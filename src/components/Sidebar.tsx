'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { LayoutDashboard, User, Settings, LogOut, History, X } from 'lucide-react'
import { PlanId } from '@/lib/plans'
import PlanBadge from '@/components/PlanBadge'
import { cn } from '@/lib/utils'

interface SidebarProps {
  planId: PlanId
  isMobileOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ planId, isMobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { signOut } = useClerk()


  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Histórico', href: '/dashboard/historico', icon: History },
    { name: 'Meu Perfil', href: '/dashboard/perfil', icon: User },
    { name: 'Planos', href: '/dashboard/planos', icon: Settings },
  ]

  const sidebarContent = (
    <>
      <div className="p-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 group px-2" onClick={onClose}>
          <Image 
            src="/images/logos/LogoEscrita.png" 
            alt="Jing IA" 
            width={120} 
            height={40} 
            className="object-contain group-hover:opacity-80 transition-opacity"
            priority
          />
        </Link>
        {/* Botão fechar — só visível no mobile */}
        {onClose && (
          <button onClick={onClose} className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
          Menu Principal
        </h3>
        {links.map((link) => {
          const Icon = link.icon
          const isActive =
            pathname === link.href ||
            (pathname.startsWith('/dashboard/chat') && link.href === '/dashboard') ||
            (pathname.startsWith('/dashboard/historico') && link.href === '/dashboard/historico')
          
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive 
                  ? 'bg-brand-preto dark:bg-gray-800 text-brand-offwhite shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand-preto dark:hover:text-gray-100'
              )}
            >
              <Icon size={18} className={isActive ? 'text-brand-offwhite' : 'text-brand-sombra'} />
              {link.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Meu Plano</span>
          </div>
          <PlanBadge planId={planId} />
        </div>
        
        <button
          onClick={() => signOut({ redirectUrl: '/sign-in' })}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col h-full overflow-y-auto hidden md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-800 z-50 flex flex-col shadow-2xl md:hidden animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}

