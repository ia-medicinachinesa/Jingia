export const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'pt-BR'
export const LOCALE_COOKIE = 'jingia-locale'

export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
  es: 'Español',
}

export const INTL_LOCALES: Record<Locale, string> = {
  'pt-BR': 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale)
}

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return DEFAULT_LOCALE

  const normalized = value.toLowerCase()
  if (normalized.startsWith('pt')) return 'pt-BR'
  if (normalized.startsWith('es')) return 'es'
  if (normalized.startsWith('en')) return 'en'
  return DEFAULT_LOCALE
}

