import { redirect } from 'next/navigation'
import { checkSubscription } from '@/lib/subscription'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar planId={planId} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader
          userName={userName}
          planId={planId}
          messagesUsed={messagesUsed}
          messagesLimit={messagesLimit}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  )
}
