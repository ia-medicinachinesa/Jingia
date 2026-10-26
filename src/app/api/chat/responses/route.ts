import { NextResponse } from 'next/server'
import { openaiAnalista } from '@/lib/openai'
import { db, ThreadRow, threadMessages, threads } from '@/lib/db'
import { chatRateLimit } from '@/lib/ratelimit'
import { PROMPTS } from '@/lib/prompts'
import { ASSISTANTS } from '@/lib/assistants'
import { DEFAULT_LOCALE, isLocale, Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

const LANGUAGE_INSTRUCTIONS: Record<Locale, string> = {
  'pt-BR': 'Responda em português do Brasil, salvo quando o usuário pedir explicitamente outro idioma.',
  en: 'Respond in English unless the user explicitly asks for another language.',
  es: 'Responde en español, salvo que el usuario solicite explícitamente otro idioma.',
}

const API_MESSAGES = {
  'pt-BR': { required: 'Mensagem é requerida', unauthorized: 'Não autorizado', rate: 'Muitas mensagens em sequência. Aguarde um momento.', user: 'Usuário não encontrado.', conversation: 'Conversa não encontrada.', empty: 'Resposta vazia da OpenAI', quota: 'Saldo de créditos da API da OpenAI esgotado. Adicione créditos para restabelecer o atendimento.', internal: 'Erro interno durante o processamento da resposta.' },
  en: { required: 'A message is required', unauthorized: 'Unauthorized', rate: 'Too many messages in a row. Please wait a moment.', user: 'User not found.', conversation: 'Conversation not found.', empty: 'Empty response from OpenAI', quota: 'The OpenAI API credit balance is depleted. Add credits to restore service.', internal: 'An internal error occurred while processing the response.' },
  es: { required: 'Se requiere un mensaje', unauthorized: 'No autorizado', rate: 'Demasiados mensajes seguidos. Espera un momento.', user: 'Usuario no encontrado.', conversation: 'Conversación no encontrada.', empty: 'Respuesta vacía de OpenAI', quota: 'El saldo de créditos de la API de OpenAI se ha agotado. Añade créditos para restablecer el servicio.', internal: 'Error interno al procesar la respuesta.' },
} as const

function isMissingPreviousResponse(error: unknown): boolean {
  const candidate = error as { status?: number; code?: string; message?: string }
  const message = candidate?.message?.toLowerCase() ?? ''
  return (candidate?.status === 400 || candidate?.status === 404) &&
    (message.includes('previous response') || message.includes('previous_response_id')) &&
    (message.includes('not found') || candidate?.code === 'not_found')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCompletedText(response: any): string {
  if (typeof response?.output_text === 'string') return response.output_text
  return (response?.output ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((item: any) => item.type === 'message')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .flatMap((item: any) => item.content ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((item: any) => item.type === 'output_text' || item.type === 'text')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((item: any) => item.text ?? '')
    .join('')
}

export async function POST(req: Request) {
  let locale: Locale = DEFAULT_LOCALE

  try {
    const body = await req.json()
    const {
      message,
      vectorStoreId,
      imageFileIds,
      assistantId,
      conversationId,
      threadId: legacyThreadId,
      requestId: suppliedRequestId,
      fileName,
      locale: requestedLocale,
    } = body
    locale = isLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE
    const apiText = API_MESSAGES[locale]

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: apiText.required }, { status: 400 })
    }

    let clerkUserId = 'dev_user'
    if (isClerkConfigured) {
      const { auth } = await import('@clerk/nextjs/server')
      const { userId } = await auth()
      if (!userId) return NextResponse.json({ error: apiText.unauthorized }, { status: 401 })
      clerkUserId = userId
    }

    const { success } = await chatRateLimit.limit(clerkUserId)
    if (!success) return NextResponse.json({ error: apiText.rate }, { status: 429 })

    const user = await db.getUserByClerkId(clerkUserId)
    if (!user) return NextResponse.json({ error: apiText.user }, { status: 404 })

    let conversation: ThreadRow | null = null
    if (typeof conversationId === 'string' && conversationId) {
      conversation = await threads.getByIdForUser(conversationId, user.id)
      if (!conversation) return NextResponse.json({ error: apiText.conversation }, { status: 404 })
    } else if (typeof legacyThreadId === 'string' && legacyThreadId) {
      conversation = await threads.getByOpenaiIdForUser(legacyThreadId, user.id)
      if (!conversation) return NextResponse.json({ error: apiText.conversation }, { status: 404 })
    }

    if (conversation && conversation.assistant_id !== assistantId) {
      return NextResponse.json({ error: apiText.conversation }, { status: 404 })
    }

    const previousResponseId = conversation?.openai_thread_id.startsWith('resp_')
      ? conversation.openai_thread_id
      : null
    const durableHistory = conversation
      ? (await threadMessages.listByThread(conversation.id, 100)).slice(-20)
      : []
    const requestId = typeof suppliedRequestId === 'string' && /^[0-9a-f-]{36}$/i.test(suppliedRequestId)
      ? suppliedRequestId
      : crypto.randomUUID()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = [{ type: 'input_text', text: message }]

    // Anexa imagens multimodais diretamente na Responses API
    if (Array.isArray(imageFileIds) && imageFileIds.length > 0) {
      for (const imgId of imageFileIds) {
        if (typeof imgId === 'string' && imgId.startsWith('file-')) {
          content.push({
            type: 'input_image',
            file_id: imgId,
            detail: 'auto'
          })
        }
      }
    }

    const ASSISTANT_VECTOR_STORES: Record<string, string> = {
      'ASS-05': 'vs_6a0a572794488191b7ad8481f8686685',
    }
    const storeIds: string[] = [
      vectorStoreId,
      ASSISTANT_VECTOR_STORES[assistantId],
      process.env.OPENAI_CORE_KNOWLEDGE_ID,
    ]
      .filter((id): id is string => Boolean(id))
      .map(id => id.trim())

    const isFileRequest = /\b(planilha|excel|tabela|relatório|documento|arquivo|download|exportar|imagem|gráfico|diagrama|gerar|criar|spreadsheet|table|report|document|file|download|export|image|chart|diagram|generate|create|hoja|tabla|informe|documento|archivo|descargar|exportar|imagen|gráfico|diagrama|generar|crear|pdf|word|docx|csv|xlsx|png|jpg|jpeg|zip|txt)\b/i.test(message)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseTools: any[] = []
    if (storeIds.length > 0) responseTools.push({ type: 'file_search', vector_store_ids: storeIds })
    if (isFileRequest) responseTools.push({ type: 'code_interpreter' })

    const config = ASSISTANTS.find(a => a.id === assistantId)
    let systemPrompt = assistantId && PROMPTS[assistantId] ? PROMPTS[assistantId] : undefined
    if (!systemPrompt) {
      systemPrompt = config
        ? `Você é o assistente "${config.name}" da plataforma Jing IA, especializado na área de "${config.category}". Sua função principal é: ${config.description}. Forneça análises clínicas, didáticas, fundamentadas em evidências científicas e na fisiologia moderna integrada à Medicina Tradicional Chinesa (MTC).`
        : 'Você é um assistente clínico de Inteligência Artificial especializado na Medicina Tradicional Chinesa e fisiologia moderna.'
    }
    systemPrompt += `\n\n<response_language>${LANGUAGE_INSTRUCTIONS[locale]}</response_language>`
    if (isFileRequest) {
      systemPrompt += "\n\nATENÇÃO: O usuário solicitou a geração de um arquivo (planilha, documento, PDF, imagem, gráfico, ZIP, etc.). Você DEVE usar a ferramenta Code Interpreter (Python) para gerar o arquivo real de verdade com os dados solicitados e salvá-lo no diretório '/mnt/data/'. Depois de gerá-lo por código, você DEVE disponibilizar o link de download no seu texto no formato estrito '[Nome do Arquivo](sandbox:/mnt/data/nome_do_arquivo.extensão)'. Nunca use links relativos como '/mnt/data/...' ou links simulados; a URL do markdown deve começar obrigatoriamente com o prefixo 'sandbox:/' para que a anotação correspondente seja gerada."
    }

    const hasUserImage = Array.isArray(imageFileIds) && imageFileIds.length > 0
    // Se o usuário está enviando imagem para avaliação sem documento RAG anexo, não forçamos 'required' na busca
    const toolChoice = (storeIds.length > 0 && !hasUserImage) ? 'required' : 'auto'

    const createResponse = (previousId: string | null, replayHistory: boolean) => {
      const input = replayHistory
        ? [
            ...durableHistory.map(item => ({ role: item.role, content: item.content })),
            { role: 'user', content },
          ]
        : [{ role: 'user', content }]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (openaiAnalista as any).responses.create({
        model: 'gpt-4.1',
        store: true,
        stream: true,
        max_output_tokens: 16384,
        previous_response_id: previousId ?? undefined,
        instructions: systemPrompt,
        input,
        tools: responseTools.length > 0 ? responseTools : undefined,
        tool_choice: storeIds.length > 0 ? toolChoice : 'auto',
      })
    }

    let recoveredConversation = false
    let responseStream
    try {
      responseStream = await createResponse(previousResponseId, false)
    } catch (error) {
      if (!previousResponseId || !isMissingPreviousResponse(error)) throw error
      recoveredConversation = true
      console.warn(`[responses] Ponteiro ${previousResponseId} indisponível; recuperando conversa ${conversation?.id}.`)
      responseStream = await createResponse(null, durableHistory.length > 0)
    }

    if (!responseStream) throw new Error(apiText.empty)
    await db.incrementMessageCount(clerkUserId)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let activeConversation = conversation
        let responseId: string | null = null
        let assistantMessage = ''

        try {
          if (recoveredConversation) {
            controller.enqueue(encoder.encode('event: conversationRecovered\ndata: true\n\n'))
          }

          let assistantSaved = false
          for await (const chunk of responseStream) {
            if (chunk.type === 'response.created') {
              responseId = chunk.response?.id ?? null
              if (responseId) {
                await db.updateLastResponseId(clerkUserId, responseId)

                if (activeConversation) {
                  activeConversation = await threads.updateOpenaiId(activeConversation.id, user.id, responseId)
                } else {
                  let title = message.length > 60 ? `${message.slice(0, 57)}...` : message
                  if (fileName) title = `📄 ${fileName} - ${title}`
                  activeConversation = await threads.create(user.id, assistantId, responseId, title)
                }

                await threadMessages.upsert({
                  threadId: activeConversation.id,
                  requestId,
                  role: 'user',
                  content: message,
                  openaiResponseId: responseId,
                })

                controller.enqueue(encoder.encode(`event: conversationId\ndata: ${activeConversation.id}\n\n`))
                controller.enqueue(encoder.encode(`event: threadId\ndata: ${responseId}\n\n`))
              }
            }

            if (chunk.type === 'response.output_text.delta' && chunk.delta) {
              assistantMessage += chunk.delta
            }

            if ((chunk.type === 'response.completed' || chunk.type === 'response.done') && activeConversation) {
              if (!assistantMessage && chunk.response) assistantMessage = getCompletedText(chunk.response)
              if (assistantMessage) {
                await threadMessages.upsert({
                  threadId: activeConversation.id,
                  requestId,
                  role: 'assistant',
                  content: assistantMessage,
                  openaiResponseId: responseId,
                })
                assistantSaved = true
              }
              if (conversation) await threads.incrementCountById(activeConversation.id, user.id)
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
          }

          // Garantia de persistência: se o stream terminou e a mensagem do assistente ainda não foi persistida
          if (!assistantSaved && activeConversation && assistantMessage) {
            await threadMessages.upsert({
              threadId: activeConversation.id,
              requestId,
              role: 'assistant',
              content: assistantMessage,
              openaiResponseId: responseId,
            })
            if (conversation) await threads.incrementCountById(activeConversation.id, user.id)
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          console.error('Erro no processamento da stream:', error)
          const errorText = error instanceof Error ? error.message : String(error)
          const isQuotaError = errorText.includes('credit_balance_exhausted') || errorText.includes('insufficient_quota') || errorText.includes('no credits remaining') || errorText.includes('429')
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(isQuotaError ? apiText.quota : apiText.internal)}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Erro na Responses API:', error)
    const message = error instanceof Error ? error.message : API_MESSAGES[locale].internal
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
