import { NextResponse } from 'next/server'
import { openai } from '@/lib/openai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

/**
 * GET /api/files/download?fileId=file-xxx&name=arquivo.xlsx
 * Proxy seguro para download de arquivos gerados pelo Code Interpreter da OpenAI.
 * O frontend envia o file_id obtido das anotações do assistente e recebe o arquivo real.
 */
export async function GET(req: Request) {
  try {
    // Autenticação — somente usuários logados podem baixar arquivos
    if (isClerkConfigured) {
      const { auth } = await import('@clerk/nextjs/server')
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
    }

    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')
    const fileName = searchParams.get('name') || 'download'

    let targetFileId = fileId

    if (!targetFileId || !targetFileId.startsWith('file-')) {
      // Fallback: se a OpenAI não gerou a anotação com o file_id, buscamos pelo nome
      try {
        const filesList = await openai.files.list()
        const matchingFiles = filesList.data.filter(f => f.filename === fileName || f.filename.includes(fileName))
        
        if (matchingFiles.length > 0) {
          // Pega o mais recente
          matchingFiles.sort((a, b) => b.created_at - a.created_at)
          targetFileId = matchingFiles[0].id
        } else {
          return NextResponse.json({ error: 'fileId inválido e arquivo não encontrado pelo nome' }, { status: 400 })
        }
      } catch (err) {
        return NextResponse.json({ error: 'Erro ao buscar arquivo pelo nome' }, { status: 500 })
      }
    }

    // Busca o conteúdo binário do arquivo na OpenAI
    const fileResponse = await openai.files.content(targetFileId)
    const arrayBuffer = await fileResponse.arrayBuffer()

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erro ao baixar arquivo da OpenAI:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: 'Erro ao baixar arquivo', details: message }, { status: 500 })
  }
}
