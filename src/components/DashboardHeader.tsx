import React from 'react'
import UsageBar from '@/components/UsageBar'
import { PlanId } from '@/lib/plans'

interface DashboardHeaderProps {
  userName: string
  planId: PlanId
  messagesUsed: number
  messagesLimit: number
}

export default function DashboardHeader({
  userName,
  planId,
  messagesUsed,
  messagesLimit,
}: DashboardHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
        Olá, {userName}
      </h2>
      
      <div className="flex items-center gap-6">
        <div className="hidden sm:block w-48">
          <UsageBar used={messagesUsed} limit={messagesLimit} showLabel={false} />
        </div>
        
        <div className="h-8 w-px bg-gray-200"></div>
        
        {/* Avatar placeholder — será substituído por UserButton do Clerk quando configurado */}
        <div className="w-9 h-9 rounded-full bg-brand-teal flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-brand-light">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
