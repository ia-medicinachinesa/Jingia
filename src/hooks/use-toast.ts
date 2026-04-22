import { toast as sonnerToast, toast } from 'sonner'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  description?: string
  duration?: number
}

function createToast(type: ToastType, message: string, options?: ToastOptions) {
  const defaultDurations: Record<ToastType, number> = {
    success: 3000,
    error: 5000,
    info: 4000,
    warning: 4000,
  }

  const icons: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  }

  return sonnerToast(message, {
    description: options?.description,
    duration: options?.duration ?? defaultDurations[type],
    icon: icons[type],
  })
}

export const useToast = {
  success: (message: string, options?: ToastOptions) =>
    createToast('success', message, options),

  error: (message: string, options?: ToastOptions) =>
    createToast('error', message, options),

  info: (message: string, options?: ToastOptions) =>
    createToast('info', message, options),

  warning: (message: string, options?: ToastOptions) =>
    createToast('warning', message, options),

  dismiss: (id?: string) => toast.dismiss(id),

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ) => toast.promise(promise, messages),
}

export { toast }