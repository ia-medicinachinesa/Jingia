'use server'

import { auth, clerkClient, currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'

export async function updateProfileMetadata(data: {
  crm?: string
  specialty?: string
}) {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Não autorizado')
  }

  try {
    const client = await clerkClient()
    const user = await currentUser()
    
    if (!user) {
      throw new Error('Usuário não encontrado no Clerk')
    }

    // 1. Atualizar Clerk (Cache Rápido)
    await client.users.updateUser(userId, {
      publicMetadata: {
        crm: data.crm,
        specialty: data.specialty,
      },
    })

    // 2. Atualizar Supabase (Fonte da Verdade)
    await db.upsertUser(userId, user.emailAddresses[0].emailAddress, {
      crm: data.crm,
      specialty: data.specialty,
    })

    revalidatePath('/dashboard/perfil')
    return { success: true }
  } catch (error) {
    console.error('Erro ao atualizar metadados do perfil:', error)
    return { success: false, error: 'Falha ao salvar informações' }
  }
}
