// ═══════════════════════════════════════════════════════════════
// HUBLA — Tipos e Mapeamento de Produtos
// Centraliza toda a lógica de interpretação dos webhooks Hubla
// ═══════════════════════════════════════════════════════════════

// ── Mapeamento de Produto Hubla → Plan ID interno ──────────────

const PRODUCT_MAP: Record<string, string> = {
  [process.env.HUBLA_PRODUCT_ESSENCIAL ?? '']: 'essencial',
  [process.env.HUBLA_PRODUCT_PROFISSIONAL ?? '']: 'profissional',
}

/**
 * Converte o productId da Hubla no plan_id interno do Jing IA.
 * Retorna null se o produto não for reconhecido.
 */
export function resolveInternalPlanId(hublaProductId: string): string | null {
  return PRODUCT_MAP[hublaProductId] ?? null
}

// ── Tipos dos Payloads recebidos da Hubla (v2.0.0) ────────────

export interface HublaUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
}

export interface HublaProduct {
  id: string
  name: string
}

export interface HublaInvoice {
  id: string
  status: string
  amount?: number
  currency?: string
  createdAt?: string
  paidAt?: string
}

export interface HublaSubscription {
  id: string
  sellerId: string
  payerId: string
  status: 'active' | 'inactive' | 'expired' | 'past_due'
  type: string
  billingCycleMonths: number
  paymentMethod?: string
  autoRenew: boolean
  freeTrial: boolean
  modifiedAt: string
  createdAt: string
  lastInvoice?: HublaInvoice
  nextBillingDate?: string
}

export interface HublaRefund {
  id: string
  status: string
  reason?: string
  createdAt: string
}

/**
 * Envelope genérico do webhook Hubla.
 * Cada evento vem como um POST JSON com estrutura que varia por tipo.
 * Os campos abaixo cobrem os objetos que aparecem nos diferentes eventos.
 */
export interface HublaWebhookPayload {
  // Hubla Payload v2 structure
  type?: string
  event?: {
    subscription?: HublaSubscription
    invoice?: any // Usa any pois a fatura tem estrutura complexa
    member?: HublaUser
    refund?: HublaRefund
    product?: HublaProduct
    user?: HublaUser
    modifiedAt?: string
  }
  // Fallback para caso venham direto na raiz
  subscription?: HublaSubscription
  invoice?: HublaInvoice
  member?: HublaUser
  refund?: HublaRefund
  product?: HublaProduct
  user?: HublaUser
  version?: number | string
  createdAt?: string
  modifiedAt?: string
}

// ── Tipos de Evento que escutamos ──────────────────────────────

export type HublaEventType =
  // Assinatura
  | 'subscription_created'
  | 'subscription_activated'
  | 'subscription_deactivated'
  | 'subscription_expiring'
  | 'renewal_disabled'
  | 'renewal_enabled'
  // Fatura
  | 'invoice_created'
  | 'invoice_status_updated'
  | 'invoice_payment_succeeded'
  | 'invoice_payment_failed'
  // Membro (acesso)
  | 'access_granted'
  | 'access_removed'
  // Reembolso
  | 'refund_requested'

// ── Headers relevantes da Hubla ────────────────────────────────

export const HUBLA_HEADERS = {
  TOKEN: 'x-hubla-token',
  IDEMPOTENCY: 'x-hubla-idempotency',
  SANDBOX: 'x-hubla-sandbox',
  EVENT: 'x-hubla-event',
} as const

/**
 * Extrai o e-mail do comprador a partir do payload do webhook.
 * Tenta múltiplas fontes: user, member, e fallback para subscription.
 */
export function extractBuyerEmail(payload: HublaWebhookPayload): string | null {
  const data = payload.event || payload
  return (
    data.user?.email ??
    data.member?.email ??
    data.subscription?.payer?.email ?? 
    data.invoice?.payer?.email ??
    null
  )
}

/**
 * Extrai o productId do payload para mapear para o plano interno.
 */
export function extractProductId(payload: HublaWebhookPayload): string | null {
  const data = payload.event || payload
  return data.product?.id ?? null
}

/**
 * Calcula a data de expiração com base no ciclo de cobrança.
 * Se a Hubla enviar nextBillingDate, usa diretamente.
 * Caso contrário, estima 30 dias * billingCycleMonths.
 */
export function calculateExpiresAt(payload: HublaWebhookPayload): string | null {
  const data = payload.event || payload
  if (data.subscription?.nextBillingDate) {
    return data.subscription.nextBillingDate
  }

  const cycleMonths = data.subscription?.billingCycleMonths ?? 1
  const now = new Date()
  now.setMonth(now.getMonth() + cycleMonths)
  return now.toISOString()
}
