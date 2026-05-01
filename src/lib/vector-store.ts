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
   * Usa vectorStores.files.uploadAndPoll que faz upload + vinculação + aguarda processamento.
   * @param vectorStoreId ID do Vector Store na OpenAI
   * @param file Arquivo do tipo File (Web API File/Blob do FormData)
   */
  uploadAndAttachFile: async (vectorStoreId: string, file: File) => {
    // O SDK v6 aceita File/Blob diretamente no uploadAndPoll
    // Este método faz tudo: upload do arquivo, vinculação ao vector store e polling até ficar pronto
    const vsFile = await openaiAnalista.vectorStores.files.uploadAndPoll(
      vectorStoreId,
      file
    )

    return {
      fileId: vsFile.id,
      status: vsFile.status
    }
  },

  /**
   * Remove um arquivo do Vector Store e da OpenAI.
   */
  deleteFile: async (vectorStoreId: string, fileId: string) => {
    // Remove do Vector Store
    await openaiAnalista.vectorStores.files.delete(vectorStoreId, fileId)
    // Remove o arquivo físico da OpenAI
    await openaiAnalista.files.delete(fileId)
  }
}
