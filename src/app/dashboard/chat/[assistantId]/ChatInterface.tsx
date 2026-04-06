'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, AlertCircle } from 'lucide-react'
import { AssistantConfig } from '@/lib/assistants'
import { PlanId } from '@/lib/plans'
import ChatMessage from '@/components/ChatMessage'
import UsageBar from '@/components/UsageBar'
import UpgradeCTA from '@/components/UpgradeCTA'
import { cn } from '@/lib/utils'

// Aviso Médico de Responsabilidade
const MEDICAL_DISCLAIMER =
  'Aviso: Este assistente é uma ferramenta de suporte clínico para acupunturistas. ' +
  'As informações geradas não substituem o julgamento clínico do profissional ' +
  'nem constituem prescrição médica. Use com responsabilidade.'

interface Message {
  role:    'user' | 'assistant'
  content: string
}

interface Props {
  assistant:      AssistantConfig
  planId:         PlanId
  messagesUsed:   number
  messagesLimit:  number
}

export default function ChatInterface({ assistant, planId, messagesUsed, messagesLimit }: Props) {
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [isLoading, setIsLoading]   = useState(false)
  const [threadId, setThreadId]     = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [usedCount, setUsedCount]   = useState(messagesUsed)
  const bottomRef                   = useRef<HTMLDivElement>(null)
  const inputRef                    = useRef<HTMLTextAreaElement>(null)

  // Scroll automático para a última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const isAtLimit = usedCount >= messagesLimit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading || isAtLimit) return
    if (trimmed.length > 4000) {
      setError('Mensagem muito longa. Máximo de 4.000 caracteres.')
      return
    }

    setError(null)
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setIsLoading(true)

    // SIMULAÇÃO TEMPORÁRIA DE BACKEND PARA A UI (visto que a API de IA real ainda não foi ligada)
    try {
      // Quando a API existir:
      // const res = await fetch('/api/chat', ...)
      
      // MOCK
      setTimeout(() => {
        setUsedCount(prev => prev + 1)
        setMessages(prev => [...prev, { role: 'assistant', content: `[MOCK] O assistente processou sua mensagem: "${trimmed}". A lógica real da OpenAI será integrada aqui na rota backend.` }])
        setIsLoading(false)
      }, 1500);

    } catch {
      setError('Não foi possível conectar ao servidor. Verifique sua conexão.')
      setIsLoading(false)
    }
  }

  // Permite enviar com Enter (Shift+Enter = nova linha)
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

      {/* Header do assistente */}
      <div className="flex items-center gap-4 p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
        <span className="text-4xl drop-shadow-sm">{assistant.icon}</span>
        <div>
          <h1 className="font-bold text-gray-900 text-lg tracking-tight">{assistant.name}</h1>
          <p className="text-sm text-gray-500">{assistant.description}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 md:p-6 scroll-smooth">
        {/* Disclaimer médico */}
        <div className="bg-amber-50/50 border border-amber-100/50 rounded-xl p-4 mb-6 text-xs text-amber-700 leading-relaxed font-medium">
          ⚕️ {MEDICAL_DISCLAIMER}
        </div>

        {/* Barra de uso de mensagens (só no topo do chat para referência) */}
        {isAtLimit && (
          <div className="mb-6">
            <UpgradeCTA currentPlan={planId} />
          </div>
        )}

        {/* Área de mensagens vazia */}
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-16 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
               <span className="text-4xl">{assistant.icon}</span>
            </div>
            <p className="text-gray-500 font-medium">
              Olá! Sou o especialista em <strong className="text-brand-blue">{assistant.name}</strong>.
            </p>
            <p className="text-sm mt-1">Como posso te ajudar hoje na sua prática clínica?</p>
          </div>
        )}

        {/* Lista de mensagens */}
        <div className="space-y-6">
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 text-gray-400 text-sm p-2">
              <div className="flex gap-1.5 items-center p-3 rounded-2xl bg-gray-50 rounded-bl-sm border border-gray-100 shadow-sm">
                <span className="w-2 h-2 bg-brand-teal rounded-full animate-pulse [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-brand-teal rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-brand-teal rounded-full animate-pulse [animation-delay:300ms]" />
              </div>
              <span className="animate-pulse">Pensando...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="mx-5 mb-2 flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-sm border border-red-100">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Footer com Input */}
      <div className="p-4 md:p-6 bg-white border-t border-gray-100">
         <form onSubmit={handleSubmit} className="flex gap-3 items-end relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAtLimit ? 'Limite de mensagens atingido.' : 'Descreva o caso clínico ou dúvida...'}
            disabled={isLoading || isAtLimit}
            rows={1}
            maxLength={4000}
            className={cn(
              'flex-1 resize-none rounded-2xl border border-gray-200 px-5 py-4 text-sm bg-gray-50/50',
              'focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-brand-teal focus:bg-white transition-all shadow-sm',
              'disabled:bg-gray-100 disabled:text-gray-400',
              'min-h-[54px] max-h-[160px] overflow-y-auto'
            )}
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = `${Math.min(t.scrollHeight, 160)}px`
            }}
          />
          <button
            type="submit"
            disabled={isLoading || isAtLimit || !input.trim()}
            className={cn(
              'h-[54px] w-[54px] flex items-center justify-center rounded-2xl transition-all shrink-0 shadow-sm',
              'bg-brand-blue text-white hover:bg-brand-teal',
              'disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none'
            )}
            aria-label="Enviar mensagem"
          >
            <Send size={20} className={input.trim() && !isLoading ? "ml-1" : ""} />
          </button>
        </form>
        <div className="flex justify-between items-center px-2 mt-3">
            <p className="text-[11px] text-gray-400 font-medium">
              {input.length}/4000 caracteres
            </p>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              <strong>Enter</strong> para enviar · <strong>Shift+Enter</strong> para linha
            </p>
        </div>
      </div>
    </div>
  )
}
