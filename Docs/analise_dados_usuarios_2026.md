# Análise Multidimensional de Usuários e Performance do Produto (Jing IA)

Este relatório apresenta uma análise detalhada dos usuários da plataforma **Jing IA**, cruzando dados transacionais da plataforma **Hubla** com dados de utilização e cadastros persistidos no banco de dados **Supabase** (tabelas `users` e `threads`).

---

## 1. Embasamento e Referencial Teórico

A análise de dados de usuários para sistemas de suporte à decisão clínica baseados em inteligência artificial (CDSS-AI) é governada por três pilares científicos e de engenharia de software:

### 1.1. O Princípio de Pareto (Regra 80/20) em Sistemas Cloud-AI
Em plataformas de SaaS baseadas em LLM APIs, a distribuição de consumo de tokens frequentemente segue um padrão de cauda longa (Pareto). Uma minoria de usuários hiperativos (Power Users) consome a maior parte dos recursos computacionais. Identificar essa taxa de consumo é vital para calibrar os limites dos planos (`PLAN_LIMITS`) e evitar vazamento de margem operacional devido a custos elevados de inferência na OpenAI API.

### 1.2. Alinhamento de Especialidades Clínicas & Cognitive Offloading
O conceito de **Cognitive Offloading** (Descarregamento Cognitivo) estuda como profissionais de saúde utilizam ferramentas tecnológicas para reduzir a carga de trabalho mental na tomada de decisão. Na Medicina Tradicional Chinesa (MTC), a complexidade diagnóstica envolve relacionar múltiplos microssistemas (Língua, Pulso, Meridianos) e converter jargões milenares para pacientes contemporâneos. Mapear quais assistentes são os mais ativados elucida a exata dor que o software resolve e norteia o direcionamento da proposta de valor (Product-Market Fit).

### 1.3. Auditoria de Sincronização Transacional (Idempotência e Faturamento)
Em arquiteturas modernas de software integradas a intermediários de pagamento (via Webhooks), falhas de sincronização na entrega de eventos de checkout criam divergências entre o banco de dados interno e o gateway de pagamento. A análise sistemática dessas falhas previne o vazamento de receita (**Revenue Leakage**), onde usuários continuam acessando o sistema mesmo após estarem inadimplentes, ou problemas de experiência do cliente, onde compradores legítimos ficam com contas pendentes ou sem o plano correto ativo.

---

## 2. Visão Geral da Base de Usuários (Supabase)

A base de dados persite **42 usuários**. Segue a distribuição sociodemográfica e de planos:

### 2.1. Status da Assinatura
| Status da Assinatura | Volume | Percentual |
| :--- | :---: | :---: |
| `active` | 32 | 76.2% |
| `canceled` | 1 | 2.4% |
| `inactive` | 9 | 21.4% |

*   **Taxa de Ativação Geral (Active Users)**: **76.2%** da base cadastrada está marcada como ativa no banco de dados.

### 2.2. Distribuição de Planos Atuais
| Plano | Usuários | Percentual |
| :--- | :---: | :---: |
| `profissional` | 23 | 54.8% |
| `trial/grátis (null)` | 17 | 40.5% |
| `essencial` | 2 | 4.8% |

*   A grande maioria da base está enquadrada no plano **Profissional** (acesso a YNSA, Auriculoterapia e Fotobiomodulação).

### 2.3. Especialidades e Categorias Profissionais (CRM / Especialidade)
Mapeamento heurisitco de classes profissionais baseado no cadastro de CRM e especializações relatadas pelos próprios usuários:

| Categoria Profissional | Usuários Declarados | Percentual |
| :--- | :---: | :---: |
| Outros / Não Especificado | 28 | 66.7% |
| Fisioterapeuta | 3 | 7.1% |
| Enfermeiro | 3 | 7.1% |
| Biomédico | 3 | 7.1% |
| Acupunturista | 2 | 4.8% |
| Farmacêutico | 2 | 4.8% |
| Esteticista | 1 | 2.4% |

