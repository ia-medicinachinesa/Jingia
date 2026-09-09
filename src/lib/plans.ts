export const PLAN_LIMITS = {
  essencial:    parseInt(process.env.MSG_LIMIT_ESSENCIAL    ?? '150'),
  profissional: parseInt(process.env.MSG_LIMIT_PROFISSIONAL ?? '600'),
} as const

export type PlanId = keyof typeof PLAN_LIMITS

import { INTL_LOCALES, Locale } from '@/i18n/config'

export const PLAN_DISPLAY = {
  essencial: {
    name:  'Essencial',
    price: 'R$ 39,90/mês',
    color: 'plan-essencial',
    description: 'Plano de entrada para uso básico do raciocínio clínico',
    features: [
      'Acesso à Jing IA',
      `${PLAN_LIMITS.essencial} mensagens por mês`,
    ],
  },
  profissional: {
    name:  'Profissional',
    price: 'R$ 89,90/mês',
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

export type PlanDisplay = typeof PLAN_DISPLAY

export function getLocalizedPlanDisplay(locale: Locale): PlanDisplay {
  const monthlyPrice = (value: number) => {
    const formatted = new Intl.NumberFormat(INTL_LOCALES[locale], {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
    return locale === 'pt-BR' ? `${formatted}/mês` : locale === 'es' ? `${formatted}/mes` : `${formatted}/month`
  }

  if (locale === 'en') {
    return {
      essencial: {
        name: 'Essential', price: monthlyPrice(39.9), color: 'plan-essencial',
        description: 'Entry plan for core clinical reasoning',
        features: ['Access to Jing IA', `${PLAN_LIMITS.essencial} messages per month`],
      },
      profissional: {
        name: 'Professional', price: monthlyPrice(89.9), color: 'plan-profissional',
        description: 'Full access to every AI assistant and module',
        features: ['Access to Jing IA', 'Scientific Article Analyst', 'Case Study Generator', 'AI-Powered Practice', 'Every new AI assistant added', `${PLAN_LIMITS.profissional} messages per month`],
      },
    }
  }

  if (locale === 'es') {
    return {
      essencial: {
        name: 'Esencial', price: monthlyPrice(39.9), color: 'plan-essencial',
        description: 'Plan inicial para el razonamiento clínico básico',
        features: ['Acceso a Jing IA', `${PLAN_LIMITS.essencial} mensajes al mes`],
      },
      profissional: {
        name: 'Profesional', price: monthlyPrice(89.9), color: 'plan-profissional',
        description: 'Acceso completo a todos los asistentes y módulos de IA',
        features: ['Acceso a Jing IA', 'Analista de Artículos Científicos', 'Generador de Estudios de Caso', 'Consulta Inteligente con IA', 'Todos los nuevos asistentes de IA', `${PLAN_LIMITS.profissional} mensajes al mes`],
      },
    }
  }

  return PLAN_DISPLAY
}
