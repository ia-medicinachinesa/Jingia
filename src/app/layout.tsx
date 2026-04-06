import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
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
        "font-sans bg-gray-50 text-gray-900 antialiased"
      )}>
        {children}
      </body>
    </html>
  )

  // Só envolve com ClerkProvider se as chaves reais estiverem configuradas
  if (isClerkConfigured) {
    return <ClerkProvider>{content}</ClerkProvider>
  }

  return content
}
