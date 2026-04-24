import { Check } from 'lucide-react'
import { PLAN_DISPLAY } from '@/lib/plans'
import { cn } from '@/lib/utils'

// Substituir futuramente pelos links de checkout da Hubla
const CHECKOUT_URLS = {
  essencial:    process.env.NEXT_PUBLIC_CHECKOUT_ESSENCIAL    ?? '#',
  profissional: process.env.NEXT_PUBLIC_CHECKOUT_PROFISSIONAL ?? '#',
}

export default function PlanosPage() {
  return (
    <div className="max-w-6xl mx-auto pb-12 animate-fade-in-up">
      {/* Cabeçalho */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
          Nossos Planos
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          Aumente a capacidade magnética da sua clínica com assistência médica baseada em IA de alta performance.
        </p>
      </div>

      {/* Grid de planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
        {Object.entries(PLAN_DISPLAY).map(([planId, plan]) => (
          <div
            key={planId}
            className={cn(
              'rounded-3xl border p-8 flex flex-col transition-all relative',
              'bg-white/70 dark:bg-gray-800/40 backdrop-blur-md',
              planId === 'profissional'
                ? 'border-brand-preto ring-4 ring-brand-aco/30 dark:ring-gray-700 z-10'
                : 'border-gray-100 dark:border-white/10 opacity-95 hover:opacity-100 shadow-sm'
            )}
          >
            {/* Background Accent sutil */}
            {planId === 'profissional' && (
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-brand-aco/10 rounded-full blur-3xl" />
            )}

            {/* Badge destaque */}
            {planId === 'profissional' && (
              <span className="absolute -top-3.5 inset-x-0 mx-auto w-fit text-xs font-bold uppercase tracking-widest bg-brand-preto dark:bg-brand-offwhite dark:text-brand-preto text-white px-5 py-1.5 rounded-full shadow-lg">
                Mais Recomendado
              </span>
            )}

            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{plan.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-6 h-10">{plan.description}</p>

            <div className="mb-8">
              <span className="text-4xl font-extrabold text-brand-preto dark:text-white tracking-tight">{plan.price}</span>
            </div>

            {/* Lista de features */}
            <ul className="space-y-4 flex-1 mb-10">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-4 text-sm text-gray-600 dark:text-gray-300 font-medium leading-tight">
                  <div className="bg-brand-aco/20 dark:bg-gray-800 p-1 rounded-full shrink-0 border border-brand-aco/30">
                    <Check size={14} className="text-brand-preto dark:text-brand-offwhite" strokeWidth={3} />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href={CHECKOUT_URLS[planId as keyof typeof CHECKOUT_URLS]}
              className={cn(
                'block text-center py-4 px-6 rounded-2xl font-bold text-sm transition-all',
                planId === 'profissional'
                  ? 'bg-brand-preto text-white hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 shadow-lg hover:shadow-xl hover:-translate-y-1'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
            >
              Assinar na Hubla
            </a>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-16 font-medium">
        Pagamento processado de forma 100% segura pela Hubla.<br/>A Jing IA não armazena dados de cartão.
      </p>
    </div>
  )
}
