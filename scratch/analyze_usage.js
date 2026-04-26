import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeUsage() {
  console.log('--- Analisando Uso ---')
  
  const { data: users } = await supabase
    .from('users')
    .select('id, email, monthly_message_count')
  
  const { data: threads } = await supabase
    .from('threads')
    .select('user_id, message_count')

  const usageByUserId = {}
  
  threads?.forEach(t => {
    usageByUserId[t.user_id] = (usageByUserId[t.user_id] || 0) + t.message_count
  })

  const report = users?.map(u => ({
    email: u.email,
    countInUsersTable: u.monthly_message_count,
    countInThreadsTable: usageByUserId[u.id] || 0,
    match: u.monthly_message_count === (usageByUserId[u.id] || 0)
  }))

  console.table(report)
}

analyzeUsage()
