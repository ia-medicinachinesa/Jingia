import { currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { checkSubscription } from '@/lib/subscription'
import { ASSISTANTS, canAccessAssistant } from '@/lib/assistants'
import { PlanId } from '@/lib/plans'
import ChatInterface from './ChatInterface'

interface Props {
  params: { assistantId: string }
}

export default async function ChatPage({ params }: Props) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const subscription = await checkSubscription(user.id)
  
  // Em prod: Descomentar
  // if (!subscription.isActive) redirect('/planos?reason=no-subscription')

  const planId = (subscription.planId ?? 'essencial') as PlanId
  const assistant = ASSISTANTS.find(a => a.id === params.assistantId)

  // Assistente não existe
  if (!assistant) notFound()

  // Plano não tem acesso a esse assistente
  if (!canAccessAssistant(params.assistantId, planId)) {
    redirect('/dashboard?reason=plan-required')
  }

  return (
    <div className="h-full">
        <ChatInterface
          assistant={assistant}
          planId={planId}
          messagesUsed={subscription.monthlyMessageCount}
          messagesLimit={subscription.messageLimit}
        />
    </div>
  )
}
