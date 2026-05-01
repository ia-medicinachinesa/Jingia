'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send, Sparkles, FileText, Target, Ear, Zap, Activity, BookOpen, Megaphone, LucideIcon, Lock } from 'lucide-react'
import { AssistantConfig } from '@/lib/assistants'
import { PlanId } from '@/lib/plans'
import ChatMessage from '@/components/ChatMessage'
import UpgradeCTA from '@/components/UpgradeCTA'
import FileUpload from '@/components/FileUpload'
import { cn } from '@/lib/utils'

// Mapeamento de Ícones Fine-Line (Sincronizado)
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
  assistant:       AssistantConfig
  planId:          PlanId
  messagesUsed:    number
  messagesLimit:   number
  initialThreadId: string | null
}

export default function ChatInterface({ assistant, planId, messagesUsed, messagesLimit, initialThreadId }: Props) {
  const [messages, setMessages]               = useState<Message[]>([])
  const [input, setInput]                     = useState('')
  const [isLoading, setIsLoading]             = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(!!initialThreadId)
  const [threadId, setThreadId]               = useState<string | null>(initialThreadId)
  const [usedCount, setUsedCount]             = useState(messagesUsed)
  const [vectorStoreId, setVectorStoreId]     = useState<string | null>(null)
  const [fileName, setFileName]               = useState<string | null>(null)
  const bottomRef                             = useRef<HTMLDivElement>(null)
  const inputRef                              = useRef<HTMLTextAreaElement>(null)
  const router                                = useRouter()

  // Scroll automático para a última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Carrega histórico se houver threadId inicial
  useEffect(() => {
    async function loadHistory() {
      if (!initialThreadId) return
      
      setIsLoadingHistory(true)
      try {
        // Busca mensagens
        const res = await fetch(`/api/threads/messages?threadId=${initialThreadId}`)
        const data = await res.json()
        if (data.messages) {
          setMessages(data.messages)
        }

        // Tenta recuperar o nome do arquivo do título da thread (via lista de threads ou API)
        // Por simplicidade, vamos buscar a thread no Supabase para pegar o título
        const { supabaseAdmin } = await import('@/lib/supabase')
        const { data: thread } = await supabaseAdmin
          .from('threads')
          .select('title')
          .eq('openai_thread_id', initialThreadId)
          .single()
        
        if (thread?.title?.startsWith('📄 ')) {
          const extractedName = thread.title.split(' - ')[0].replace('📄 ', '')
          setFileName(extractedName)
        }
      } catch (error) {
        console.error('Erro ao carregar histórico:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    loadHistory()
  }, [initialThreadId])

  const isAtLimit = usedCount >= messagesLimit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading || isAtLimit) return
    if (trimmed.length > 4000) {
      toast.error('Mensagem muito longa', { description: 'Máximo de 4.000 caracteres permitidos.' })
      return
    }

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setIsLoading(true)

    // Integração Real da OpenAI via nossa API backend (Streaming)
    try {
      const isNewApiAssistant = assistant.id === 'ASS-07' || assistant.id === 'ASS-06'
      const apiUrl = isNewApiAssistant ? '/api/chat/responses' : '/api/chat'
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: trimmed, 
          assistantId: assistant.id,
          threadId: threadId, // Para API antiga e agora para a nova também
          vectorStoreId: isNewApiAssistant ? vectorStoreId : undefined, // Para API nova
          fileName: isNewApiAssistant ? fileName : undefined,
        })
      })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao comunicar com o assistente.')
      }

      // 1. Aumentar o uso na view localmente para feedback instantâneo
      setUsedCount(prev => prev + 1)
      
      // 2. Preparar a mensagem vazia do assistente para ir preenchendo
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      setIsLoading(false) // Desliga o loader "Pensando..." enquanto stream rola

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) throw new Error('Stream não suportado pelo navegador.')

      let assistantMessage = ''
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // SSE usa '\n\n' para marcar o fim de um evento
        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
          const eventPayload = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          
          const lines = eventPayload.split('\n')
          let eventType = 'message'
          let eventData = ''
          
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim()
            if (line.startsWith('data: ')) eventData = line.slice(6)
          }

          if (eventData === '[DONE]') {
            // Fim do stream finalizado pela API legada
            router.refresh()
            inputRef.current?.focus()
            continue
          }

          if (eventType === 'threadId') {
            setThreadId(eventData)
          } else if (eventType === 'error') {
            try { 
              const errorObj = JSON.parse(eventData)
              toast.error(errorObj.message || errorObj) 
            } catch { 
              toast.error(eventData) 
            }
          } else if (eventType === 'message' && eventData) {
            try {
              const parsed = JSON.parse(eventData)
              
              // Suporte para Responses API v6 (OpenAI 2026)
              if (typeof parsed === 'object' && parsed !== null) {
                // Captura do Delta de Texto
                if (parsed.type === 'response.output_text.delta' && parsed.delta) {
                  assistantMessage += parsed.delta
                } 
                // Captura do ID da resposta para manter o contexto (Pointer para a próxima mensagem)
                else if (parsed.type === 'response.created' && parsed.response?.id) {
                  setThreadId(parsed.response.id)
                }
                // Fim da Resposta
                else if (parsed.type === 'response.done') {
                  router.refresh()
                  inputRef.current?.focus()
                }
              } 
              // Suporte para Chat Completions legado (Envio direto da string)
              else {
                assistantMessage += parsed
              }
              
              // Atualiza reativamente a última mensagem na tela pedaço a pedaço
              setMessages(prev => {
                const newMsgs = [...prev]
                if (newMsgs.length > 0) {
                  newMsgs[newMsgs.length - 1].content = assistantMessage
                }
                return newMsgs
              })
            } catch (err) {
              console.error('Erro ao processar evento do stream:', err)
            }
          }
          
          boundary = buffer.indexOf('\n\n')
        }
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível conectar ao servidor.'
      toast.error(message)
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  // Permite enviar com Enter (Shift+Enter = nova linha)
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const AssistantIcon = ASSISTANT_ICONS[assistant.id] || Sparkles

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto bg-white/70 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden animate-fade-in-up">

      {/* Header do assistente */}
      <div className="flex items-center gap-4 p-5 md:p-6 border-b border-gray-100 dark:border-white/10 bg-gray-50/30 dark:bg-gray-800/30">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-brand-preto dark:text-brand-offwhite shadow-sm shrink-0">
          <AssistantIcon size={24} strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 dark:text-gray-100 text-lg tracking-tight">{assistant.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{assistant.description}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 md:p-6 scroll-smooth">
        {/* Disclaimer médico */}
        <div className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100/50 dark:border-amber-800/50 rounded-xl p-4 mb-6 text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
          ⚕️ {MEDICAL_DISCLAIMER}
        </div>
        
        {/* Identificador do Arquivo Analisado (Estilo Gemini/GPT - Card na Timeline) */}
        {fileName && (
          <div className="flex justify-start mb-8 animate-fade-in">
            <div className="bg-gray-50/80 dark:bg-gray-900/40 border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-sm backdrop-blur-sm group transition-all hover:shadow-md max-w-[85%] sm:max-w-[70%]">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-brand-preto dark:text-brand-offwhite shadow-sm ring-1 ring-gray-100 dark:ring-white/5">
                <FileText size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 mb-1">Documento Analisado</p>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{fileName}</h4>
              </div>
              <button 
                onClick={() => {
                  setVectorStoreId(null)
                  setFileName(null)
                }}
                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white dark:hover:bg-gray-700 rounded-md text-gray-400 hover:text-red-500 transition-all"
                title="Remover arquivo"
              >
                <Lock size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Barra de uso de mensagens (só no topo do chat para referência) */}
        {isAtLimit && (
          <div className="mb-6">
            <UpgradeCTA currentPlan={planId} />
          </div>
        )}

        {/* Carregando histórico de conversa existente */}
        {isLoadingHistory && (
          <div className="text-center py-16 flex flex-col items-center justify-center">
            <div className="flex gap-1.5 items-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-sm mb-4">
              <span className="w-2.5 h-2.5 bg-brand-preto dark:bg-gray-400 rounded-full animate-pulse [animation-delay:0ms]" />
              <span className="w-2.5 h-2.5 bg-brand-preto dark:bg-gray-400 rounded-full animate-pulse [animation-delay:150ms]" />
              <span className="w-2.5 h-2.5 bg-brand-preto dark:bg-gray-400 rounded-full animate-pulse [animation-delay:300ms]" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Carregando conversa...</p>
          </div>
        )}

        {/* Área de mensagens vazia (só mostrar quando não está carregando histórico) */}
        {!isLoadingHistory && messages.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 py-16 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-white/5">
               <AssistantIcon size={32} strokeWidth={1.5} className="text-brand-aco opacity-50" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              Olá! Sou o especialista em <strong className="text-brand-preto dark:text-brand-offwhite">{assistant.name}</strong>.
            </p>
            <p className="text-sm mt-1">Como posso te ajudar hoje na sua prática clínica?</p>
          </div>
        )}

        {/* Lista de mensagens */}
        <div className="space-y-6" aria-live="polite">
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500 text-sm p-2 animate-fade-in-up">
              <div className="flex gap-1.5 items-center p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 rounded-bl-sm border border-gray-100 dark:border-gray-700 shadow-sm">
                <span className="w-2 h-2 bg-brand-preto dark:bg-gray-400 rounded-full animate-pulse [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-brand-preto dark:bg-gray-400 rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-brand-preto dark:bg-gray-400 rounded-full animate-pulse [animation-delay:300ms]" />
              </div>
              <span className="animate-pulse">Pensando...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Footer com Input */}
      <div className="p-4 md:p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
         <form onSubmit={handleSubmit} className="flex gap-3 items-end relative">
          
          {/* Componente de Upload para Analistas (Artigos e Exames) */}
          {(assistant.id === 'ASS-07' || assistant.id === 'ASS-06') && (
            <div className="mb-1.5">
              <FileUpload 
                planId={planId}
                onUploadComplete={(vsId, fId, fName) => {
                  setVectorStoreId(vsId)
                  setFileName(fName || 'Arquivo selecionado')
                }}
                disabled={isLoading}
              />
            </div>
          )}

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
              'flex-1 resize-none rounded-2xl border border-gray-200 dark:border-gray-600 px-5 py-4 text-sm bg-gray-50/50 dark:bg-gray-700 dark:text-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-brand-preto dark:focus:ring-brand-offwhite focus:border-brand-preto dark:focus:border-brand-offwhite focus:bg-white dark:focus:bg-gray-600 transition-all shadow-sm',
              'disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-400 dark:disabled:text-gray-500',
              'min-h-[54px] max-h-[160px] overflow-y-auto placeholder:text-gray-400 dark:placeholder:text-gray-500'
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
              'bg-brand-preto text-white hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600',
              'disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none'
            )}
            aria-label="Enviar mensagem"
          >
            <Send size={20} className={input.trim() && !isLoading ? "ml-1" : ""} />
          </button>
        </form>
        <div className="flex justify-between items-center px-2 mt-3">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              {input.length}/4000 caracteres
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">
              <strong>Enter</strong> para enviar · <strong>Shift+Enter</strong> para linha
            </p>
        </div>
      </div>
    </div>
  )
}
