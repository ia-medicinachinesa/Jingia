import Link from 'next/link'
import { Lock } from 'lucide-react'
import { AssistantConfig, canAccessAssistant } from '@/lib/assistants'
import { PlanId, PLAN_DISPLAY } from '@/lib/plans'
import { cn } from '@/lib/utils'

interface Props {
  assistant: AssistantConfig
  planId:    PlanId
}

export default function AssistantCard({ assistant, planId }: Props) {
  const hasAccess = canAccessAssistant(assistant.id, planId)

  // Encontra o plano mínimo necessário para exibir no CTA
  const requiredPlan = assistant.plans[0]
  const requiredPlanName = PLAN_DISPLAY[requiredPlan as keyof typeof PLAN_DISPLAY]?.name

  const card = (
    <div
      className={cn(
        'rounded-2xl border p-5 transition-all h-full flex flex-col',
        hasAccess
          ? 'border-gray-200 hover:border-brand-teal hover:shadow-md cursor-pointer bg-white'
          : 'border-gray-100 bg-gray-50 opacity-70 cursor-not-allowed'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-4xl drop-shadow-sm">{assistant.icon}</span>
        {!hasAccess && (
          <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full shadow-inner">
            <Lock size={12} strokeWidth={2.5} />
            {requiredPlanName}
          </span>
        )}
      </div>

      <h3 className="font-semibold text-gray-900 mb-2 truncate">{assistant.name}</h3>
      <p className="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-3">
        {assistant.description}
      </p>

      {!hasAccess && (
        <p className="text-xs text-brand-teal mt-4 font-medium flex items-center justify-between">
          Disponível no {requiredPlanName}
          <span className="text-lg">→</span>
        </p>
      )}
    </div>
  )

  // Assistentes bloqueados não são links
  if (!hasAccess) return card

  return (
    <Link href={`/dashboard/chat/${assistant.id}`} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-brand-teal rounded-2xl">
      {card}
    </Link>
  )
}
