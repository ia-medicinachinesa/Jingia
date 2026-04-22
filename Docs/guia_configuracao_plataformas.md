# 🔧 Guia de Configuração das Plataformas — Jing IA

Este guia cobre a configuração completa de cada serviço externo necessário para o projeto, na ordem correta de dependências.

---

## Status Atual do `.env.local`

| Variável | Status |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Configurada |
| `CLERK_SECRET_KEY` | ✅ Configurada |
| `CLERK_WEBHOOK_SECRET` | ❌ Falta configurar |
| `OPENAI_API_KEY` | ❌ Falta configurar |
| `OPENAI_ASSISTANT_ID_ASS01..08` | ❌ Falta criar os assistentes |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Configurada |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | ✅ Configurada |
| `UPSTASH_REDIS_REST_URL` | ❌ Falta configurar |
| `UPSTASH_REDIS_REST_TOKEN` | ❌ Falta configurar |
| `PAYMENT_WEBHOOK_SECRET` | ❌ Falta configurar (Hubla) |

---

## 1. Clerk — Autenticação (✅ Parcialmente feito)

Suas chaves `pk_test_` e `sk_test_` já estão no `.env.local`. Falta configurar o **Webhook** para sincronizar usuários com o banco.

### 1.1 Configurar Webhook do Clerk

