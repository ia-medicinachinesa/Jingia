import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { enUS, esES, ptBR } from '@clerk/localizations'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'
import { cn } from "@/lib/utils"
import { I18nProvider } from '@/i18n/client'
import { getLocale, getServerTranslator } from '@/i18n/server'
import { MESSAGES } from '@/i18n/messages'
import { Locale } from '@/i18n/config'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export function generateMetadata(): Metadata {
  const t = getServerTranslator()
  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
  }
}

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

const CLERK_LOCALIZATIONS: Record<Locale, typeof ptBR> = {
  'pt-BR': ptBR,
  en: enUS,
  es: esES,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale()
  const content = (
    <html lang={locale} suppressHydrationWarning>
      <body className={cn(
        inter.variable,
        "font-sans bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased"
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="jingia-theme"
        >
          <I18nProvider locale={locale} messages={MESSAGES[locale]}>
            <TooltipProvider delay={300}>
              {children}
              <Toaster position="top-right" richColors />
            </TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )

  // Só envolve com ClerkProvider se as chaves reais estiverem configuradas
  if (isClerkConfigured) {
    return <ClerkProvider localization={CLERK_LOCALIZATIONS[locale]}>{content}</ClerkProvider>
  }

  return content
}
