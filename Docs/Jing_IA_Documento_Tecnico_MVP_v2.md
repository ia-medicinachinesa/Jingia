**JIng IA**

Hub de Inteligência Artificial para Acupunturistas

**DOCUMENTO TÉCNICO DE DESENVOLVIMENTO --- MVP v2.0**

*Regras de Negócio \| Requisitos \| Segurança \| Processamento de Dados*

Uso Interno --- Equipe de Desenvolvimento \| Confidencial

# **1. Visão Geral do Projeto** {#visão-geral-do-projeto}

O JIng IA é um SaaS nicho voltado exclusivamente para acupunturistas, que funciona como um hub centralizado de assistentes de Inteligência Artificial. O produto entrega ferramentas práticas do dia a dia clínico via IA, com acesso simples, seguro e acessível por assinatura recorrente.

## **1.1 Objetivo do MVP** {#objetivo-do-mvp}

Validar a proposta de valor com o menor custo possível, entregando uma experiência funcional e confiável para o usuário final. O MVP deve demonstrar que:

- Acupunturistas estão dispostos a pagar por assistentes de IA especializados em sua área

- A plataforma é segura, simples e não exige conhecimento técnico do usuário

- O modelo de assinatura recorrente é viável como fonte de receita

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Proposta de Valor Central</strong></p>
<p>Um assistente especializado que ajuda na rotina clínica: anamnese, protocolos,</p>
<p>explicações para pacientes, geração de conteúdo e muito mais — em um único lugar,</p>
<p>acessado por assinatura mensal simples e acessível.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **2. Stack Tecnológica e Arquitetura** {#stack-tecnológica-e-arquitetura}

| **Camada**     | **Tecnologia / Plataforma**         | **Responsabilidade**                        |
|----------------|-------------------------------------|---------------------------------------------|
| Frontend       | Next.js (React) --- App Router      | Interface, roteamento, SSR                  |
| Autenticação   | Clerk                               | Login, sessão, gestão de usuários           |
| Agentes de IA  | OpenAI Assistants API               | Lógica dos assistentes especializados       |
| Assinatura     | Hubla                      | Planos, cobranças recorrentes, webhooks     |
| Banco de Dados | Supabase (PostgreSQL gerenciado)    | Usuários, histórico, logs de auditoria      |
| Backend API    | Next.js API Routes / Route Handlers | Intermediação segura entre front e serviços |
| Hospedagem     | Vercel (frontend + API)             | Deploy, CI/CD, variáveis de ambiente        |
| Rate Limiting  | Upstash Redis                       | Controle de abuso nas rotas de chat         |
| Monitoramento  | Vercel Analytics + Logs             | Observabilidade e alertas de erro           |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Fluxo Macro do Sistema</strong></p>
<p>Usuário acessa o site → Clerk autentica o login</p>
<p>→ Backend valida assinatura ativa (banco de dados, atualizado via webhook)</p>
<p>→ Usuário acessa o hub e escolhe um assistente</p>
<p>→ Frontend envia mensagem para /api/chat → Backend valida sessão + assinatura</p>
<p>→ Backend aplica rate limit → Backend chama OpenAI Assistants API</p>
<p>→ Resposta retorna ao usuário → Thread ID persistido no banco</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **3. Regras de Negócio** {#regras-de-negócio}

As regras de negócio definem o comportamento obrigatório do sistema sob qualquer circunstância. São não-negociáveis e devem ser implementadas e testadas antes do launch.

## **RN-01 --- Acesso Exclusivo por Assinatura Ativa** {#rn-01-acesso-exclusivo-por-assinatura-ativa}

| **Atributo** | **Valor**                                                                                      |
|--------------|------------------------------------------------------------------------------------------------|
| ID           | RN-01                                                                                          |
| Descrição    | Nenhum usuário pode acessar qualquer assistente sem assinatura ativa no momento da requisição. |
| Verificação  | Feita no backend a cada chamada à /api/chat e /api/threads --- não apenas no login.            |
| Exceções     | Período de trial (se configurado) com limite de mensagens definido em RN-07.                   |
| Violação     | Retornar HTTP 403 com mensagem clara orientando o usuário a assinar um plano.                  |

## **RN-02 --- Vínculo Obrigatório entre Clerk e Banco de Dados** {#rn-02-vínculo-obrigatório-entre-clerk-e-banco-de-dados}

| **Atributo** | **Valor**                                                                                                                                    |
|--------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| ID           | RN-02                                                                                                                                        |
| Descrição    | Todo usuário autenticado via Clerk deve ter um registro correspondente na tabela users do banco. O campo clerk_user_id é a chave de vínculo. |
| Criação      | Registro criado automaticamente via webhook do Clerk (evento user.created).                                                                  |
| Consistência | Se o clerk_user_id não existir no banco, o acesso é negado mesmo com sessão válida.                                                          |
| Violação     | Log de erro + retornar HTTP 500 com mensagem genérica ao usuário.                                                                            |

## **RN-03 --- Isolamento Total de Dados entre Usuários** {#rn-03-isolamento-total-de-dados-entre-usuários}

| **Atributo**       | **Valor**                                                                                        |
|--------------------|--------------------------------------------------------------------------------------------------|
| ID                 | RN-03                                                                                            |
| Descrição          | Um usuário jamais pode visualizar, modificar ou excluir dados de outro usuário.                  |
| Implementação      | Toda query ao banco deve incluir cláusula WHERE user_id = {clerk_user_id} resolvido no servidor. |
| Row Level Security | Habilitar RLS no Supabase como segunda camada de proteção (ver seção 8).                         |
| Violação           | Retornar HTTP 403. Registrar ocorrência em log de auditoria de segurança.                        |

## **RN-04 --- Processamento de Pagamento Exclusivamente via Plataforma Externa** {#rn-04-processamento-de-pagamento-exclusivamente-via-plataforma-externa}

| **Atributo**     | **Valor**                                                                                                              |
|------------------|------------------------------------------------------------------------------------------------------------------------|
| ID               | RN-04                                                                                                                  |
| Descrição        | O JIng IA jamais processa, armazena ou transita dados de cartão de crédito. Pagamentos ocorrem 100% na Eduzz ou Hubla. |
| Responsabilidade | A plataforma de pagamento é responsável por PCI-DSS e segurança financeira.                                            |
| Backend          | Apenas armazena: status da assinatura, data de expiração e plan_id --- nunca dados financeiros.                        |
| Violação         | Qualquer tentativa de coletar dados financeiros deve ser bloqueada e reportada.                                        |

## **RN-05 --- Atualização de Status de Assinatura Apenas via Webhook Autenticado** {#rn-05-atualização-de-status-de-assinatura-apenas-via-webhook-autenticado}

| **Atributo** | **Valor**                                                                                                                    |
|--------------|------------------------------------------------------------------------------------------------------------------------------|
| ID           | RN-05                                                                                                                        |
| Descrição    | O status de assinatura no banco só pode ser alterado pelo endpoint de webhook, após validação da assinatura HMAC do payload. |
| Proibido     | Endpoints administrativos ou chamadas manuais que alterem subscription_status sem validação.                                 |
| Auditoria    | Toda alteração de status deve ser registrada na tabela subscription_events com timestamp, evento e payload bruto.            |
| Violação     | Rejeitar requisição com HTTP 401. Registrar tentativa em log de segurança.                                                   |

## **RN-06 --- Desativação Imediata por Cancelamento ou Reembolso** {#rn-06-desativação-imediata-por-cancelamento-ou-reembolso}

| **Atributo**            | **Valor**                                                                                                               |
|-------------------------|-------------------------------------------------------------------------------------------------------------------------|
| ID                      | RN-06                                                                                                                   |
| Descrição               | Em eventos de cancelamento ou reembolso, o acesso deve ser revogado imediatamente (subscription_status = \'inactive\'). |
| Cancelamento recorrente | Acesso mantido até subscription_expires_at; após essa data, acesso revogado automaticamente.                            |
| Reembolso               | Acesso revogado imediatamente, independente do período remanescente.                                                    |
| Violação                | Falha no webhook deve ser logada e re-tentada (implementar retry com backoff).                                          |

## **RN-07 --- Limite de Mensagens por Usuário (Rate de Negócio)** {#rn-07-limite-de-mensagens-por-usuário-rate-de-negócio}

| **Atributo**   | **Valor**                                                                                                     |
|----------------|---------------------------------------------------------------------------------------------------------------|
| ID             | RN-07                                                                                                         |
| Descrição      | Cada plano define um número máximo de mensagens por período (diário ou mensal) para controle de custo de API. |
| MVP (sugerido) | Plano único: 200 mensagens/mês por usuário. Configurável via variável de ambiente.                            |
| Trial          | Se habilitado: 20 mensagens totais, sem renovação.                                                            |
| Controle       | Contador armazenado no banco. Verificado antes de cada chamada à OpenAI.                                      |
| Esgotamento    | Retornar mensagem amigável informando o limite e orientando sobre upgrade.                                    |

## **RN-08 --- Disclaimer Médico Obrigatório** {#rn-08-disclaimer-médico-obrigatório}

| **Atributo**  | **Valor**                                                                                                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ID            | RN-08                                                                                                                                                                                           |
| Descrição     | Todo assistente deve exibir, na primeira mensagem de cada sessão, um disclaimer informando que o conteúdo gerado é de suporte clínico e não substitui julgamento profissional do acupunturista. |
| Implementação | Disclaimer injetado via system prompt de cada Assistant na OpenAI.                                                                                                                              |
| Interface     | Banner fixo ou mensagem inicial visível na tela de chat.                                                                                                                                        |
| Violação      | Ausência do disclaimer é bloqueante para o launch.                                                                                                                                              |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>⚠️ Atenção Legal (RN-08)</strong></p>
<p>O sistema lida indiretamente com saúde. O disclaimer protege juridicamente o produto.</p>
<p>Consultar advogado para adequação à Lei 13.146 e normas do CFM/CREFITO antes do launch.</p>
<p>Os assistentes NÃO devem prescrever tratamentos — apenas suportar o raciocínio clínico do profissional.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **4. Requisitos Funcionais (RF)** {#requisitos-funcionais-rf}

Descrevem o que o sistema deve fazer. Classificados por prioridade: MUST (obrigatório para MVP), SHOULD (importante, mas negociável) e COULD (desejável, pós-MVP).

## **4.1 Autenticação e Sessão** {#autenticação-e-sessão}

| **ID** | **Requisito**                                                 | **Prioridade** |
|--------|---------------------------------------------------------------|----------------|
| RF-01  | Usuário pode se cadastrar com e-mail e senha via Clerk        | MUST           |
| RF-02  | Usuário pode fazer login com e-mail e senha                   | MUST           |
| RF-03  | Sessão expira após inatividade configurável (padrão: 30 dias) | MUST           |
| RF-04  | Suporte a login social (Google) via Clerk                     | SHOULD         |
| RF-05  | Autenticação de dois fatores (2FA) opcional para o usuário    | SHOULD         |
| RF-06  | Usuário pode redefinir senha via e-mail                       | MUST           |

## **4.2 Assinatura e Acesso** {#assinatura-e-acesso}

| **ID** | **Requisito**                                                          | **Prioridade** |
|--------|------------------------------------------------------------------------|----------------|
| RF-07  | Sistema recebe e processa webhooks de pagamento da Eduzz/Hubla         | MUST           |
| RF-08  | Acesso ao hub é liberado automaticamente após confirmação de pagamento | MUST           |
| RF-09  | Acesso é revogado automaticamente em cancelamento ou reembolso         | MUST           |
| RF-10  | Usuário sem assinatura é redirecionado para página de planos           | MUST           |
| RF-11  | Usuário pode visualizar status atual da sua assinatura no perfil       | SHOULD         |
| RF-12  | Sistema suporta período de trial com limite de mensagens               | SHOULD         |

## **4.3 Hub de Assistentes** {#hub-de-assistentes}

| **ID** | **Requisito**                                                                | **Prioridade** |
|--------|------------------------------------------------------------------------------|----------------|
| RF-13  | Dashboard exibe todos os assistentes disponíveis com nome e descrição        | MUST           |
| RF-14  | Usuário pode iniciar conversa com qualquer assistente disponível             | MUST           |
| RF-15  | Interface de chat exibe histórico da conversa atual                          | MUST           |
| RF-16  | Thread é persistida no banco e pode ser retomada posteriormente              | MUST           |
| RF-17  | Usuário pode visualizar lista de conversas anteriores por assistente         | SHOULD         |
| RF-18  | Usuário pode excluir uma conversa anterior                                   | SHOULD         |
| RF-19  | Resposta do assistente exibe indicador de carregamento durante processamento | MUST           |
| RF-20  | Sistema exibe disclaimer de saúde na abertura de cada sessão de chat         | MUST           |

## **4.4 Controle de Uso** {#controle-de-uso}

| **ID** | **Requisito**                                                          | **Prioridade** |
|--------|------------------------------------------------------------------------|----------------|
| RF-21  | Sistema conta e persiste número de mensagens enviadas por usuário/mês  | MUST           |
| RF-22  | Ao atingir limite, exibir mensagem amigável e bloquear novas mensagens | MUST           |
| RF-23  | Contador de mensagens é resetado no início de cada período de cobrança | MUST           |
| RF-24  | Administrador pode visualizar uso agregado de mensagens por usuário    | SHOULD         |

# **5. Requisitos Não-Funcionais (RNF)** {#requisitos-não-funcionais-rnf}

## **5.1 Performance** {#performance}

| **ID** | **Requisito**                                                 | **Meta**            |
|--------|---------------------------------------------------------------|---------------------|
| RNF-01 | Tempo de resposta da interface (carregamento de páginas)      | \< 2 segundos (LCP) |
| RNF-02 | Tempo de resposta da IA (primeira palavra visível ao usuário) | \< 5 segundos       |
| RNF-03 | API de chat deve responder (sem contar IA) em                 | \< 500ms            |
| RNF-04 | Endpoint de webhook deve processar e retornar em              | \< 3 segundos       |
| RNF-05 | Disponibilidade do sistema (uptime)                           | \>= 99%             |

## **5.2 Escalabilidade** {#escalabilidade}

| **ID** | **Requisito**                                          | **Meta**                        |
|--------|--------------------------------------------------------|---------------------------------|
| RNF-06 | MVP deve suportar sem degradação                       | Até 500 usuários simultâneos    |
| RNF-07 | Banco de dados deve suportar sem otimização adicional  | Até 10.000 registros de threads |
| RNF-08 | Arquitetura stateless permite escalonamento horizontal | Obrigatório desde o início      |

## **5.3 Usabilidade** {#usabilidade}

| **ID** | **Requisito**                                                 | **Meta**     |
|--------|---------------------------------------------------------------|--------------|
| RNF-09 | Interface responsiva (mobile-first)                           | Obrigatório  |
| RNF-10 | Fluxo de cadastro + primeiro acesso ao assistente             | \< 3 minutos |
| RNF-11 | Mensagens de erro devem ser em português e orientar o usuário | Obrigatório  |
| RNF-12 | Interface acessível (WCAG 2.1 nível A)                        | SHOULD       |

## **5.4 Manutenibilidade** {#manutenibilidade}

| **ID** | **Requisito**                                                      | **Meta**    |
|--------|--------------------------------------------------------------------|-------------|
| RNF-13 | Código com TypeScript estrito (strict: true)                       | Obrigatório |
| RNF-14 | Variáveis de configuração externalizadas em .env                   | Obrigatório |
| RNF-15 | Logs estruturados (JSON) em todas as rotas de API                  | Obrigatório |
| RNF-16 | Cobertura de testes nas regras de negócio críticas (RN-01 a RN-06) | MUST        |

# **6. Agentes de IA --- OpenAI Assistants API** {#agentes-de-ia-openai-assistants-api}

## **6.1 Assistentes do MVP** {#assistentes-do-mvp}

| **ID** | **Nome**     | **Função**                         | **Exemplo de Uso**                          |
|--------|--------------|------------------------------------|---------------------------------------------|
| ASS-01 | AcuAnamnese  | Estrutura roteiro de anamnese      | Gera perguntas por queixa principal         |
| ASS-02 | AcuProtocolo | Sugere pontos e protocolos de MTC  | Protocolo para lombalgia com padrão de Rim  |
| ASS-03 | AcuExplica   | Traduz diagnósticos para pacientes | Explica Qi estagnado em linguagem simples   |
| ASS-04 | AcuConteúdo  | Gera conteúdo de marketing clínico | Post Instagram sobre acupuntura e ansiedade |
| ASS-05 | AcuEstudo    | Resume e revisa conteúdo acadêmico | Resume artigo científico em pontos práticos |

## **6.2 Regras de Configuração dos Assistants** {#regras-de-configuração-dos-assistants}

- Cada Assistant criado no painel da OpenAI Platform deve ter seu ID armazenado como variável de ambiente no backend

- O system prompt de cada Assistant deve incluir obrigatoriamente o disclaimer de saúde (RN-08)

- O system prompt deve delimitar o escopo do assistente (ex.: AcuProtocolo não responde sobre finanças)

- Temperatura recomendada: 0.4 a 0.7 --- equilibra criatividade e consistência clínica

- Modelo: gpt-4o (para qualidade clínica) ou gpt-4o-mini (para redução de custo no MVP)

## **6.3 Fluxo Técnico Completo de uma Mensagem** {#fluxo-técnico-completo-de-uma-mensagem}

| **Etapa** | **Responsável** | **Ação**                                             | **Falha → Resultado**     |
|-----------|-----------------|------------------------------------------------------|---------------------------|
| 1         | Frontend        | POST /api/chat com {assistantId, message, threadId?} | ---                       |
| 2         | Middleware      | Clerk valida sessão JWT                              | HTTP 401                  |
| 3         | Route Handler   | Consulta banco: subscription_status === \'active\'   | HTTP 403                  |
| 4         | Route Handler   | Verifica rate limit (Upstash): msgs \< limite/mês    | HTTP 429                  |
| 5         | Route Handler   | Verifica/cria Thread na OpenAI (threadId ou novo)    | HTTP 500 + log            |
| 6         | Route Handler   | Adiciona mensagem à Thread (POST /messages)          | HTTP 500 + log            |
| 7         | Route Handler   | Cria Run com assistantId                             | HTTP 500 + log            |
| 8         | Route Handler   | Polling/streaming até Run status = completed         | HTTP 504 timeout          |
| 9         | Route Handler   | Persiste threadId no banco (se novo)                 | Log warning (não crítico) |
| 10        | Route Handler   | Incrementa contador de mensagens do usuário          | Log warning (não crítico) |
| 11        | Frontend        | Exibe resposta ao usuário                            | Mensagem de erro amigável |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>🔒 Regra Crítica de Segurança — OpenAI</strong></p>
<p>A OPENAI_API_KEY existe EXCLUSIVAMENTE no servidor (variável de ambiente server-side).</p>
<p>Jamais deve aparecer em código de componente React, arquivo de configuração do cliente</p>
<p>ou em qualquer bundle JavaScript entregue ao navegador.</p>
<p>Violação desta regra resulta em vazamento de chave e custos não controlados.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **7. Autenticação com Clerk** {#autenticação-com-clerk}

## **7.1 Configuração de Variáveis de Ambiente** {#configuração-de-variáveis-de-ambiente}

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Variáveis obrigatórias (.env.local — jamais no repositório)</strong></p>
<p>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... # Pública (frontend)</p>
<p>CLERK_SECRET_KEY=sk_live_... # Privada (SOMENTE backend)</p>
<p>CLERK_WEBHOOK_SECRET=whsec_... # Validação de webhooks do Clerk</p>
<p>NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in</p>
<p>NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up</p>
<p>NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard</p>
<p>NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **7.2 Matriz de Acesso por Rota** {#matriz-de-acesso-por-rota}

| **Rota**         | **Autenticação** | **Assinatura Ativa** | **Ação se Negado**              |
|------------------|------------------|----------------------|---------------------------------|
| /                | Não exigida      | Não exigida          | --- (pública)                   |
| /planos          | Não exigida      | Não exigida          | --- (pública)                   |
| /sign-in         | Não exigida      | Não exigida          | --- (pública)                   |
| /sign-up         | Não exigida      | Não exigida          | --- (pública)                   |
| /dashboard       | ✅ Exigida       | ✅ Exigida           | Redireciona /sign-in ou /planos |
| /dashboard/chat  | ✅ Exigida       | ✅ Exigida           | HTTP 403 + redirecionamento     |
| /perfil          | ✅ Exigida       | Não exigida          | Redireciona /sign-in            |
| /api/chat        | ✅ Exigida       | ✅ Exigida           | HTTP 401 / 403                  |
| /api/threads     | ✅ Exigida       | ✅ Exigida           | HTTP 401 / 403                  |
| /api/webhooks/\* | Não (Clerk)      | Não                  | HTTP 401 (assinatura HMAC)      |

## **7.3 Webhook do Clerk --- Sincronização de Usuários** {#webhook-do-clerk-sincronização-de-usuários}

O Clerk emite eventos que devem ser capturados para manter o banco sincronizado:

| **Evento Clerk** | **Ação no Banco**                                                          |
|------------------|----------------------------------------------------------------------------|
| user.created     | INSERT em users com clerk_user_id, email, subscription_status=\'inactive\' |
| user.updated     | UPDATE email em users WHERE clerk_user_id = id                             |
| user.deleted     | Soft-delete ou anonimização dos dados do usuário (LGPD)                    |

# **8. Banco de Dados --- Estrutura Completa** {#banco-de-dados-estrutura-completa}

## **8.1 Tabela: users** {#tabela-users}

| **Campo**               | **Tipo**     | **Constraints**                | **Descrição**                                  |
|-------------------------|--------------|--------------------------------|------------------------------------------------|
| id                      | UUID         | PK, DEFAULT gen_random_uuid()  | Identificador interno                          |
| clerk_user_id           | VARCHAR(255) | UNIQUE, NOT NULL               | ID gerado pelo Clerk                           |
| email                   | VARCHAR(320) | UNIQUE, NOT NULL               | E-mail do usuário                              |
| subscription_status     | VARCHAR(20)  | NOT NULL, DEFAULT \'inactive\' | \'active\',\'inactive\',\'trial\',\'canceled\' |
| subscription_expires_at | TIMESTAMPTZ  | NULLABLE                       | Data de expiração do plano atual               |
| plan_id                 | VARCHAR(100) | NULLABLE                       | Identificador do plano contratado              |
| trial_messages_used     | INTEGER      | DEFAULT 0                      | Mensagens usadas no trial                      |
| monthly_message_count   | INTEGER      | DEFAULT 0                      | Contador mensal de mensagens                   |
| message_count_reset_at  | TIMESTAMPTZ  | NULLABLE                       | Data do último reset do contador               |
| created_at              | TIMESTAMPTZ  | DEFAULT NOW()                  | Data de criação                                |
| updated_at              | TIMESTAMPTZ  | DEFAULT NOW()                  | Última atualização (trigger)                   |

## **8.2 Tabela: threads** {#tabela-threads}

| **Campo**        | **Tipo**     | **Constraints**               | **Descrição**                      |
|------------------|--------------|-------------------------------|------------------------------------|
| id               | UUID         | PK, DEFAULT gen_random_uuid() | Identificador interno              |
| user_id          | UUID         | FK → users.id, NOT NULL       | Referência ao usuário (RLS)        |
| assistant_id     | VARCHAR(50)  | NOT NULL                      | ID do Assistant na OpenAI (ASS-0X) |
| openai_thread_id | VARCHAR(255) | UNIQUE, NOT NULL              | Thread ID da OpenAI Assistants API |
| title            | VARCHAR(200) | NULLABLE                      | Título gerado automaticamente      |
| message_count    | INTEGER      | DEFAULT 0                     | Total de mensagens na thread       |
| created_at       | TIMESTAMPTZ  | DEFAULT NOW()                 | Data de criação                    |
| updated_at       | TIMESTAMPTZ  | DEFAULT NOW()                 | Última atualização                 |

## **8.3 Tabela: subscription_events (Auditoria)** {#tabela-subscription_events-auditoria}

| **Campo**     | **Tipo**     | **Constraints**               | **Descrição**                               |
|---------------|--------------|-------------------------------|---------------------------------------------|
| id            | UUID         | PK, DEFAULT gen_random_uuid() | Identificador do evento                     |
| user_id       | UUID         | FK → users.id, NULLABLE       | Usuário afetado (se identificado)           |
| event_type    | VARCHAR(100) | NOT NULL                      | Ex: payment.approved, subscription.canceled |
| platform      | VARCHAR(50)  | NOT NULL                      | \'eduzz\' ou \'hubla\'                      |
| payload       | JSONB        | NOT NULL                      | Payload bruto do webhook (para auditoria)   |
| processed_at  | TIMESTAMPTZ  | DEFAULT NOW()                 | Timestamp de processamento                  |
| status        | VARCHAR(20)  | NOT NULL                      | \'success\', \'failed\', \'ignored\'        |
| error_message | TEXT         | NULLABLE                      | Detalhe do erro se status = failed          |

## **8.4 Tabela: security_audit_log (Segurança)** {#tabela-security_audit_log-segurança}

| **Campo**  | **Tipo**     | **Constraints**               | **Descrição**                           |
|------------|--------------|-------------------------------|-----------------------------------------|
| id         | UUID         | PK, DEFAULT gen_random_uuid() | Identificador                           |
| user_id    | UUID         | NULLABLE                      | Usuário envolvido                       |
| event_type | VARCHAR(100) | NOT NULL                      | Ex: unauthorized_access, rate_limit_hit |
| ip_address | INET         | NULLABLE                      | IP da requisição                        |
| user_agent | TEXT         | NULLABLE                      | User-Agent do cliente                   |
| metadata   | JSONB        | NULLABLE                      | Dados adicionais do evento              |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()                 | Timestamp do evento                     |

## **8.5 Row Level Security (RLS) --- Supabase** {#row-level-security-rls-supabase}

O RLS é uma camada de segurança adicional no banco de dados que garante que mesmo que uma query chegue ao banco sem o filtro correto, o próprio banco bloqueará o acesso a dados de outros usuários.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Políticas RLS obrigatórias (SQL)</strong></p>
<p>-- Habilitar RLS nas tabelas sensíveis</p>
<p>ALTER TABLE threads ENABLE ROW LEVEL SECURITY;</p>
<p>ALTER TABLE users ENABLE ROW LEVEL SECURITY;</p>
<p>-- Usuário só vê seus próprios threads</p>
<p>CREATE POLICY user_threads ON threads</p>
<p>FOR ALL USING (user_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()));</p>
<p>-- Usuário só vê seu próprio registro</p>
<p>CREATE POLICY user_own_record ON users</p>
<p>FOR ALL USING (clerk_user_id = auth.uid());</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **9. Gestão de Assinaturas --- Eduzz / Hubla** {#gestão-de-assinaturas-eduzz-hubla}

## **9.1 Comparativo das Plataformas** {#comparativo-das-plataformas}

| **Critério**          | **Eduzz**                | **Hubla**                      |
|-----------------------|--------------------------|--------------------------------|
| Foco principal        | Infoprodutos e digitais  | Comunidades, SaaS, memberships |
| Webhook de pagamento  | ✅ Disponível            | ✅ Disponível                  |
| API REST              | ✅ Disponível            | ✅ Disponível                  |
| Assinatura recorrente | ✅ Disponível            | ✅ Nativamente focado          |
| Checkout próprio      | ✅ Sim                   | ✅ Sim                         |
| Suporte a SaaS        | Possível                 | Nativo --- mais adequado       |
| Recomendação MVP      | Se já possui conta ativa | ✅ Preferencial para SaaS      |

## **9.2 Fluxo Completo de Webhook de Pagamento** {#fluxo-completo-de-webhook-de-pagamento}

| **Etapa**         | **Ação**                                                              | **Validação Necessária**      |
|-------------------|-----------------------------------------------------------------------|-------------------------------|
| 1\. Recebimento   | POST /api/webhooks/pagamento recebe evento da plataforma              | ---                           |
| 2\. Autenticação  | Validar HMAC-SHA256 do payload com WEBHOOK_SECRET                     | Rejeitar HTTP 401 se inválido |
| 3\. Idempotência  | Verificar se event_id já foi processado na tabela subscription_events | Ignorar duplicatas (HTTP 200) |
| 4\. Identificação | Localizar usuário pelo e-mail ou external_id do payload               | Log warning se não encontrado |
| 5\. Processamento | Atualizar subscription_status e expires_at conforme evento            | Ver tabela de eventos abaixo  |
| 6\. Auditoria     | INSERT em subscription_events com payload completo e status           | Sempre, mesmo em falha        |
| 7\. Resposta      | Retornar HTTP 200 para a plataforma (evita reenvios desnecessários)   | Timeout máximo: 3 segundos    |

## **9.3 Mapeamento de Eventos para Ações no Banco** {#mapeamento-de-eventos-para-ações-no-banco}

| **Evento**            | **subscription_status** | **subscription_expires_at** | **Observação**                 |
|-----------------------|-------------------------|-----------------------------|--------------------------------|
| payment.approved      | \'active\'              | Data de expiração do plano  | Ativar acesso imediatamente    |
| subscription.renewed  | \'active\'              | Nova data de expiração      | Renovação automática           |
| subscription.canceled | \'canceled\'            | Manter até expiração        | Acesso até fim do período pago |
| payment.refunded      | \'inactive\'            | NULL                        | Revogar imediatamente          |
| payment.chargeback    | \'inactive\'            | NULL                        | Revogar + log de segurança     |
| subscription.expired  | \'inactive\'            | NULL                        | Verificação periódica (cron)   |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>⚠️ Idempotência de Webhooks</strong></p>
<p>Plataformas de pagamento podem reenviar o mesmo evento múltiplas vezes.</p>
<p>O endpoint DEVE verificar se o event_id já foi processado antes de executar ações.</p>
<p>Usar a tabela subscription_events como registro de eventos processados.</p>
<p>Retornar HTTP 200 mesmo para eventos duplicados (evita loops de reenvio).</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **10. Regras de Segurança** {#regras-de-segurança}

Esta seção define obrigações de segurança técnica. Todas as regras com prioridade MUST são bloqueantes para o launch --- o sistema não pode ir ao ar sem elas implementadas.

## **10.1 Gestão de Segredos e Variáveis de Ambiente** {#gestão-de-segredos-e-variáveis-de-ambiente}

| **Regra** | **Descrição**                                                                | **Prioridade** |
|-----------|------------------------------------------------------------------------------|----------------|
| SEC-01    | Nenhuma chave de API, secret ou credencial no código-fonte ou repositório    | MUST           |
| SEC-02    | .env\*, .env.local listados no .gitignore ANTES do primeiro commit           | MUST           |
| SEC-03    | Segredos de produção configurados no painel Vercel --- nunca em arquivos     | MUST           |
| SEC-04    | OPENAI_API_KEY, CLERK_SECRET_KEY, WEBHOOK_SECRET: exclusivamente server-side | MUST           |
| SEC-05    | Rotação de chaves de API a cada 90 dias ou em caso de suspeita de vazamento  | SHOULD         |
| SEC-06    | Uso de gerenciador de segredos (ex: Doppler) em ambiente de time             | COULD          |

## **10.2 Autenticação e Autorização** {#autenticação-e-autorização}

| **Regra** | **Descrição**                                                                          | **Prioridade** |
|-----------|----------------------------------------------------------------------------------------|----------------|
| SEC-07    | Toda rota de API valida sessão Clerk via getAuth() no servidor --- sem exceções        | MUST           |
| SEC-08    | Toda rota sensível verifica assinatura ativa no banco após validar sessão              | MUST           |
| SEC-09    | Webhook de pagamento valida assinatura HMAC-SHA256 antes de qualquer processamento     | MUST           |
| SEC-10    | Webhook do Clerk valida signature com svix antes de processar eventos de usuário       | MUST           |
| SEC-11    | Middleware de proteção de rotas configurado em middleware.ts para toda rota /dashboard | MUST           |
| SEC-12    | Tokens de sessão nunca armazenados em localStorage --- usar cookies HttpOnly via Clerk | MUST           |

## **10.3 Proteção contra Abusos** {#proteção-contra-abusos}

| **Regra** | **Descrição**                                                                          | **Prioridade** |
|-----------|----------------------------------------------------------------------------------------|----------------|
| SEC-13    | Rate limiting por userId nas rotas /api/chat: 20 req/min via Upstash                   | MUST           |
| SEC-14    | Rate limiting global por IP nas rotas públicas: 100 req/min                            | SHOULD         |
| SEC-15    | Webhook endpoint com rate limit de IP para evitar flood                                | SHOULD         |
| SEC-16    | Input sanitization: todas as mensagens do usuário sanitizadas antes de enviar à OpenAI | MUST           |
| SEC-17    | Tamanho máximo de mensagem do usuário: 4.000 caracteres (rejeitar acima disso)         | MUST           |
| SEC-18    | Timeout de 30 segundos nas chamadas à OpenAI --- retornar erro amigável se exceder     | MUST           |

## **10.4 Segurança de Dados e Infraestrutura** {#segurança-de-dados-e-infraestrutura}

| **Regra** | **Descrição**                                                                     | **Prioridade** |
|-----------|-----------------------------------------------------------------------------------|----------------|
| SEC-19    | Toda comunicação em HTTPS/TLS 1.2+ --- HTTP redireciona para HTTPS                | MUST           |
| SEC-20    | Conexão com banco de dados exclusivamente via SSL (sslmode=require)               | MUST           |
| SEC-21    | Usuário do banco com permissões mínimas (SELECT, INSERT, UPDATE --- sem DROP/DDL) | MUST           |
| SEC-22    | CORS configurado: apenas o domínio de produção autorizado                         | MUST           |
| SEC-23    | Headers de segurança HTTP configurados: CSP, X-Frame-Options, HSTS                | SHOULD         |
| SEC-24    | Backups automáticos do banco habilitados no Supabase (retenção: 7 dias mínimo)    | MUST           |
| SEC-25    | Logs de erro não expõem stack traces ou dados sensíveis ao usuário                | MUST           |

## **10.5 Auditoria e Monitoramento** {#auditoria-e-monitoramento}

| **Regra** | **Descrição**                                                                    | **Prioridade** |
|-----------|----------------------------------------------------------------------------------|----------------|
| SEC-26    | Log de auditoria para eventos: acesso negado, rate limit, erro de webhook        | MUST           |
| SEC-27    | Log de auditoria armazenado em security_audit_log com IP, user-agent e timestamp | MUST           |
| SEC-28    | Alertas configurados para: erros 5XX acima de 5/min, rate limits acima de 50/min | SHOULD         |
| SEC-29    | Revisão mensal dos logs de segurança pelo time técnico                           | SHOULD         |

## **10.6 Checklist de Segurança --- Obrigatório pré-Launch** {#checklist-de-segurança-obrigatório-pré-launch}

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>🚨 Bloqueantes para o Launch — Verificar antes de qualquer acesso externo</strong></p>
<p>[ ] Repositório sem nenhum arquivo .env (git log --all --full-history -- '*.env')</p>
<p>[ ] OPENAI_API_KEY existe SOMENTE em variável de ambiente server-side da Vercel</p>
<p>[ ] Middleware do Clerk protegendo TODAS as rotas /dashboard/* e /api/*</p>
<p>[ ] Webhook de pagamento validando assinatura HMAC antes de qualquer UPDATE no banco</p>
<p>[ ] Webhook do Clerk validando assinatura svix</p>
<p>[ ] RLS habilitado nas tabelas users e threads no Supabase</p>
<p>[ ] Banco com SSL obrigatório (sslmode=require na connection string)</p>
<p>[ ] Rate limiting ativo em /api/chat (Upstash Redis configurado)</p>
<p>[ ] HTTPS forçado (HTTP → HTTPS redirect ativo)</p>
<p>[ ] CORS configurado apenas para o domínio de produção</p>
<p>[ ] Headers de segurança HTTP configurados no next.config.js</p>
<p>[ ] Logs de erro sem stack traces expostos ao usuário</p>
<p>[ ] Disclaimer médico visível na interface de chat (RN-08)</p>
<p>[ ] Testes das regras RN-01 a RN-06 passando</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **11. Processamento de Dados --- Segurança e LGPD** {#processamento-de-dados-segurança-e-lgpd}

O JIng IA processa dados pessoais de profissionais de saúde. Embora o sistema não armazene dados de pacientes diretamente, o acupunturista pode inserir informações clínicas no chat. Esta seção define como tratar esses dados de forma segura e em conformidade com a LGPD (Lei 13.709/2018).

## **11.1 Classificação dos Dados Processados** {#classificação-dos-dados-processados}

| **Categoria**       | **Dados**                            | **Onde Armazenado**             | **Sensibilidade** | **Base Legal LGPD**                       |
|---------------------|--------------------------------------|---------------------------------|-------------------|-------------------------------------------|
| Dados do assinante  | Nome, e-mail, plan_id                | Banco próprio (users)           | Média             | Execução de contrato (Art. 7º, V)         |
| Dados de sessão     | clerk_user_id, tokens JWT            | Clerk (gerenciado)              | Alta              | Execução de contrato                      |
| Dados de assinatura | status, expires_at, plan_id          | Banco próprio (users)           | Média             | Execução de contrato                      |
| Histórico de chat   | Thread ID, contador de msgs          | Banco próprio (threads)         | Alta              | Execução de contrato                      |
| Conteúdo das msgs   | Texto das mensagens ao assistente    | OpenAI (gerenciado pela OpenAI) | Muito Alta        | Execução de contrato + legítimo interesse |
| Dados de pagamento  | Processados pela Eduzz/Hubla         | NUNCA no JIng IA                | Crítica           | Terceiro responsável                      |
| Logs de auditoria   | IP, user-agent, eventos de segurança | Banco próprio (audit_log)       | Média             | Legítimo interesse (segurança)            |

## **11.2 Fluxo de Dados --- Do Usuário à OpenAI** {#fluxo-de-dados-do-usuário-à-openai}

| **Etapa**          | **O que Trafega**                           | **Proteção Aplicada**           |
|--------------------|---------------------------------------------|---------------------------------|
| Navegador → Vercel | Mensagem do usuário + token de sessão Clerk | HTTPS/TLS 1.3                   |
| Vercel → Supabase  | Queries de validação de sessão e assinatura | TLS + SSL + usuário restrito    |
| Vercel → Upstash   | Chave de rate limit (userId hash)           | TLS + token de acesso           |
| Vercel → OpenAI    | Mensagem sanitizada + system prompt         | HTTPS/TLS + API Key server-side |
| OpenAI → Vercel    | Resposta do assistente                      | HTTPS/TLS                       |
| Vercel → Supabase  | INSERT/UPDATE de thread_id e contadores     | TLS + SSL                       |
| Vercel → Navegador | Resposta do assistente ao usuário           | HTTPS/TLS                       |

## **11.3 Política de Retenção de Dados** {#política-de-retenção-de-dados}

| **Dado**                    | **Retenção**                  | **Ação após Retenção**                      |
|-----------------------------|-------------------------------|---------------------------------------------|
| Dados de conta (users)      | Enquanto conta ativa + 5 anos | Anonimização ou exclusão definitiva         |
| Histórico de threads        | 12 meses após última mensagem | Exclusão automática (cron job)              |
| subscription_events         | 5 anos (obrigação fiscal)     | Arquivamento ou exclusão                    |
| security_audit_log          | 12 meses                      | Exclusão automática (cron job)              |
| Dados na OpenAI (mensagens) | Conforme política da OpenAI\* | Usuário pode solicitar exclusão via suporte |

*\*Verificar e informar ao usuário a política de retenção de dados da OpenAI vigente. Atualmente a OpenAI não usa dados de API para treinar modelos por padrão.*

## **11.4 Direitos do Titular (LGPD --- Art. 18)** {#direitos-do-titular-lgpd-art.-18}

| **Direito**                       | **Como o Sistema Atende**                                                |
|-----------------------------------|--------------------------------------------------------------------------|
| Confirmação de processamento      | Seção de perfil informa quais dados são armazenados                      |
| Acesso aos dados                  | Usuário pode solicitar exportação via suporte (MVP: processo manual)     |
| Correção de dados                 | Usuário pode atualizar e-mail no perfil via Clerk                        |
| Exclusão de dados                 | Usuário pode solicitar exclusão total via suporte. Prazo: 15 dias        |
| Portabilidade                     | Pós-MVP: exportação de histórico de conversas em JSON                    |
| Revogação de consentimento        | Usuário pode cancelar assinatura e solicitar exclusão a qualquer momento |
| Informação sobre compartilhamento | Política de Privacidade informando uso da OpenAI e Clerk                 |

## **11.5 Sanitização de Input do Usuário** {#sanitização-de-input-do-usuário}

Toda mensagem enviada pelo usuário deve ser sanitizada antes de ser transmitida à OpenAI, para prevenir prompt injection e envio de dados extremamente sensíveis.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Regras de Sanitização (implementar em lib/sanitize.ts)</strong></p>
<p>1. Remover caracteres de controle e null bytes</p>
<p>2. Limitar comprimento: máximo 4.000 caracteres por mensagem (SEC-17)</p>
<p>3. Detectar e alertar (não bloquear) tentativas de prompt injection</p>
<p>- Padrões como: 'ignore all previous instructions', 'you are now', 'jailbreak'</p>
<p>4. NÃO remover conteúdo clínico — o filtro é mínimo e focado em segurança técnica</p>
<p>5. Logar tentativas de injection detectadas em security_audit_log</p>
<p>6. Nunca armazenar o conteúdo das mensagens no banco próprio (apenas Thread ID da OpenAI)</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **11.6 Política de Privacidade --- Elementos Mínimos Obrigatórios** {#política-de-privacidade-elementos-mínimos-obrigatórios}

O sistema deve ter Política de Privacidade e Termos de Uso publicados antes de receber o primeiro usuário externo. Elementos mínimos:

- Identificação do controlador de dados (CNPJ ou CPF do responsável)

- Quais dados são coletados e para qual finalidade

- Com quem os dados são compartilhados (OpenAI, Clerk, Eduzz/Hubla)

- Por quanto tempo os dados são retidos

- Como o titular pode exercer seus direitos (canal de contato)

- Informação sobre uso de cookies de sessão

- Data da última atualização do documento

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>⚠️ Obrigação Legal</strong></p>
<p>A ausência de Política de Privacidade adequada sujeita o produto a sanções da ANPD.</p>
<p>Recomenda-se revisão por advogado especializado em LGPD antes do launch.</p>
<p>O sistema processa dados de profissionais de saúde — contexto regulado.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **12. Estrutura de Pastas --- Next.js (App Router)** {#estrutura-de-pastas-next.js-app-router}

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Estrutura recomendada</strong></p>
<p>/JIng-ia</p>
<p>├── /app</p>
<p>│ ├── /dashboard → Área protegida (requer auth + assinatura)</p>
<p>│ │ ├── page.tsx → Hub principal com lista de assistentes</p>
<p>│ │ ├── /chat/[assistantId] → Interface de chat com assistente</p>
<p>│ │ └── /historico → Lista de threads anteriores</p>
<p>│ ├── /perfil → Dados do usuário (requer auth)</p>
<p>│ ├── /planos → Página pública de planos e preços</p>
<p>│ ├── /sign-in/[[...sign-in]] → Login via Clerk</p>
<p>│ ├── /sign-up/[[...sign-up]] → Cadastro via Clerk</p>
<p>│ └── /api</p>
<p>│ ├── /chat → POST: envia mensagem ao assistente</p>
<p>│ ├── /threads → GET/POST: gerencia threads do usuário</p>
<p>│ └── /webhooks</p>
<p>│ ├── /clerk → POST: eventos de usuário do Clerk</p>
<p>│ └── /pagamento → POST: eventos de pagamento (Eduzz/Hubla)</p>
<p>├── /components → Componentes de UI reutilizáveis</p>
<p>├── /lib</p>
<p>│ ├── openai.ts → Cliente OpenAI + funções de thread/run</p>
<p>│ ├── db.ts → Conexão Supabase + queries tipadas</p>
<p>│ ├── subscription.ts → Verificação de assinatura ativa</p>
<p>│ ├── sanitize.ts → Sanitização de input do usuário</p>
<p>│ ├── ratelimit.ts → Configuração Upstash Rate Limit</p>
<p>│ └── audit.ts → Funções de log de auditoria</p>
<p>├── /types → Tipos TypeScript globais</p>
<p>├── middleware.ts → Proteção de rotas via Clerk</p>
<p>├── next.config.js → Headers de segurança HTTP</p>
<p>├── .env.local → Variáveis locais (NUNCA no git)</p>
<p>└── .gitignore → Inclui .env* obrigatoriamente</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **13. Roadmap do MVP --- Fases de Desenvolvimento** {#roadmap-do-mvp-fases-de-desenvolvimento}

| **Fase**         | **Entregáveis**                                                                                                    | **Critério de Conclusão**                                 | **Prior.** |
|------------------|--------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|------------|
| Fase 1Base       | Setup Next.js + TypeScript + Clerk + SupabaseDeploy inicial no Vercel + .gitignore correto                         | Login funcionando + banco conectado + sem secrets no repo | 🔴 Crítico |
| Fase 2Assinatura | Webhook Eduzz/Hubla com validação HMACLógica de verificação de assinatura ativaTabelas users + subscription_events | Pagamento simulado ativa/revoga acesso no banco           | 🔴 Crítico |
| Fase 3IA         | Assistants criados na OpenAI PlatformRota /api/chat integradaPersistência de Thread IDSanitização de input         | Usuário assinante consegue conversar com assistente       | 🔴 Crítico |
| Fase 4Segurança  | Rate limiting com UpstashRLS no SupabaseHeaders de segurança HTTPAudit log implementado                            | Todos os itens do checklist pré-launch SEC passando       | 🔴 Crítico |
| Fase 5UI/UX      | Dashboard de assistentesInterface de chatPágina de planosDisclaimer médico visível                                 | Fluxo completo: cadastro → pagamento → chat funcionando   | 🟡 Alto    |
| Fase 6Histórico  | Lista de conversas anterioresRetomada de thread por IDExclusão de conversa                                         | Usuário consegue retomar conversa anterior                | 🟡 Alto    |
| Fase 7LGPD       | Política de Privacidade publicadaTermos de Uso publicadosFluxo de exclusão de conta (manual)                       | Documentos legais publicados e revisados                  | 🟡 Alto    |
| Fase 8Beta       | Acesso para 5--10 acupunturistas betaColeta de feedback estruturadoAjustes baseados em uso real                    | Validação da proposta de valor com usuários reais         | 🟢 Normal  |

# **14. Estimativa de Custos --- Infraestrutura MVP** {#estimativa-de-custos-infraestrutura-mvp}

| **Serviço**    | **Plano Inicial**  | **Custo Estimado** | **Observação**                                       |
|----------------|--------------------|--------------------|------------------------------------------------------|
| Clerk          | Free (até 10k MAU) | R\$ 0              | Suficiente para validação                            |
| Vercel         | Hobby              | R\$ 0              | Upgrade para Pro se precisar de domínio custom + SLA |
| Supabase       | Free               | R\$ 0              | 500 MB + 2 GB egress --- suficiente para MVP         |
| Upstash Redis  | Free               | R\$ 0              | 10k req/dia --- suficiente para início               |
| OpenAI API     | Pay-per-use        | Variável           | Monitorar --- principal custo variável               |
| Eduzz ou Hubla | Comissão s/ vendas | % sobre receita    | Sem custo fixo                                       |
| Domínio        | Registro anual     | \~R\$ 50--80/ano   | Obrigatório para produção                            |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>💰 Custo fixo de infraestrutura no MVP</strong></p>
<p>Entre R$ 0 e R$ 100/mês — dependendo de domínio e plano Vercel.</p>
<p>O custo variável principal é a OpenAI API: implementar limite de mensagens por usuário (RN-07)</p>
<p>para manter previsibilidade de custos conforme a base cresce.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **15. Próximos Passos Imediatos** {#próximos-passos-imediatos}

1.  Criar repositório no GitHub com .gitignore incluindo .env\* antes de qualquer commit

2.  Criar conta na OpenAI Platform e configurar os primeiros Assistants (ASS-01 a ASS-03)

3.  Criar projeto no Clerk e configurar URLs de login, cadastro e webhooks

4.  Criar projeto no Supabase e criar as tabelas conforme seção 8 (com RLS habilitado)

5.  Inicializar projeto Next.js com App Router, TypeScript strict e instalar dependências

6.  Configurar middleware.ts do Clerk e validar proteção de todas as rotas /dashboard/\*

7.  Criar conta e configurar plano de assinatura na Eduzz ou Hubla

8.  Implementar endpoint /api/webhooks/pagamento com validação HMAC e testar com eventos simulados

9.  Desenvolver rota /api/chat com: auth → assinatura → rate limit → sanitização → OpenAI → log

10. Implementar RLS no Supabase e validar isolamento de dados entre usuários

11. Configurar headers de segurança HTTP no next.config.js

12. Executar checklist completo de segurança (seção 10.6) antes de qualquer acesso externo

13. Publicar Política de Privacidade e Termos de Uso

14. Convidar 5--10 acupunturistas beta e coletar feedback estruturado

JIng IA --- Documento Técnico de Desenvolvimento \| v2.0 \| Uso Interno Confidencial

*Este documento deve ser atualizado a cada decisão técnica relevante tomada durante o desenvolvimento.*
