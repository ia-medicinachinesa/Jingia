-- ════════════════════════════════════════════════════════════════
-- RPC: increment_message_count
-- Incrementa o contador mensal de mensagens de um usuário de forma atômica.
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_message_count(p_clerk_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET 
    monthly_message_count = COALESCE(monthly_message_count, 0) + 1,
    updated_at = NOW()
  WHERE clerk_user_id = p_clerk_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════
-- RPC: increment_thread_message_count
-- Incrementa o contador de mensagens de uma thread específica.
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_thread_message_count(p_openai_thread_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE threads
  SET 
    message_count = COALESCE(message_count, 0) + 1,
    updated_at = NOW()
  WHERE openai_thread_id = p_openai_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
