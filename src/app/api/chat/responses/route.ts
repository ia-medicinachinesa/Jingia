import { NextResponse } from 'next/server'
import { openaiAnalista } from '@/lib/openai'
import { db } from '@/lib/db'
import { chatRateLimit } from '@/lib/ratelimit'
import { PROMPTS } from '@/lib/prompts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

export async function POST(req: Request) {
  try {
    const { message, vectorStoreId, assistantId } = await req.json()

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
    
    // 3. Vector Stores (Usuário + Conhecimento Base)
    const storeIds: string[] = []
    if (vectorStoreId) storeIds.push(vectorStoreId)
    if (process.env.OPENAI_CORE_KNOWLEDGE_ID) storeIds.push(process.env.OPENAI_CORE_KNOWLEDGE_ID)

    const tools = storeIds.length > 0 ? [
      { 
        type: "file_search",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vector_store_ids: storeIds as any
      }
    ] : []

    const tool_resources = storeIds.length > 0 ? {
      file_search: {
        vector_store_ids: storeIds
      }
    } : undefined

    // 4. Instruções do Assistente (System Prompt)
    const systemPrompt = assistantId && PROMPTS[assistantId] 
      ? PROMPTS[assistantId] 
      : "Você é um assistente clínico de Inteligência Artificial especializado na Medicina Tradicional Chinesa."

    // 5. Chamada para a Responses API (OpenAI 2026)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (openaiAnalista as any).responses.create({
      model: "gpt-4.1",
      store: true,
      previous_response_id: user.last_response_id || undefined,
      instructions: systemPrompt,
      input: [
        { 
          role: "user", 
          content: content
        }
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tool_resources: tool_resources as any,
      tool_choice: "auto"
    })

    if (!response) {
      throw new Error("Resposta vazia da OpenAI")
    }

    // 3. Atualizar o ID da última resposta de forma assíncrona
    if (response.id) {
      await db.updateLastResponseId(userId, response.id)
    }

    // 4. Incrementar contador de mensagens
    await db.incrementMessageCount(userId)

    // 5. Retornar o stream para o frontend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response((response as any).toReadableStream(), {
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
