import { openaiAnalista } from './openai'
import { supabaseAdmin } from './supabase'
import { db } from './db'

/**
 * Utilitário para gerenciar Vector Stores da OpenAI vinculados aos usuários do Jing IA.
 * Seguindo a Arquitetura 2026 para análise de artigos científicos.
 * 
 * SDK v6.34+ usa openai.vectorStores (root, não beta) e
 * openai.vectorStores.files.uploadAndPoll para upload direto.
 */
export const vectorStoreProvider = {
  /**
   * Obtém o ID do Vector Store do usuário ou cria um novo se não existir.
   * @param clerkUserId ID do usuário no Clerk
   */
  getOrCreateVectorStore: async (clerkUserId: string): Promise<string> => {
    const user = await db.getUserByClerkId(clerkUserId)
    
    if (!user) {
      throw new Error('Usuário não encontrado para criação de Vector Store')
    }

    if (user.vector_store_id) {
      return user.vector_store_id
    }

    // Criar na OpenAI (root-level, não beta)
    const vectorStore = await openaiAnalista.vectorStores.create({
      name: `JingIA_Store_${clerkUserId}`,
    })

    // Salvar no Supabase
    const { error } = await supabaseAdmin
      .from('users')
      .update({ 
        vector_store_id: vectorStore.id,
        updated_at: new Date().toISOString()
      })
      .eq('clerk_user_id', clerkUserId)

    if (error) {
      console.error('Erro ao salvar vector_store_id no Supabase:', error)
      throw error
    }

    return vectorStore.id
  },

  /**
   * Faz o upload de um arquivo e o anexa a um Vector Store.
   * Usa uploadAndPoll que faz upload + vinculação + AGUARDA indexação completa.
   * Isso garante que o file_search encontrará o conteúdo quando o usuário enviar a mensagem.
   * @param vectorStoreId ID do Vector Store na OpenAI
   * @param file Objeto de arquivo compatível com o SDK (OpenAI.Uploadable)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadAndAttachFile: async (vectorStoreId: string, file: any) => {
    // Upload + vinculação + aguarda indexação completa (polling automático)
    // Isso resolve o bug onde file_search retornava vazio porque o arquivo
    // ainda estava sendo indexado quando o usuário enviava a mensagem.
    const vsFile = await openaiAnalista.vectorStores.files.uploadAndPoll(
      vectorStoreId,
      file
    )

    console.log('Arquivo indexado no Vector Store:', vsFile.id, '| Status final:', vsFile.status)

    if (vsFile.status === 'failed') {
      console.error('Falha na indexação do arquivo:', vsFile.id, '| Erro:', vsFile.last_error)
      throw new Error(`Falha ao processar o arquivo: ${vsFile.last_error?.message || 'erro desconhecido'}`)
    }

    return {
      fileId: vsFile.id,
      status: vsFile.status
    }
  },

  /**
   * Remove um arquivo do Vector Store e da OpenAI.
   */
  deleteFile: async (vectorStoreId: string, fileId: string) => {
    // No SDK v6, este método usa argumentos posicionais (vs_id, file_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (openaiAnalista.vectorStores.files.delete as any)(vectorStoreId, fileId)

    // Já o files.delete padrão usa um objeto { file_id }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (openaiAnalista.files.delete as any)({ file_id: fileId })
  }
}
