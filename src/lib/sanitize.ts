/**
 * Sanitiza o input do usuário para o chat de IA.
 * 
 * Regras:
 * 1. Remove tags HTML para evitar ataques de injeção no frontend.
 * 2. Limita o tamanho máximo do texto para economizar tokens e evitar ataques de DoS.
 * 3. Remove excesso de espaços em branco.
 */
export function sanitizeInput(input: string, maxLength: number = 4000): string {
  if (!input) return ''

  // 1. Remove tags HTML simples
  const noHtml = input.replace(/<[^>]*>/g, '')

  // 2. Limita o tamanho
  const sliced = noHtml.slice(0, maxLength)

  // 3. Trim de espaços
  return sliced.trim()
}

/**
 * Validação de segurança básica para nomes de arquivos ou outros metadados.
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9.-]/gi, '_').toLowerCase()
}
