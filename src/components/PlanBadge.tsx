import { cn } from '@/lib/utils'

const BADGE_STYLES: Record<string, string> = {
  essencial:    'bg-brand-aco/20 dark:bg-gray-800 text-brand-sombra dark:text-gray-400',
  profissional: 'bg-brand-preto dark:bg-gray-700 text-brand-offwhite shadow-sm',
}

const BADGE_LABELS: Record<string, string> = {
  essencial:    'Essencial',
  profissional: 'Profissional',
}

interface Props {
  planId:    string
  className?: string
}

export default function PlanBadge({ planId, className }: Props) {
  return (
    <span
      className={cn(
        'text-xs font-semibold px-3 py-1 rounded-full',
        BADGE_STYLES[planId] ?? 'bg-gray-100 text-gray-600',
        className
      )}
    >
      {BADGE_LABELS[planId] ?? planId}
    </span>
  )
}
