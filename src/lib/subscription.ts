import { db } from '@/lib/db'
import { PLAN_LIMITS } from '@/lib/plans'

export interface SubscriptionInfo {
  isActive: boolean
  planId: string | null
  monthlyMessageCount: number
  messageLimit: number
  expiresAt: string | null
}

export async function checkSubscription(clerkUserId: string, email?: string): Promise<SubscriptionInfo> {
  let user = await db.getUserByClerkId(clerkUserId)

  if (!user && email) {
    // 1. Tenta encontrar pelo e-mail (caso o perfil tenha sido pré-provisionado pelo webhook da Hubla)
    user = await db.getUserByEmail(email)

    if (user) {
      // O perfil já existe (provavelmente com clerk_user_id = pending_...), então vamos apenas atualizar o clerk_user_id real.
      // Passamos {} no data para não sobrescrever a assinatura (subscription_status, plan_id, etc).
      try {
        user = await db.upsertUser(clerkUserId, email, {})
        console.info(`[SUBSCRIPTION] ✅ Perfil vinculado com sucesso: ${email} -> ${clerkUserId}`)
      } catch (err) {
        console.error('[SUBSCRIPTION] Erro ao vincular perfil:', err)
      }
    } else {
      // 2. Se não encontrou nem por clerk_user nem por e-mail, é um usuário 100% novo (ainda não pagou).
      try {
        user = await db.upsertUser(clerkUserId, email, {
          subscription_status: 'inactive',
          plan_id: null,
          monthly_message_count: 0,
        })
        console.info(`[SUBSCRIPTION] 🆕 Perfil provisionado automaticamente: ${email}`)
      } catch (err) {
        console.error('[SUBSCRIPTION] Erro ao provisionar perfil:', err)
      }
    }
  }

  if (!user) {
    return {
      isActive: false,
      planId: null,
      monthlyMessageCount: 0,
      messageLimit: 0,
      expiresAt: null,
    }
  }

  const isActive = user.subscription_status === 'active'
  const planId = user.plan_id ?? 'essencial'
  const messageLimit = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS] ?? 20

  return {
    isActive,
    planId,
    monthlyMessageCount: user.monthly_message_count,
    messageLimit,
    expiresAt: user.subscription_expires_at,
  }
}
