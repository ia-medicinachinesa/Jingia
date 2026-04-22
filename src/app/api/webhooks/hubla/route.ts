import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  HUBLA_HEADERS,
  extractBuyerEmail,
  extractProductId,
  resolveInternalPlanId,
  calculateExpiresAt,
  type HublaWebhookPayload,
  type HublaEventType,
} from '@/lib/hubla'

// ═══════════════════════════════════════════════════════════════
// POST /api/webhooks/hubla
// Recebe eventos da plataforma Hubla e atualiza o estado de
// assinatura dos usuários no banco de dados.
//
// Regras de Negócio:
//   RN-04 — Pagamento exclusivamente via plataforma externa
//   RN-05 — Atualização apenas via webhook autenticado
//   RN-06 — Desativação imediata por cancelamento/reembolso
//
// Segurança:
//   SEC-09 — Validação de token antes de qualquer processamento
// ═══════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  // ── 0. Debug: Log de Headers ────────────────────────────────
  const allHeaders: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    allHeaders[key] = value
  })
  // console.log('[HUBLA WEBHOOK] Headers recebidos:', JSON.stringify(allHeaders, null, 2))

  // ── 1. Validar token de autenticação ─────────────────────────
  const token = req.headers.get(HUBLA_HEADERS.TOKEN)
  const expectedToken = process.env.HUBLA_WEBHOOK_TOKEN

  if (!expectedToken) {
    console.error('[HUBLA WEBHOOK] HUBLA_WEBHOOK_TOKEN não configurado')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  if (!token || token !== expectedToken) {
    console.warn('[HUBLA WEBHOOK] Token inválido recebido')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Verificar sandbox ─────────────────────────────────────
  const isSandbox = req.headers.get(HUBLA_HEADERS.SANDBOX) === 'true'
  const isProduction = process.env.NODE_ENV === 'production'

  if (isSandbox && isProduction) {
    console.info('[HUBLA WEBHOOK] Evento sandbox ignorado em produção')
    return NextResponse.json({ status: 'sandbox_ignored' }, { status: 200 })
  }

  // ── 3. Parsear payload ───────────────────────────────────────
  let payload: HublaWebhookPayload
  let rawBody: string

  try {
    rawBody = await req.text()
    payload = JSON.parse(rawBody) as HublaWebhookPayload
  } catch {
    console.error('[HUBLA WEBHOOK] Payload JSON inválido')
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // ── 4. Extrair tipo de evento ────────────────────────────────
  // Tenta extrair do header, se não houver, tenta extrair da raiz do payload (formato v2.0.0)
  const headerEvent = req.headers.get(HUBLA_HEADERS.EVENT)
  const bodyEvent = payload.type
  const rawEventType = headerEvent || bodyEvent

  if (!rawEventType) {
    console.warn('[HUBLA WEBHOOK] Tipo de evento não identificado (Header ou Body)')
    // Para facilitar o debug no terminal do usuário:
    console.log('[HUBLA WEBHOOK] Payload recebido:', rawBody)
    return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
  }

  // Mapeia nomenclaturas v2 da Hubla (com ponto) para os nossos tipos internos (com underline)
  let eventType = rawEventType as HublaEventType
  
  const eventMapping: Record<string, HublaEventType> = {
    'customer.member_added': 'access_granted',
    'customer.member_removed': 'access_removed',
    'invoice.payment_succeeded': 'invoice_payment_succeeded',
    'invoice.payment_failed': 'invoice_payment_failed',
    'invoice.created': 'invoice_created',
    'invoice.status_updated': 'invoice_status_updated',
    'subscription.created': 'subscription_created',
    'subscription.activated': 'subscription_activated',
    'subscription.deactivated': 'subscription_deactivated',
    'subscription.expiring': 'subscription_expiring',
    'subscription.renewal_disabled': 'renewal_disabled',
    'subscription.renewal_enabled': 'renewal_enabled',
    'refund.requested': 'refund_requested'
  }

  if (eventMapping[rawEventType]) {
    eventType = eventMapping[rawEventType]
  }


  // ── 5. Gerar ID de idempotência ──────────────────────────────
  const hublaIdempotency = req.headers.get(HUBLA_HEADERS.IDEMPOTENCY)
  const subscriptionId = payload.subscription?.id ?? payload.invoice?.id ?? ''
  const eventId = hublaIdempotency ?? `${subscriptionId}_${eventType}_${payload.modifiedAt ?? Date.now()}`

  try {
    const alreadyProcessed = await db.isEventProcessed(eventId)
    if (alreadyProcessed) {
      console.info(`[HUBLA WEBHOOK] Evento duplicado ignorado: ${eventId}`)
      return NextResponse.json({ status: 'duplicate_ignored' }, { status: 200 })
    }
  } catch (error) {
    console.error('[HUBLA WEBHOOK] Erro ao verificar idempotência:', error)
    // Continua processamento — melhor processar 2x do que perder um evento
  }

  // ── 6. Identificar usuário ───────────────────────────────────
  const buyerEmail = extractBuyerEmail(payload)
  let userId: string | null = null
  let userFound = false

  if (buyerEmail) {
    try {
      const user = await db.getUserByEmail(buyerEmail)
      if (user) {
        userId = user.id
        userFound = true
      }
    } catch (error) {
      console.error('[HUBLA WEBHOOK] Erro ao buscar usuário:', error)
    }
  }

  // ── 7. Processar evento ──────────────────────────────────────
  let status: 'success' | 'failed' | 'ignored' = 'success'
  let errorMessage: string | undefined

  try {
    if (!buyerEmail) {
      status = 'failed'
      errorMessage = 'E-mail do comprador não encontrado no payload'
      console.warn(`[HUBLA WEBHOOK] ${errorMessage}`)
    } else if (!userFound) {
      status = 'failed'
      errorMessage = `Usuário não encontrado no banco para o e-mail: ${buyerEmail}`
      console.warn(`[HUBLA WEBHOOK] ${errorMessage}`)
    } else {
      await processEvent(eventType, payload, buyerEmail)
    }
  } catch (error) {
    status = 'failed'
    errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error(`[HUBLA WEBHOOK] Erro ao processar evento ${eventType}:`, error)
  }

  // ── 8. Registrar na auditoria ────────────────────────────────
  try {
    await db.logSubscriptionEvent({
      userId,
      eventType,
      eventId,
      payload: JSON.parse(rawBody),
      status,
      errorMessage,
    })
  } catch (logError) {
    console.error('[HUBLA WEBHOOK] Erro ao registrar evento na auditoria:', logError)
  }

  // ── 9. Responder imediatamente ───────────────────────────────
  const elapsed = Date.now() - startTime
  console.info(
    `[HUBLA WEBHOOK] ${eventType} | ${status} | ${buyerEmail ?? 'sem email'} | ${elapsed}ms`
  )

  return NextResponse.json({ status, eventId }, { status: 200 })
}

// ═══════════════════════════════════════════════════════════════
// Processamento de eventos por tipo
// ═══════════════════════════════════════════════════════════════

async function processEvent(
  eventType: HublaEventType,
  payload: HublaWebhookPayload,
  email: string
) {
  const productId = extractProductId(payload)
  const planId = productId ? resolveInternalPlanId(productId) : null

  switch (eventType) {
    // ── Acesso concedido (evento principal de ativação) ────────
    case 'access_granted':
    case 'subscription_activated': {
      const expiresAt = calculateExpiresAt(payload)
      await db.updateSubscription(email, {
        subscription_status: 'active',
        plan_id: planId,
        subscription_expires_at: expiresAt,
      })
      console.info(`[HUBLA] ✅ Acesso ativado: ${email} | plano: ${planId}`)
      break
    }

    // ── Acesso removido (revogação definitiva) ─────────────────
    case 'access_removed': {
      await db.updateSubscription(email, {
        subscription_status: 'inactive',
        subscription_expires_at: null,
      })
      console.info(`[HUBLA] ❌ Acesso removido: ${email}`)
      break
    }

    // ── Assinatura desativada (cancelamento com período) ───────
    case 'subscription_deactivated':
    case 'renewal_disabled': {
      // Manter acesso até a data de expiração atual
      await db.updateSubscription(email, {
        subscription_status: 'canceled',
      })
      console.info(`[HUBLA] ⏳ Assinatura cancelada (mantém até expiração): ${email}`)
      break
    }

    // ── Renovação reativada ────────────────────────────────────
    case 'renewal_enabled': {
      await db.updateSubscription(email, {
        subscription_status: 'active',
      })
      console.info(`[HUBLA] 🔄 Renovação reativada: ${email}`)
      break
    }

    // ── Pagamento de fatura confirmado (renovação) ─────────────
    case 'invoice_payment_succeeded': {
      const expiresAt = calculateExpiresAt(payload)
      await db.updateSubscription(email, {
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
      })
      console.info(`[HUBLA] 💰 Pagamento confirmado: ${email}`)
      break
    }

    // ── Reembolso solicitado (revogação imediata — RN-06) ──────
    case 'refund_requested': {
      await db.updateSubscription(email, {
        subscription_status: 'inactive',
        subscription_expires_at: null,
      })
      console.info(`[HUBLA] 💸 Reembolso — acesso revogado: ${email}`)
      break
    }

    // ── Eventos informativos (apenas log) ─────────────────────
    case 'subscription_created':
    case 'subscription_expiring':
    case 'invoice_created':
    case 'invoice_status_updated':
    case 'invoice_payment_failed': {
      console.info(`[HUBLA] 📋 Evento informativo registrado: ${eventType} | ${email}`)
      break
    }

    default: {
      console.warn(`[HUBLA] ⚠️ Evento desconhecido: ${eventType}`)
    }
  }
}
