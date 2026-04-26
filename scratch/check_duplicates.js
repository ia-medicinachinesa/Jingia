import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDuplicates() {
  console.log('--- Analisando usuários ---')
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, clerk_user_id, monthly_message_count, subscription_status')
  
  if (error) {
    console.error('Erro ao buscar usuários:', error)
    return
  }

  const emailMap = new Map()
  const issues = []

  for (const user of users) {
    const lowerEmail = user.email.toLowerCase()
    if (emailMap.has(lowerEmail)) {
      issues.push({
        type: 'DUPLICATE_EMAIL',
        email: lowerEmail,
        users: [emailMap.get(lowerEmail), user]
      })
    } else {
      emailMap.set(lowerEmail, user)
    }

    if (user.clerk_user_id.startsWith('pending_')) {
      // Verifica se existe um usuário real com esse e-mail
      const realUser = users.find(u => u.email.toLowerCase() === lowerEmail && !u.clerk_user_id.startsWith('pending_'))
      if (realUser) {
        issues.push({
          type: 'UNLINKED_PENDING',
          email: lowerEmail,
          pending: user,
          real: realUser
        })
      }
    }
  }

  console.log(`Total de usuários: ${users.length}`)
  console.log(`Problemas encontrados: ${issues.length}`)
  console.dir(issues, { depth: null })
}

checkDuplicates()
