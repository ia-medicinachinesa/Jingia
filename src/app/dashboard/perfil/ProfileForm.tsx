'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, CreditCard, ExternalLink, Save, Stethoscope } from 'lucide-react'
import { updateProfileMetadata } from './actions'
import { useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { useI18n } from '@/i18n/client'

interface ProfileFormProps {
  initialProfession: string
  initialLevel: string
  initialSpecialty: string
}

export default function ProfileForm({ initialProfession, initialLevel, initialSpecialty }: ProfileFormProps) {
  const { t } = useI18n()
  const [profession, setProfession] = useState(initialProfession)
  const [level, setLevel] = useState(initialLevel)
  const [specialty, setSpecialty] = useState(initialSpecialty)
  const [isSaving, setIsSaving] = useState(false)
  const { openUserProfile } = useClerk()

  async function handleSave() {
    setIsSaving(true)
    try {
      const res = await updateProfileMetadata({ profession, level, specialty })
      if (res.success) {
        toast.success(t('profile.saved'))
      } else {
        throw new Error()
      }
    } catch {
      toast.error(t('profile.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Dados Profissionais */}
      <section className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-brand-aco/20 text-brand-preto dark:text-brand-offwhite">
            <Stethoscope size={18} />
          </div>
          <h2 className="text-xs font-bold text-brand-preto dark:text-brand-offwhite uppercase tracking-widest">
            {t('profile.professionalData')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">{t('profile.profession')}</label>
            <input
              type="text"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder={t('profile.professionPlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-gray-900/50 focus:outline-none focus:ring-2 focus:ring-brand-preto dark:focus:ring-brand-sombra transition-all text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">{t('profile.level')}</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-gray-900/50 focus:outline-none focus:ring-2 focus:ring-brand-preto dark:focus:ring-brand-sombra transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="Acupunturista">{t('profile.levelAcupuncturist')}</option>
              <option value="Estudante de Acupuntura">{t('profile.levelStudent')}</option>
              <option value="Outro">{t('profile.levelOther')}</option>
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">{t('profile.specialty')}</label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder={t('profile.specialtyPlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-gray-900/50 focus:outline-none focus:ring-2 focus:ring-brand-preto dark:focus:ring-brand-sombra transition-all text-sm"
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-50 dark:border-white/5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-preto text-white dark:bg-brand-offwhite dark:text-brand-preto rounded-xl font-bold text-sm hover:opacity-80 active:scale-95 transition-all shadow-md disabled:opacity-50"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {t('profile.save')}
          </button>
        </div>
      </section>

      {/* Gestão e Segurança */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-brand-preto dark:text-brand-offwhite">
              <ShieldCheck size={18} />
            </div>
            <h2 className="text-xs font-bold text-brand-preto dark:text-brand-offwhite uppercase tracking-widest">
              {t('profile.security')}
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            {t('profile.securityDescription')}
          </p>
          <button
            onClick={() => openUserProfile()}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/60 rounded-xl transition-all group"
          >
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('profile.accountSettings')}</span>
            <ExternalLink size={16} className="text-gray-400 group-hover:text-brand-preto dark:group-hover:text-brand-offwhite transition-colors" />
          </button>
        </section>

        <section className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-brand-preto dark:text-brand-offwhite">
              <CreditCard size={18} />
            </div>
            <h2 className="text-xs font-bold text-brand-preto dark:text-brand-offwhite uppercase tracking-widest">
              {t('profile.subscription')}
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            {t('profile.subscriptionDescription')}
          </p>
          <Link
            href="/dashboard/planos"
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/60 rounded-xl transition-all group mb-2"
          >
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('profile.changePlan')}</span>
            <ExternalLink size={16} className="text-gray-400 group-hover:text-brand-preto dark:group-hover:text-brand-offwhite transition-colors" />
          </Link>
          <a
            href="#"
            target="_blank"
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/60 rounded-xl transition-all group"
          >
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('profile.paymentPortal')}</span>
            <ExternalLink size={16} className="text-gray-400 group-hover:text-brand-preto dark:group-hover:text-brand-offwhite transition-colors" />
          </a>
        </section>
      </div>
    </div>
  )
}
