import { NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { chatRateLimit } from '@/lib/ratelimit'
import { sanitizeInput } from '@/lib/sanitize'
import { ASSISTANTS } from '@/lib/assistants'
import { db, threads } from '@/lib/db'
import { PLAN_LIMITS } from '@/lib/plans'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { assistantId } = body
    let { message, threadId } = body

    message = sanitizeInput(message)

    if (!message || !assistantId) {
      return NextResponse.json({ error: 'Mensagem e Id do Assistente são requeridos' }, { status: 400 })
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

    // Rate limiting (anti-spam: 10 req/min)
    const { success } = await chatRateLimit.limit(userId)
    if (!success) {
      return NextResponse.json({ error: 'Muitas mensagens em sequência. Aguarde um momento.' }, { status: 429 })
    }

    // ── QUOTA DE MENSAGENS MENSAL ──────────────────────────────
    const user = await db.getUserByClerkId(userId)
    if (user) {
      const planId = user.plan_id ?? 'essencial'
      const limit = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.essencial
      if (user.monthly_message_count >= limit) {
        return NextResponse.json({ 
          error: `Limite de ${limit} mensagens/mês atingido. Faça upgrade do seu plano.`,
          quotaExceeded: true 
        }, { status: 429 })
      }
    }

    // ── ASSISTENTE ─────────────────────────────────────────────
    const assistantConfig = ASSISTANTS.find(a => a.id === assistantId)
    if (!assistantConfig || !assistantConfig.openaiId || assistantConfig.openaiId.includes('placeholder')) {
      return NextResponse.json({ error: 'Este assistente ainda não está disponível.' }, { status: 404 })
    }

    // ── THREAD (criar ou reutilizar) ──────────────────────────
    let isNewThread = false
    if (!threadId) {
      const thread = await openai.beta.threads.create()
      threadId = thread.id
      isNewThread = true
    }

    // ── ENVIAR MENSAGEM ───────────────────────────────────────
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    })

    // ── EXECUTAR ASSISTENTE (STREAMING) ─────────────────────────
    const runStream = openai.beta.threads.runs.stream(threadId, {
      assistant_id: assistantConfig.openaiId
    })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Envia o threadId no início do stream
          controller.enqueue(encoder.encode(`event: threadId\ndata: ${threadId}\n\n`))

          for await (const event of runStream) {
            if (event.event === 'thread.message.delta') {
              const textDelta = event.data.delta.content?.[0]
              if (textDelta && textDelta.type === 'text' && textDelta.text?.value) {
                // Envia o pedaço de texto para o cliente
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(textDelta.text.value)}\n\n`))
              }
            } else if (event.event === 'thread.run.completed') {
              // Quando o assistente termina de responder, atualizamos o banco de dados
              await db.incrementMessageCount(userId)

              if (isNewThread && user) {
                const title = message.length > 60 ? message.slice(0, 57) + '...' : message
                await threads.create(user.id, assistantId, threadId, title)
              } else {
                await threads.incrementCount(threadId)
              }
              
              // Sinaliza fim do stream
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
            } else if (event.event === 'thread.run.failed') {
               controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify('O assistente falhou na execução.')}\n\n`))
            }
          }
        } catch (error) {
           console.error("Stream error", error)
           controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify('Erro interno no streaming.')}\n\n`))
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
    console.error('Erro na API de Chat:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: 'Erro interno do servidor', details: message }, { status: 500 })
  }
}

