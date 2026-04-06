import { db } from '@/lib/db'
import { PLAN_LIMITS } from '@/lib/plans'

export interface SubscriptionInfo {
  isActive: boolean
  planId: string | null
  monthlyMessageCount: number
  messageLimit: number
  expiresAt: Date | null
}

export async function checkSubscription(clerkUserId: string): Promise<SubscriptionInfo> {
  const user = await db.query(
    `SELECT subscription_status, plan_id, monthly_message_count, subscription_expires_at
     FROM users WHERE clerk_user_id = $1`,
    [clerkUserId]
  )

  if (!user.rows[0]) {
    return { isActive: false, planId: null, monthlyMessageCount: 0, messageLimit: 0, expiresAt: null }
  }

  const row = user.rows[0]
  const isActive = row.subscription_status === 'active'
  const planId = row.plan_id ?? 'essencial'
  const messageLimit = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS] ?? 50

  return {
    isActive,
    planId,
    monthlyMessageCount: row.monthly_message_count,
    messageLimit,
    expiresAt: row.subscription_expires_at,
  }
}
