import { NextResponse } from 'next/server'
import { openai, openaiAnalista } from '@/lib/openai'

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
    const isResponse = Boolean(threadId && threadId.startsWith('resp_'))
    const activeClient = isResponse ? openaiAnalista : openai

    if (!targetFileId || !targetFileId.startsWith('file-')) {
      // Fallback 1: Buscar o arquivo pesquisando nas mensagens da Thread ou do Response
      if (threadId) {
        try {
          if (isResponse) {
            // Fluxo Responses API: recuperar a resposta pelo ID do container sandboxed
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const responseObj = await (openaiAnalista as any).responses.retrieve(threadId)
            const items = responseObj.output || []
            for (const item of items) {
              if (item.content) {
                for (const content of item.content) {
                  if (content.type === 'text' && content.text?.annotations) {
                    for (const annot of content.text.annotations) {
                      // Suporte a file_citation, container_file_citation ou file_path
                      const annotFileId = annot.file_id || annot.file_path?.file_id || annot.container_file_citation?.file_id
                      const annotFileName = annot.filename || annot.text?.split('/').pop()
                      if (annotFileId && annotFileName) {
                        if (
                          annotFileName === fileName ||
                          annotFileName.includes(fileName) ||
                          fileName.includes(annotFileName)
                        ) {
                          targetFileId = annotFileId
                          break
                        }
                      }
                    }
                  }
                  if (targetFileId) break
                }
              }
              if (targetFileId) break
            }
          } else {
            // Fluxo Assistants API clássico: varrer histórico da thread
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
          }
        } catch (err) {
          console.error('Erro ao buscar arquivo por threadId/responseId:', err)
        }
      }

      // Fallback 2: Se não encontrou na Thread/Response, busca no repositório global
      if (!targetFileId || !targetFileId.startsWith('file-')) {
        try {
          const filesList = await activeClient.files.list()
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

    // Busca o conteúdo binário do arquivo na OpenAI usando o cliente adequado
    const fileResponse = await activeClient.files.content(targetFileId)
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
