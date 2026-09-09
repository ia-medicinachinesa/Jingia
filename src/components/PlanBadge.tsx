'use client'

import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/client'
import { getLocalizedPlanDisplay } from '@/lib/plans'

const BADGE_STYLES: Record<string, string> = {
  essencial:    'bg-brand-aco/20 dark:bg-gray-800 text-brand-sombra dark:text-gray-400',
  profissional: 'bg-brand-preto dark:bg-gray-700 text-brand-offwhite shadow-sm',
}

interface Props {
  planId:    string
  className?: string
}

export default function PlanBadge({ planId, className }: Props) {
  const { locale } = useI18n()
  const labels = getLocalizedPlanDisplay(locale)
  return (
    <span
      className={cn(
        'text-xs font-semibold px-3 py-1 rounded-full',
        BADGE_STYLES[planId] ?? 'bg-gray-100 text-gray-600',
        className
      )}
    >
      {labels[planId as keyof typeof labels]?.name ?? planId}
    </span>
  )
}
