import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { checkSubscription } from '@/lib/subscription'
import { PLAN_DISPLAY } from '@/lib/plans'
import PlanBadge from '@/components/PlanBadge'
import UsageBar from '@/components/UsageBar'

export default async function PerfilPage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const subscription = await checkSubscription(user.id)
  const planId = subscription.planId ?? 'essencial'
  const plan = PLAN_DISPLAY[planId as keyof typeof PLAN_DISPLAY]

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Meu Perfil</h1>
        <p className="text-gray-500 mt-2">Gerencie suas informações e uso da assinatura.</p>
      </div>

      {/* Dados do usuário */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
        <h2 className="text-xs font-bold text-brand-teal uppercase tracking-widest mb-4">
          Informações Pessoais
        </h2>
        <div className="space-y-4 text-sm mt-6">
          <div className="flex justify-between items-center border-b border-gray-50 pb-4">
            <span className="text-gray-500">Nome</span>
            <span className="font-medium text-gray-900">{user.fullName ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">E-mail</span>
            <span className="font-medium text-gray-900">{user.emailAddresses[0]?.emailAddress ?? '—'}</span>
          </div>
        </div>
      </section>

      {/* Assinatura */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
        <h2 className="text-xs font-bold text-brand-teal uppercase tracking-widest mb-6">
          Assinatura e Uso
        </h2>
        <div className="flex items-center justify-between mb-6 bg-brand-light/30 p-4 rounded-xl border border-brand-light">
          <div>
            <p className="font-bold text-brand-blue text-lg mb-1">{plan?.name ?? 'Sem plano'}</p>
            <p className="text-sm text-gray-500">{plan?.price}</p>
          </div>
          <PlanBadge planId={planId} className="scale-110" />
        </div>

        {subscription.expiresAt && (
          <p className="text-xs text-gray-400 mb-6 bg-gray-50 p-2 rounded-lg inline-block border border-gray-100">
            Renova em: <strong className="text-gray-700">{new Date(subscription.expiresAt).toLocaleDateString('pt-BR')}</strong>
          </p>
        )}

        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <UsageBar
            used={subscription.monthlyMessageCount}
            limit={subscription.messageLimit}
            showLabel
          />
        </div>
      </section>

      {/* Aviso LGPD */}
      <section className="bg-gray-50 rounded-2xl border border-gray-100 p-6 flex flex-col gap-3">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Privacidade e Dados
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Armazenamos apenas e-mail, status da assinatura e histórico de conversas.
          Não armazenamos dados de pagamento (processados pela Hubla).
        </p>
        <p className="text-sm text-gray-500 leading-relaxed">
          Para solicitar exclusão dos seus dados, entre em contato pelo e-mail{' '}
          <a href="mailto:privacidade@jing.com.br" className="text-brand-teal font-medium hover:underline">
            privacidade@jing.com.br
          </a>
          . Prazo de atendimento: 15 dias úteis.
        </p>
      </section>
    </main>
  )
}
