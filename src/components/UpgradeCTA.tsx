import Link from 'next/link'
import { Zap } from 'lucide-react'
import { PlanId } from '@/lib/plans'
import { cn } from '@/lib/utils'

// Próximo plano recomendado para upgrade
const NEXT_PLAN: Partial<Record<PlanId, string>> = {
  essencial: 'profissional',
}

interface Props {
  currentPlan: PlanId
  className?:  string
}

export default function UpgradeCTA({ currentPlan, className }: Props) {
  const nextPlan = NEXT_PLAN[currentPlan]
  if (!nextPlan) return null // Premium já está no topo

  return (
    <div className={cn('bg-brand-light border border-brand-medium rounded-xl p-4', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Zap size={16} className="text-brand-teal" />
        <span className="text-sm font-semibold text-brand-blue">
          Limite de mensagens atingido
        </span>
      </div>
      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
        Faça upgrade para o plano{' '}
        <strong className="capitalize text-brand-teal">{nextPlan}</strong>{' '}
        e continue usando seus assistentes sem interrupção.
      </p>
      {/* Aqui apontamos para a Hubla caso os links estejam na /planos */}
      <Link
        href="/planos"
        className="inline-block text-xs font-semibold bg-brand-teal text-white px-4 py-2 rounded-lg hover:bg-brand-blue transition-colors shadow-sm"
      >
        Ver planos e assinar →
      </Link>
    </div>
  )
}
