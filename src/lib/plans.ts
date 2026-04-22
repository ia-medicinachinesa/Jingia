export const PLAN_LIMITS = {
  essencial:    parseInt(process.env.MSG_LIMIT_ESSENCIAL    ?? '150'),
  profissional: parseInt(process.env.MSG_LIMIT_PROFISSIONAL ?? '600'),
} as const

export type PlanId = keyof typeof PLAN_LIMITS

export const PLAN_DISPLAY = {
  essencial: {
    name:  'Essencial',
    price: 'R$ 29,90/mês',
    color: 'plan-essencial',
    description: 'Plano de entrada para uso básico do raciocínio clínico',
    features: [
      'Acesso à Jing IA',
      `${PLAN_LIMITS.essencial} mensagens por mês`,
    ],
  },
  profissional: {
    name:  'Profissional',
    price: 'R$ 79,90/mês',
    color: 'plan-profissional',
    description: 'Acesso completo a todas as IAs e módulos',
    features: [
      'Acesso à Jing IA',
      'Analista de Artigos Científicos',
      'Gerador de Estudo de Caso',
      'Consultório Inteligente IA',
      'Todas as novas IAs adicionadas',
      `${PLAN_LIMITS.profissional} mensagens por mês`,
    ],
  },
} satisfies Record<string, { name: string; price: string; color: string; description: string; features: string[] }>