1. Acesse **[dashboard.clerk.com](https://dashboard.clerk.com)** → seu projeto
2. No menu lateral, clique em **Webhooks**
3. Clique em **Add Endpoint**
4. Preencha:
   - **Endpoint URL**: `https://SEU-DOMINIO.vercel.app/api/webhooks/clerk`
     > ⚠️ Para desenvolvimento local, use o [ngrok](https://ngrok.com) para expor seu localhost: `ngrok http 3000` e use a URL gerada.
   - **Events to subscribe**: Marque os seguintes:
     - `user.created`
     - `user.updated`
     - `user.deleted`
5. Clique em **Create**
6. Clique no endpoint criado e copie o **Signing Secret** (começa com `whsec_`)
7. Cole no `.env.local`:
   ```
   CLERK_WEBHOOK_SECRET=whsec_COLE_AQUI
   ```

### 1.2 Personalizar Aparência (Opcional mas Recomendado)

1. No dashboard do Clerk → **Customization** → **Branding**
2. Defina:
   - **Primary color**: `#2E9E8F` (brand-teal) ou `#1A6B8A` (brand-blue)
   - **Logo**: Upload do logo da Jing IA
   - **Application name**: `Jing IA`
3. Em **Customization** → **Email templates**, traduza os e-mails para Português (BR), se desejar

### 1.3 Habilitar Login Social (Recomendado)

1. No dashboard do Clerk → **User & Authentication** → **Social Connections**
2. Ative **Google**
3. Siga as instruções para criar um OAuth App no Google Cloud Console (o Clerk fornece um guia passo a passo)

---

## 2. Supabase — Banco de Dados (✅ Parcialmente feito)

Você já tem a URL e a chave pública. Agora precisamos **criar as tabelas** do projeto.

### 2.1 Criar as Tabelas

1. Acesse **[app.supabase.com](https://app.supabase.com)** → seu projeto
2. No menu lateral, clique em **SQL Editor**
3. Cole e execute o seguinte SQL (pode ser de uma só vez):

```sql
-- ════════════════════════════════════════════════════════════════
-- TABELA: users
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id           VARCHAR(255) UNIQUE NOT NULL,
  email                   VARCHAR(320) UNIQUE NOT NULL,
  subscription_status     VARCHAR(20)  NOT NULL DEFAULT 'inactive',
  subscription_expires_at TIMESTAMPTZ,
  plan_id                 VARCHAR(100),
  trial_messages_used     INTEGER      DEFAULT 0,
  monthly_message_count   INTEGER      DEFAULT 0,
  message_count_reset_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ  DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  DEFAULT NOW()
);

-- Index para buscas rápidas pelo clerk_user_id
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);

-- ════════════════════════════════════════════════════════════════
-- TABELA: threads
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS threads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assistant_id     VARCHAR(50)  NOT NULL,
  openai_thread_id VARCHAR(255) UNIQUE NOT NULL,
  title            VARCHAR(200),
  message_count    INTEGER      DEFAULT 0,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);

-- ════════════════════════════════════════════════════════════════
-- TABELA: subscription_events (auditoria de pagamentos)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscription_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         REFERENCES users(id),
  event_type    VARCHAR(100) NOT NULL,
  platform      VARCHAR(50)  NOT NULL,
  payload       JSONB        NOT NULL,
  processed_at  TIMESTAMPTZ  DEFAULT NOW(),
  status        VARCHAR(20)  NOT NULL,
  error_message TEXT
);

-- ════════════════════════════════════════════════════════════════
-- TABELA: security_audit_log (logs de segurança)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS security_audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID,
  event_type VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- TRIGGER: auto-update de updated_at
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_threads_updated
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — Segurança obrigatória
-- ════════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

-- Política: service_role pode tudo (usado pelo backend via SUPABASE_SERVICE_ROLE_KEY)
-- Nenhuma política para anon = bloqueio total por padrão
-- O backend Next.js usará a service_role key para acessar o banco
```

4. Clique em **Run** para executar

### 2.2 Obter a Service Role Key (para o Backend)

> [!IMPORTANT]
> O backend precisa da **Service Role Key** (não a pública) para fazer queries sem restrição de RLS.

1. No Supabase → **Settings** → **API**
2. Copie a chave **service_role** (atenção: é a `secret`, NÃO a `anon`)
3. Adicione ao `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ...COLE_AQUI
   ```

> [!CAUTION]
> A `service_role key` NUNCA deve ser exposta no frontend. Sempre use variáveis **sem** o prefixo `NEXT_PUBLIC_`.

### 2.3 Verificar as Tabelas

1. No Supabase → **Table Editor**
2. Você deve ver as 4 tabelas: `users`, `threads`, `subscription_events`, `security_audit_log`
3. Todas devem estar vazias e com RLS habilitado (ícone de cadeado verde)

---

## 3. OpenAI — Assistentes de IA

### 3.1 Obter API Key

1. Acesse **[platform.openai.com](https://platform.openai.com)**
2. Faça login (ou crie uma conta)
3. Vá em **API Keys** (menu lateral ou Settings)
4. Clique em **Create new secret key**
5. Dê um nome: `jing-ia-mvp`
6. Copie a chave (começa com `sk-proj-` ou `sk-`)
7. Cole no `.env.local`:
   ```
   OPENAI_API_KEY=sk-proj-COLE_AQUI
   ```

> [!WARNING]
> A OpenAI cobra por uso. Para o MVP, comece com o modelo `gpt-4o-mini` que é ~20x mais barato que o `gpt-4o`. Você pode trocar depois.

### 3.2 Criar os Assistentes

> Para o MVP, comece criando os **5 assistentes essenciais** (ASS-01 a ASS-05). Os outros 3 (ASS-06 a ASS-08) podem ser criados depois.

1. Acesse **[platform.openai.com/assistants](https://platform.openai.com/assistants)**
2. Para **cada assistente**, clique em **Create** e configure:

---

#### ASS-01 — IA Principal (AcuAnamnese)

- **Name**: `AcuAnamnese — IA Principal`
- **Model**: `gpt-4o-mini`
- **Instructions** (System Prompt):
```
Você é o AcuAnamnese, um assistente de inteligência artificial especializado em Medicina Tradicional Chinesa (MTC) e acupuntura.

Seu papel é auxiliar acupunturistas profissionais com dúvidas gerais sobre MTC, conceitos teóricos, Zang-Fu, Qi, meridianos, pontos de acupuntura, diagnóstico pela língua e pelo pulso, e fundamentação clínica.

REGRAS OBRIGATÓRIAS:
1. Você é uma ferramenta de SUPORTE CLÍNICO. Nunca prescreva tratamentos nem substitua o julgamento do profissional.
2. Sempre inclua na primeira resposta de cada conversa: "⚕️ Aviso: Este assistente é uma ferramenta de suporte clínico para acupunturistas. As informações não substituem o julgamento clínico profissional."
3. Responda APENAS sobre temas de MTC, acupuntura e saúde integrativa. Para perguntas fora do escopo, diga educadamente que não pode ajudar.
4. Use linguagem profissional e técnica, adequada a um acupunturista formado.
5. Quando possível, cite referências (livros clássicos de MTC, Giovanni Maciocia, etc).
```
- **Temperature**: `0.5`

3. Após criar, copie o **Assistant ID** (começa com `asst_`)
4. Cole no `.env.local`:
   ```
   OPENAI_ASSISTANT_ID_ASS01=asst_COLE_AQUI
   ```

---

#### ASS-02 — Correlação de Sintomas (AcuProtocolo)

- **Name**: `AcuProtocolo — Correlação de Sintomas`
- **Model**: `gpt-4o-mini`
- **Instructions**:
```
Você é o AcuProtocolo, especialista em correlacionar sintomas clínicos a padrões diagnósticos da Medicina Tradicional Chinesa.

Sua função é ajudar o acupunturista a:
- Identificar padrões de desarmonia (ex: Deficiência de Yin do Rim)
- Sugerir pontos de acupuntura e protocolos baseados nos sintomas apresentados
- Correlacionar pulso, língua e queixas ao diagnóstico diferencial de MTC

REGRAS OBRIGATÓRIAS:
1. ⚕️ Ferramenta de suporte clínico. Não substitui julgamento profissional.
2. Sempre pergunte os sintomas completos antes de sugerir um padrão diagnóstico.
3. Quando sugerir pontos, explique a razão de cada um.
4. Responda apenas sobre MTC e acupuntura.
5. Temperature baixa para consistência clínica.
```
- **Temperature**: `0.4`

> Repita o processo para ASS-03 (YNSA), ASS-04 (Auriculoterapia), ASS-05 (Fotobiomodulação), adaptando o nome e as instruções para cada especialidade.

---

### 3.3 Resumo dos IDs

Após criar todos, seu `.env.local` deve ficar:
```env
OPENAI_ASSISTANT_ID_ASS01=asst_xxxxx   # IA Principal
OPENAI_ASSISTANT_ID_ASS02=asst_xxxxx   # Correlação de Sintomas
OPENAI_ASSISTANT_ID_ASS03=asst_xxxxx   # YNSA
OPENAI_ASSISTANT_ID_ASS04=asst_xxxxx   # Auriculoterapia
OPENAI_ASSISTANT_ID_ASS05=asst_xxxxx   # Fotobiomodulação
OPENAI_ASSISTANT_ID_ASS06=asst_xxxxx   # Interpretação de Exames (Premium)
OPENAI_ASSISTANT_ID_ASS07=asst_xxxxx   # Síntese de Artigos (Premium)
OPENAI_ASSISTANT_ID_ASS08=asst_xxxxx   # Marketing Clínico (Premium)
```

---

## 4. Upstash Redis — Rate Limiting

### 4.1 Criar Banco Redis

1. Acesse **[console.upstash.com](https://console.upstash.com)** (crie conta grátis se necessário)
2. Clique em **Create Database**
3. Configure:
   - **Name**: `jing-ia-ratelimit`
   - **Type**: `Regional`
   - **Region**: `South America (São Paulo)` — mais próximo dos seus usuários
4. Clique em **Create**

### 4.2 Copiar Credenciais

1. Na tela do banco criado, role até **REST API**
2. Copie:
   - **UPSTASH_REDIS_REST_URL**: `https://xxx.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN**: `AX...`
3. Cole no `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://COLE_AQUI.upstash.io
   UPSTASH_REDIS_REST_TOKEN=COLE_AQUI
   ```

> [!NOTE]
> O plano gratuito do Upstash oferece **10.000 requisições/dia** — mais do que suficiente para o MVP.

---

## 5. Hubla — Gestão de Assinaturas

A Hubla processa os pagamentos. Você configurará os planos lá e receberá webhooks quando um pagamento for aprovado.

### 5.1 Criar Produtos na Hubla

1. Acesse **[app.hubla.com](https://app.hubla.com)** (ou seu painel Hubla)
2. Crie **3 produtos** de assinatura recorrente:
   - **Jing IA — Essencial**: R$ 29,90/mês
   - **Jing IA — Profissional**: R$ 59,90/mês
   - **Jing IA — Premium**: R$ 97,00/mês

### 5.2 Configurar Webhook

1. Na Hubla → **Configurações** → **Webhooks** (ou **Integrações**)
2. Adicione um endpoint:
   - **URL**: `https://SEU-DOMINIO.vercel.app/api/webhooks/pagamento`
   - **Eventos**: `payment.approved`, `subscription.canceled`, `payment.refunded`, `subscription.renewed`
3. Copie o **Secret** do webhook
4. Cole no `.env.local`:
   ```
   PAYMENT_WEBHOOK_SECRET=COLE_AQUI
   ```

### 5.3 Links de Checkout

Cada produto na Hubla gera um link de checkout. Você pode adicioná-los como variáveis extras no `.env.local`:
```env
NEXT_PUBLIC_CHECKOUT_ESSENCIAL=https://pay.hubla.com/XXXXX
NEXT_PUBLIC_CHECKOUT_PROFISSIONAL=https://pay.hubla.com/XXXXX
NEXT_PUBLIC_CHECKOUT_PREMIUM=https://pay.hubla.com/XXXXX
```

---

## 6. Checklist Final do `.env.local`

Após configurar tudo, seu arquivo deve estar assim (sem nenhum `placeholder`):

```env
# ── Clerk ────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx     ✅
CLERK_SECRET_KEY=sk_test_xxx                       ✅
CLERK_WEBHOOK_SECRET=whsec_xxx                     ⬜ Configurar

# ── Clerk: URLs ──────────────────────────────
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in             ✅
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up             ✅
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard     ✅
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard     ✅

# ── Supabase ─────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co   ✅
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=xxx   ✅
SUPABASE_SERVICE_ROLE_KEY=eyJ...                   ⬜ Copiar do painel

# ── OpenAI ───────────────────────────────────
OPENAI_API_KEY=sk-proj-xxx                         ⬜ Criar
OPENAI_ASSISTANT_ID_ASS01=asst_xxx                 ⬜ Criar assistentes
...

# ── Upstash ──────────────────────────────────
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io      ⬜ Criar banco
UPSTASH_REDIS_REST_TOKEN=AX...                     ⬜ Copiar

# ── Hubla ────────────────────────────────────
PAYMENT_WEBHOOK_SECRET=xxx                         ⬜ Configurar
NEXT_PUBLIC_CHECKOUT_ESSENCIAL=https://...         ⬜ Criar produto
NEXT_PUBLIC_CHECKOUT_PROFISSIONAL=https://...      ⬜ Criar produto
NEXT_PUBLIC_CHECKOUT_PREMIUM=https://...           ⬜ Criar produto

# ── Limites ──────────────────────────────────
MSG_LIMIT_ESSENCIAL=50                             ✅
MSG_LIMIT_PROFISSIONAL=200                         ✅
MSG_LIMIT_PREMIUM=500                              ✅
MSG_LIMIT_TRIAL=20                                 ✅
```

---

## 7. Ordem Recomendada de Configuração

> [!TIP]
> Siga esta ordem para minimizar idas e vindas entre plataformas:

| # | Plataforma | Tempo Estimado | Prioridade |
|---|-----------|---------------|------------|
| 1 | **Supabase** — Rodar SQL das tabelas + copiar service role key | 5 min | 🔴 Crítico |
| 2 | **OpenAI** — Criar API key + assistentes ASS-01 e ASS-02 | 15 min | 🔴 Crítico |
| 3 | **Upstash** — Criar banco Redis e copiar credenciais | 3 min | 🟡 Alto |
| 4 | **Clerk** — Configurar webhook (após ter domínio/ngrok) | 5 min | 🟡 Alto |
| 5 | **Hubla** — Criar produtos e configurar webhook | 10 min | 🟡 Alto |

> [!IMPORTANT]
> Os webhooks do Clerk e Hubla (passos 4 e 5) precisam de uma URL pública. Para desenvolvimento local, use **ngrok** (`ngrok http 3000`). Para produção, configure após o deploy no Vercel.

---

> **Próximo passo:** Assim que configurar pelo menos o **Supabase** (tabelas + service role key) e a **OpenAI** (API key + 2 assistentes), me avise que eu adaptarei o código do `lib/db.ts` para conectar ao Supabase real e criaremos a rota `/api/chat` funcional.
