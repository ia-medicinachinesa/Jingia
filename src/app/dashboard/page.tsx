import { redirect } from 'next/navigation'
import { checkSubscription } from '@/lib/subscription'
import { ASSISTANTS } from '@/lib/assistants'
import AssistantCard from '@/components/AssistantCard'
import { PlanId } from '@/lib/plans'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

export default async function DashboardPage() {
  let planId: PlanId = 'profissional'

  if (isClerkConfigured) {
    const { currentUser } = await import('@clerk/nextjs/server')
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const subscription = await checkSubscription(user.id)
    planId = (subscription.planId ?? 'essencial') as PlanId
  }

  // Agrupa assistentes por categoria
  const categories = [...new Set(ASSISTANTS.map(a => a.category))]

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clínica IA</h1>
        <p className="text-gray-500 mt-2 text-lg">Selecione um assistente especializado para iniciar.</p>
      </div>

      {categories.map(category => (
        <section key={category} className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-sm font-semibold text-brand-teal uppercase tracking-widest bg-brand-light px-4 py-1.5 rounded-full inline-block">
              {category}
            </h2>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {ASSISTANTS.filter(a => a.category === category).map(assistant => (
              <AssistantCard
                key={assistant.id}
                assistant={assistant}
                planId={planId}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
