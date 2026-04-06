import Link from 'next/link'
import { Check } from 'lucide-react'
import { PLAN_DISPLAY } from '@/lib/plans'
import { cn } from '@/lib/utils'

// Substituir futuramente pelos links de checkout da Hubla
const CHECKOUT_URLS = {
  essencial:    process.env.NEXT_PUBLIC_CHECKOUT_ESSENCIAL    ?? '#',
  profissional: process.env.NEXT_PUBLIC_CHECKOUT_PROFISSIONAL ?? '#',
  premium:      process.env.NEXT_PUBLIC_CHECKOUT_PREMIUM      ?? '#',
}

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-light/50 to-white py-20 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Cabeçalho */}
        <div className="text-center mb-16">
          <Link href="/dashboard" className="inline-block text-brand-teal text-sm font-semibold mb-6 hover:underline">
            ← Voltar para a Clínica IA
          </Link>
          <h1 className="text-4xl font-bold text-brand-blue mb-4 tracking-tight">
            Nossos Planos
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Aumente a capacidade magnética da sua clínica com assistência médica baseada em IA de alta performance. Cancele quando quiser.
          </p>
        </div>

        {/* Grid de planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.entries(PLAN_DISPLAY).map(([planId, plan]) => (
            <div
              key={planId}
              className={cn(
                'rounded-3xl border-2 p-8 flex flex-col bg-white shadow-sm transition-all hover:shadow-xl relative',
                planId === 'profissional'
                  ? 'border-brand-teal ring-4 ring-brand-teal/10 scale-100 md:scale-105 z-10'  // Plano destacado
                  : 'border-gray-100 opacity-90 hover:opacity-100'
              )}
            >
              {/* Badge destaque */}
              {planId === 'profissional' && (
                <span className="absolute -top-4 inset-x-0 mx-auto w-fit text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-brand-teal to-brand-blue text-white px-4 py-1.5 rounded-full shadow-md">
                  Mais Recomendado
                </span>
              )}

              <h2 className="text-2xl font-bold text-gray-900 mt-2">{plan.name}</h2>
              <p className="text-sm text-gray-500 mt-2 mb-6 h-10">{plan.description}</p>

              <div className="mb-8">
                <span className="text-4xl font-extrabold text-brand-blue tracking-tight">{plan.price}</span>
              </div>

              {/* Lista de features */}
              <ul className="space-y-4 flex-1 mb-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                    <div className="bg-brand-light/50 p-1 rounded-full shrink-0">
                      <Check size={16} className="text-brand-teal" strokeWidth={3} />
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
                    ? 'bg-brand-teal text-white hover:bg-brand-blue shadow-lg hover:shadow-xl'
                    : 'bg-brand-light text-brand-blue hover:bg-brand-medium hover:text-white'
                )}
              >
                Assinar na Hubla
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-16 font-medium">
          Pagamento processado de forma 100% segura pela Hubla.<br/>A Jing IA não armazena dados de cartão.
        </p>
      </div>
    </main>
  )
}
