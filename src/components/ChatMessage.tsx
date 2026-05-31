'use client'

import { useRef, ComponentPropsWithoutRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Props {
  role:    'user' | 'assistant'
  content: string
}

interface CustomTableProps extends ComponentPropsWithoutRef<'table'> {
  node?: unknown
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CustomTable({ node, children, ...props }: CustomTableProps) {
  const tableRef = useRef<HTMLTableElement>(null)

  const handleExport = () => {
    if (!tableRef.current) return
    try {
      // Gera o workbook a partir do elemento de tabela DOM
      const wb = XLSX.utils.table_to_book(tableRef.current, { sheet: "Planilha Jing IA" })
      // Exporta e faz download automático do arquivo Excel .xlsx
      XLSX.writeFile(wb, "tabela_jing_ia.xlsx")
    } catch (error) {
      console.error("Erro ao exportar tabela para Excel:", error)
    }
  }

  return (
    <div className="my-6 relative border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-800/40">
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40">
        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Tabela de Resultados</span>
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-brand-preto dark:hover:text-brand-offwhite hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-all border border-gray-200 dark:border-gray-700 shadow-sm"
          title="Baixar dados como planilha Excel (.xlsx)"
        >
          <Download size={13} />
          Exportar Excel
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <table ref={tableRef} className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props}>
          {children}
        </table>
      </div>
    </div>
  )
}

interface CustomLinkProps extends ComponentPropsWithoutRef<'a'> {
  node?: unknown
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CustomLink({ node, ...props }: CustomLinkProps) {
  const searchParams = useSearchParams()
  const threadId = searchParams.get('thread')
  
  let href = props.href || ''
  
  // Intercepta qualquer URL que seja do sandbox ou contenha /mnt/data/
  const isSandbox = href.startsWith('sandbox:') || href.includes('/mnt/data/')
  
  if (isSandbox) {
    const fileName = href.split('/').pop() || 'download'
    if (threadId) {
      href = `/api/files/download?name=${encodeURIComponent(fileName)}&threadId=${encodeURIComponent(threadId)}`
    } else {
      // Se não houver threadId no contexto, exibe como indisponível (alucinação ou descontextualizado)
      return (
        <span 
          className="text-gray-400 dark:text-gray-500 italic line-through cursor-not-allowed inline-flex items-center gap-1"
          title="Este arquivo não pôde ser localizado ou a sessão expirou."
        >
          {props.children} (arquivo indisponível)
        </span>
      )
    }
  }

  const isDownload = href.startsWith('/api/files/download')
  if (isDownload && threadId && !href.includes('threadId=')) {
    href += `&threadId=${encodeURIComponent(threadId)}`
  }

  if (isDownload) {
    // Remove qualquer atributo target para permitir download nativo
    const restProps = { ...props }
    delete restProps.target
    return <a {...restProps} href={href} target="_self" rel="noopener noreferrer" />
  }
  
  return <a {...props} href={href} target="_blank" rel="noopener noreferrer" />
}

export default function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex w-full animate-fade-in-up', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm overflow-hidden',
          isUser
            ? 'bg-brand-preto text-white rounded-tr-sm bg-gradient-to-br from-brand-preto to-gray-800'
            : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm prose-slate max-w-none 
              prose-p:leading-relaxed prose-p:-mt-1 prose-p:mb-4 last:prose-p:mb-0
              prose-a:text-brand-sombra prose-a:underline hover:prose-a:text-brand-preto
              prose-strong:font-bold prose-strong:text-brand-preto dark:prose-strong:text-white
              prose-ul:list-disc prose-ul:pl-4 prose-ul:-mt-2 prose-ul:mb-4
              prose-ol:list-decimal prose-ol:pl-4 prose-ol:-mt-2 prose-ol:mb-4
              prose-li:mb-1
              prose-headings:text-brand-preto dark:prose-headings:text-white prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3
              prose-h1:text-xl
              prose-h2:text-lg
              prose-h3:text-base
              prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-gray-800
              prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              urlTransform={(value: string) => value}
              components={{
                table: CustomTable,
                a: CustomLink
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

