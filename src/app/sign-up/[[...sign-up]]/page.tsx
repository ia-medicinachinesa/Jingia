import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-light">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-blue">jing IA</h1>
          <p className="text-gray-500 mt-2">Crie sua conta gratuita</p>
        </div>
        <SignUp />
      </div>
    </main>
  )
}
