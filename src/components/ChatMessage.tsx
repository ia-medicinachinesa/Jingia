import { cn } from '@/lib/utils'

interface Props {
  role:    'user' | 'assistant'
  content: string
}

export default function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'bg-brand-teal text-white rounded-tr-sm bg-gradient-to-br from-brand-teal to-brand-blue'
            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
        )}
      >
        {content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