#### Áreas de Foco Clínico e Sub-especialidades
Análise de frequência baseada nas especialidades descritas pelos usuários (um usuário pode atuar em mais de uma área):
*   **Dor e Traumato-Ortopedia**: 8 usuários mencionam foco em dor crônica, hérnias, fibromialgia ou acupuntura neuromuscular.
*   **Saúde da Mulher, Ginecologia e Fertilidade**: 6 usuários focam em fertilidade, FIV (Fertilização in Vitro), saúde da mulher, gestação ou menopausa.
*   **Saúde Mental e Emocional**: 3 usuários citam ansiedade, depressão, estresse, insônia ou distúrbios psicossomáticos.
*   **Estética Clínica**: 1 usuários declaram atuar com emagrecimento, estética facial, melasma ou queda de cabelo (alopecia).
*   **Pediatria e Neonatologia**: 2 usuários focam em atendimento infantil ou pediátrico.

---

## 3. Análise de Faturamento e Transações (Hubla)

Análise financeira extraída das planilhas de checkout. Foram identificadas **29 transações únicas** no período analisado.

### 3.1. Métricas Financeiras Consolidadas (Vendas Pagas)
*   **Volume de Vendas Pagas**: **29** faturas
*   **Receita Bruta Total (Gross Revenue)**: **R$ 10.379,50**
*   **Receita Líquida (Net Revenue após taxas do gateway)**: **R$ 8.608,81**
*   **Comissão Líquida do Produtor (Seu Ganho)**: **R$ 5.165,33**
*   **Taxa de Reembolso (Refund Rate)**: **0.0%** (0 faturas reembolsadas)
*   **Taxa de Recusa/Cancelamento**: **0.0%** (0 faturas canceladas ou recusadas pelo cliente/antifraude)

### 3.2. Métodos de Pagamento Escolhidos
| Método de Pagamento | Faturas Pagas | Percentual |
| :--- | :---: | :---: |
| Cartão de Crédito | 17 | 58.6% |
| PIX | 12 | 41.4% |

### 3.3. Ciclo de Cobrança (Frequência de Assinatura)
| Frequência | Faturas Pagas | Percentual |
| :--- | :---: | :---: |
| Mensal | 19 | 65.5% |
| Anual | 10 | 34.5% |

### 3.4. Distribuição por Nome da Oferta
| Nome do Produto / Oferta | Vendas Pagas | Percentual |
| :--- | :---: | :---: |
| Jing IA Pro | 20 | 69.0% |
| Jing IA | 9 | 31.0% |

---

## 4. Engajamento e Uso da Inteligência Artificial

A utilização dos assistentes de inteligência artificial revela o comportamento clínico real dos usuários na plataforma. Foram analisadas **187 conversas (threads)**, acumulando um total de **546 mensagens enviadas**.

### 4.1. Popularidade e Engajamento por Assistente
A tabela abaixo exibe a ativação de cada assistente, ordenada pelo total de mensagens enviadas:

| Código | Assistente / Nome | Conversas Criadas | Mensagens Enviadas | Média de Mensagens/Thread |
| :--- | :--- | :---: | :---: | :---: |
| `ASS-01` | IA Principal (AcuAnamnese) | 127 | 420 | 3.3 |
| `ASS-09` | Marketing / Apoio Adicional | 18 | 62 | 3.4 |
| `ASS-08` | Estratégia de Marketing Clínico | 8 | 28 | 3.5 |
| `ASS-06` | Interpretação de Exames | 22 | 22 | 1.0 |
| `ASS-07` | Síntese de Artigos Científicos | 8 | 10 | 1.3 |
| `ASS-05` | Fotobiomodulação | 3 | 3 | 1.0 |
| `ASS-02` | Correlação de Sintomas (AcuProtocolo) | 1 | 1 | 1.0 |

#### Insights Clínicos:
1.  **AcuAnamnese (`ASS-01`)** é o motor primário do engajamento na plataforma, respondendo por **76.9%** de todas as mensagens. Isso demonstra que a principal dor atendida é o suporte direto à condução de anamneses e diagnóstico clínico em tempo de consulta.
2.  **Interpretação de Exames (`ASS-06`)** possui a maior taxa de mensagens por thread (**1.0**). Isso indica que a análise laboratorial sob a perspectiva da MTC exige conversas mais longas e iterações mais profundas por caso analisado.
3.  Os assistentes especializados em técnicas específicas (`ASS-03`, `ASS-04`, `ASS-05`) têm baixa atração na base atual, sinalizando que a clínica geral e o auxílio no marketing e exames são prioridades operacionais mais prementes para o profissional.

