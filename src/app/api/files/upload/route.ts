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
  let checkpoint = 'Início'
  try {
    let userId = 'dev_user'

    // 1. Autenticação
    checkpoint = 'Autenticação Clerk'
    if (isClerkConfigured) {
      const { auth } = await import('@clerk/nextjs/server')
      const { userId: clerkId } = await auth()
      
      if (!clerkId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
      userId = clerkId
    }

    // 2. Validação do Usuário e Plano
    checkpoint = 'Busca de Usuário no Banco'
    const user = await db.getUserByClerkId(userId)
    if (!user) {
      return NextResponse.json({ error: `Usuário [${userId}] não encontrado no banco de dados.` }, { status: 404 })
    }

    checkpoint = 'Validação de Plano'
    if (user.plan_id !== 'profissional' && userId !== 'dev_user') {
      return NextResponse.json({ 
        error: 'Recurso exclusivo do Plano Profissional.',
        upgradeRequired: true 
      }, { status: 403 })
    }

    // 3. Processamento do Arquivo
    checkpoint = 'Recebimento do Arquivo (FormData)'
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

    checkpoint = 'Preparação do Buffer (toFile)'
    const { toFile } = await import('openai')
    const { openaiAnalista } = await import('@/lib/openai')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileForOpenAI = await toFile(buffer, file.name)

    // Detecção de Imagem vs Documento
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name)

    if (isImage) {
      checkpoint = 'Upload de Imagem para Visão (OpenAI Files)'
      const uploadedFile = await openaiAnalista.files.create({
        file: fileForOpenAI,
        purpose: 'vision',
      })

      return NextResponse.json({
        success: true,
        fileId: uploadedFile.id,
        fileName: file.name,
        fileType: 'image'
      })
    }

    // 4. Integração com OpenAI Vector Store (Apenas documentos de texto: PDF, DOCX, TXT, etc.)
    checkpoint = 'Criação/Busca de Vector Store'
    const vectorStoreId = await vectorStoreProvider.getOrCreateVectorStore(userId)
    
    checkpoint = 'Upload e Indexação na OpenAI'
    const { fileId } = await vectorStoreProvider.uploadAndAttachFile(vectorStoreId, fileForOpenAI)

    return NextResponse.json({ 
      success: true, 
      vectorStoreId, 
      fileId,
      fileName: file.name,
      fileType: 'document'
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(`Erro no upload [Fase: ${checkpoint}]:`, error)
    
    // Tenta capturar a mensagem de erro específica da OpenAI se houver
    const errorMessage = error.response?.data?.error?.message || error.message || 'Erro desconhecido'
    
    return NextResponse.json({ 
      error: `Falha na fase [${checkpoint}]: ${errorMessage}`,
      details: error.stack
    }, { status: 500 })
  }
}
