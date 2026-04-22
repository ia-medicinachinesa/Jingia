'use client'

import React from 'react'
import { Menu } from 'lucide-react'
import UsageBar from '@/components/UsageBar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PlanId } from '@/lib/plans'

interface DashboardHeaderProps {
  userName: string
  planId: PlanId
  messagesUsed: number
  messagesLimit: number
  onMenuToggle?: () => void
}

export default function DashboardHeader({
  userName,
  messagesUsed,
  messagesLimit,
  onMenuToggle,
}: DashboardHeaderProps) {
  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Hamburger — só no mobile */}
        {onMenuToggle && (
          <button onClick={onMenuToggle} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Abrir menu">
            <Menu size={22} className="text-gray-600 dark:text-gray-300" />
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
          Olá, {userName}
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:block w-48">
          <UsageBar used={messagesUsed} limit={messagesLimit} showLabel={false} />
        </div>
        
        <div className="h-8 w-px bg-gray-200 dark:bg-gray-800"></div>
        
        <ThemeToggle />
        
        {/* Avatar placeholder — será substituído por UserButton do Clerk quando configurado */}
        <div className="w-9 h-9 rounded-full bg-brand-teal flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-brand-light dark:border-brand-teal/30">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
