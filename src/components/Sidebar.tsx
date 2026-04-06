'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, Settings, LogOut } from 'lucide-react'
import { PlanId } from '@/lib/plans'
import PlanBadge from '@/components/PlanBadge'
import { cn } from '@/lib/utils'

interface SidebarProps {
  planId: PlanId
}

export default function Sidebar({ planId }: SidebarProps) {
  const pathname = usePathname()

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Meu Perfil', href: '/perfil', icon: User },
    { name: 'Planos', href: '/planos', icon: Settings },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto hidden md:flex">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-brand-teal flex items-center justify-center text-white font-bold text-xl group-hover:bg-brand-blue transition-colors shadow-sm">
            J
          </div>
          <span className="text-2xl font-bold text-brand-blue tracking-tight group-hover:text-brand-teal transition-colors">jing IA</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
          Menu Principal
        </h3>
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href || (pathname.startsWith('/dashboard/chat') && link.href === '/dashboard')
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive 
                  ? 'bg-brand-light text-brand-blue shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={18} className={isActive ? 'text-brand-teal' : 'text-gray-400'} />
              {link.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Meu Plano</span>
          </div>
          <PlanBadge planId={planId} />
        </div>
        
        <button
          onClick={() => window.location.href = '/sign-in'}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
