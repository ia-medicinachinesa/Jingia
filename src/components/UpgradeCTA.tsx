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
    <div className={cn('bg-brand-offwhite border border-brand-aco/30 dark:bg-gray-800/50 dark:border-gray-700 rounded-xl p-4', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Zap size={16} className="text-brand-preto dark:text-brand-offwhite" />
        <span className="text-sm font-semibold text-brand-preto dark:text-gray-200">
          Limite de mensagens atingido
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
        Faça upgrade para o plano{' '}
        <strong className="capitalize text-brand-preto dark:text-white">{nextPlan}</strong>{' '}
        e continue usando seus assistentes sem interrupção.
      </p>
      {/* Aqui apontamos para a Hubla caso os links estejam na /planos */}
      <Link
        href="/dashboard/planos"
        className="inline-block text-xs font-semibold bg-brand-preto dark:bg-brand-offwhite dark:text-brand-preto text-white px-4 py-2 rounded-lg hover:bg-black transition-colors shadow-sm"
      >
        Ver planos e assinar →
      </Link>
    </div>
  )
}
