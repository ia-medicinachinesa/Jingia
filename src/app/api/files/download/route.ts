import { NextResponse } from 'next/server'
import { openai, openaiAnalista } from '@/lib/openai'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

function normalizeFileName(value: string) {
  try {
    value = decodeURIComponent(value)
  } catch {}

  return value
    .split('/')
    .pop()
    ?.trim()
    .toLowerCase()
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'xls': return 'application/vnd.ms-excel'
    case 'csv': return 'text/csv'
    case 'pdf': return 'application/pdf'
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'json': return 'application/json'
    case 'txt': return 'text/plain'
    default: return 'application/octet-stream'
  }
}

async function downloadContainerFile(containerId: string, fileId: string, name: string) {
  console.log("[download] Iniciando download do container sandboxed:", { containerId, fileId, name })
  
  const response = await fetch(
    `https://api.openai.com/v1/containers/${containerId}/files/${fileId}/content`,
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY_ANALISTA || process.env.OPENAI_API_KEY || ''}`,
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[download] Falha no download do container:", { status: response.status, errorText })
    return NextResponse.json(
      {
        error: "Falha ao baixar arquivo do container da OpenAI.",
        status: response.status,
        detail: errorText,
        containerId,
        fileId,
      },
      { status: response.status }
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  console.log("[download] Download do container concluído com sucesso!")

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": getMimeType(name),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  })
}

async function downloadAssistantFile(activeClient: OpenAI, fileId: string, name: string) {
  console.log("[download] Iniciando download de arquivo clássico da Assistants API. fileId:", fileId)
  const fileResponse = await activeClient.files.content(fileId)
  const arrayBuffer = await fileResponse.arrayBuffer()
  console.log("[download] Download de arquivo clássico concluído com sucesso!")

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": getMimeType(name),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  })
}

/**
 * GET /api/files/download?fileId=file-xxx&name=arquivo.xlsx
 * Proxy seguro para download de arquivos gerados pelo Code Interpreter da OpenAI.
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
    const containerId = searchParams.get('containerId')
    const fileName = searchParams.get('name') || 'download'
    const threadId = searchParams.get('threadId')

    console.log("[download] GET /api/files/download requisitado:", {
      fileId,
      containerId,
      fileName,
      threadId,
    })

    const isResponse = Boolean(threadId && threadId.startsWith('resp_'))
    const activeClient = isResponse ? openaiAnalista : openai

    // 1. Se possuir containerId e fileId de forma explícita, prioriza download via container sandboxed (Responses API)
    if (containerId && fileId) {
      return await downloadContainerFile(containerId, fileId, fileName)
    }

    // 2. Se possuir fileId direto e válido (do tipo file-xxx) sem containerId, prioriza download direto via Assistants API
    if (fileId && fileId.startsWith('file-')) {
      return await downloadAssistantFile(activeClient, fileId, fileName)
    }

    // 3. Fallback Contextual: se não temos fileId explícito na requisição, tentamos mapear via histórico da Thread ou Response
    if (threadId && fileName) {
      const wantedName = normalizeFileName(fileName)
      let resolvedFileId = ''
      let resolvedContainerId = ''

      console.log("[download] Sem IDs diretos válidos. Iniciando mapeamento contextual para:", wantedName)

      try {
        if (isResponse) {
          console.log("[download] Fluxo Responses API ativado para buscar IDs contextuais de Resposta:", threadId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const responseObj = await (openaiAnalista as any).responses.retrieve(threadId)
          const items = responseObj.output || []
          
          for (const item of items) {
            if (item.content) {
              for (const content of item.content) {
                if (content.type === 'text' && content.text?.annotations) {
                  for (const annot of content.text.annotations) {
                    const annotFileId = annot.file_id || annot.file_path?.file_id || annot.container_file_citation?.file_id
                    const annotContainerId = annot.container_id || annot.container_file_citation?.container_id
                    const annotFileNameStr = annot.filename || annot.text || ''
                    const annotFileName = normalizeFileName(annotFileNameStr)

                    if (annotFileId && annotFileName) {
                      if (
                        annotFileName === wantedName ||
                        annotFileNameStr.includes(fileName) ||
                        fileName.includes(annotFileNameStr)
                      ) {
                        resolvedFileId = annotFileId
                        resolvedContainerId = annotContainerId || ''
                        console.log("[download] Identificadores resolvidos com sucesso na Responses API:", { resolvedFileId, resolvedContainerId })
                        break
                      }
                    }
                  }
                }
                if (resolvedFileId) break
              }
            }
            if (resolvedFileId) break
          }
        } else {
          console.log("[download] Fluxo Assistants API clássico ativado para buscar IDs contextuais de Thread:", threadId)
          const messagesList = await openai.beta.threads.messages.list(threadId, { limit: 50 })
          
          for (const msg of messagesList.data) {
            for (const content of msg.content) {
              if (content.type === 'text' && content.text?.annotations) {
                for (const annot of content.text.annotations) {
                  if (annot.type === 'file_path') {
                    const annotFileId = annot.file_path.file_id
                    const annotFileNameStr = annot.text || ''
                    const annotFileName = normalizeFileName(annotFileNameStr)

                    if (
                      annotFileName === wantedName ||
                      annotFileNameStr.includes(fileName) ||
                      fileName.includes(annotFileNameStr)
                    ) {
                      resolvedFileId = annotFileId
                      console.log("[download] Identificador resolvido com sucesso na Thread:", resolvedFileId)
                      break
                    }
                  }
                }
              }
              if (resolvedFileId) break
            }
            if (resolvedFileId) break
          }
        }
      } catch (err) {
        console.error('[download] Erro no mapeamento contextual da conversa:', err)
      }

      // Se conseguimos resolver o fileId
      if (resolvedFileId) {
        if (resolvedContainerId) {
          return await downloadContainerFile(resolvedContainerId, resolvedFileId, fileName)
        } else {
          return await downloadAssistantFile(activeClient, resolvedFileId, fileName)
        }
      }

      // Fallback 4: Se o mapeamento contextual falhar, tenta como último recurso a listagem global
      console.log("[download] Mapeamento contextual falhou. Buscando no repositório global...")
      try {
        const filesList = await activeClient.files.list()
        const matchingFiles = filesList.data.filter(f => {
          const currentFileName = normalizeFileName(f.filename)
          return currentFileName === wantedName || f.filename.includes(fileName) || fileName.includes(f.filename)
        })
        
        if (matchingFiles.length > 0) {
          matchingFiles.sort((a, b) => b.created_at - a.created_at)
          const globalResolvedId = matchingFiles[0].id
          console.log("[download] Encontrado no repositório global. fileId:", globalResolvedId)
          return await downloadAssistantFile(activeClient, globalResolvedId, fileName)
        }
      } catch (err) {
        console.error('[download] Erro na busca global de fallback:', err)
      }

      // Se todos os caminhos falharem, retorna o JSON explicativo completo de diagnóstico
      console.warn("[download] Arquivo impossível de ser localizado.")
      return NextResponse.json({ 
        error: 'Arquivo não encontrado nas anotações da thread/conversa.',
        cause: 'A mensagem correspondente pode ter vindo de um fluxo de Responses API expirado, perdeu as annotations originais ou o Code Interpreter não chegou a gerar o arquivo binário na OpenAI.',
        name: fileName,
        normalizedWantedName: wantedName,
        threadId: threadId || 'não fornecido',
        isResponseFlow: isResponse,
        hint: 'Caso esteja gerando um arquivo dinâmico novo, verifique se a resposta de fato anexa as annotations correspondentes.'
      }, { status: 404 })
    }

    return NextResponse.json({ error: 'Parâmetros de requisição inválidos ou insuficientes' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao baixar arquivo da OpenAI:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: 'Erro ao baixar arquivo', details: message }, { status: 500 })
  }
}
