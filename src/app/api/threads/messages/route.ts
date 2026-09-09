import { NextResponse } from 'next/server'
import { db, threadMessages, threads } from '@/lib/db'
import { openai, openaiAnalista } from '@/lib/openai'

export const dynamic = 'force-dynamic'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function isRemoteHistoryUnavailable(error: unknown): boolean {
  const candidate = error as { status?: number; code?: string; message?: string }
  const message = candidate?.message?.toLowerCase() ?? ''
  return candidate?.status === 404 || candidate?.code === 'not_found' || message.includes('not found')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function responseMessages(response: any): ChatMessage[] {
  const messages: ChatMessage[] = []
  const userText = (response.input ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((item: any) => {
      if (typeof item.content === 'string') return item.content
      return (item.content ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((part: any) => part.type === 'input_text' || part.type === 'text')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((part: any) => part.text ?? '')
        .join('')
    })
    .filter(Boolean)
    .join('\n')
  if (userText) messages.push({ role: 'user', content: userText })

  const assistantText = (response.output ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((item: any) => item.type === 'message')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .flatMap((item: any) => item.content ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((part: any) => part.type === 'output_text' || part.type === 'text')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((part: any) => part.text ?? '')
    .join('')
  if (assistantText) messages.push({ role: 'assistant', content: assistantText })

  return messages
}

/**
 * GET /api/threads/messages?conversationId=<uuid>
 * `threadId` continua aceito temporariamente para links antigos.
 */
export async function GET(req: Request) {
  try {
    let clerkUserId = 'dev_user'
    if (isClerkConfigured) {
      const { auth } = await import('@clerk/nextjs/server')
      const { userId } = await auth()
      if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      clerkUserId = userId
    }

    const user = await db.getUserByClerkId(clerkUserId)
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')
    const legacyThreadId = searchParams.get('threadId')
    if (!conversationId && !legacyThreadId) {
      return NextResponse.json({ error: 'conversationId é obrigatório' }, { status: 400 })
    }

    const conversation = conversationId
      ? await threads.getByIdForUser(conversationId, user.id)
      : await threads.getByOpenaiIdForUser(legacyThreadId!, user.id)
    if (!conversation) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

    const durable = await threadMessages.listByThread(conversation.id, 100)
    if (durable.length > 0) {
      return NextResponse.json({
        messages: durable.map(({ role, content }) => ({ role, content })),
        conversationId: conversation.id,
        threadId: conversation.openai_thread_id,
        title: conversation.title,
      })
    }

    let messages: ChatMessage[] = []
    try {
      if (conversation.openai_thread_id.startsWith('resp_')) {
        // A Responses API legada só permite recuperar a última interação por esse ponteiro.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (openaiAnalista as any).responses.retrieve(conversation.openai_thread_id)
        messages = responseMessages(response)
      } else if (conversation.openai_thread_id.startsWith('thread_')) {
        const response = await openai.beta.threads.messages.list(conversation.openai_thread_id, {
          order: 'asc',
          limit: 100,
        })
        messages = response.data.map(item => {
          const firstContent = item.content[0]
          return {
            role: item.role as 'user' | 'assistant',
            content: firstContent?.type === 'text' ? firstContent.text.value : '',
          }
        }).filter(item => item.content)
      }
    } catch (error) {
      if (!isRemoteHistoryUnavailable(error)) throw error
      console.warn(`[threads/messages] Histórico remoto indisponível para ${conversation.id}.`)
      return NextResponse.json({
        messages: [],
        conversationId: conversation.id,
        threadId: conversation.openai_thread_id,
        title: conversation.title,
        historyUnavailable: true,
      })
    }

    // Migra silenciosamente o que ainda estiver disponível na OpenAI.
    for (const item of messages) {
      await threadMessages.upsert({
        threadId: conversation.id,
        requestId: crypto.randomUUID(),
        role: item.role,
        content: item.content,
        openaiResponseId: conversation.openai_thread_id,
      })
    }

    return NextResponse.json({
      messages,
      conversationId: conversation.id,
      threadId: conversation.openai_thread_id,
      title: conversation.title,
    })
  } catch (error) {
    console.error('Erro ao buscar mensagens da conversa:', error)
    const details = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: 'Erro ao carregar mensagens', details }, { status: 500 })
  }
}
