import Link from 'next/link'
import { Lock, Clock, Sparkles, FileText, Target, Ear, Zap, Activity, BookOpen, Megaphone, LucideIcon } from 'lucide-react'
import { AssistantConfig, canAccessAssistant } from '@/lib/assistants'
import { PlanId, PLAN_DISPLAY } from '@/lib/plans'
import { cn } from '@/lib/utils'

// Mapeamento de Ícones Fine-Line para os Assistentes
const ASSISTANT_ICONS: Record<string, LucideIcon> = {
  'ASS-01': Sparkles,
  'ASS-02': FileText,
  'ASS-03': Target,
  'ASS-04': Ear,
  'ASS-05': Zap,
  'ASS-06': Activity,
  'ASS-07': BookOpen,
  'ASS-08': Megaphone,
}

interface Props {
  assistant: AssistantConfig
  planId:    PlanId
}

export default function AssistantCard({ assistant, planId }: Props) {
  const hasAccess = canAccessAssistant(assistant.id, planId)
  const isConfigured = assistant.openaiId && !assistant.openaiId.includes('placeholder')

  // Encontra o plano mínimo necessário para exibir no CTA
  const requiredPlan = assistant.plans[0]
  const requiredPlanName = PLAN_DISPLAY[requiredPlan as keyof typeof PLAN_DISPLAY]?.name

  const AssistantIcon = ASSISTANT_ICONS[assistant.id] || Sparkles

  const card = (
    <div
      className={cn(
        'rounded-2xl border p-6 transition-all duration-300 h-full flex flex-col animate-fade-in-up group relative overflow-hidden',
        'backdrop-blur-sm',
        !isConfigured
          ? 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-950/40 opacity-60 cursor-default'
          : hasAccess
            ? 'border-white/60 dark:border-white/10 bg-white/70 dark:bg-gray-800/40 hover:border-brand-sombra/50 dark:hover:border-brand-sombra/50 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
            : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-gray-800/20 opacity-70 cursor-not-allowed'
      )}
    >
      {/* Background Decorativo sutil */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-aco/10 rounded-full blur-3xl group-hover:bg-brand-aco/20 transition-colors" />

      <div className="flex items-start justify-between mb-6">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm",
          hasAccess 
            ? "bg-gradient-to-br from-gray-100 to-gray-200 text-brand-preto dark:bg-gray-800 dark:from-gray-800 dark:to-gray-700 dark:text-brand-offwhite group-hover:scale-110 group-hover:rotate-3"
            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
        )}>
          <AssistantIcon size={24} strokeWidth={1.5} />
        </div>
        
        <div className="flex gap-2">
          {requiredPlan === 'profissional' && (
            <span className="flex items-center px-2 py-1 text-[10px] uppercase font-black tracking-widest text-white bg-brand-preto dark:bg-brand-offwhite dark:text-brand-preto rounded-md shadow-sm">
              PRO
            </span>
          )}

          {!isConfigured ? (
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
              <Clock size={12} strokeWidth={2.5} />
              Em breve
            </span>
          ) : !hasAccess ? (
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-lg shadow-inner">
              <Lock size={12} strokeWidth={2.5} />
              Bloqueado
            </span>
          ) : null}
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 truncate group-hover:text-brand-preto dark:group-hover:text-brand-offwhite transition-colors">{assistant.name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed flex-1 line-clamp-3">
        {assistant.description}
      </p>

      {!isConfigured ? (
        <p className="text-xs text-amber-600 dark:text-amber-500/80 mt-4 font-medium italic">
          Este assistente será ativado em breve
        </p>
      ) : !hasAccess && (
        <p className="text-xs text-brand-preto dark:text-brand-offwhite mt-4 font-medium flex items-center justify-between">
          Disponível no {requiredPlanName}
          <span className="text-lg">→</span>
        </p>
      )}
    </div>
  )

  // Assistentes não configurados ou bloqueados não são links
  if (!isConfigured || !hasAccess) return card

  return (
    <Link href={`/dashboard/chat/${assistant.id}`} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-brand-preto dark:focus-visible:ring-brand-offwhite rounded-2xl">
      {card}
    </Link>
  )
}

