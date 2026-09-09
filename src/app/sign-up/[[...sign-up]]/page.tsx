import { SignUp } from '@clerk/nextjs'
import Image from 'next/image'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { getServerTranslator } from '@/i18n/server'

export default function SignUpPage() {
  const t = getServerTranslator()
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-brand-offwhite dark:bg-gray-950">
      <LanguageSwitcher className="absolute right-6 top-6" />
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <Image src="/images/logos/LogoEscrita.png" alt="Jing IA" width={180} height={60} priority className="mb-2" />
          <p className="text-gray-500 mt-2">{t('auth.signUpSubtitle')}</p>
        </div>
        <SignUp />
      </div>
    </main>
  )
}
