# Arquitetura Técnica Jing IA - Implementação 2026

Este documento descreve a transição técnica realizada para o módulo de análise de documentos e chat avançado, utilizando os padrões da **OpenAI SDK v6 (2026)**.

## 1. Tecnologias Principais
- **Framework**: Next.js 14+ (App Router)
- **AI SDK**: OpenAI v6.34.0 (Nativo 2026)
- **Auth**: Clerk (Metadata para controle de planos)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Integração de Pagamento**: Hubla (Webhooks)

## 2. Mudança de Paradigma: Assistants API -> Responses API
Migramos do modelo tradicional de "Assistants" (onde o prompt e arquivos ficavam no painel da OpenAI) para a **Responses API**.

### Por que?
- **Independência de Dashboard**: Os prompts agora vivem no código (`src/lib/prompts.ts`), facilitando versionamento e testes.
- **Multimodalidade Nativa**: O sistema suporta `input_text`, `input_file` (PDF/Docx) e `input_image` na mesma chamada.
- **Contexto Stateless**: Usamos `previous_response_id` salvo no Supabase (`users.last_response_id`) para manter a memória da conversa sem depender de Threads fixas da OpenAI.

## 3. Fluxo de Análise de Documentos (Vector Stores)
Implementamos uma gestão automatizada de **Vector Stores** em `src/lib/vector-store.ts`:

1. **Criação Automática**: Se um usuário do plano Profissional faz o primeiro upload, o sistema cria uma Vector Store dedicada (`JingIA_Store_ID_USER`) e salva o ID no Supabase.
2. **Upload & Poll**: Utilizamos o método `openai.vectorStores.files.uploadAndPoll` (SDK v6) que simplifica o upload, vinculação e espera pela vetorização em um único passo.
3. **Busca Híbrida**: Na Responses API, combinamos:
   - **User Vector Store**: O arquivo que o usuário subiu.
   - **Global Vector Store**: Uma base de conhecimento fixa configurada via `OPENAI_CORE_KNOWLEDGE_ID`.

## 4. Componentes Chave

### Backend
- `src/app/api/chat/responses/route.ts`: Engine de chat em streaming. Converte o input do usuário para o formato 2026 (`input_text`, `input_file`) e gerencia os `tool_resources`.
- `src/app/api/files/upload/route.ts`: Processa o upload do arquivo, valida o plano do usuário e aciona a vetorização.
- `src/lib/openai.ts`: Exporta dois clientes — `openai` (geral) e `openaiAnalista` (para o projeto isolado do Analista de Artigos).

### Frontend
- `src/components/FileUpload.tsx`: Componente multimodal com suporte a PDFs e Imagens.
- `src/app/dashboard/chat/[assistantId]/ChatInterface.tsx`: Gerencia a alternância entre a API de Chat comum e a Responses API (ativada para o ASS-07).

## 5. Estrutura de Dados (Supabase)
Tabela `users`:
- `vector_store_id` (uuid): Vínculo com a biblioteca da OpenAI.
- `last_response_id` (string): Mantém o fio da conversa para a Responses API.
- `plan_id` (string): `essencial` ou `profissional` (controlado via Webhook Hubla).

## 6. Prompt Engineering
Os prompts foram centralizados em `src/lib/prompts.ts`. O prompt do **Analista de Artigos (ASS-07)** é o mais complexo, estruturado para leitura crítica de Medicina Tradicional Chinesa, focando em:
- Rigor metodológico.
- Conflito entre padronização e individualização clínica.
- Tradução de jargão para leigos e profissionais.

## 7. Instruções para outras LLMs
Ao dar manutenção neste código:
1. **Sempre verifique as permissões da API Key**: Ela precisa de acesso a `Vector Stores`, `Files` e `Responses`.
2. **Tipagem**: Use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` onde as definições do SDK v6 ainda estiverem incompletas (especialmente no retorno do stream).
3. **Assinaturas de Métodos**: 
   - `openai.files.delete({ file_id })` (usa objeto).
   - `openai.vectorStores.files.delete(vs_id, f_id)` (usa argumentos posicionais).
   - `openai.vectorStores.files.uploadAndPoll(vs_id, file)` (método recomendado).
## 8. Mapeamento de Arquivos e Implementações

### 8.1. Configuração de Clientes (src/lib/openai.ts)
Diferenciamos o cliente geral do cliente especializado para o Analista de Artigos para permitir o uso de chaves de API com escopos diferentes.
```typescript
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
export const openaiAnalista = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY_ANALISTA || process.env.OPENAI_API_KEY 
})
```

### 8.2. Motor de Vetorização (src/lib/vector-store.ts)
Gerencia o ciclo de vida dos documentos. O ponto crítico é o uso do `uploadAndPoll`, que simplifica o fluxo de 2026.
```typescript
uploadAndAttachFile: async (vectorStoreId: string, file: File) => {
  const vsFile = await openaiAnalista.vectorStores.files.uploadAndPoll(vectorStoreId, file)
  return { fileId: vsFile.id, status: vsFile.status }
}
```

### 8.3. Responses API (src/app/api/chat/responses/route.ts)
O coração da multimodalidade. Aceita texto e arquivos simultaneamente.
```typescript
const content: any[] = [{ type: "input_text", text: message }]
if (fileId) content.push({ type: "input_file", file_id: fileId })

const response = await (openaiAnalista as any).responses.create({
  model: "gpt-4.1",
  instructions: systemPrompt,
  input: [{ role: "user", content: content }],
  tools: tools as any
})
```

### 8.4. Central de Prompts (src/lib/prompts.ts)
Arquivo que armazena os "System Instructions". O prompt do ASS-07 está isolado aqui.
- **Local**: `src/lib/prompts.ts`
- **Uso**: Importado na rota de chat para injetar no campo `instructions` da Responses API.

### 8.5. Componente de UI (src/components/FileUpload.tsx)
Componente reutilizável que lida com o estado de upload e feedbacks visual (Shadcn/UI + Lucide).
- **Formatos**: PDF, DOCX, TXT, JPG, PNG, WEBP.

### 8.6. Persistência no Banco (src/lib/db.ts)
Novos campos e métodos para controle de estado da IA.
- `updateLastResponseId(userId, responseId)`: Salva o ID para continuidade da conversa.
- `vector_store_id`: Mapeamento fixo do "espaço de trabalho" do usuário na OpenAI.
