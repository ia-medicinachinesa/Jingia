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
