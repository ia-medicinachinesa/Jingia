'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'
import { PlanId } from '@/lib/plans'

interface Props {
  children: React.ReactNode
  userName: string
  planId: PlanId
  messagesUsed: number
  messagesLimit: number
}

export default function DashboardShell({ children, userName, planId, messagesUsed, messagesLimit }: Props) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        planId={planId}
        isMobileOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader
          userName={userName}
          planId={planId}
          messagesUsed={messagesUsed}
          messagesLimit={messagesLimit}
          onMenuToggle={() => setIsMobileOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-800/50">
          {children}
        </main>
      </div>
    </div>
  )
}
