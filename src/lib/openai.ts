import OpenAI from 'openai'

// Verificamos de forma segura e injetamos as variáveis.
// Em desenvolvimento, uma API mock pode ser usada caso a key não exista,
// mas para o nosso real, vamos garantir a instanciação.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'MISSING_API_KEY',
})

// Cliente dedicado para o projeto isolado do Analista de Artigos (2026)
export const openaiAnalista = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_ANALISTA || process.env.OPENAI_API_KEY || 'MISSING_API_KEY',
})
