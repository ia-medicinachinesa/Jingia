import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'jing IA — Assistentes de IA para Acupunturistas',
  description: 'Hub de inteligência artificial especializado em acupuntura e medicina tradicional chinesa.',
}

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <html lang="pt-BR" suppressHydrationWarning>
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
          <TooltipProvider delay={300}>
            {children}
            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )

  // Só envolve com ClerkProvider se as chaves reais estiverem configuradas
  if (isClerkConfigured) {
    return <ClerkProvider>{content}</ClerkProvider>
  }

  return content
}
