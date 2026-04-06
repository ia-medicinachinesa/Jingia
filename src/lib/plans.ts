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
