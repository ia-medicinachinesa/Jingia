import { cn } from '@/lib/utils'
import { PlanId } from '@/lib/plans'

const BADGE_STYLES: Record<string, string> = {
  essencial:    'bg-slate-100   text-slate-600',
  profissional: 'bg-teal-100    text-teal-700',
  premium:      'bg-blue-100    text-blue-700',
  trial:        'bg-orange-100  text-orange-700',
}

const BADGE_LABELS: Record<string, string> = {
  essencial:    'Essencial',
  profissional: 'Profissional',
  premium:      'Premium',
  trial:        'Trial',
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
