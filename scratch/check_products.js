import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listProducts() {
  console.log('--- Analisando Produtos nos Webhooks ---')
  const { data: events, error } = await supabase
    .from('subscription_events')
    .select('payload')
  
  if (error) {
    console.error('Erro ao buscar eventos:', error)
    return
  }

  const products = new Map()

  events?.forEach(e => {
    const p = e.payload.event?.product || e.payload.product
    if (p && p.id) {
      products.set(p.id, p.name)
    }
  })

  console.log('Produtos encontrados:')
  products.forEach((name, id) => {
    console.log(`- ${name} (ID: ${id})`)
  })
}

listProducts()
