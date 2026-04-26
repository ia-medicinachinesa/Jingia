import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { db, threads } from '@/lib/db'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

// GET /api/threads — Lista conversas do usuário
export async function GET() {
  try {
    let userId = 'dev_user'

    if (isClerkConfigured) {
      const { auth } = await import('@clerk/nextjs/server')
      const { userId: clerkId } = await auth()
      if (!clerkId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
      userId = clerkId
    }

    const user = await db.getUserByClerkId(userId)
    if (!user) {
      return NextResponse.json({ threads: [] })
    }

    const userThreads = await threads.listByUser(user.id)
    return NextResponse.json({ threads: userThreads })

  } catch (error) {
    console.error('Erro ao listar threads:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE /api/threads?id=xxx — Exclui uma conversa
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const threadId = searchParams.get('id')

    if (!threadId) {
      return NextResponse.json({ error: 'ID da thread é obrigatório' }, { status: 400 })
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

    const user = await db.getUserByClerkId(userId)
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    await threads.delete(threadId, user.id)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao excluir thread:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
