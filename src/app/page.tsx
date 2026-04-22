import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-light p-6">
      <div className="text-center max-w-2xl">
        <div className="w-20 h-20 rounded-2xl bg-brand-teal flex items-center justify-center text-white font-bold text-4xl mx-auto shadow-lg mb-8">
          J
        </div>
        <h1 className="text-5xl font-bold text-brand-blue tracking-tight">jing IA</h1>
        <p className="text-gray-600 mt-6 text-xl leading-relaxed">
          O centro de inteligência avançada focado na <span className="text-brand-teal font-semibold">Medicina Tradicional Chinesa</span>.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto px-8 py-4 bg-brand-teal text-white rounded-2xl font-bold text-lg hover:bg-brand-blue transition-all shadow-md hover:shadow-xl transform hover:-translate-y-1 text-center"
          >
            Acessar Plataforma
          </Link>
          <Link 
            href="/sign-up" 
            className="w-full sm:w-auto px-8 py-4 bg-white text-brand-blue border-2 border-brand-teal/20 rounded-2xl font-bold text-lg hover:border-brand-teal transition-all text-center"
          >
            Criar Conta Grátis
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          Já tem uma conta? <Link href="/sign-in" className="text-brand-teal hover:underline font-medium">Entrar agora</Link>
        </p>
      </div>
    </main>
  );
}