### 4.2. O Princípio de Pareto Aplicado à Utilização da IA
A análise do comportamento individual dos usuários ativos revela alta disparidade de consumo:

*   **Usuários Ativos (que criaram ao menos 1 thread)**: **27 usuários** de 42 totais (**64.3%**).
*   **Usuários Inativos no Período**: **15 usuários** (**35.7%**).
*   **Concentração de Consumo (Top 20% mais ativos)**: Os **5** usuários mais ativos são responsáveis por **335 mensagens**, o que representa **61.4%** de toda a carga de inferência do sistema.

#### Perfil dos Top 5 Usuários Mais Ativos (Power Users)
| E-mail do Usuário | Categoria Profissional (CRM) | Total Mensagens | Total Conversas (Threads) |
| :--- | :--- | :---: | :---: |
| `pscosta.flavia@gmail.com` | Farmacêutico  | Acupunturista | 108 | 23 |
| `millarochapp@gmail.com` | Não Declarado | 84 | 20 |
| `olimpiademicianojorge@gmail.com` | Não Declarado | 54 | 28 |
| `desilv2002@yahoo.com.br` | Biomédica  | Acupunturista | 48 | 15 |
| `ia.medicinachinesa@gmail.com` | | Outro | 41 | 29 |

---

## 5. Auditoria de Qualidade de Dados e Inconsistências Técnicas

Abaixo estão listadas as divergências identificadas entre o banco de dados interno e as faturas da Hubla. Estas inconsistências afetam diretamente a receita operacional ou representam bugs no fluxo de webhooks.

### 5.1. Usuários Ativos no Banco de Dados com Plano Nulo (Sem plano definido)
Estes usuários estão marcados como `active` no Supabase, mas a coluna `plan_id` está vazia/nula. O sistema pode estar aplicando a eles o limite padrão (que pode ser inadequado ou gerar acessos indevidos):

| E-mail | Status | Criado em | CRM Declarado |
| :--- | :---: | :---: | :--- |
| `desilv2002@yahoo.com.br` | `active` | 2026-05-04 | Biomédica  | Acupunturista |
| `kelicmarocco@gmail.com` | `active` | 2026-05-04 | - |
| `lopessheila0@gmail.com` | `active` | 2026-04-25 | - |
| `cspaziolavie@gmail.com` | `active` | 2026-04-28 | - |
| `jefersonassuncao@gmail.com` | `active` | 2026-05-04 | - |
| `li_navarro@outlook.com` | `active` | 2026-04-30 | - |
| `leilalisboaleila@gmail.com` | `active` | 2026-04-28 | Biomedica  | Acupunturista |

### 5.2. Suspeita de Acesso Sem Pagamento Ativo ("Free Riders")
Usuários marcados como ativos (`subscription_status = 'active'`) no Supabase, mas que **não possuem faturas marcadas como 'Paga'** nas planilhas de exportação da Hubla. Requer auditoria urgente para verificar se a liberação ocorreu por cortesia ou se há falha de cancelamento via webhook:

| E-mail | Plano Ativo | Criado em |
| :--- | :---: | :---: |
| `trafegodicla4@gmail.com` | `profissional` | 2026-04-25 |
| `plenamenteufs@gmail.com` | `profissional` | 2026-04-27 |
| `ia.medicinachinesa@gmail.com` | `profissional` | 2026-04-15 |

### 5.3. Faturas Pagas na Hubla sem Conta Ativa no Supabase (Assinantes Órfãos)
Estes clientes pagaram a assinatura na Hubla, mas **não possuem registro de usuário** no banco de dados Supabase ou sua conta ainda não foi criada. Isso significa que eles compraram, mas ainda não acessaram o sistema ou o webhook falhou em inserir o registro pendente:

| Nome do Cliente | E-mail do Cliente | Data Pagamento | Oferta Comprada |
| :--- | :--- | :---: | :--- |
| *Nenhum cliente pago está faltando na base.* | - | - | - |

### 5.4. Contas Pendentes de Primeiro Acesso (Criadas por Webhook, aguardando Clerk)
Estes usuários tiveram o faturamento aprovado e foram pré-cadastrados no banco com `clerk_user_id` iniciando com `pending_`, mas ainda não completaram o login/cadastro inicial através do fluxo do Clerk:

