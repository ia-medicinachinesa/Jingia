import { PLAN_DISPLAY } from '@/lib/plans'
import PlanBadge from '@/components/PlanBadge'
import UsageBar from '@/components/UsageBar'
import ProfileForm from './ProfileForm'
import { db, threads } from '@/lib/db'
import { redirect } from 'next/navigation'
import { checkSubscription } from '@/lib/subscription'
import { Briefcase, User } from 'lucide-react'

export default async function PerfilPage() {
  const { currentUser, auth } = await import('@clerk/nextjs/server')
  const { userId: clerkId } = await auth()
  
  if (!clerkId) redirect('/sign-in')
  
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const subscription = await checkSubscription(clerkId)
  const planId = subscription.planId ?? 'essencial'
  const plan = PLAN_DISPLAY[planId as keyof typeof PLAN_DISPLAY]

  // Busca o ID interno do usuário no banco para evitar erro de UUID nas threads
  const dbUser = await db.getUserByClerkId(clerkId)
  
  // Metadados do Clerk
  const metadata = user.publicMetadata as { crm?: string; specialty?: string }
  
  // Estatísticas de Uso
  const userThreads = dbUser ? await threads.listByUser(dbUser.id) : []
  const totalConversas = userThreads.length
  const totalMensagens = userThreads.reduce((acc, t) => acc + (t.message_count || 0), 0)

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in-up">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Meu Perfil</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Gerencie suas informações e uso da assinatura.</p>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <ProfileForm 
            initialCrm={dbUser?.crm || metadata.crm || ''} 
            initialSpecialty={dbUser?.specialty || metadata.specialty || ''} 
          />
          
          {/* Aviso LGPD */}
          <section className="bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-white/5 p-6 flex flex-col gap-3">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
              Privacidade e Dados
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Armazenamos apenas e-mail, status da assinatura e histórico de conversas.
              Não armazenamos dados de pagamento (processados pela Hubla).
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Para solicitar exclusão dos seus dados, entre em contato pelo e-mail{' '}
              <a href="mailto:privacidade@jing.com.br" className="text-brand-teal font-medium hover:underline">
                privacidade@jing.com.br
              </a>
              .
            </p>
          </section>
        </div>

        <div className="space-y-6">
          {/* Assinatura */}
          <section className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
            <h2 className="text-xs font-bold text-brand-teal uppercase tracking-widest mb-6">
              Plano Atual
            </h2>
            <div className="flex flex-col items-center text-center p-4 bg-gray-50/50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-white/5 mb-6">
              <PlanBadge planId={planId} className="scale-125 mb-4" />
              <p className="font-bold text-gray-900 dark:text-gray-100 text-xl">{plan?.name ?? 'Sem plano'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{plan?.price}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400 uppercase font-semibold">Mensagens do Mês</span>
                <span className="text-brand-teal font-bold">{subscription.monthlyMessageCount} / {subscription.messageLimit}</span>
              </div>
              <UsageBar
                used={subscription.monthlyMessageCount}
                limit={subscription.messageLimit}
                showLabel={false}
              />
            </div>

             {subscription.expiresAt && (
              <div className="mt-8 pt-6 border-t border-gray-50 dark:border-white/5">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-tighter mb-1">Próxima Renovação</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {new Date(subscription.expiresAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </section>

          {/* Insights Rápidos */}
          <section className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">
              Insights de Uso
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalConversas}</span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Total de Casos</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                   <Briefcase size={20} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalMensagens}</span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Mensagens Trocadas</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <User size={20} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
