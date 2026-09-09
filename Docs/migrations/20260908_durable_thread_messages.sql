-- Histórico durável das conversas da Jing IA.
-- Execute este arquivo uma única vez no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS public.thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  openai_response_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT thread_messages_request_role_unique
    UNIQUE (thread_id, request_id, role)
);

CREATE INDEX IF NOT EXISTS thread_messages_thread_created_idx
  ON public.thread_messages (thread_id, created_at);

ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.thread_messages IS
  'Histórico canônico das conversas. Acesso exclusivo pelo backend com service role.';

COMMENT ON COLUMN public.thread_messages.request_id IS
  'Chave de idempotência compartilhada pelas mensagens do usuário e do assistente.';
