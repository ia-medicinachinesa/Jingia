import { redirect, notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'
import { checkSubscription } from '@/lib/subscription'
import { getLocalizedAssistant, canAccessAssistant } from '@/lib/assistants'
import { PlanId } from '@/lib/plans'
import ChatInterface from './ChatInterface'
import { getLocale } from '@/i18n/server'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

interface Props {
  params: { assistantId: string }
  searchParams: { conversation?: string; thread?: string }
}

export default async function ChatPage({ params, searchParams }: Props) {
  const locale = getLocale()
  let userId = 'dev_123'

  if (isClerkConfigured) {
    const { currentUser } = await import('@clerk/nextjs/server')
    const user = await currentUser()
    if (!user) redirect('/sign-in')
    userId = user.id
  }

  const subscription = await checkSubscription(userId)
  
  // Bloqueia quem tentar acessar a URL do chat diretamente sem ter plano
  if (!subscription.isActive) {
    redirect('/dashboard/planos')
  }

  const planId = (subscription.planId ?? 'essencial') as PlanId
  const assistant = getLocalizedAssistant(params.assistantId, locale)

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
          initialConversationId={searchParams.conversation ?? null}
          initialLegacyThreadId={searchParams.thread ?? null}
        />
    </div>
  )
}

