import { cn } from '@/lib/utils'

interface Props {
  used:       number
  limit:      number
  showLabel?: boolean
  className?: string
}

export default function UsageBar({ used, limit, showLabel = false, className }: Props) {
  const percentage = Math.min((used / limit) * 100, 100)

  const barColor =
    percentage >= 90 ? 'bg-red-500' :
    percentage >= 70 ? 'bg-amber-400' :
    'bg-brand-preto dark:bg-brand-offwhite'

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Mensagens usadas</span>
          <span className={percentage >= 90 ? 'text-red-500 font-semibold' : ''}>
            {used} / {limit}
          </span>
        </div>
      )}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {!showLabel && (
        <p className="text-xs text-gray-400 mt-1">
          {used}/{limit} mensagens usadas este mês
        </p>
      )}
    </div>
  )
}
