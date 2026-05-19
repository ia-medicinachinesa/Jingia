import { NextResponse } from 'next/server'
import { openaiAnalista } from '@/lib/openai'
import { db, threads } from '@/lib/db'
import { chatRateLimit } from '@/lib/ratelimit'
import { PROMPTS } from '@/lib/prompts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

export async function POST(req: Request) {
  try {
    const { message, vectorStoreId, assistantId, threadId, fileName } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Mensagem é requerida' }, { status: 400 })
    }

    let userId = 'dev_user'

    if (isClerkConfigured) {
      const { auth } = await import('@clerk/nextjs/server')
      const { userId: clerkId } = await auth()
      
      if (!clerkId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
      userId = clerkId
    }

    // Rate limiting
    const { success } = await chatRateLimit.limit(userId)
    if (!success) {
      return NextResponse.json({ error: 'Muitas mensagens em sequência. Aguarde um momento.' }, { status: 429 })
    }

    // 1. Buscar dados do usuário (Plano e Contexto)
    const user = await db.getUserByClerkId(userId)
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }

    // 2. Construir o conteúdo da mensagem (Responses API 2026 — RAG focado)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = [{ type: "input_text", text: message }]
    
    // Mapeamento de Vector Stores específicas por Assistente
    const ASSISTANT_VECTOR_STORES: Record<string, string> = {
      'ASS-05': 'vs_6a0a572794488191b7ad8481f8686685'
    }
    const assistantVectorStore = ASSISTANT_VECTOR_STORES[assistantId]
    
    // 3. Vector Stores (Usuário + Conhecimento Base do Assistente + Conhecimento Base Geral) - Sanitizado com .trim()
    const storeIds: string[] = [
      vectorStoreId,
      assistantVectorStore,
      process.env.OPENAI_CORE_KNOWLEDGE_ID
    ]
      .filter((id): id is string => Boolean(id))
      .map(id => id.trim())

    const tools = storeIds.length > 0 ? [
      { 
        type: "file_search",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vector_store_ids: storeIds as any
      }
    ] : []

    // 4. Instruções do Assistente (System Prompt)
    const systemPrompt = assistantId && PROMPTS[assistantId] 
      ? PROMPTS[assistantId] 
      : "Você é um assistente clínico de Inteligência Artificial especializado na Medicina Tradicional Chinesa."

    // 5. Chamada para a Responses API (OpenAI 2026) com Streaming ativado
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseStream = await (openaiAnalista as any).responses.create({
      model: "gpt-4.1",
      store: true,
      stream: true,
      max_output_tokens: 16384,
      previous_response_id: threadId || undefined,
      instructions: systemPrompt,
      input: [
        { 
          role: "user", 
          content: content
        }
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any,
      tool_choice: "auto"
    })

    if (!responseStream) {
      throw new Error("Resposta vazia da OpenAI")
    }

    // 6. Incrementar contador de mensagens
    await db.incrementMessageCount(userId)

    // ═══ DIAGNÓSTICO: Log detalhado dos Vector Stores utilizados ═══
    console.log(`[RESPONSES DIAG] Assistente: ${assistantId} | Stores: [${storeIds.join(', ')}] | Tools: ${JSON.stringify(tools.map((t: { type: string }) => t.type))}`)

    // 7. Preparar Stream Manual para capturar IDs e atualizar Banco
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let isHistoryCreated = false
          let hasToolCall = false
          let currentResponseId: string | null = null

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const processResponseStream = async (streamToProcess: any, isSecondTurn = false) => {
            for await (const chunk of streamToProcess) {
              if (chunk.type === 'response.created') {
                const responseId = chunk.response?.id
                if (responseId) {
                  currentResponseId = responseId
                  // 1. Atualiza o contexto global do usuário (só no primeiro turno)
                  if (!isSecondTurn) {
                    await db.updateLastResponseId(userId, responseId)
                  }

                  // 2. Gerencia o Histórico de Conversas (Tabela threads)
                  if (!threadId && !isHistoryCreated && !isSecondTurn) {
                    let threadTitle = message.length > 60 ? message.slice(0, 57) + '...' : message
                    if (fileName) {
                      threadTitle = `📄 ${fileName} - ${threadTitle}`
                    }
                    await threads.create(user!.id, assistantId, responseId, threadTitle)
                    isHistoryCreated = true
                  } else if (threadId && !isSecondTurn) {
                    const { supabaseAdmin } = await import('@/lib/supabase')
                    await supabaseAdmin
                      .from('threads')
                      .update({ 
                        openai_thread_id: responseId,
                        updated_at: new Date().toISOString()
                      })
                      .eq('openai_thread_id', threadId)
                  }
                }
              }

              // Detecta se a IA chamou o file_search
              if (chunk.type === 'response.output_item.done' && chunk.item?.type === 'file_search_call') {
                hasToolCall = true
              }

              // Repassa o evento para o frontend (escondemos o response.done do primeiro turno se houver tool call)
              if (chunk.type === 'response.done') {
                if (!hasToolCall || isSecondTurn) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
                }
              } else {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
              }
            }
          }

          // Inicia o processamento do primeiro turno
          await processResponseStream(responseStream, false)

          // ═══ NOVO LOOP: Se o modelo chamou uma ferramenta, iniciamos o 2º turno automaticamente ═══
          if (hasToolCall && currentResponseId) {
            console.log(`[RESPONSES DIAG] Ferramenta acionada. Iniciando 2º Turno para gerar texto com id ${currentResponseId}...`)
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const responseStream2 = await (openaiAnalista as any).responses.create({
              model: "gpt-4.1",
              store: true,
              stream: true, 
              max_output_tokens: 16384,
              previous_response_id: currentResponseId, // Continua a thread
              instructions: systemPrompt,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tools: tools as any,
              input: [] // Array vazio força o modelo a olhar para os resultados da ferramenta e continuar
            })

            await processResponseStream(responseStream2, true)
          }

          // Sinaliza fim definitivo para parsers que esperam [DONE]
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        } catch (err) {
          console.error("Erro no processamento da stream:", err)
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify('Erro no processamento da stream.')}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Erro na Responses API:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
