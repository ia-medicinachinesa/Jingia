'use client'

import { createContext, useCallback, useContext } from 'react'
import { Locale } from './config'
import type { Messages, TranslationKey } from './messages'

interface I18nContextValue {
  locale: Locale
  messages: Messages
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  children,
  locale,
  messages,
}: I18nContextValue & { children: React.ReactNode }) {
  return <I18nContext.Provider value={{ locale, messages }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  const t = useCallback(
    (key: TranslationKey, values: Record<string, string | number> = {}) => {
      if (!context) throw new Error('useI18n must be used inside I18nProvider')
      return Object.entries(values).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        context.messages[key],
      )
    },
    [context],
  )

  if (!context) throw new Error('useI18n must be used inside I18nProvider')

  return {
    locale: context.locale,
    messages: context.messages,
    t,
  }
}
