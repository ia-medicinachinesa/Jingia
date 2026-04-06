import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-light">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-blue">jing IA</h1>
          <p className="text-gray-500 mt-2">Acesse sua conta</p>
        </div>
        {/* SignIn renderiza o formulário completo do Clerk */}
        <SignIn />
      </div>
    </main>
  )
}
