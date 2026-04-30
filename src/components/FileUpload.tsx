'use client'

import { useState, useRef } from 'react'
import { Paperclip, X, FileIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onUploadComplete: (vectorStoreId: string, fileId: string, fileName: string) => void
  disabled?: boolean
  planId: string
}

export default function FileUpload({ onUploadComplete, disabled, planId }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isProfissional = planId === 'profissional'

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validação básica
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande', { description: 'O limite para análise é de 20MB.' })
      return
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado', { description: 'Por favor, envie PDF, DOCX ou TXT.' })
      return
    }

    setFileName(file.name)
    setIsUploading(true)
    setStatus('uploading')
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulação de progresso inicial (já que o fetch padrão não tem onProgress fácil)
      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 10 : prev))
      }, 500)

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha no upload')
      }

      const data = await response.json()
      setProgress(100)
      setStatus('success')
      
      toast.success('Documento pronto', { description: `${file.name} foi processado com sucesso.` })
      
      // Notifica o pai
      onUploadComplete(data.vectorStoreId, data.fileId, file.name)

    } catch (error) {
      setStatus('error')
      const msg = error instanceof Error ? error.message : 'Erro ao processar arquivo'
      toast.error('Erro no processamento', { description: msg })
      setFileName(null)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const reset = () => {
    setStatus('idle')
    setFileName(null)
    setProgress(0)
  }

  if (!isProfissional) {
    return (
      <button
        type="button"
        disabled
        className="p-3 text-gray-300 dark:text-gray-600 cursor-not-allowed transition-colors"
        title="Disponível apenas no Plano Profissional"
      >
        <Paperclip size={20} />
      </button>
    )
  }

  return (
    <div className="relative flex items-center">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
        className="hidden"
        disabled={disabled || isUploading}
      />

      {status === 'idle' && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className={cn(
            "p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all",
            "hover:text-brand-preto dark:hover:text-brand-offwhite"
          )}
          title="Anexar arquivo ou imagem para análise"
        >
          <Paperclip size={20} />
        </button>
      )}

      {status !== 'idle' && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border animate-in fade-in slide-in-from-left-2 duration-300",
          status === 'uploading' && "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50",
          status === 'success' && "bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-800/50",
          status === 'error' && "bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50"
        )}>
          {status === 'uploading' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
          {status === 'success' && <CheckCircle2 size={16} className="text-green-500" />}
          {status === 'error' && <AlertCircle size={16} className="text-red-500" />}
          
          <span className="text-xs font-medium max-w-[120px] truncate text-gray-700 dark:text-gray-300">
            {fileName}
          </span>

          <button 
            type="button"
            onClick={reset}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={14} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
          </button>
        </div>
      )}
    </div>
  )
}
