# 🚀 Skill: Implementação do Módulo de Análise de Documentos (Jing IA - 2026)

Este documento serve como o "estado da arte" e resumo executivo para retomar a implementação do módulo de análise de artigos científicos em qualquer nova sessão.

## 1. Contexto do Projeto (Maio/2026)
*   **Objetivo:** Adicionar capacidade de upload e análise de PDFs/DOCXs no chat.
*   **Público:** Exclusivo para o **Plano Profissional**.
*   **Foco Inicial:** Assistente "Analista de Artigos Científicos" (ASS-07).

## 2. Decisão Arquitetural (Estratégia 2026)
*   **Tecnologia:** Abandono da antiga Assistants API (obsoleta em Ago/2026).
*   **Nova Stack:** 
    *   **OpenAI Responses API** (`/v1/responses`) - Mais rápida e unificada.
    *   **Vector Stores** - Para busca semântica (RAG) nos arquivos.
*   **Vantagem:** Evita reescrita futura e aproveita o suporte nativo a citações (página/parágrafo).

## 3. Estrutura de Arquivos Planejada
1.  `src/app/api/files/upload/route.ts`: Rota de backend para upload e vetorização na OpenAI.
2.  `src/app/api/chat/responses/route.ts`: Rota de chat usando o novo paradigma de Responses.
3.  `src/components/chat/FileUpload.tsx`: Componente de interface para o botão de clip e progresso.
4.  `src/lib/vector-store.ts`: Utilitários para gerenciar os IDs de bibliotecas no Supabase.

## 4. Próximos Passos Imediatos
1.  **Backend:** Criar a rota de upload de arquivos que valida o Plano Profissional.
2.  **OpenAI:** Raphael configurar o Projeto Dedicado e as Scoped API Keys.
3.  **Chat:** Atualizar a `ChatInterface` para aceitar `vector_store_id`.

## 5. Referências de Documentação
*   Arquitetura Detalhada: `Docs/Arquitetura_Analise_Documentos_2026.md`
*   Guia do Gestor: Seção 4 do arquivo acima.

---
**Status:** Planejamento Finalizado | **Pronto para Codar.**
