import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'
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
    
    // Bloqueia quem não comprou nada e tenta acessar a plataforma
    if (!subscription.isActive) {
      redirect('/dashboard/planos')
    }

    planId = (subscription.planId ?? 'essencial') as PlanId
  }

  const baseAssistant = ASSISTANTS.find(a => a.id === 'ASS-01')
  const proAssistants = ASSISTANTS.filter(a => a.id !== 'ASS-01')

  // Agrupa assistentes pro por categoria
  const proCategories = Array.from(new Set(proAssistants.map(a => a.category)))

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Clínica IA</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Selecione um assistente especializado para iniciar.</p>
      </div>

      {/* JING IA BASE */}
      {baseAssistant && (
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-sm font-semibold text-brand-preto dark:text-brand-offwhite uppercase tracking-widest bg-brand-aco/10 dark:bg-brand-sombra/20 px-4 py-1.5 rounded-full inline-block">
              Jing IA
            </h2>
            <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AssistantCard assistant={baseAssistant} planId={planId} />
          </div>
        </section>
      )}

      {/* SEPARADOR JING IA PRO */}
      <div className="mb-12 text-center relative">
         <div className="absolute inset-0 flex items-center">
           <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
         </div>
         <div className="relative flex justify-center">
           <span className="bg-brand-preto text-white dark:bg-brand-offwhite dark:text-brand-preto px-6 py-2.5 text-lg font-black tracking-widest rounded-xl shadow-md uppercase">
             Jing IA PRO
           </span>
         </div>
      </div>

      {/* CATEGORIAS PRO */}
      {proCategories.map(category => (
        <section key={category} className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-gray-800/50 px-4 py-1.5 rounded-full inline-block">
              {category}
            </h2>
            <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {proAssistants.filter(a => a.category === category).map(assistant => (
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
