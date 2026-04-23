import { SignUp } from '@clerk/nextjs'
import Image from 'next/image'

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-offwhite dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <Image src="/images/logos/LogoEscrita.png" alt="Jing IA" width={180} height={60} priority className="mb-2" />
          <p className="text-gray-500 mt-2">Crie sua conta gratuita</p>
        </div>
        <SignUp />
      </div>
    </main>
  )
}
