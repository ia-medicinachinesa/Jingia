# jing IA — Documentação de Desenvolvimento Frontend

> **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Clerk · shadcn/ui  
> **Versão:** 1.0 · **Uso:** Interno — Equipe de Desenvolvimento  
> **Pré-requisito:** Leia o documento técnico geral antes deste.

---

## Índice

1. [Configuração do Ambiente](#1-configuração-do-ambiente)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Variáveis de Ambiente](#3-variáveis-de-ambiente)
4. [Sistema de Design (Tokens e Tema)](#4-sistema-de-design-tokens-e-tema)
5. [Autenticação com Clerk](#5-autenticação-com-clerk)
6. [Middleware de Proteção de Rotas](#6-middleware-de-proteção-de-rotas)
7. [Layout e Componentes Globais](#7-layout-e-componentes-globais)
8. [Páginas — Descrição e Código](#8-páginas--descrição-e-código)
   - [8.1 Página Pública — `/planos`](#81-página-pública--planos)
   - [8.2 Dashboard — `/dashboard`](#82-dashboard--dashboard)
   - [8.3 Chat — `/dashboard/chat/[assistantId]`](#83-chat--dashboardchatassistantid)
   - [8.4 Perfil — `/perfil`](#84-perfil--perfil)
9. [Componentes Reutilizáveis](#9-componentes-reutilizáveis)
   - [9.1 AssistantCard](#91-assistantcard)
   - [9.2 ChatMessage](#92-chatmessage)
   - [9.3 PlanBadge](#93-planbadge)
   - [9.4 UsageBar](#94-usagebar)
   - [9.5 UpgradeCTA](#95-upgradecta)
10. [Hooks Customizados](#10-hooks-customizados)
11. [Chamadas à API (Client-side)](#11-chamadas-à-api-client-side)
12. [Controle de Acesso por Plano no Frontend](#12-controle-de-acesso-por-plano-no-frontend)
13. [Tratamento de Erros e Loading States](#13-tratamento-de-erros-e-loading-states)
14. [Checklist de Qualidade Frontend](#14-checklist-de-qualidade-frontend)

---

## 1. Configuração do Ambiente

### Requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20.x LTS |
| npm | 10.x |
| Git | 2.x |

### Instalação do projeto

```bash
# 1. Clonar o repositório
git clone https://github.com/sua-org/jing-ia.git
cd jing-ia

# 2. Instalar dependências
npm install

# 3. Copiar o arquivo de variáveis de ambiente
cp .env.example .env.local
# ⚠️ Preencher os valores em .env.local antes de prosseguir

# 4. Rodar em desenvolvimento
npm run dev
```

A aplicação estará em `http://localhost:3000`.

### Dependências principais

```bash
# Framework e linguagem
npm install next@14 react react-dom typescript

# Autenticação
npm install @clerk/nextjs

# Estilo
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Componentes de UI (shadcn — instalar individualmente conforme uso)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card badge avatar separator skeleton

# Utilitários
npm install clsx tailwind-merge lucide-react
npm install @tanstack/react-query   # gerenciamento de estado assíncrono
```

---

## 2. Estrutura de Pastas

```
/jing-ia
├── /app                            ← App Router do Next.js
│   ├── layout.tsx                  ← Layout raiz (ClerkProvider + fontes)
│   ├── page.tsx                    ← Landing page pública
│   │
│   ├── /sign-in/[[...sign-in]]/
│   │   └── page.tsx                ← Página de login via Clerk
│   ├── /sign-up/[[...sign-up]]/
│   │   └── page.tsx                ← Página de cadastro via Clerk
│   │
│   ├── /planos/
│   │   └── page.tsx                ← Página pública de planos e preços
│   │
│   ├── /dashboard/                 ← ⚠️ Rota PROTEGIDA (auth + assinatura)
│   │   ├── layout.tsx              ← Layout do dashboard (sidebar + header)
│   │   ├── page.tsx                ← Hub: lista de assistentes
│   │   ├── /chat/
│   │   │   └── [assistantId]/
│   │   │       └── page.tsx        ← Interface de chat
│   │   └── /historico/
│   │       └── page.tsx            ← Lista de conversas anteriores
│   │
│   ├── /perfil/
│   │   └── page.tsx                ← Dados da conta e assinatura
│   │
│   └── /api/                       ← Route Handlers (backend — ver doc técnico)
│       ├── /chat/route.ts
│       ├── /threads/route.ts
│       └── /webhooks/
│           ├── /clerk/route.ts
│           └── /pagamento/route.ts
│
├── /components
│   ├── /ui/                        ← Componentes do shadcn (gerados automaticamente)
│   ├── AssistantCard.tsx
│   ├── ChatMessage.tsx
│   ├── PlanBadge.tsx
│   ├── UsageBar.tsx
│   ├── UpgradeCTA.tsx
│   ├── DashboardHeader.tsx
│   └── Sidebar.tsx
│
├── /hooks
│   ├── useSubscription.ts          ← Dados da assinatura do usuário
│   ├── useChat.ts                  ← Lógica de chat com a IA
│   └── useAssistants.ts            ← Lista de assistentes disponíveis
│
├── /lib
│   ├── assistants.ts               ← Configuração estática dos assistentes
│   ├── plans.ts                    ← Configuração dos planos e limites
│   └── utils.ts                    ← cn() e utilitários gerais
│
├── /types
│   └── index.ts                    ← Tipos TypeScript globais
│
├── middleware.ts                   ← Proteção de rotas via Clerk
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
├── .env.local                      ← ⚠️ NUNCA commitar este arquivo
└── .gitignore
```

---

## 3. Variáveis de Ambiente

Criar `.env.local` na raiz (use `.env.example` como base):

```env
# ── Clerk (Autenticação) ─────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...   # Pública — pode ir no frontend
CLERK_SECRET_KEY=sk_test_...                     # ⚠️ PRIVADA — somente servidor
CLERK_WEBHOOK_SECRET=whsec_...                   # ⚠️ PRIVADA — validação de webhooks

# Clerk: URLs de redirecionamento
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ── OpenAI ──────────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...                            # ⚠️ PRIVADA — SOMENTE servidor
OPENAI_ASSISTANT_ID_ASS01=asst_...              # IA Principal
OPENAI_ASSISTANT_ID_ASS02=asst_...              # Correlação de sintomas
OPENAI_ASSISTANT_ID_ASS03=asst_...              # YNSA
OPENAI_ASSISTANT_ID_ASS04=asst_...              # Auriculoterapia
OPENAI_ASSISTANT_ID_ASS05=asst_...              # Fotobiomodulação
OPENAI_ASSISTANT_ID_ASS06=asst_...              # Interpretação de exames
OPENAI_ASSISTANT_ID_ASS07=asst_...              # Síntese de artigos
OPENAI_ASSISTANT_ID_ASS08=asst_...              # Estratégia de marketing

# ── Banco de Dados ──────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host:5432/jing?sslmode=require

# ── Upstash Redis (Rate Limiting) ────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# ── Webhook de Pagamento ─────────────────────────────────────────────────────
PAYMENT_WEBHOOK_SECRET=...                       # ⚠️ PRIVADA — Eduzz ou Hubla

# ── Limites por Plano ────────────────────────────────────────────────────────
MSG_LIMIT_ESSENCIAL=50
MSG_LIMIT_PROFISSIONAL=200
MSG_LIMIT_PREMIUM=500
MSG_LIMIT_TRIAL=20
```

> **Regra de ouro:** qualquer variável SEM o prefixo `NEXT_PUBLIC_` existe **somente no servidor**. Nunca referencie variáveis privadas em componentes React ou arquivos de configuração do cliente.

---

## 4. Sistema de Design (Tokens e Tema)

### `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:   '#1A6B8A',
          teal:   '#2E9E8F',
          light:  '#E8F4F8',
          medium: '#B8DDE8',
        },
        plan: {
          essencial:    '#78909C',
          profissional: '#2E9E8F',
          premium:      '#1A6B8A',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
        display: ['var(--font-cal)'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}

export default config
```

### `app/layout.tsx` — Layout raiz com Provider do Clerk

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'jing IA — Assistentes de IA para Acupunturistas',
  description: 'Hub de inteligência artificial especializado em acupuntura e medicina tradicional chinesa.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="pt-BR">
        <body className={`${inter.variable} font-sans bg-gray-50 text-gray-900 antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

### `lib/utils.ts`

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utilitário padrão para composição de classes Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 5. Autenticação com Clerk

O Clerk gerencia login, cadastro e sessão. **Nenhuma lógica de autenticação deve ser escrita manualmente.**

### Página de login — `app/sign-in/[[...sign-in]]/page.tsx`

```tsx
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
```

### Página de cadastro — `app/sign-up/[[...sign-up]]/page.tsx`

```tsx
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
```

### Acessando o usuário logado nos componentes

```tsx
// Em Server Components (padrão no App Router)
import { currentUser } from '@clerk/nextjs/server'

export default async function MeuComponenteServidor() {
  const user = await currentUser()
  if (!user) return null // middleware já trata — isso é segurança extra

  return <p>Olá, {user.firstName}!</p>
}

// Em Client Components (precisam de 'use client')
'use client'
import { useUser } from '@clerk/nextjs'

export default function MeuComponenteCliente() {
  const { user, isLoaded } = useUser()
  if (!isLoaded) return <span>Carregando...</span>

  return <p>Olá, {user?.firstName}!</p>
}
```

---

## 6. Middleware de Proteção de Rotas

O arquivo `middleware.ts` na raiz protege rotas automaticamente. **Toda rota dentro de `/dashboard` e `/perfil` exige autenticação.**

### `middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define quais rotas exigem autenticação
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/perfil(.*)',
])

// Define rotas que são sempre públicas
const isPublicRoute = createRouteMatcher([
  '/',
  '/planos(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)', // webhooks não usam autenticação Clerk
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // Redireciona para /sign-in se não estiver autenticado
    await auth.protect()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Aplica middleware em todas as rotas exceto arquivos estáticos
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

> **Nota:** O middleware **não verifica assinatura ativa** — isso é feito nas rotas de API do backend e no layout do dashboard. O middleware garante apenas que o usuário está autenticado via Clerk.

---

## 7. Layout e Componentes Globais

### `app/dashboard/layout.tsx` — Layout com verificação de assinatura

Este layout roda no **servidor**, verifica se o usuário tem assinatura ativa e redireciona para `/planos` caso não tenha.

```tsx
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { checkSubscription } from '@/lib/subscription'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  // Segurança extra — middleware já bloqueou, mas garantimos aqui também
  if (!user) redirect('/sign-in')

  // Verifica assinatura no banco de dados
  const subscription = await checkSubscription(user.id)

  if (!subscription.isActive) {
    redirect('/planos?reason=no-subscription')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar planId={subscription.planId} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader
          userName={user.firstName ?? 'Usuário'}
          planId={subscription.planId}
          messagesUsed={subscription.monthlyMessageCount}
          messagesLimit={subscription.messageLimit}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### `lib/subscription.ts` — Verificação de assinatura (servidor)

```typescript
import { db } from '@/lib/db'
import { PLAN_LIMITS } from '@/lib/plans'

export interface SubscriptionInfo {
  isActive: boolean
  planId: string | null
  monthlyMessageCount: number
  messageLimit: number
  expiresAt: Date | null
}

export async function checkSubscription(clerkUserId: string): Promise<SubscriptionInfo> {
  const user = await db.query(
    `SELECT subscription_status, plan_id, monthly_message_count, subscription_expires_at
     FROM users WHERE clerk_user_id = $1`,
    [clerkUserId]
  )

  if (!user.rows[0]) {
    return { isActive: false, planId: null, monthlyMessageCount: 0, messageLimit: 0, expiresAt: null }
  }

  const row = user.rows[0]
  const isActive = row.subscription_status === 'active'
  const planId = row.plan_id ?? 'essencial'
  const messageLimit = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS] ?? 50

  return {
    isActive,
    planId,
    monthlyMessageCount: row.monthly_message_count,
    messageLimit,
    expiresAt: row.subscription_expires_at,
  }
}
```

### `lib/plans.ts` — Configuração central dos planos

```typescript
export const PLAN_LIMITS = {
  trial:        parseInt(process.env.MSG_LIMIT_TRIAL        ?? '20'),
  essencial:    parseInt(process.env.MSG_LIMIT_ESSENCIAL    ?? '50'),
  profissional: parseInt(process.env.MSG_LIMIT_PROFISSIONAL ?? '200'),
  premium:      parseInt(process.env.MSG_LIMIT_PREMIUM      ?? '500'),
} as const

export type PlanId = keyof typeof PLAN_LIMITS

export const PLAN_DISPLAY = {
  essencial: {
    name:  'Essencial',
    price: 'R$ 29,90/mês',
    color: 'plan-essencial',
    description: 'Para quem quer começar com baixo custo',
    features: [
      'IA Principal para dúvidas gerais',
      'Correlação de sintomas',
      `${PLAN_LIMITS.essencial} mensagens por mês`,
    ],
  },
  profissional: {
    name:  'Profissional',
    price: 'R$ 59,90/mês',
    color: 'plan-profissional',
    description: 'Para acupunturistas frequentes',
    features: [
      'Tudo do Essencial',
      'Módulo YNSA',
      'Auriculoterapia IA',
      'Fotobiomodulação IA',
      `${PLAN_LIMITS.profissional} mensagens por mês`,
    ],
  },
  premium: {
    name:  'Premium',
    price: 'R$ 97,00/mês',
    color: 'plan-premium',
    description: 'Para profissionais avançados',
    features: [
      'Tudo do Profissional',
      'Interpretação de exames',
      'Síntese de artigos científicos',
      'Estratégia de marketing clínico',
      `${PLAN_LIMITS.premium} mensagens por mês`,
    ],
  },
} satisfies Record<string, { name: string; price: string; color: string; description: string; features: string[] }>
```

### `lib/assistants.ts` — Configuração estática dos assistentes

```typescript
import { PlanId } from '@/lib/plans'

export interface AssistantConfig {
  id:          string        // ASS-01, ASS-02, ...
  name:        string
  description: string
  icon:        string        // Emoji ou nome de ícone Lucide
  category:    string
  plans:       PlanId[]      // Planos que têm acesso
  openaiId:    string        // ID do Assistant na OpenAI (via env var)
}

export const ASSISTANTS: AssistantConfig[] = [
  {
    id:          'ASS-01',
    name:        'IA Principal',
    description: 'Dúvidas gerais sobre MTC, conceitos, Zang-Fu, Qi e muito mais.',
    icon:        '🧠',
    category:    'Clínica Geral',
    plans:       ['essencial', 'profissional', 'premium'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS01 ?? '',
  },
  {
    id:          'ASS-02',
    name:        'Correlação de Sintomas',
    description: 'Relaciona sintomas clínicos a padrões diagnósticos da MTC.',
    icon:        '🔍',
    category:    'Clínica Geral',
    plans:       ['essencial', 'profissional', 'premium'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS02 ?? '',
  },
  {
    id:          'ASS-03',
    name:        'YNSA',
    description: 'Yamamoto New Scalp Acupuncture — protocolos e pontos.',
    icon:        '🎯',
    category:    'Técnicas Especializadas',
    plans:       ['profissional', 'premium'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS03 ?? '',
  },
  {
    id:          'ASS-04',
    name:        'Auriculoterapia',
    description: 'Mapeamento auricular, protocolos e seleção de pontos.',
    icon:        '👂',
    category:    'Técnicas Especializadas',
    plans:       ['profissional', 'premium'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS04 ?? '',
  },
  {
    id:          'ASS-05',
    name:        'Fotobiomodulação',
    description: 'Protocolos de laser e LED terapêutico para acupunturistas.',
    icon:        '💡',
    category:    'Técnicas Especializadas',
    plans:       ['profissional', 'premium'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS05 ?? '',
  },
  {
    id:          'ASS-06',
    name:        'Interpretação de Exames',
    description: 'Análise laboratorial sob perspectiva integrativa da MTC.',
    icon:        '📋',
    category:    'Recursos Avançados',
    plans:       ['premium'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS06 ?? '',
  },
  {
    id:          'ASS-07',
    name:        'Síntese de Artigos',
    description: 'Resumo e análise crítica de literatura científica.',
    icon:        '📚',
    category:    'Recursos Avançados',
    plans:       ['premium'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS07 ?? '',
  },
  {
    id:          'ASS-08',
    name:        'Estratégia de Marketing',
    description: 'Conteúdo, copywriting e crescimento para sua clínica.',
    icon:        '📣',
    category:    'Recursos Avançados',
    plans:       ['premium'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS08 ?? '',
  },
]

// Retorna somente os assistentes acessíveis para um dado plano
export function getAssistantsForPlan(planId: PlanId): AssistantConfig[] {
  return ASSISTANTS.filter(a => a.plans.includes(planId))
}

// Verifica se um assistant específico é acessível para um plano
export function canAccessAssistant(assistantId: string, planId: PlanId): boolean {
  const assistant = ASSISTANTS.find(a => a.id === assistantId)
  return assistant?.plans.includes(planId) ?? false
}
```

---

## 8. Páginas — Descrição e Código

### 8.1 Página Pública — `/planos`

Exibe os três planos com preços, features e botão de assinatura (link para Eduzz/Hubla).

```tsx
// app/planos/page.tsx
import Link from 'next/link'
import { Check } from 'lucide-react'
import { PLAN_DISPLAY } from '@/lib/plans'
import { cn } from '@/lib/utils'

// ⚠️ Substituir pelos links reais de checkout da Eduzz ou Hubla
const CHECKOUT_URLS = {
  essencial:    process.env.NEXT_PUBLIC_CHECKOUT_ESSENCIAL    ?? '#',
  profissional: process.env.NEXT_PUBLIC_CHECKOUT_PROFISSIONAL ?? '#',
  premium:      process.env.NEXT_PUBLIC_CHECKOUT_PREMIUM      ?? '#',
}

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-light to-white py-20 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Cabeçalho */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-brand-blue mb-4">
            Escolha seu plano
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Assistentes de IA especializados em acupuntura e MTC.
            Cancele quando quiser.
          </p>
        </div>

        {/* Grid de planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.entries(PLAN_DISPLAY).map(([planId, plan]) => (
            <div
              key={planId}
              className={cn(
                'rounded-2xl border-2 p-8 flex flex-col bg-white shadow-sm transition-shadow hover:shadow-md',
                planId === 'profissional'
                  ? 'border-brand-teal ring-2 ring-brand-teal/20'  // Plano destacado
                  : 'border-gray-200'
              )}
            >
              {/* Badge destaque */}
              {planId === 'profissional' && (
                <span className="text-xs font-semibold bg-brand-teal text-white px-3 py-1 rounded-full self-start mb-4">
                  Mais popular
                </span>
              )}

              <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
              <p className="text-sm text-gray-500 mt-1 mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-3xl font-bold text-brand-blue">{plan.price}</span>
              </div>

              {/* Lista de features */}
              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={16} className="text-brand-teal mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={CHECKOUT_URLS[planId as keyof typeof CHECKOUT_URLS]}
                className={cn(
                  'block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors',
                  planId === 'profissional'
                    ? 'bg-brand-teal text-white hover:bg-brand-blue'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                )}
              >
                Assinar agora
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Pagamento processado pela plataforma de pagamento parceira.
          jing IA não armazena dados de cartão.
        </p>
      </div>
    </main>
  )
}
```

---

### 8.2 Dashboard — `/dashboard`

Lista todos os assistentes. Assistentes bloqueados pelo plano aparecem com cadeado.

```tsx
// app/dashboard/page.tsx
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { checkSubscription } from '@/lib/subscription'
import { ASSISTANTS } from '@/lib/assistants'
import AssistantCard from '@/components/AssistantCard'
import { PlanId } from '@/lib/plans'

export default async function DashboardPage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const subscription = await checkSubscription(user.id)
  if (!subscription.isActive) redirect('/planos?reason=no-subscription')

  const planId = (subscription.planId ?? 'essencial') as PlanId

  // Agrupa assistentes por categoria
  const categories = [...new Set(ASSISTANTS.map(a => a.category))]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Seus Assistentes</h1>
        <p className="text-gray-500 mt-1">Selecione um assistente para começar uma conversa.</p>
      </div>

      {categories.map(category => (
        <section key={category} className="mb-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ASSISTANTS.filter(a => a.category === category).map(assistant => (
              <AssistantCard
                key={assistant.id}
                assistant={assistant}
                planId={planId}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

---

### 8.3 Chat — `/dashboard/chat/[assistantId]`

Interface principal de conversação com o assistente.

```tsx
// app/dashboard/chat/[assistantId]/page.tsx
import { currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { checkSubscription } from '@/lib/subscription'
import { ASSISTANTS, canAccessAssistant } from '@/lib/assistants'
import { PlanId } from '@/lib/plans'
import ChatInterface from './ChatInterface' // Client Component

interface Props {
  params: { assistantId: string }
}

export default async function ChatPage({ params }: Props) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const subscription = await checkSubscription(user.id)
  if (!subscription.isActive) redirect('/planos?reason=no-subscription')

  const planId = (subscription.planId ?? 'essencial') as PlanId
  const assistant = ASSISTANTS.find(a => a.id === params.assistantId)

  // Assistente não existe
  if (!assistant) notFound()

  // Plano não tem acesso a esse assistente
  if (!canAccessAssistant(params.assistantId, planId)) {
    redirect('/dashboard?reason=plan-required')
  }

  return (
    <ChatInterface
      assistant={assistant}
      planId={planId}
      messagesUsed={subscription.monthlyMessageCount}
      messagesLimit={subscription.messageLimit}
    />
  )
}
```

```tsx
// app/dashboard/chat/[assistantId]/ChatInterface.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, AlertCircle } from 'lucide-react'
import { AssistantConfig } from '@/lib/assistants'
import { PlanId } from '@/lib/plans'
import ChatMessage from '@/components/ChatMessage'
import UsageBar from '@/components/UsageBar'
import UpgradeCTA from '@/components/UpgradeCTA'
import { cn } from '@/lib/utils'

// ⚠️ Disclaimer médico — obrigatório por RN-08
const MEDICAL_DISCLAIMER =
  '⚕️ **Aviso:** Este assistente é uma ferramenta de suporte clínico para acupunturistas. ' +
  'As informações geradas não substituem o julgamento clínico do profissional ' +
  'nem constituem prescrição médica. Use com responsabilidade.'

interface Message {
  role:    'user' | 'assistant'
  content: string
}

interface Props {
  assistant:      AssistantConfig
  planId:         PlanId
  messagesUsed:   number
  messagesLimit:  number
}

export default function ChatInterface({ assistant, planId, messagesUsed, messagesLimit }: Props) {
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [isLoading, setIsLoading]   = useState(false)
  const [threadId, setThreadId]     = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [usedCount, setUsedCount]   = useState(messagesUsed)
  const bottomRef                   = useRef<HTMLDivElement>(null)
  const inputRef                    = useRef<HTMLTextAreaElement>(null)

  // Scroll automático para a última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const isAtLimit = usedCount >= messagesLimit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading || isAtLimit) return
    if (trimmed.length > 4000) {
      setError('Mensagem muito longa. Máximo de 4.000 caracteres.')
      return
    }

    setError(null)
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId: assistant.id,
          message:     trimmed,
          threadId,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 429) {
          setError('Você atingiu o limite de mensagens do seu plano este mês.')
        } else if (res.status === 403) {
          setError('Acesso negado. Verifique sua assinatura.')
        } else {
          setError(body.message ?? 'Ocorreu um erro. Tente novamente.')
        }
        return
      }

      const data = await res.json()
      setThreadId(data.threadId)
      setUsedCount(data.messagesUsed)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique sua conexão.')
    } finally {
      setIsLoading(false)
    }
  }

  // Permite enviar com Enter (Shift+Enter = nova linha)
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">

      {/* Header do assistente */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-4">
        <span className="text-3xl">{assistant.icon}</span>
        <div>
          <h1 className="font-bold text-gray-900">{assistant.name}</h1>
          <p className="text-sm text-gray-500">{assistant.description}</p>
        </div>
      </div>

      {/* Disclaimer médico — sempre visível (RN-08) */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">
        {MEDICAL_DISCLAIMER}
      </div>

      {/* Barra de uso de mensagens */}
      <UsageBar used={usedCount} limit={messagesLimit} className="mb-4" />

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <span className="text-4xl block mb-3">{assistant.icon}</span>
            <p className="text-sm">
              Olá! Sou o <strong>{assistant.name}</strong>. Como posso ajudar?
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-brand-teal rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-brand-teal rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-brand-teal rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            Gerando resposta...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3 mb-3 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* CTA de upgrade quando atingiu o limite */}
      {isAtLimit && (
        <UpgradeCTA currentPlan={planId} className="mb-3" />
      )}

      {/* Campo de input */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAtLimit ? 'Limite de mensagens atingido.' : 'Digite sua mensagem...'}
          disabled={isLoading || isAtLimit}
          rows={1}
          maxLength={4000}
          className={cn(
            'flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-400',
            'min-h-[48px] max-h-[160px] overflow-y-auto'
          )}
          style={{ height: 'auto' }}
          onInput={e => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = `${Math.min(t.scrollHeight, 160)}px`
          }}
        />
        <button
          type="submit"
          disabled={isLoading || isAtLimit || !input.trim()}
          className={cn(
            'p-3 rounded-xl transition-colors shrink-0',
            'bg-brand-teal text-white hover:bg-brand-blue',
            'disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed'
          )}
          aria-label="Enviar mensagem"
        >
          <Send size={18} />
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center mt-2">
        {input.length}/4000 caracteres · Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>
  )
}
```

---

### 8.4 Perfil — `/perfil`

Exibe informações da conta e status da assinatura.

```tsx
// app/perfil/page.tsx
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { checkSubscription } from '@/lib/subscription'
import { PLAN_DISPLAY } from '@/lib/plans'
import PlanBadge from '@/components/PlanBadge'
import UsageBar from '@/components/UsageBar'

export default async function PerfilPage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const subscription = await checkSubscription(user.id)
  const planId = subscription.planId ?? 'essencial'
  const plan = PLAN_DISPLAY[planId as keyof typeof PLAN_DISPLAY]

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Minha Conta</h1>

      {/* Dados do usuário */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Informações Pessoais
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Nome</span>
            <span className="font-medium">{user.fullName ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">E-mail</span>
            <span className="font-medium">{user.emailAddresses[0]?.emailAddress ?? '—'}</span>
          </div>
        </div>
      </section>

      {/* Assinatura */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Assinatura
        </h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-gray-900">{plan?.name ?? 'Sem plano'}</p>
            <p className="text-sm text-gray-500">{plan?.price}</p>
          </div>
          <PlanBadge planId={planId} />
        </div>

        {subscription.expiresAt && (
          <p className="text-xs text-gray-400 mb-4">
            Renova em: {new Date(subscription.expiresAt).toLocaleDateString('pt-BR')}
          </p>
        )}

        <UsageBar
          used={subscription.monthlyMessageCount}
          limit={subscription.messageLimit}
          showLabel
        />
      </section>

      {/* Aviso LGPD */}
      <section className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Seus Dados
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          Armazenamos apenas e-mail, status da assinatura e histórico de conversas.
          Não armazenamos dados de pagamento.
        </p>
        <p className="text-sm text-gray-500">
          Para solicitar exclusão dos seus dados, entre em contato pelo e-mail{' '}
          <a href="mailto:privacidade@jing.com.br" className="text-brand-teal underline">
            privacidade@jing.com.br
          </a>
          . Prazo de atendimento: 15 dias úteis.
        </p>
      </section>
    </main>
  )
}
```

---

## 9. Componentes Reutilizáveis

### 9.1 `AssistantCard`

```tsx
// components/AssistantCard.tsx
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { AssistantConfig, canAccessAssistant } from '@/lib/assistants'
import { PlanId, PLAN_DISPLAY } from '@/lib/plans'
import { cn } from '@/lib/utils'

interface Props {
  assistant: AssistantConfig
  planId:    PlanId
}

export default function AssistantCard({ assistant, planId }: Props) {
  const hasAccess = canAccessAssistant(assistant.id, planId)

  // Encontra o plano mínimo necessário para exibir no CTA
  const requiredPlan = assistant.plans[0]
  const requiredPlanName = PLAN_DISPLAY[requiredPlan as keyof typeof PLAN_DISPLAY]?.name

  const card = (
    <div
      className={cn(
        'rounded-2xl border-2 p-5 transition-all',
        hasAccess
          ? 'border-gray-200 hover:border-brand-teal hover:shadow-md cursor-pointer bg-white'
          : 'border-gray-100 bg-gray-50 opacity-70 cursor-not-allowed'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{assistant.icon}</span>
        {!hasAccess && (
          <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            <Lock size={10} />
            {requiredPlanName}
          </span>
        )}
      </div>

      <h3 className="font-semibold text-gray-900 mb-1">{assistant.name}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{assistant.description}</p>

      {!hasAccess && (
        <p className="text-xs text-brand-teal mt-3 font-medium">
          Disponível no plano {requiredPlanName} →
        </p>
      )}
    </div>
  )

  // Assistentes bloqueados não são links
  if (!hasAccess) return card

  return (
    <Link href={`/dashboard/chat/${assistant.id}`} className="block">
      {card}
    </Link>
  )
}
```

---

### 9.2 `ChatMessage`

```tsx
// components/ChatMessage.tsx
import { cn } from '@/lib/utils'

interface Props {
  role:    'user' | 'assistant'
  content: string
}

// Renderização simples com suporte a quebras de linha
// Para produção: considere usar react-markdown para renderizar Markdown completo
export default function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-brand-teal text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
        )}
      >
        {content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
```

---

### 9.3 `PlanBadge`

```tsx
// components/PlanBadge.tsx
import { cn } from '@/lib/utils'
import { PlanId } from '@/lib/plans'

const BADGE_STYLES: Record<string, string> = {
  essencial:    'bg-slate-100   text-slate-600',
  profissional: 'bg-teal-100    text-teal-700',
  premium:      'bg-blue-100    text-blue-700',
  trial:        'bg-orange-100  text-orange-700',
}

const BADGE_LABELS: Record<string, string> = {
  essencial:    'Essencial',
  profissional: 'Profissional',
  premium:      'Premium',
  trial:        'Trial',
}

interface Props {
  planId:    string
  className?: string
}

export default function PlanBadge({ planId, className }: Props) {
  return (
    <span
      className={cn(
        'text-xs font-semibold px-3 py-1 rounded-full',
        BADGE_STYLES[planId] ?? 'bg-gray-100 text-gray-600',
        className
      )}
    >
      {BADGE_LABELS[planId] ?? planId}
    </span>
  )
}
```

---

### 9.4 `UsageBar`

```tsx
// components/UsageBar.tsx
import { cn } from '@/lib/utils'

interface Props {
  used:       number
  limit:      number
  showLabel?: boolean
  className?: string
}

export default function UsageBar({ used, limit, showLabel = false, className }: Props) {
  const percentage = Math.min((used / limit) * 100, 100)

  const barColor =
    percentage >= 90 ? 'bg-red-500' :
    percentage >= 70 ? 'bg-amber-400' :
    'bg-brand-teal'

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Mensagens usadas</span>
          <span className={percentage >= 90 ? 'text-red-500 font-semibold' : ''}>
            {used} / {limit}
          </span>
        </div>
      )}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {!showLabel && (
        <p className="text-xs text-gray-400 mt-1">
          {used}/{limit} mensagens usadas este mês
        </p>
      )}
    </div>
  )
}
```

---

### 9.5 `UpgradeCTA`

```tsx
// components/UpgradeCTA.tsx
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { PlanId } from '@/lib/plans'
import { cn } from '@/lib/utils'

// Próximo plano recomendado para upgrade
const NEXT_PLAN: Partial<Record<PlanId, string>> = {
  trial:     'essencial',
  essencial: 'profissional',
  profissional: 'premium',
}

interface Props {
  currentPlan: PlanId
  className?:  string
}

export default function UpgradeCTA({ currentPlan, className }: Props) {
  const nextPlan = NEXT_PLAN[currentPlan]
  if (!nextPlan) return null // Premium já está no topo

  return (
    <div className={cn('bg-brand-light border border-brand-medium rounded-xl p-4', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Zap size={16} className="text-brand-teal" />
        <span className="text-sm font-semibold text-brand-blue">
          Limite de mensagens atingido
        </span>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Faça upgrade para o plano{' '}
        <strong className="capitalize">{nextPlan}</strong>{' '}
        e continue usando seus assistentes sem interrupção.
      </p>
      <Link
        href="/planos"
        className="inline-block text-xs font-semibold bg-brand-teal text-white px-4 py-2 rounded-lg hover:bg-brand-blue transition-colors"
      >
        Ver planos →
      </Link>
    </div>
  )
}
```

---

## 10. Hooks Customizados

### `hooks/useChat.ts`

> Alternativa ao estado local do `ChatInterface`. Use se precisar reutilizar a lógica de chat em múltiplos componentes.

```typescript
// hooks/useChat.ts
'use client'

import { useState, useCallback } from 'react'

interface Message {
  role:    'user' | 'assistant'
  content: string
}

interface UseChatOptions {
  assistantId: string
}

export function useChat({ assistantId }: UseChatOptions) {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [threadId,  setThreadId]  = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    setError(null)
    setMessages(prev => [...prev, { role: 'user', content }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ assistantId, message: content, threadId }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? `Erro ${res.status}`)
      }

      const data = await res.json()
      setThreadId(data.threadId)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [assistantId, threadId, isLoading])

  const clearMessages = useCallback(() => {
    setMessages([])
    setThreadId(null)
    setError(null)
  }, [])

  return { messages, isLoading, error, threadId, sendMessage, clearMessages }
}
```

### `hooks/useSubscription.ts`

```typescript
// hooks/useSubscription.ts
'use client'

import { useEffect, useState } from 'react'

interface SubscriptionData {
  isActive:            boolean
  planId:              string | null
  monthlyMessageCount: number
  messageLimit:        number
}

export function useSubscription() {
  const [data,      setData]      = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/subscription')
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Não foi possível carregar dados da assinatura'))
      .finally(() => setIsLoading(false))
  }, [])

  return { data, isLoading, error }
}
```

---

## 11. Chamadas à API (Client-side)

Todas as chamadas à API usam `fetch` nativo. **Nunca coloque chaves de API em chamadas do lado do cliente.**

### Padrão de chamada à `/api/chat`

```typescript
// Requisição
const response = await fetch('/api/chat', {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    assistantId: 'ASS-01',       // ID interno do assistente
    message:     'Texto aqui',   // Mensagem do usuário (max 4000 chars)
    threadId:    null,           // null na primeira mensagem; ID nas seguintes
  }),
})

// Resposta de sucesso (HTTP 200)
const data = await response.json()
// {
//   reply:        string,   // Resposta do assistente
//   threadId:     string,   // Thread ID (persistir para próximas mensagens)
//   messagesUsed: number,   // Total de mensagens usadas no mês
// }

// Respostas de erro comuns
// HTTP 401 — não autenticado (redirecionar para /sign-in)
// HTTP 403 — sem assinatura ativa ou assistente fora do plano
// HTTP 429 — limite de mensagens atingido
// HTTP 500 — erro interno (exibir mensagem genérica)
```

### Padrão de tratamento de erros na UI

```typescript
async function callApi(url: string, body: unknown) {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))

    // Mensagens de erro amigáveis por código HTTP
    const messages: Record<number, string> = {
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Acesso negado. Verifique sua assinatura.',
      429: 'Você atingiu o limite de mensagens do seu plano este mês.',
      500: 'Ocorreu um erro no servidor. Tente novamente em alguns instantes.',
    }

    throw new Error(data.message ?? messages[res.status] ?? 'Erro desconhecido')
  }

  return res.json()
}
```

---

## 12. Controle de Acesso por Plano no Frontend

O frontend **nunca é a única barreira** — o backend sempre re-valida. O frontend aplica controle visual para UX:

| Situação | Comportamento no Frontend |
|---|---|
| Assistente fora do plano | `AssistantCard` exibe cadeado + nome do plano necessário |
| Limite de mensagens atingido | Input desabilitado + `UpgradeCTA` exibido |
| Acesso negado pela API (403) | Mensagem de erro + link para `/planos` |
| Rate limit atingido (429) | Mensagem de erro específica |
| Sem assinatura | `layout.tsx` redireciona para `/planos` no servidor |

### Lógica de verificação de acesso (utilitário)

```typescript
// lib/assistants.ts — já definido acima
export function canAccessAssistant(assistantId: string, planId: PlanId): boolean {
  const assistant = ASSISTANTS.find(a => a.id === assistantId)
  return assistant?.plans.includes(planId) ?? false
}
```

---

## 13. Tratamento de Erros e Loading States

### Regras gerais

- **Erros de rede:** exibir mensagem amigável, nunca stack trace
- **Loading:** usar skeleton ou spinner — nunca deixar tela em branco
- **Formulários desabilitados:** sempre indicar visualmente com `disabled` + `cursor-not-allowed`
- **Retry:** para erros 5XX, oferecer botão de "Tentar novamente"

### Skeleton de loading para o dashboard

```tsx
// components/AssistantCardSkeleton.tsx
export default function AssistantCardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-gray-100 p-5 bg-white animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-4/5 mt-1" />
    </div>
  )
}
```

---

## 14. Checklist de Qualidade Frontend

Execute antes de qualquer PR ou deploy:

```
Funcionalidade
[ ] Login, cadastro e logout funcionando via Clerk
[ ] Redirecionamento correto para /planos quando sem assinatura
[ ] Assistentes bloqueados exibem cadeado (não link)
[ ] Chat envia mensagem e exibe resposta corretamente
[ ] Limite de mensagens bloqueia input e exibe UpgradeCTA
[ ] Disclaimer médico visível em toda sessão de chat
[ ] Erros de API exibem mensagens amigáveis em português

Segurança
[ ] Nenhuma variável de ambiente privada exposta no bundle do cliente
[ ] Nenhuma rota /dashboard/* acessível sem autenticação
[ ] Input do chat limitado a 4.000 caracteres no frontend
[ ] Não há console.log com dados sensíveis em produção

Responsividade
[ ] Interface funcional em mobile (320px+)
[ ] Interface funcional em tablet (768px+)
[ ] Interface funcional em desktop (1024px+)

Performance
[ ] Imagens com next/image (se houver)
[ ] Fontes carregadas via next/font
[ ] Nenhuma importação de biblioteca desnecessária no bundle do cliente

Acessibilidade
[ ] Botões com aria-label descritivo
[ ] Campos de formulário com labels ou aria-label
[ ] Contraste de cores adequado (WCAG AA)
[ ] Navegação por teclado funcionando no chat
```

---

> **Dúvidas?** Consulte o documento técnico geral (v3.0) para arquitetura, regras de negócio, segurança e banco de dados.  
> **Última atualização:** v1.0 — uso interno jing IA.