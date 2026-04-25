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

  // ── Provisão automática: se o usuário ainda não existe no Supabase,
  //    cria o registro usando os dados do Clerk.
  //    Isso garante que o webhook da Hubla sempre encontrará o usuário
  //    pelo e-mail, mesmo que o pagamento ocorra antes do primeiro login.
  if (!user && email) {
    try {
      user = await db.upsertUser(clerkUserId, email, {
        subscription_status: 'inactive',
        plan_id: null,
        monthly_message_count: 0,
      })
      console.info(`[SUBSCRIPTION] Perfil provisionado automaticamente: ${email}`)
    } catch (err) {
      console.error('[SUBSCRIPTION] Erro ao provisionar perfil:', err)
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
