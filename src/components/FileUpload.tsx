'use client'

import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { Paperclip, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/client'

export interface FileUploadRef {
  uploadFile: (file: File) => Promise<void>
  reset: () => void
}

interface FileUploadProps {
  onUploadComplete: (vectorStoreId: string | undefined, fileId: string, fileName: string, fileType: 'image' | 'document') => void
  onReset?: () => void
  disabled?: boolean
  planId: string
}

const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(function FileUpload(
  { onUploadComplete, onReset, disabled, planId },
  ref
) {
  const { locale, t } = useI18n()
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isProfissional = planId === 'profissional'

  const processFile = async (file: File) => {
    // Validação básica de tamanho (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error(t('upload.tooLarge'), { description: t('upload.tooLargeDescription') })
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
      toast.error(t('upload.unsupported'), { description: t('upload.unsupportedDescription') })
      return
    }

    setFileName(file.name)
    setIsUploading(true)
    setStatus('uploading')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('locale', locale)

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMsg = data.upgradeRequired 
          ? t('upload.professionalOnly') 
          : (data.error || t('upload.failed'))
        throw new Error(errorMsg)
      }

      const data = await response.json()
      setStatus('success')
      
      toast.success(t('upload.ready'), { description: t('upload.readyDescription', { name: file.name }) })
      
      const fileType: 'image' | 'document' = data.fileType || (file.type.startsWith('image/') ? 'image' : 'document')
      // Notifica o componente pai com vectorStoreId (se houver), fileId, nome e tipo
      onUploadComplete(data.vectorStoreId, data.fileId, file.name, fileType)

    } catch (error) {
      setStatus('error')
      const msg = error instanceof Error ? error.message : t('upload.processingErrorDescription')
      toast.error(t('upload.processingError'), { description: msg })
      setFileName(null)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const reset = () => {
    setStatus('idle')
    setFileName(null)
    onReset?.()
  }

  useImperativeHandle(ref, () => ({
    uploadFile: processFile,
    reset,
  }))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  if (!isProfissional) {
    return (
      <button
        type="button"
        disabled
        className="p-3 text-gray-300 dark:text-gray-600 cursor-not-allowed transition-colors"
        title={t('upload.professionalOnly')}
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
          title={t('upload.attach')}
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
})

export default FileUpload
