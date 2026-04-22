'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, CreditCard, ExternalLink, Save, Stethoscope } from 'lucide-react'
import { updateProfileMetadata } from './actions'
import { useClerk } from '@clerk/nextjs'
import Link from 'next/link'

interface ProfileFormProps {
  initialCrm: string
  initialSpecialty: string
}

export default function ProfileForm({ initialCrm, initialSpecialty }: ProfileFormProps) {
  const [crm, setCrm] = useState(initialCrm)
  const [specialty, setSpecialty] = useState(initialSpecialty)
  const [isSaving, setIsSaving] = useState(false)
  const { openUserProfile } = useClerk()

  async function handleSave() {
    setIsSaving(true)
    try {
      const res = await updateProfileMetadata({ crm, specialty })
      if (res.success) {
        toast.success('Perfil atualizado com sucesso!')
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Erro ao salvar informações')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Dados Profissionais */}
      <section className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-brand-teal/10 text-brand-teal">
            <Stethoscope size={18} />
          </div>
          <h2 className="text-xs font-bold text-brand-teal uppercase tracking-widest">
            Dados Profissionais
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">Registro Profissional (CRM/CRT)</label>
            <input
              type="text"
              value={crm}
              onChange={(e) => setCrm(e.target.value)}
              placeholder="Ex: 12345/SP"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-gray-900/50 focus:outline-none focus:ring-2 focus:ring-brand-teal transition-all text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">Especialidade Principal</label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Ex: Acupuntura Clínica"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-gray-900/50 focus:outline-none focus:ring-2 focus:ring-brand-teal transition-all text-sm"
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-50 dark:border-white/5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-teal text-white rounded-xl font-bold text-sm hover:bg-brand-blue transition-all shadow-md disabled:opacity-50"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Salvar Alterações
          </button>
        </div>
      </section>

      {/* Gestão e Segurança */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <ShieldCheck size={18} />
            </div>
            <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest">
              Segurança
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Gerencie sua senha, métodos de autenticação em dois fatores e sessões ativas.
          </p>
          <button
            onClick={() => openUserProfile()}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/60 rounded-xl transition-all group"
          >
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Configurações de Conta</span>
            <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
          </button>
        </section>

        <section className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
              <CreditCard size={18} />
            </div>
            <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest">
              Assinatura
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Gerencie seu método de pagamento e histórico de faturas diretamente na Hubla.
          </p>
          <Link
            href="/dashboard/planos"
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/60 rounded-xl transition-all group mb-2"
          >
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Alterar Plano</span>
            <ExternalLink size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
          </Link>
          <a
            href="#"
            target="_blank"
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/60 rounded-xl transition-all group"
          >
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Portal de Pagamentos</span>
            <ExternalLink size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
          </a>
        </section>
      </div>
    </div>
  )
}
