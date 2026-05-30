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
    const threadId = searchParams.get('threadId')

    let targetFileId = fileId

    if (!targetFileId || !targetFileId.startsWith('file-')) {
      // Fallback 1: Buscar o arquivo pesquisando nas mensagens da Thread
      if (threadId) {
        try {
          const messagesList = await openai.beta.threads.messages.list(threadId)
          for (const msg of messagesList.data) {
            for (const content of msg.content) {
              if (content.type === 'text' && content.text?.annotations) {
                for (const annot of content.text.annotations) {
                  if (annot.type === 'file_path') {
                    const annotFileId = annot.file_path.file_id
                    const annotFileName = annot.text.split('/').pop()
                    if (
                      annotFileName === fileName ||
                      annotFileName?.includes(fileName) ||
                      fileName.includes(annotFileName || '')
                    ) {
                      targetFileId = annotFileId
                      break
                    }
                  }
                }
              }
              if (targetFileId) break
            }
            if (targetFileId) break
          }
        } catch (err) {
          console.error('Erro ao buscar arquivo por threadId:', err)
        }
      }

      // Fallback 2: Se não encontrou na Thread, busca no repositório global
      if (!targetFileId || !targetFileId.startsWith('file-')) {
        try {
          const filesList = await openai.files.list()
          const matchingFiles = filesList.data.filter(f => f.filename === fileName || f.filename.includes(fileName))
          
          if (matchingFiles.length > 0) {
            matchingFiles.sort((a, b) => b.created_at - a.created_at)
            targetFileId = matchingFiles[0].id
          }
        } catch (err) {
          console.error('Erro ao buscar arquivo pelo nome no repositório global:', err)
        }
      }

      // Se nenhum dos fallbacks encontrou o arquivo
      if (!targetFileId || !targetFileId.startsWith('file-')) {
        return NextResponse.json({ error: 'Não foi possível encontrar o arquivo correspondente na OpenAI' }, { status: 404 })
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
