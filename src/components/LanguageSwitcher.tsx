'use client'

import { useState } from 'react'
import { Languages } from 'lucide-react'
import { useI18n } from '@/i18n/client'
import { LOCALE_LABELS, Locale, SUPPORTED_LOCALES } from '@/i18n/config'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from '@/components/ui/select'

const LOCALE_DETAILS: Record<Locale, { flag: string; code: string }> = {
  'pt-BR': { flag: '🇧🇷', code: 'PT-BR' },
  en: { flag: '🇺🇸', code: 'EN-US' },
  es: { flag: '🇪🇸', code: 'ES' },
}

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n()
  const [isChanging, setIsChanging] = useState(false)

  async function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) return
    setIsChanging(true)

    try {
      const response = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: nextLocale }),
      })
      if (!response.ok) throw new Error('Unable to update locale')
      window.location.reload()
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className={cn('inline-flex', className)}>
      <Select
        value={locale}
        disabled={isChanging}
        onValueChange={(value) => changeLocale(value as Locale)}
      >
        <SelectTrigger
          aria-label={t('language.label')}
          className="h-9 min-w-[116px] gap-2 rounded-xl border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 shadow-sm transition-all hover:-translate-y-px hover:border-gray-300 hover:bg-gray-50 hover:shadow-md focus-visible:border-brand-preto focus-visible:ring-2 focus-visible:ring-brand-preto/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-700 dark:focus-visible:border-brand-offwhite dark:focus-visible:ring-brand-offwhite/15"
        >
          <Languages size={16} className="text-brand-sombra dark:text-brand-aco" aria-hidden="true" />
          <span className="flex-1 text-left">{LOCALE_LABELS[locale]}</span>
        </SelectTrigger>

        <SelectContent
          align="end"
          alignItemWithTrigger={false}
          sideOffset={8}
          className="w-52 rounded-2xl border border-gray-200/80 bg-white/95 p-1.5 shadow-2xl shadow-black/10 backdrop-blur-xl ring-1 ring-black/[0.03] dark:border-gray-700 dark:bg-gray-800/95 dark:shadow-black/40 dark:ring-white/[0.04]"
        >
          <SelectGroup>
            <SelectLabel className="px-2.5 pb-2 pt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              {t('language.label')}
            </SelectLabel>
            <SelectSeparator className="mx-1 mb-1.5 bg-gray-100 dark:bg-gray-700" />
            {SUPPORTED_LOCALES.map((item) => (
              <SelectItem
                key={item}
                value={item}
                className="rounded-xl py-2.5 pl-2.5 pr-9 text-gray-700 transition-colors focus:bg-brand-aco/15 focus:text-brand-preto data-selected:bg-brand-aco/10 dark:text-gray-200 dark:focus:bg-white/10 dark:focus:text-white dark:data-selected:bg-white/[0.07]"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-gray-50 text-lg shadow-sm ring-1 ring-gray-200/70 dark:bg-gray-900/60 dark:ring-gray-700">
                  {LOCALE_DETAILS[item].flag}
                </span>
                <span className="flex min-w-0 flex-col items-start gap-0">
                  <span className="font-semibold leading-4">{LOCALE_LABELS[item]}</span>
                  <span className="text-[10px] font-medium tracking-wider text-gray-400 dark:text-gray-500">
                    {LOCALE_DETAILS[item].code}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
