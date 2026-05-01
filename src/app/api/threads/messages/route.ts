import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { openai } from '@/lib/openai'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

/**
 * GET /api/threads/messages?threadId=thread_xxx
 * Busca as mensagens de uma thread existente na OpenAI.
 */
export async function GET(req: Request) {
  try {
    // ── Autenticação ───────────────────────────────────────────
    if (isClerkConfigured) {
      const { auth } = await import('@clerk/nextjs/server')
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
    }

    const { searchParams } = new URL(req.url)
    const threadId = searchParams.get('threadId')

    if (!threadId) {
      return NextResponse.json({ error: 'threadId é obrigatório' }, { status: 400 })
    }

    // ── Buscar mensagens na API da OpenAI ─────────────────────
    
    // Suporte para a nova Responses API v6 (Analista de Artigos)
    if (threadId.startsWith('resp_')) {
      const { openaiAnalista } = await import('@/lib/openai')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = await (openaiAnalista as any).responses.retrieve(threadId)
      
      const history: any[] = []
      
      // Extrai a mensagem do usuário (input)
      const userText = resp.input?.[0]?.content?.[0]?.text
      if (userText) {
        history.push({ role: 'user', content: userText })
      }
      
      // Extrai a resposta do assistente (output)
      // O output pode ter múltiplos itens, buscamos o primeiro texto
      const assistantItem = resp.output?.find((o: any) => o.type === 'message')
      const assistantText = assistantItem?.content?.[0]?.text
      if (assistantText) {
        history.push({ role: 'assistant', content: assistantText })
      }

      return NextResponse.json({ messages: history })
    }

    // Suporte para Assistants API legada
    const response = await openai.beta.threads.messages.list(threadId, {
      order: 'asc',
      limit: 100,
    })

    const messages = response.data.map(msg => {
      let content = ''
      if (msg.content[0]?.type === 'text') {
        content = (msg.content[0] as any).text.value
      }
      return {
        role: msg.role as 'user' | 'assistant',
        content,
      }
    })

    return NextResponse.json({ messages })

  } catch (error) {
    console.error('Erro ao buscar mensagens da thread:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: 'Erro ao carregar mensagens', details: message }, { status: 500 })
  }
}
