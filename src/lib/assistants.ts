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
    name:        'Jing IA',
    description: 'Dúvidas gerais sobre MTC, conceitos, Zang-Fu, Qi e muito mais.',
    icon:        '🧠',
    category:    'Base e Raciocínio Clínico',
    plans:       ['essencial', 'profissional'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS01 ?? '',
  },
  {
    id:          'ASS-02',
    name:        'Estudo de Caso e Relato',
    description: 'Análise técnica de casos clínicos e formatação de relatos de experiência em MTC.',
    icon:        '📋',
    category:    'Produção Científica e Acadêmica',
    plans:       ['profissional'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS02 ?? '',
  },
  {
    id:          'ASS-03',
    name:        'YNSA',
    description: 'Yamamoto New Scalp Acupuncture — pontos.',
    icon:        '🎯',
    category:    'Técnicas Especializadas',
    plans:       ['profissional'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS03 ?? '',
  },
  {
    id:          'ASS-04',
    name:        'Auriculoterapia',
    description: 'Mapeamento auricular e seleção de pontos.',
    icon:        '👂',
    category:    'Técnicas Especializadas',
    plans:       ['profissional'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS04 ?? '',
  },
  {
    id:          'ASS-05',
    name:        'Fotobiomodulação',
    description: 'Laser e LED terapêutico para acupunturistas.',
    icon:        '💡',
    category:    'Técnicas Especializadas',
    plans:       ['profissional'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS05 ?? '',
  },
  {
    id:          'ASS-06',
    name:        'Interpretação de Exames',
    description: 'Análise laboratorial sob perspectiva integrativa da MTC.',
    icon:        '📋',
    category:    'Base e Raciocínio Clínico',
    plans:       ['profissional'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS06 ?? '',
  },
  {
    id:          'ASS-07',
    name:        'Analista de Artigos Científicos',
    description: 'Resumo e análise crítica de literatura científica.',
    icon:        '📚',
    category:    'Produção Científica e Acadêmica',
    plans:       ['profissional'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS07 || 'asst_OVRfwgMUmnSZo00dlncwVJwj',
  },
  {
    id:          'ASS-08',
    name:        'Consultor de Negócios para Acupunturistas',
    description: 'Conteúdo, copywriting e crescimento para sua clínica.',
    icon:        '📣',
    category:    'Consultório e Marketing',
    plans:       ['profissional'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS08 || 'asst_nTywh8x4trYbPRNwm05wQEc1',
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
