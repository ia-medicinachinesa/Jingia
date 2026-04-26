import { supabaseAdmin } from './supabase'

export interface UserRow {
  id:                      string
  clerk_user_id:           string
  email:                   string
  subscription_status:     string
  plan_id:                 string | null
  monthly_message_count:   number
  message_count_reset_at:  string | null
  subscription_expires_at: string | null
  crm:                     string | null
  specialty:               string | null
  created_at:              string
  updated_at:              string
}

export const db = {
  // Busca um usuário pelo ID do Clerk
  getUserByClerkId: async (clerkUserId: string) => {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (error && error.code !== 'PGRST116') { // Ignora "not found"
      console.error('Erro ao buscar usuário no Supabase:', error)
      throw error
    }
    return data as UserRow | null
  },

  // Busca um usuário pelo E-mail (usado em webhooks de pagamento)
  getUserByEmail: async (email: string) => {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .ilike('email', email)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }
    return data as UserRow | null
  },

  // Cria ou atualiza um usuário (Upsert)
  upsertUser: async (clerkUserId: string, email: string, data: Partial<UserRow>) => {
    const { data: result, error } = await supabaseAdmin
      .from('users')
      .upsert({
        clerk_user_id: clerkUserId,
        email,
        ...data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' })
      .select()
      .single()

    if (error) {
      console.error('Erro ao fazer upsert do usuário:', error)
      throw error
    }
    return result as UserRow
  },

  // Incrementa o contador de mensagens do mês
  incrementMessageCount: async (clerkUserId: string) => {
    const user = await db.getUserByClerkId(clerkUserId)
    if (!user) return

    // Se o reset_at já passou, zera o contador antes de incrementar
    const now = new Date()
    const resetAt = user.message_count_reset_at
      ? new Date(user.message_count_reset_at)
      : null

    if (!resetAt || now >= resetAt) {
      // Reseta e começa novo ciclo de 30 dias
      const nextReset = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      await supabaseAdmin
        .from('users')
        .update({
          monthly_message_count: 1,
          message_count_reset_at: nextReset.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('clerk_user_id', clerkUserId)
      return
    }

    // Incremento normal
    // Incremento atômico via RPC
    const { error: rpcError } = await supabaseAdmin.rpc('increment_message_count', {
      p_clerk_user_id: clerkUserId
    })

    if (rpcError) {
      console.warn('RPC increment_message_count falhou, usando fallback manual:', rpcError)
      // Fallback manual se a RPC não existir ou falhar
      await supabaseAdmin
        .from('users')
        .update({
          monthly_message_count: (user.monthly_message_count ?? 0) + 1,
          updated_at: now.toISOString()
        })
        .eq('clerk_user_id', clerkUserId)
    }
  },

  // ── Métodos de Assinatura (Hubla Webhooks) ──────────────────

  // Atualiza o status de assinatura de um usuário pelo e-mail
  updateSubscription: async (email: string, updates: {
    subscription_status: string
    plan_id?: string | null
    subscription_expires_at?: string | null
  }) => {
    const updateData: Record<string, unknown> = {
      subscription_status: updates.subscription_status,
      updated_at: new Date().toISOString(),
    }

    if (updates.plan_id !== undefined) {
      updateData.plan_id = updates.plan_id
    }
    if (updates.subscription_expires_at !== undefined) {
      updateData.subscription_expires_at = updates.subscription_expires_at
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('email', email)

    if (error) {
      console.error('Erro ao atualizar assinatura:', error)
      throw error
    }
  },

  // Registra evento de webhook na tabela de auditoria
  logSubscriptionEvent: async (eventData: {
    userId?: string | null
    eventType: string
    eventId: string
    payload: object
    status: 'success' | 'failed' | 'ignored'
    errorMessage?: string
  }) => {
    const { error } = await supabaseAdmin
      .from('subscription_events')
      .insert({
        user_id: eventData.userId ?? null,
        event_type: eventData.eventType,
        event_id: eventData.eventId,
        platform: 'hubla',
        payload: eventData.payload,
        status: eventData.status,
        error_message: eventData.errorMessage ?? null,
      })

    if (error) {
      // Não lançar exceção — o log de auditoria não deve quebrar o fluxo
      console.error('Erro ao registrar evento de assinatura:', error)
    }
  },

  // Verifica idempotência: retorna true se o evento já foi processado
  isEventProcessed: async (eventId: string): Promise<boolean> => {
    const { data, error } = await supabaseAdmin
      .from('subscription_events')
      .select('id')
      .eq('event_id', eventId)
      .limit(1)

    if (error) {
      console.error('Erro ao verificar idempotência:', error)
      return false // Em caso de erro, permite reprocessar (segurança)
    }

    return (data?.length ?? 0) > 0
  },
}

// ═══════════════════════════════════════════════════════════════
// THREADS — Persistência de conversas
// ═══════════════════════════════════════════════════════════════
export interface ThreadRow {
  id:               string
  user_id:          string
  assistant_id:     string
  openai_thread_id: string
  title:            string | null
  message_count:    number
  created_at:       string
  updated_at:       string
}

export const threads = {
  // Cria uma nova thread no banco
  create: async (userId: string, assistantId: string, openaiThreadId: string, title?: string) => {
    const { data, error } = await supabaseAdmin
      .from('threads')
      .insert({
        user_id: userId,
        assistant_id: assistantId,
        openai_thread_id: openaiThreadId,
        title: title ?? null,
        message_count: 1
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar thread:', error)
      throw error
    }
    return data as ThreadRow
  },

  // Incrementa o contador de mensagens de uma thread
  incrementCount: async (openaiThreadId: string) => {
    const { error: rpcError } = await supabaseAdmin.rpc('increment_thread_message_count', {
      p_openai_thread_id: openaiThreadId
    })

    if (rpcError) {
      console.warn('RPC increment_thread_message_count falhou, usando fallback manual:', rpcError)
      // Fallback manual seguro
      const { data } = await supabaseAdmin
        .from('threads')
        .select('message_count')
        .eq('openai_thread_id', openaiThreadId)
        .single()

      if (data) {
        await supabaseAdmin
          .from('threads')
          .update({ 
            message_count: (data.message_count ?? 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('openai_thread_id', openaiThreadId)
      }
    }
  },

  // Lista threads de um usuário (mais recentes primeiro)
  listByUser: async (userId: string) => {
    const { data, error } = await supabaseAdmin
      .from('threads')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erro ao listar threads:', error)
      throw error
    }
    return (data ?? []) as ThreadRow[]
  },

  // Busca thread pelo openai_thread_id
  getByOpenaiId: async (openaiThreadId: string) => {
    const { data, error } = await supabaseAdmin
      .from('threads')
      .select('*')
      .eq('openai_thread_id', openaiThreadId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as ThreadRow | null
  },

  // Exclui uma thread
  delete: async (threadId: string, userId: string) => {
    const { error } = await supabaseAdmin
      .from('threads')
      .delete()
      .eq('id', threadId)
      .eq('user_id', userId) // Segurança: só o dono pode apagar

    if (error) {
      console.error('Erro ao excluir thread:', error)
      throw error
    }
  },

  // Atualiza o título de uma thread
  updateTitle: async (openaiThreadId: string, title: string) => {
    await supabaseAdmin
      .from('threads')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('openai_thread_id', openaiThreadId)
  }
}
