import { redirect } from 'next/navigation'
import { checkSubscription } from '@/lib/subscription'
import DashboardShell from '@/components/DashboardShell'
import { PlanId } from '@/lib/plans'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let userName = 'Dev'
  let planId: PlanId = 'profissional'
  let messagesUsed = 5
  let messagesLimit = 200

  if (isClerkConfigured) {
    // Importação dinâmica para evitar crash quando Clerk não está configurado
    const { currentUser } = await import('@clerk/nextjs/server')
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const subscription = await checkSubscription(user.id)
    userName = user.firstName ?? 'Usuário'
    planId = (subscription.planId ?? 'essencial') as PlanId
    messagesUsed = subscription.monthlyMessageCount
    messagesLimit = subscription.messageLimit
  }

  return (
    <DashboardShell
      userName={userName}
      planId={planId}
      messagesUsed={messagesUsed}
      messagesLimit={messagesLimit}
    >
      {children}
    </DashboardShell>
  )
}

