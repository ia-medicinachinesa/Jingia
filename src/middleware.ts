import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

// Define quais rotas exigem autenticação
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/perfil(.*)',
])

// Se o Clerk não estiver configurado com chaves reais, 
// deixamos o servidor subir normalmente para desenvolvimento visual
export default isClerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect()
      }
      return NextResponse.next()
    })
  : function middleware() {
      return NextResponse.next()
    }

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
