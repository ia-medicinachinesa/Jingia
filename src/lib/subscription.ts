import { db } from '@/lib/db'
import { PLAN_LIMITS } from '@/lib/plans'

export interface SubscriptionInfo {
  isActive: boolean
  planId: string | null
  monthlyMessageCount: number
  messageLimit: number
  expiresAt: string | null
}

export async function checkSubscription(clerkUserId: string): Promise<SubscriptionInfo> {
  const user = await db.getUserByClerkId(clerkUserId)

  // Se o usuário não existe no banco (ainda não sincronizado pelo webhook)
  // Retornamos como inativo, o que forçará o redirecionamento
  if (!user) {
    return {
      isActive: false,
      planId: null,
      monthlyMessageCount: 0,
      messageLimit: 0,
      expiresAt: null
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
