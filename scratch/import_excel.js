import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const PRODUCT_MAP = {
  'I56UyU6TcVfNx30gqL0i': 'essencial',
  'CtS4aDPpPQjbTmnVnwhh': 'essencial',
  'FRqufWE8Mgf9cmCEFDLq': 'profissional'
}

async function importFromExcelXml() {
  const xmlPath = 'scratch/excel_unzipped/xl/worksheets/sheet1.xml'
  if (!fs.existsSync(xmlPath)) {
    console.error('Arquivo XML não encontrado. Execute o unzipping primeiro.')
    return
  }

  const content = fs.readFileSync(xmlPath, 'utf8')
  
  // Regex para extrair linhas (simplificado para o formato XML do Excel)
  const rowRegex = /<row r="(\d+)".*?>(.*?)<\/row>/g
  const cellRegex = /<c r="([A-Z]+)\d+".*?>(?:<v>(.*?)<\/v>)?<\/c>/g

  let match
  let count = 0
  let skipped = 0

  console.log('--- Iniciando Importação ---')

  while ((match = rowRegex.exec(content)) !== null) {
    const rowNum = match[1]
    const rowContent = match[2]

    if (rowNum === '1') continue // Pula cabeçalho

    const cells = {}
    let cellMatch
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      cells[cellMatch[1]] = cellMatch[2]
    }

    // Mapeamento de colunas baseado na análise prévia:
    // D: Status da fatura
    // V: Email do cliente
    // N: ID do produto
    // Y: Plano de assinatura (Anual / Mensal)
    // H: Data de pagamento (formato "DD/MM/YYYY HH:MM:SS")

    const status = cells['D']
    const email = cells['V']?.toLowerCase().trim()
    const productId = cells['N']
    const planType = cells['Y'] // "Anual" ou "Mensal"
    const paymentDateStr = cells['H']

    if (status !== 'Paga' || !email) {
      skipped++
      continue
    }

    const planId = PRODUCT_MAP[productId] || 'essencial'
    
    // Calcular expiração
    let expiresAt = new Date()
    if (paymentDateStr) {
      const [datePart] = paymentDateStr.split(' ')
      const [day, month, year] = datePart.split('/').map(Number)
      expiresAt = new Date(year, month - 1, day)
    }

    if (planType === 'Anual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }

    console.log(`Importando: ${email} | Plano: ${planId} (${planType}) | Expira: ${expiresAt.toLocaleDateString()}`)

    const { error } = await supabase
      .from('users')
      .upsert({
        clerk_user_id: `pending_${email}`,
        email: email,
        subscription_status: 'active',
        plan_id: planId,
        subscription_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' })

    if (error) {
      console.error(`Erro ao importar ${email}:`, error.message)
    } else {
      count++
    }
  }

  console.log(`\n--- Fim da Importação ---`)
  console.log(`Sucesso: ${count}`)
  console.log(`Ignorados/Falhas: ${skipped}`)
}

importFromExcelXml()
