import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-offwhite p-6">
      <div className="text-center max-w-2xl flex flex-col items-center">
        <Image src="/images/logos/Logo+Icone.png" alt="Jing IA" width={300} height={100} className="mb-10" priority />
        <p className="text-gray-600 mt-2 text-xl md:text-2xl leading-relaxed">
          O centro de inteligência avançada focado na <span className="text-brand-preto font-bold">Medicina Tradicional Chinesa</span>.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto px-8 py-4 bg-brand-preto text-white rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-md hover:shadow-xl transform hover:-translate-y-1 text-center"
          >
            Acessar Plataforma
          </Link>
          <Link 
            href="/sign-up" 
            className="w-full sm:w-auto px-8 py-4 bg-white text-brand-preto border-2 border-brand-aco/30 rounded-2xl font-bold text-lg hover:border-brand-preto transition-all text-center"
          >
            Criar Conta Grátis
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          Já tem uma conta? <Link href="/sign-in" className="text-brand-preto hover:underline font-medium">Entrar agora</Link>
        </p>
      </div>
    </main>
  );
}

