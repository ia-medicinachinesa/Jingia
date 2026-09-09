import { PlanId } from '@/lib/plans'
import { Locale } from '@/i18n/config'

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
    name:        'Fotobiomodulação IA',
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
    description: 'Direcionamento estratégico e gestão para o crescimento da sua clínica.',
    icon:        '🏢',
    category:    'Consultório e Marketing',
    plans:       ['profissional'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS08 || 'asst_nTywh8x4trYbPRNwm05wQEc1',
  },
  {
    id:          'ASS-09',
    name:        'Social Media para Acupunturistas',
    description: 'A IA que ajuda acupunturistas a criarem conteúdos estratégicos, fortalecerem autoridade e atraírem mais pacientes pelas redes sociais com ética e profissionalismo.',
    icon:        '📱',
    category:    'Consultório e Marketing',
    plans:       ['profissional'],
    openaiId:    process.env.OPENAI_ASSISTANT_ID_ASS09 || 'asst_0bEJ5gzO4YyvU9z0Vu0uTDBK',
  },
]

const ASSISTANT_COPY: Record<Locale, Record<string, Pick<AssistantConfig, 'name' | 'description' | 'category'>>> = {
  'pt-BR': Object.fromEntries(ASSISTANTS.map(({ id, name, description, category }) => [id, { name, description, category }])),
  en: {
    'ASS-01': { name: 'Jing IA', description: 'General questions about TCM, concepts, Zang-Fu, Qi, and more.', category: 'Clinical Foundations and Reasoning' },
    'ASS-02': { name: 'Case Study and Report', description: 'Technical analysis of clinical cases and preparation of TCM experience reports.', category: 'Scientific and Academic Work' },
    'ASS-03': { name: 'YNSA', description: 'Yamamoto New Scalp Acupuncture — points.', category: 'Specialized Techniques' },
    'ASS-04': { name: 'Auriculotherapy', description: 'Auricular mapping and point selection.', category: 'Specialized Techniques' },
    'ASS-05': { name: 'AI Photobiomodulation', description: 'Therapeutic laser and LED guidance for acupuncturists.', category: 'Specialized Techniques' },
    'ASS-06': { name: 'Lab Test Interpretation', description: 'Laboratory analysis from an integrative TCM perspective.', category: 'Clinical Foundations and Reasoning' },
    'ASS-07': { name: 'Scientific Article Analyst', description: 'Summaries and critical analysis of scientific literature.', category: 'Scientific and Academic Work' },
    'ASS-08': { name: 'Business Consultant for Acupuncturists', description: 'Strategic guidance and management for growing your clinic.', category: 'Practice and Marketing' },
    'ASS-09': { name: 'Social Media for Acupuncturists', description: 'Create strategic content, strengthen your authority, and attract patients ethically and professionally.', category: 'Practice and Marketing' },
  },
  es: {
    'ASS-01': { name: 'Jing IA', description: 'Consultas generales sobre MTC, conceptos, Zang-Fu, Qi y mucho más.', category: 'Fundamentos y Razonamiento Clínico' },
    'ASS-02': { name: 'Estudio de Caso e Informe', description: 'Análisis técnico de casos clínicos y elaboración de informes de experiencia en MTC.', category: 'Producción Científica y Académica' },
    'ASS-03': { name: 'YNSA', description: 'Nueva Acupuntura Craneal de Yamamoto — puntos.', category: 'Técnicas Especializadas' },
    'ASS-04': { name: 'Auriculoterapia', description: 'Mapeo auricular y selección de puntos.', category: 'Técnicas Especializadas' },
    'ASS-05': { name: 'Fotobiomodulación IA', description: 'Láser y LED terapéuticos para acupuntores.', category: 'Técnicas Especializadas' },
    'ASS-06': { name: 'Interpretación de Análisis', description: 'Análisis de laboratorio desde una perspectiva integrativa de la MTC.', category: 'Fundamentos y Razonamiento Clínico' },
    'ASS-07': { name: 'Analista de Artículos Científicos', description: 'Resumen y análisis crítico de literatura científica.', category: 'Producción Científica y Académica' },
    'ASS-08': { name: 'Consultor de Negocios para Acupuntores', description: 'Orientación estratégica y gestión para el crecimiento de tu clínica.', category: 'Consulta y Marketing' },
    'ASS-09': { name: 'Redes Sociales para Acupuntores', description: 'Crea contenido estratégico, fortalece tu autoridad y atrae pacientes con ética y profesionalismo.', category: 'Consulta y Marketing' },
  },
}

export function getLocalizedAssistants(locale: Locale): AssistantConfig[] {
  return ASSISTANTS.map((assistant) => ({
    ...assistant,
    ...(ASSISTANT_COPY[locale][assistant.id] ?? ASSISTANT_COPY['pt-BR'][assistant.id]),
  }))
}

export function getLocalizedAssistant(assistantId: string, locale: Locale): AssistantConfig | undefined {
  return getLocalizedAssistants(locale).find((assistant) => assistant.id === assistantId)
}

// Retorna somente os assistentes acessíveis para um dado plano
export function getAssistantsForPlan(planId: PlanId): AssistantConfig[] {
  return ASSISTANTS.filter(a => a.plans.includes(planId))
}

// Verifica se um assistant específico é acessível para um plano
export function canAccessAssistant(assistantId: string, planId: PlanId): boolean {
  const assistant = ASSISTANTS.find(a => a.id === assistantId)
  return assistant?.plans.includes(planId) ?? false
}
