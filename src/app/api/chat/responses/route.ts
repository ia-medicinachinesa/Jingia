import { NextResponse } from 'next/server'
import { openaiAnalista } from '@/lib/openai'
import { db, threads } from '@/lib/db'
import { chatRateLimit } from '@/lib/ratelimit'
import { PROMPTS } from '@/lib/prompts'
import { ASSISTANTS } from '@/lib/assistants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

export async function POST(req: Request) {
  try {
    const { message, vectorStoreId, assistantId, threadId, fileName } = await req.json()
    const activeThreadId = (threadId && threadId.startsWith('resp_')) ? threadId : null

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

    const isFileRequest = /\b(planilha|excel|tabela|relatório|documento|pdf|word|docx|csv|xlsx|arquivo|download|exportar|imagem|png|jpg|jpeg|zip|txt|gráfico|diagrama|gerar|criar)\b/i.test(message)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: any[] = []
    if (storeIds.length > 0) {
      tools.push({
        type: "file_search",
        vector_store_ids: storeIds
      })
    }
    if (isFileRequest) {
      tools.push({
        type: "code_interpreter"
      })
    }

    // 4. Instruções do Assistente (System Prompt com Fallback Estruturado)
    const config = ASSISTANTS.find(a => a.id === assistantId)
    let systemPrompt = assistantId && PROMPTS[assistantId] ? PROMPTS[assistantId] : undefined

    if (!systemPrompt) {
      if (config) {
        systemPrompt = `Você é o assistente "${config.name}" da plataforma Jing IA, especializado na área de "${config.category}". Sua função principal é: ${config.description}. Forneça análises clínicas, didáticas, fundamentadas em evidências científicas e na fisiologia moderna integrada à Medicina Tradicional Chinesa (MTC).`
      } else {
        systemPrompt = "Você é um assistente clínico de Inteligência Artificial especializado na Medicina Tradicional Chinesa e fisiologia moderna."
      }
    }

    if (isFileRequest) {
      systemPrompt += "\n\nATENÇÃO: O usuário solicitou a geração de um arquivo (planilha, documento, PDF, imagem, gráfico, ZIP, etc.). Você DEVE usar a ferramenta Code Interpreter (Python) para gerar o arquivo real de verdade com os dados solicitados e salvá-lo no diretório '/mnt/data/'. Depois de gerá-lo por código, você DEVE disponibilizar o link de download no seu texto no formato estrito '[Nome do Arquivo](sandbox:/mnt/data/nome_do_arquivo.extensão)'. Nunca use links relativos como '/mnt/data/...' ou links simulados; a URL do markdown deve começar obrigatoriamente com o prefixo 'sandbox:/' para que a anotação correspondente seja gerada."
    }

    // 5. Chamada para a Responses API (OpenAI 2026) com Streaming ativado
    const hasFileSearch = storeIds.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseStream = await (openaiAnalista as any).responses.create({
      model: "gpt-4.1",
      store: true,
      stream: true,
      max_output_tokens: 16384,
      previous_response_id: activeThreadId || undefined,
      instructions: systemPrompt,
      input: [
        { 
          role: "user", 
          content: content
        }
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools.length > 0 ? (tools as any) : undefined,
      tool_choice: hasFileSearch ? "required" : "auto"
    })

    if (!responseStream) {
      throw new Error("Resposta vazia da OpenAI")
    }

    // 6. Incrementar contador de mensagens
    await db.incrementMessageCount(userId)

    // 7. Preparar Stream Manual para capturar IDs e atualizar Banco
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let isHistoryCreated = false

          for await (const chunk of responseStream) {
            // Gerenciamento de Histórico (threads) e Contexto
            if (chunk.type === 'response.created') {
              const responseId = chunk.response?.id
              if (responseId) {
                await db.updateLastResponseId(userId, responseId)

                // Transição de threads antigas do padrão 'thread_' para 'resp_'
                if (threadId && threadId.startsWith('thread_')) {
                  const { supabaseAdmin } = await import('@/lib/supabase')
                  await supabaseAdmin
                    .from('threads')
                    .update({ 
                      openai_thread_id: responseId,
                      updated_at: new Date().toISOString()
                    })
                    .eq('openai_thread_id', threadId)
                } else if (!activeThreadId && !isHistoryCreated) {
                  let threadTitle = message.length > 60 ? message.slice(0, 57) + '...' : message
                  if (fileName) {
                    threadTitle = `📄 ${fileName} - ${threadTitle}`
                  }
                  await threads.create(user!.id, assistantId, responseId, threadTitle)
                  isHistoryCreated = true
                } else if (activeThreadId) {
                  const { supabaseAdmin } = await import('@/lib/supabase')
                  await supabaseAdmin
                    .from('threads')
                    .update({ 
                      openai_thread_id: responseId,
                      updated_at: new Date().toISOString()
                    })
                    .eq('openai_thread_id', activeThreadId)
                }
              }
            }

            if (chunk.type === 'response.done') {
              console.log("[responses] response.done - Resposta concluída com sucesso:", JSON.stringify(chunk.response, null, 2))
            }

            // Repassa o evento para o frontend
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
          }
          
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        } catch (err) {
          console.error("Erro no processamento da stream:", err)
          const errStr = err instanceof Error ? err.message : String(err)
          const isQuotaError = errStr.includes('credit_balance_exhausted') || errStr.includes('insufficient_quota') || errStr.includes('no credits remaining') || errStr.includes('429')
          
          const errorMessage = isQuotaError
            ? 'Saldo de créditos da API da OpenAI esgotado. Por favor, adicione créditos na sua conta em platform.openai.com para restabelecer o atendimento.'
            : 'Erro interno durante o processamento da resposta.'

          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(errorMessage)}\n\n`))
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
