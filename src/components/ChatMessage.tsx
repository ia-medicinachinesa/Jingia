import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  role:    'user' | 'assistant'
  content: string
}

export default function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex w-full animate-fade-in-up', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm overflow-hidden',
          isUser
            ? 'bg-brand-teal text-white rounded-tr-sm bg-gradient-to-br from-brand-teal to-brand-blue'
            : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm prose-slate max-w-none 
              prose-p:leading-relaxed prose-p:-mt-1 prose-p:mb-4 last:prose-p:mb-0
              prose-a:text-brand-teal prose-a:no-underline hover:prose-a:underline
              prose-strong:font-bold prose-strong:text-brand-blue
              prose-ul:list-disc prose-ul:pl-4 prose-ul:-mt-2 prose-ul:mb-4
              prose-ol:list-decimal prose-ol:pl-4 prose-ol:-mt-2 prose-ol:mb-4
              prose-li:mb-1
              prose-headings:text-brand-blue prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3
              prose-h1:text-xl
              prose-h2:text-lg
              prose-h3:text-base
              prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-gray-800
              prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

