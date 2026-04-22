import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carrega as variáveis de ambiente do .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function seedUser() {
  const clerkUserId = 'user_3CP2IOJwVXsj0ByJxiKTEY3fMz5'
  const email = 'ia.medicinachinesa@gmail.com'

  console.log(`Inserindo usuário: ${email} (${clerkUserId})...`)

  const { data, error } = await supabase
    .from('users')
    .upsert({
      clerk_user_id: clerkUserId,
      email: email,
      subscription_status: 'active',
      plan_id: 'profissional',
      monthly_message_count: 0,
      updated_at: new Date().toISOString()
    }, { onConflict: 'clerk_user_id' })
    .select()

  if (error) {
    console.error('Erro ao inserir usuário:', error)
  } else {
    console.log('Usuário inserido/atualizado com sucesso!', data)
  }
}

seedUser()
