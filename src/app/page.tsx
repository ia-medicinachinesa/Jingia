import Link from 'next/link'
import Image from 'next/image'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { getServerTranslator } from '@/i18n/server'

export default function Home() {
  const t = getServerTranslator()
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-brand-offwhite p-6">
      <LanguageSwitcher className="absolute right-6 top-6" />
      <div className="text-center max-w-2xl flex flex-col items-center">
        <Image src="/images/logos/Logo+Icone.png" alt="Jing IA" width={300} height={100} className="mb-10" priority />
        <p className="text-gray-600 mt-2 text-xl md:text-2xl leading-relaxed">
          {t('home.taglinePrefix')} <span className="text-brand-preto font-bold">{t('home.specialty')}</span>.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto px-8 py-4 bg-brand-preto text-white rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-md hover:shadow-xl transform hover:-translate-y-1 text-center"
          >
            {t('home.access')}
          </Link>
          <Link 
            href="/sign-up" 
            className="w-full sm:w-auto px-8 py-4 bg-white text-brand-preto border-2 border-brand-aco/30 rounded-2xl font-bold text-lg hover:border-brand-preto transition-all text-center"
          >
            {t('home.createAccount')}
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          {t('home.hasAccount')} <Link href="/sign-in" className="text-brand-preto hover:underline font-medium">{t('home.signIn')}</Link>
        </p>
      </div>
    </main>
  );
}

