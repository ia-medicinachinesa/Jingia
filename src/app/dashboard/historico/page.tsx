'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MessageSquare, Trash2, Clock, ArrowLeft, Search, Sparkles, FileText, Target, Ear, Zap, Activity, BookOpen, Megaphone, LucideIcon } from 'lucide-react'
import { ASSISTANTS } from '@/lib/assistants'
import { cn } from '@/lib/utils'

// Mapeamento de Ícones Fine-Line (Sincronizado com Dashboard)
const ASSISTANT_ICONS: Record<string, LucideIcon> = {
  'ASS-01': Sparkles,
  'ASS-02': FileText,
  'ASS-03': Target,
  'ASS-04': Ear,
  'ASS-05': Zap,
  'ASS-06': Activity,
  'ASS-07': BookOpen,
  'ASS-08': Megaphone,
}
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'

interface Thread {
  id: string
  assistant_id: string
  openai_thread_id: string
  title: string | null
  message_count: number
  created_at: string
  updated_at: string
}

export default function HistoricoPage() {
  const [threadList, setThreadList] = useState<Thread[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // States de Filtro
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>('all')

  // State para exclusão
  const [threadToDelete, setThreadToDelete] = useState<Thread | null>(null)

  useEffect(() => {
    fetchThreads()
  }, [])

  async function fetchThreads() {
    try {
      const res = await fetch('/api/threads')
      const data = await res.json()
      setThreadList(data.threads ?? [])
    } catch {
      toast.error('Erro ao carregar o histórico de conversas.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!threadToDelete) return
    
    const threadId = threadToDelete.id
    setDeletingId(threadId)
    setThreadToDelete(null) // Fecha o modal imediatamente

    try {
      const res = await fetch(`/api/threads?id=${threadId}`, { method: 'DELETE' })
      if (res.ok) {
        setThreadList(prev => prev.filter(t => t.id !== threadId))
        toast.success('Conversa excluída com sucesso.')
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Não foi possível excluir a conversa neste momento.')
    } finally {
      setDeletingId(null)
    }
  }

  function getAssistantInfo(assistantId: string) {
    return ASSISTANTS.find(a => a.id === assistantId)
  }

  // Lógica de Filtragem
  const filteredThreads = threadList.filter(thread => {
    const matchesSearch = (thread.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAssistant = selectedAssistant === 'all' || !selectedAssistant || thread.assistant_id === selectedAssistant
    return matchesSearch && matchesAssistant
  })

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return 'Agora mesmo'
    if (diffMinutes < 60) return `${diffMinutes}min atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    if (diffDays < 7) return `${diffDays}d atrás`
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-500" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Histórico de Conversas</h1>
          <p className="text-gray-500 mt-1">Retome ou exclua suas conversas anteriores.</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por título da conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-brand-teal bg-white dark:bg-gray-800 dark:border-gray-700 transition-all text-sm"
          />
        </div>
        
        <div className="w-full sm:w-60">
          <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
            <SelectTrigger className="w-full h-11 rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-brand-teal shadow-none">
              <SelectValue placeholder="Filtrar por assistente" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos os Assistentes</SelectItem>
              {ASSISTANTS.map(assistant => (
                <SelectItem key={assistant.id} value={assistant.id}>
                  {assistant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
            <MessageSquare size={32} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-500 font-medium">Nenhuma conversa encontrada</p>
          <p className="text-sm text-gray-400 mt-1">Tente ajustar sua busca ou filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredThreads.map(thread => {
            const assistant = getAssistantInfo(thread.assistant_id)
            const AssistantIcon = ASSISTANT_ICONS[thread.assistant_id] || MessageSquare

            return (
              <div
                key={thread.id}
                className="group relative bg-white/70 dark:bg-gray-800/40 backdrop-blur-sm border border-gray-100 dark:border-white/10 rounded-2xl p-4 md:p-5 hover:border-brand-teal/50 dark:hover:border-brand-teal/50 hover:shadow-xl dark:hover:shadow-brand-teal/5 transition-all animate-fade-in-up"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-teal/10 to-brand-blue/10 dark:from-brand-teal/20 dark:to-brand-blue/20 rounded-xl flex items-center justify-center text-brand-blue dark:text-brand-teal shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    <AssistantIcon size={24} strokeWidth={1.5} />
                  </div>
                  
                  <Link 
                    href={`/dashboard/chat/${thread.assistant_id}?thread=${thread.openai_thread_id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-brand-teal transition-colors">
                        {thread.title || 'Conversa sem título'}
                      </h3>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5 capitalize text-brand-teal font-medium">
                        {assistant?.name || 'Assistente'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} />
                        {formatDate(thread.updated_at)}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {thread.message_count} msg{thread.message_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </Link>

                  <button
                    onClick={() => setThreadToDelete(thread)}
                    disabled={deletingId === thread.id}
                    className={cn(
                      'p-2 rounded-xl transition-all shrink-0',
                      'text-gray-300 hover:text-red-500 hover:bg-red-50',
                      'opacity-0 group-hover:opacity-100',
                      deletingId === thread.id && 'opacity-100 animate-pulse'
                    )}
                    aria-label="Excluir conversa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!threadToDelete} onOpenChange={(open) => !open && setThreadToDelete(null)}>
        <DialogContent className="rounded-3xl max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Excluir conversa?</DialogTitle>
            <DialogDescription className="text-gray-500 pt-2">
              Esta ação não pode ser desfeita. A conversa <strong className="text-gray-900 font-semibold">{threadToDelete?.title || 'sem título'}</strong> será removida permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setThreadToDelete(null)}
              className="rounded-xl border-gray-200"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="rounded-xl bg-red-500 hover:bg-red-600"
            >
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
