import { openaiAnalista } from './openai'
import { supabaseAdmin } from './supabase'
import { db } from './db'

/**
 * Utilitário para gerenciar Vector Stores da OpenAI vinculados aos usuários do Jing IA.
 * Seguindo a Arquitetura 2026 para análise de artigos científicos.
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

    // Criar na OpenAI
    // Usamos o prefixo "JingIA_" para facilitar a identificação no dashboard
    const vectorStore = await (openaiAnalista as any).vectorStores.create({
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
   * @param vectorStoreId ID do Vector Store na OpenAI
   * @param file Arquivo do tipo File (do Buffer ou FormData)
   */
  uploadAndAttachFile: async (vectorStoreId: string, file: File) => {
    // 1. Upload do arquivo para a OpenAI com o propósito correto para 2026
    // Nota: O SDK da OpenAI pode exigir um formato específico para o arquivo (ex: fs.ReadStream ou Buffer)
    // No Next.js, 'file' costuma ser um Blob/File.
    
    const openaiFile = await openaiAnalista.files.create({
      file: file,
      purpose: 'responses' as any, // Conforme Arquitetura 2026
    })

    // 2. Anexar ao Vector Store
    const fileBatch = await (openaiAnalista as any).vectorStores.fileBatches.create(
      vectorStoreId,
      {
        file_ids: [openaiFile.id]
      }
    )

    return {
      fileId: openaiFile.id,
      batchId: fileBatch.id
    }
  },

  /**
   * Remove um arquivo do Vector Store e da OpenAI.
   */
  deleteFile: async (vectorStoreId: string, fileId: string) => {
    // Remove do Vector Store
    await (openaiAnalista as any).vectorStores.files.del(vectorStoreId, fileId)
    // Remove o arquivo físico
    await openaiAnalista.files.delete(fileId)
  }
}