| E-mail do Usuário | Status | Plano Pré-configurado |
| :--- | :---: | :---: |
| `trafegodicla@gmail.com` | `active` | `profissional` |
| `lanicsil@gmail.com` | `active` | `essencial` |
| `alyneazevedo31@gmail.com` | `active` | `profissional` |
| `gildete496@gmail.com` | `active` | `profissional` |
| `kelicmarocco@gmail.com` | `active` | `null` |
| `lupokrajac@gmail.com` | `active` | `profissional` |

### 5.5. Divergência de Contagem de Mensagens (Auditoria de Consumo)
Divergência entre o contador rápido da tabela de usuários (`users.monthly_message_count`) e a soma real das mensagens enviadas nas threads daquele usuário. Diferenças significativas indicam que o contador de mensagens pode não estar sendo incrementado corretamente nas chamadas de API ou que as conversas estão sendo excluídas sem dedução proporcional no contador rápido:

| E-mail do Usuário | Contador Users (`monthly_message_count`) | Soma Real nas Threads | Diferença absoluta |
| :--- | :---: | :---: | :---: |
| `ia.medicinachinesa@gmail.com` | 5 | 41 | 36 |
| `pscosta.flavia@gmail.com` | 139 | 108 | 31 |
| `olimpiademicianojorge@gmail.com` | 69 | 54 | 15 |
| `maiafisio3@gmail.com` | 47 | 37 | 10 |
| `gabrielasouzaterapias@gmail.com` | 32 | 23 | 9 |
| `lucietyleal71@gmail.com` | 20 | 12 | 8 |
| `naiarasantos.nds@gmail.com` | 23 | 17 | 6 |
| `oliveiralexandrenf@gmail.com` | 7 | 5 | 2 |
| `millarochapp@gmail.com` | 86 | 84 | 2 |
| `helentamaki@gmail.com` | 12 | 10 | 2 |

---

## 6. Recomendações Estratégicas e Técnicas (Business Intelligence)

Com base nas análises empíricas e no referencial teórico delineado, propõem-se as seguintes ações para a otimização da Jing IA:

### 6.1. Correções Críticas de Infraestrutura e Faturamento (Agilidade e Segurança)
1.  **Resolver Assinantes Órfãos**: Verificar manualmente os clientes listados na seção 5.3. Como eles pagaram mas não constam na base, devem ser convidados ativamente para realizar o cadastro ou ter suas contas inseridas via script com o plano correspondente.
2.  **Corrigir Sincronização de Cancelamento**: Os usuários "Free Riders" listados na seção 5.2 precisam ter seus acessos bloqueados. Deve-se revisar a rota do Webhook da Hubla para garantir que eventos de inadimplência (`chargeback`, `canceled`, `refunded`) estejam alterando o `subscription_status` para `inactive` ou `canceled`.

### 6.2. Otimização Financeira e Controle de Custos de LLM (Prevenção de Abuso)
1.  **Revisão do Plano Profissional**: O limite de mensagens mensal do plano Profissional é de **200**. No entanto, observamos que os Power Users consomem volumes que chegam perto de **139** mensagens em poucos dias (como a usuária `pscosta.flavia@gmail.com`). Se houver escalonamento no uso, o custo de API Key (OpenAI Responses API) aumentará acentuadamente.
2.  **Mitigação do Efeito Pareto**: Implementar um sistema de alerta no backend que monitore usuários que atingem 80% do seu limite de mensagens mensais em menos de 15 dias, oferecendo um upgrade para o plano Premium ou aplicando um rate limit diário para evitar picos atípicos de requisição.

### 6.3. Direcionamento do Product-Market Fit (Foco da Proposta de Valor)
1.  **Foco em Anamnese e Diagnóstico**: Sabendo que **AcuAnamnese (`ASS-01`)** concentra quase todo o engajamento do aplicativo, as campanhas de marketing devem focar em demonstrar a velocidade e facilidade em montar roteiros diagnósticos rápidos.
2.  **Monetização do Leitor de Artigos e Exames**: A interpretação de exames e artigos científicos (`ASS-06` e `ASS-07`) são recursos avançados e de alta demanda de tokens/contexto devido ao upload de PDFs. Como eles geram threads significativamente mais longas, deve-se garantir que permaneçam restritos estritamente ao plano Premium (como configurado no `assistants.ts`) ou monetizados sob demanda.
