import { cookies, headers } from 'next/headers'
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, Locale, normalizeLocale } from './config'
import { translate, TranslationKey } from './messages'

export function getLocale(): Locale {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value
  if (isLocale(cookieLocale)) return cookieLocale

  const acceptedLanguage = headers().get('accept-language')?.split(',')[0]
  return acceptedLanguage ? normalizeLocale(acceptedLanguage) : DEFAULT_LOCALE
}

export function getServerTranslator(locale = getLocale()) {
  return (key: TranslationKey, values?: Record<string, string | number>) =>
    translate(locale, key, values)
}

