import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { vectorStoreProvider } from '@/lib/vector-store'
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

    // 4. Preparar o arquivo para a OpenAI usando o utilitário oficial toFile
    // Isso garante que metadados (nome, extensão) sejam preservados corretamente para o parsing de PDFs/Docs
    const { toFile } = await import('openai')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileForOpenAI = await toFile(buffer, file.name)

    // 5. Integração com OpenAI Vector Store
    const vectorStoreId = await vectorStoreProvider.getOrCreateVectorStore(userId)
    
    const { fileId } = await vectorStoreProvider.uploadAndAttachFile(vectorStoreId, fileForOpenAI)

    return NextResponse.json({ 
      success: true, 
      vectorStoreId, 
      fileId,
      fileName: file.name 
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Erro detalhado no upload de arquivo:', error)
    
    // Tenta capturar a mensagem de erro específica da OpenAI se houver
    const errorMessage = error.response?.data?.error?.message || error.message || 'Erro desconhecido no servidor'
    
    return NextResponse.json({ 
      error: `Erro no processamento: ${errorMessage}`,
      details: error.stack
    }, { status: 500 })
  }
}
