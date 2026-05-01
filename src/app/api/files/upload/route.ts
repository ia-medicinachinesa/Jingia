import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { vectorStoreProvider } from '@/lib/vector-store'
import { Readable } from 'stream'
import { Buffer } from 'buffer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

export async function POST(req: Request) {
  try {
    let userId = 'dev_user'

    // 1. Autenticação
    if (isClerkConfigured) {
      const { auth } = await import('@clerk/nextjs/server')
      const { userId: clerkId } = await auth()
      
      if (!clerkId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
      userId = clerkId
    }

    // 2. Validação do Usuário e Plano
    const user = await db.getUserByClerkId(userId)
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado no banco de dados.' }, { status: 404 })
    }

    if (user.plan_id !== 'profissional' && userId !== 'dev_user') {
      return NextResponse.json({ 
        error: 'Recurso exclusivo do Plano Profissional.',
        upgradeRequired: true 
      }, { status: 403 })
    }

    // 3. Processamento do Arquivo
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    // Limite de tamanho (ex: 20MB conforme sugerido na arquitetura)
    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande. O limite é 20MB.' }, { status: 400 })
    }

    // 4. Converter Web API File → Node.js Readable stream
    // O SDK da OpenAI espera um stream Node.js com .path (nome do arquivo),
    // não o File da Web API que o Next.js entrega via formData.
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const stream = Readable.from(buffer)
    // Essencial: o SDK usa .path para determinar o nome e extensão do arquivo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(stream as any).path = file.name

    // 5. Integração com OpenAI Vector Store
    const vectorStoreId = await vectorStoreProvider.getOrCreateVectorStore(userId)
    
    const { fileId } = await vectorStoreProvider.uploadAndAttachFile(vectorStoreId, stream)

    return NextResponse.json({ 
      success: true, 
      vectorStoreId, 
      fileId,
      fileName: file.name 
    })

  } catch (error) {
    console.error('Erro no upload de arquivo:', error)
    const message = error instanceof Error ? error.message : 'Erro interno no processamento do arquivo.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
