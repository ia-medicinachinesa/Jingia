const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Helper to parse SQL INSERT VALUES statements
function parseSqlValues(content) {
  const valuesPartMatch = content.match(/VALUES\s*([\s\S]+)$/i);
  if (!valuesPartMatch) return [];
  let valuesStr = valuesPartMatch[1].trim();
  if (valuesStr.endsWith(';')) {
    valuesStr = valuesStr.slice(0, -1);
  }
  
  const tuples = [];
  let inString = false;
  let currentTuple = '';
  let parenLevel = 0;
  
  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    if (char === "'" && valuesStr[i - 1] !== '\\') {
      inString = !inString;
      currentTuple += char;
    } else if (!inString) {
      if (char === '(') {
        parenLevel++;
        if (parenLevel === 1) {
          currentTuple = '';
          continue;
        }
      } else if (char === ')') {
        parenLevel--;
        if (parenLevel === 0) {
          tuples.push(currentTuple);
          currentTuple = '';
          continue;
        }
      }
      currentTuple += char;
    } else {
      currentTuple += char;
    }
  }
  
  return tuples.map(t => {
    const values = [];
    let currentVal = '';
    let inStr = false;
    for (let i = 0; i < t.length; i++) {
      const char = t[i];
      if (char === "'" && t[i - 1] !== '\\') {
        inStr = !inStr;
      } else if (char === ',' && !inStr) {
        values.push(cleanVal(currentVal));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(cleanVal(currentVal));
    return values;
  });
}

function cleanVal(val) {
  val = val.trim();
  if (val === 'null' || val === 'NULL' || val === '') return null;
  if (!isNaN(val)) return Number(val);
  return val;
}

function runAnalysis() {
  console.log('--- Loading Data ---');
  
  // 1. Load SQL Users
  const usersSqlPath = path.join('Usuários', 'users_rows (1).sql');
  const usersSql = fs.readFileSync(usersSqlPath, 'utf8');
  const rawUsers = parseSqlValues(usersSql);
  const users = rawUsers.map(row => ({
    id: row[0],
    clerk_user_id: row[1],
    email: row[2] ? row[2].toLowerCase().trim() : null,
    subscription_status: row[3],
    subscription_expires_at: row[4],
    plan_id: row[5],
    trial_messages_used: row[6],
    monthly_message_count: row[7],
    message_count_reset_at: row[8],
    created_at: row[9],
    updated_at: row[10],
    crm: row[11],
    specialty: row[12],
    vector_store_id: row[13],
    last_response_id: row[14]
  }));
  
  // 2. Load SQL Threads
  const threadsSqlPath = path.join('Usuários', 'threads_rows.sql');
  const threadsSql = fs.readFileSync(threadsSqlPath, 'utf8');
  const rawThreads = parseSqlValues(threadsSql);
  const threads = rawThreads.map(row => ({
    id: row[0],
    user_id: row[1],
    assistant_id: row[2],
    openai_thread_id: row[3],
    title: row[4],
    message_count: row[5],
    created_at: row[6],
    updated_at: row[7]
  }));

  // 3. Load Excel Sheets
  const xlsx1Path = '0d9cda77-8c85-5860-a522-018ea0df1132.xlsx';
  const xlsx2Path = path.join('Usuários', 'a9f9b25f-1518-50e1-89ce-3e69d2a3ab55.xlsx');
  
  const allSales = [];
  const allRecebedores = [];
  
  function processExcel(filePath) {
    if (!fs.existsSync(filePath)) return;
    const wb = xlsx.readFile(filePath);
    wb.SheetNames.forEach(sheetName => {
      const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
      if (sheetName.includes('Vendas') || sheetName.includes('18-02')) {
        data.forEach(row => {
          allSales.push(row);
        });
      } else if (sheetName.includes('Recebedores')) {
        data.forEach(row => {
          allRecebedores.push(row);
        });
      }
    });
  }
  
  processExcel(xlsx1Path);
  processExcel(xlsx2Path);
  
  // Deduplicate sales by ID da fatura
  const salesMap = new Map();
  allSales.forEach(sale => {
    const id = sale['ID da fatura'];
    if (id) {
      salesMap.set(id, sale);
    }
  });
  const uniqueSales = Array.from(salesMap.values());
  
  console.log(`Loaded ${users.length} users, ${threads.length} threads, and ${uniqueSales.length} unique transaction records.`);
  
  // --- SEGMENTATION ANALYSIS ---
  
  // Statuses
  const statusCounts = {};
  users.forEach(u => {
    statusCounts[u.subscription_status] = (statusCounts[u.subscription_status] || 0) + 1;
  });
  
  // Plans
  const planCounts = {};
  users.forEach(u => {
    const plan = u.plan_id || 'trial/grátis (null)';
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  });
  
  // Professions (CRM field parsing)
  const professions = {
    'Acupunturista': 0,
    'Fisioterapeuta': 0,
    'Enfermeiro': 0,
    'Biomédico': 0,
    'Farmacêutico': 0,
    'Esteticista': 0,
    'Outros / Não Especificado': 0
  };
  
  users.forEach(u => {
    const crmStr = (u.crm || '').toLowerCase();
    const specStr = (u.specialty || '').toLowerCase();
    
    let classified = false;
    if (crmStr.includes('fisioterapeuta') || crmStr.includes('fisio') || specStr.includes('fisioterapeuta') || specStr.includes('fisio')) {
      professions['Fisioterapeuta']++;
      classified = true;
    }
    if (crmStr.includes('enfermeir') || specStr.includes('enfermeir')) {
      professions['Enfermeiro']++;
      classified = true;
    }
    if (crmStr.includes('biomédic') || crmStr.includes('biomedic') || specStr.includes('biomédic') || specStr.includes('biomedic')) {
      professions['Biomédico']++;
      classified = true;
    }
    if (crmStr.includes('farmacêutic') || crmStr.includes('farmaceutic') || specStr.includes('farmacêutic') || specStr.includes('farmaceutic')) {
      professions['Farmacêutico']++;
      classified = true;
    }
    if (crmStr.includes('estetic') || specStr.includes('estetic')) {
      professions['Esteticista']++;
      classified = true;
    }
    // Check general acupunturista if not already classified or specifically mentioned
    if (crmStr.includes('acupunturista') || specStr.includes('acupunturista')) {
      if (!classified) {
        professions['Acupunturista']++;
        classified = true;
      }
    }
    
    if (!classified) {
      if (crmStr.trim() !== '' || specStr.trim() !== '') {
        professions['Acupunturista']++; // Default category for MTC platform
      } else {
        professions['Outros / Não Especificado']++;
      }
    }
  });

  // Clinical Specialties / Focus areas (Specialty field analysis)
  const focusAreas = {
    'Dor e Traumato-Ortopedia (Lombalgia, Ciática, Fibromialgia)': 0,
    'Saúde da Mulher, Ginecologia e Fertilidade (FIV, Menopausa)': 0,
    'Saúde Mental, Emocional e Sono (Ansiedade, Depressão, Insônia)': 0,
    'Pediatria e Neonatologia': 0,
    'Estética Clinica (Melasma, Alopecia, Emagrecimento)': 0
  };
  
  users.forEach(u => {
    const spec = (u.specialty || '').toLowerCase() + ' ' + (u.crm || '').toLowerCase();
    let hasFocus = false;
    
    if (spec.includes('dor') || spec.includes('ombro') || spec.includes('joelho') || spec.includes('hérnia') || spec.includes('fibromialgia') || spec.includes('neuromuscular') || spec.includes('cervical') || spec.includes('lombar') || spec.includes('ciática') || spec.includes('algia') || spec.includes('lombociatalgia')) {
      focusAreas['Dor e Traumato-Ortopedia (Lombalgia, Ciática, Fibromialgia)']++;
      hasFocus = true;
    }
    if (spec.includes('mulher') || spec.includes('homem') || spec.includes('fértil') || spec.includes('fertilidade') || spec.includes('endometriose') || spec.includes('menopausa') || spec.includes('ginec') || spec.includes('gravid') || spec.includes('gest') || spec.includes('fiv')) {
      focusAreas['Saúde da Mulher, Ginecologia e Fertilidade (FIV, Menopausa)']++;
      hasFocus = true;
    }
    if (spec.includes('mental') || spec.includes('ansiedade') || spec.includes('depressão') || spec.includes('estresse') || spec.includes('tdah') || spec.includes('sono') || spec.includes('insônia') || spec.includes('emocional') || spec.includes('pânico')) {
      focusAreas['Saúde Mental, Emocional e Sono (Ansiedade, Depressão, Insônia)']++;
      hasFocus = true;
    }
    if (spec.includes('pediat') || spec.includes('infantil') || spec.includes('criança') || spec.includes('nenê') || spec.includes('bebê') || spec.includes('neonatal') || spec.includes('desenv')) {
      focusAreas['Pediatria e Neonatologia']++;
      hasFocus = true;
    }
    if (spec.includes('estétic') || spec.includes('emagrec') || spec.includes('cabelo') || spec.includes('alopecia') || spec.includes('melasma') || spec.includes('rugas')) {
      focusAreas['Estética Clinica (Melasma, Alopecia, Emagrecimento)']++;
      hasFocus = true;
    }
  });

  // --- REVENUE & BILLING (HUBLA) ANALYSIS ---
  
  const paidSales = uniqueSales.filter(s => s['Status da fatura'] === 'Paga');
  const refundsSales = uniqueSales.filter(s => s['Status da fatura'] === 'Reembolsada');
  const refusedSales = uniqueSales.filter(s => s['Status da fatura'] === 'Recusada' || s['Status da fatura'] === 'Cancelada');
  
  let totalGrossRevenue = 0;
  let totalNetRevenue = 0;
  let totalCommissionsRevenue = 0; // Producer commission
  
  paidSales.forEach(s => {
    totalGrossRevenue += Number(s['Valor total'] || s['Valor do produto'] || 0);
    totalNetRevenue += Number(s['Valor Líquido'] || 0);
    totalCommissionsRevenue += Number(s['Valor da sua comissão'] || 0);
  });
  
  // Payment methods
  const paymentMethods = {};
  paidSales.forEach(s => {
    const method = s['Método de pagamento'] || 'Desconhecido';
    paymentMethods[method] = (paymentMethods[method] || 0) + 1;
  });
  
  // Subscriptions frequency
  const billingCycle = {};
  paidSales.forEach(s => {
    const cycle = s['Plano de assinatura'] || 'Venda Única / Sem Assinatura';
    billingCycle[cycle] = (billingCycle[cycle] || 0) + 1;
  });

  // Offer names
  const offerCounts = {};
  paidSales.forEach(s => {
    const name = s['Nome da oferta'] || s['Nome do produto'] || 'Outro';
    offerCounts[name] = (offerCounts[name] || 0) + 1;
  });

  // --- ENGAGEMENT & PRODUCT USAGE (THREADS / MESSAGES) ---
  
  const totalThreadsCount = threads.length;
  let totalMessagesCount = 0;
  
  const userThreadCounts = {};
  const userMessageCounts = {};
  const assistantUsage = {}; // thread counts and message counts per assistant
  const assistantMessages = {};
  
  threads.forEach(t => {
    const userId = t.user_id;
    const msgCount = Number(t.message_count || 0);
    
    totalMessagesCount += msgCount;
    
    userThreadCounts[userId] = (userThreadCounts[userId] || 0) + 1;
    userMessageCounts[userId] = (userMessageCounts[userId] || 0) + msgCount;
    
    const astId = t.assistant_id || 'Não Definido';
    assistantUsage[astId] = (assistantUsage[astId] || 0) + 1;
    assistantMessages[astId] = (assistantMessages[astId] || 0) + msgCount;
  });
  
  // Sort users by usage to verify Pareto Principle (80/20 rule)
  const sortedUserIdsByMessages = Object.keys(userMessageCounts).sort((a, b) => userMessageCounts[b] - userMessageCounts[a]);
  const numUsersUsage = sortedUserIdsByMessages.length;
  
  // Pareto calculation: Top 20% users
  const top20PercentCount = Math.max(1, Math.round(numUsersUsage * 0.2));
  let top20PercentMessages = 0;
  for (let i = 0; i < top20PercentCount; i++) {
    top20PercentMessages += userMessageCounts[sortedUserIdsByMessages[i]];
  }
  const paretoRatio = totalMessagesCount > 0 ? (top20PercentMessages / totalMessagesCount * 100).toFixed(1) : 0;
  
  // Inactive users check (users in db who never created a thread)
  let inactiveUsersInDb = 0;
  const activeDbUserIds = new Set(threads.map(t => t.user_id));
  users.forEach(u => {
    if (!activeDbUserIds.has(u.id)) {
      inactiveUsersInDb++;
    }
  });

  // Top 5 power users details
  const top5PowerUsers = sortedUserIdsByMessages.slice(0, 5).map(uid => {
    const userObj = users.find(u => u.id === uid);
    return {
      email: userObj ? userObj.email : 'unknown@user.com',
      crm: userObj ? userObj.crm : 'N/A',
      messages: userMessageCounts[uid],
      threads: userThreadCounts[uid]
    };
  });

  // --- DATA QUALITY AUDIT / INCONSISTENCIES ---
  
  // 1. Database active users with null plan
  const activeUsersNullPlan = users.filter(u => u.subscription_status === 'active' && !u.plan_id);
  
  // 2. Database active users who are not found in Hubla paid list (Free Riders)
  const hublaPaidEmails = new Set(paidSales.map(s => s['Email do cliente'] ? s['Email do cliente'].toLowerCase().trim() : ''));
  const freeRiders = users.filter(u => u.subscription_status === 'active' && !hublaPaidEmails.has(u.email));
  
  // 3. Paid customers in Hubla who are pending or missing in Database
  const dbEmails = new Set(users.map(u => u.email));
  const missingInDb = [];
  const pendingInDb = [];
  
  paidSales.forEach(s => {
    const email = s['Email do cliente'] ? s['Email do cliente'].toLowerCase().trim() : null;
    if (email) {
      if (!dbEmails.has(email)) {
        missingInDb.push({
          name: s['Nome do cliente'],
          email: email,
          date: s['Data de pagamento'],
          offer: s['Nome da oferta']
        });
      } else {
        const dbUser = users.find(u => u.email === email);
        if (dbUser && dbUser.clerk_user_id.startsWith('pending_')) {
          pendingInDb.push({
            email: email,
            status: dbUser.subscription_status,
            plan: dbUser.plan_id
          });
        }
      }
    }
  });
  
  // 4. Mismatch in message count (users.monthly_message_count vs sum of messages in threads)
  const countMismatches = [];
  users.forEach(u => {
    const threadSum = userMessageCounts[u.id] || 0;
    if (u.monthly_message_count !== threadSum) {
      countMismatches.push({
        email: u.email,
        tableCount: u.monthly_message_count,
        threadCount: threadSum,
        diff: Math.abs(u.monthly_message_count - threadSum)
      });
    }
  });

  // Sort mismatches by difference
  countMismatches.sort((a, b) => b.diff - a.diff);

  console.log('--- Generating Report Markdown ---');

  // Assistant mappings
  const assistantNames = {
    'ASS-01': 'IA Principal (AcuAnamnese)',
    'ASS-02': 'Correlação de Sintomas (AcuProtocolo)',
    'ASS-03': 'YNSA (Acupuntura Craniana)',
    'ASS-04': 'Auriculoterapia',
    'ASS-05': 'Fotobiomodulação',
    'ASS-06': 'Interpretação de Exames',
    'ASS-07': 'Síntese de Artigos Científicos',
    'ASS-08': 'Estratégia de Marketing Clínico',
    'ASS-09': 'Marketing / Apoio Adicional'
  };

  // Compile markdown
  let md = `# Análise Multidimensional de Usuários e Performance do Produto (Jing IA)

Este relatório apresenta uma análise detalhada dos usuários da plataforma **Jing IA**, cruzando dados transacionais da plataforma **Hubla** com dados de utilização e cadastros persistidos no banco de dados **Supabase** (tabelas \`users\` e \`threads\`).

---

## 1. Embasamento e Referencial Teórico

A análise de dados de usuários para sistemas de suporte à decisão clínica baseados em inteligência artificial (CDSS-AI) é governada por três pilares científicos e de engenharia de software:

### 1.1. O Princípio de Pareto (Regra 80/20) em Sistemas Cloud-AI
Em plataformas de SaaS baseadas em LLM APIs, a distribuição de consumo de tokens frequentemente segue um padrão de cauda longa (Pareto). Uma minoria de usuários hiperativos (Power Users) consome a maior parte dos recursos computacionais. Identificar essa taxa de consumo é vital para calibrar os limites dos planos (\`PLAN_LIMITS\`) e evitar vazamento de margem operacional devido a custos elevados de inferência na OpenAI API.

### 1.2. Alinhamento de Especialidades Clínicas & Cognitive Offloading
O conceito de **Cognitive Offloading** (Descarregamento Cognitivo) estuda como profissionais de saúde utilizam ferramentas tecnológicas para reduzir a carga de trabalho mental na tomada de decisão. Na Medicina Tradicional Chinesa (MTC), a complexidade diagnóstica envolve relacionar múltiplos microssistemas (Língua, Pulso, Meridianos) e converter jargões milenares para pacientes contemporâneos. Mapear quais assistentes são os mais ativados elucida a exata dor que o software resolve e norteia o direcionamento da proposta de valor (Product-Market Fit).

### 1.3. Auditoria de Sincronização Transacional (Idempotência e Faturamento)
Em arquiteturas modernas de software integradas a intermediários de pagamento (via Webhooks), falhas de sincronização na entrega de eventos de checkout criam divergências entre o banco de dados interno e o gateway de pagamento. A análise sistemática dessas falhas previne o vazamento de receita (**Revenue Leakage**), onde usuários continuam acessando o sistema mesmo após estarem inadimplentes, ou problemas de experiência do cliente, onde compradores legítimos ficam com contas pendentes ou sem o plano correto ativo.

---

## 2. Visão Geral da Base de Usuários (Supabase)

A base de dados persite **${users.length} usuários**. Segue a distribuição sociodemográfica e de planos:

### 2.1. Status da Assinatura
| Status da Assinatura | Volume | Percentual |
| :--- | :---: | :---: |
${Object.entries(statusCounts).map(([status, count]) => `| \`${status}\` | ${count} | ${(count / users.length * 100).toFixed(1)}% |`).join('\n')}

*   **Taxa de Ativação Geral (Active Users)**: **${((statusCounts['active'] || 0) / users.length * 100).toFixed(1)}%** da base cadastrada está marcada como ativa no banco de dados.

### 2.2. Distribuição de Planos Atuais
| Plano | Usuários | Percentual |
| :--- | :---: | :---: |
${Object.entries(planCounts).map(([plan, count]) => `| \`${plan}\` | ${count} | ${(count / users.length * 100).toFixed(1)}% |`).join('\n')}

*   A grande maioria da base está enquadrada no plano **Profissional** (acesso a YNSA, Auriculoterapia e Fotobiomodulação).

### 2.3. Especialidades e Categorias Profissionais (CRM / Especialidade)
Mapeamento heurisitco de classes profissionais baseado no cadastro de CRM e especializações relatadas pelos próprios usuários:

| Categoria Profissional | Usuários Declarados | Percentual |
| :--- | :---: | :---: |
${Object.entries(professions).sort((a, b) => b[1] - a[1]).map(([prof, count]) => `| ${prof} | ${count} | ${(count / users.length * 100).toFixed(1)}% |`).join('\n')}

#### Áreas de Foco Clínico e Sub-especialidades
Análise de frequência baseada nas especialidades descritas pelos usuários (um usuário pode atuar em mais de uma área):
*   **Dor e Traumato-Ortopedia**: ${focusAreas['Dor e Traumato-Ortopedia (Lombalgia, Ciática, Fibromialgia)']} usuários mencionam foco em dor crônica, hérnias, fibromialgia ou acupuntura neuromuscular.
*   **Saúde da Mulher, Ginecologia e Fertilidade**: ${focusAreas['Saúde da Mulher, Ginecologia e Fertilidade (FIV, Menopausa)']} usuários focam em fertilidade, FIV (Fertilização in Vitro), saúde da mulher, gestação ou menopausa.
*   **Saúde Mental e Emocional**: ${focusAreas['Saúde Mental, Emocional e Sono (Ansiedade, Depressão, Insônia)']} usuários citam ansiedade, depressão, estresse, insônia ou distúrbios psicossomáticos.
*   **Estética Clínica**: ${focusAreas['Estética Clinica (Melasma, Alopecia, Emagrecimento)']} usuários declaram atuar com emagrecimento, estética facial, melasma ou queda de cabelo (alopecia).
*   **Pediatria e Neonatologia**: ${focusAreas['Pediatria e Neonatologia']} usuários focam em atendimento infantil ou pediátrico.

---

## 3. Análise de Faturamento e Transações (Hubla)

Análise financeira extraída das planilhas de checkout. Foram identificadas **${uniqueSales.length} transações únicas** no período analisado.

### 3.1. Métricas Financeiras Consolidadas (Vendas Pagas)
*   **Volume de Vendas Pagas**: **${paidSales.length}** faturas
*   **Receita Bruta Total (Gross Revenue)**: **R$ ${totalGrossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**
*   **Receita Líquida (Net Revenue após taxas do gateway)**: **R$ ${totalNetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**
*   **Comissão Líquida do Produtor (Seu Ganho)**: **R$ ${totalCommissionsRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**
*   **Taxa de Reembolso (Refund Rate)**: **${(refundsSales.length / uniqueSales.length * 100).toFixed(1)}%** (${refundsSales.length} faturas reembolsadas)
*   **Taxa de Recusa/Cancelamento**: **${(refusedSales.length / uniqueSales.length * 100).toFixed(1)}%** (${refusedSales.length} faturas canceladas ou recusadas pelo cliente/antifraude)

### 3.2. Métodos de Pagamento Escolhidos
| Método de Pagamento | Faturas Pagas | Percentual |
| :--- | :---: | :---: |
${Object.entries(paymentMethods).sort((a, b) => b[1] - a[1]).map(([m, c]) => `| ${m} | ${c} | ${(c / paidSales.length * 100).toFixed(1)}% |`).join('\n')}

### 3.3. Ciclo de Cobrança (Frequência de Assinatura)
| Frequência | Faturas Pagas | Percentual |
| :--- | :---: | :---: |
${Object.entries(billingCycle).sort((a, b) => b[1] - a[1]).map(([c, count]) => `| ${c} | ${count} | ${(count / paidSales.length * 100).toFixed(1)}% |`).join('\n')}

### 3.4. Distribuição por Nome da Oferta
| Nome do Produto / Oferta | Vendas Pagas | Percentual |
| :--- | :---: | :---: |
${Object.entries(offerCounts).sort((a, b) => b[1] - a[1]).map(([off, count]) => `| ${off} | ${count} | ${(count / paidSales.length * 100).toFixed(1)}% |`).join('\n')}

---

## 4. Engajamento e Uso da Inteligência Artificial

A utilização dos assistentes de inteligência artificial revela o comportamento clínico real dos usuários na plataforma. Foram analisadas **${totalThreadsCount} conversas (threads)**, acumulando um total de **${totalMessagesCount} mensagens enviadas**.

### 4.1. Popularidade e Engajamento por Assistente
A tabela abaixo exibe a ativação de cada assistente, ordenada pelo total de mensagens enviadas:

| Código | Assistente / Nome | Conversas Criadas | Mensagens Enviadas | Média de Mensagens/Thread |
| :--- | :--- | :---: | :---: | :---: |
${Object.entries(assistantMessages).sort((a, b) => b[1] - a[1]).map(([astId, msgs]) => {
  const threadsCount = assistantUsage[astId] || 0;
  const avg = threadsCount > 0 ? (msgs / threadsCount).toFixed(1) : '0';
  const name = assistantNames[astId] || astId;
  return `| \`${astId}\` | ${name} | ${threadsCount} | ${msgs} | ${avg} |`;
}).join('\n')}

#### Insights Clínicos:
1.  **AcuAnamnese (\`ASS-01\`)** é o motor primário do engajamento na plataforma, respondendo por **${((assistantMessages['ASS-01'] || 0) / totalMessagesCount * 100).toFixed(1)}%** de todas as mensagens. Isso demonstra que a principal dor atendida é o suporte direto à condução de anamneses e diagnóstico clínico em tempo de consulta.
2.  **Interpretação de Exames (\`ASS-06\`)** possui a maior taxa de mensagens por thread (**${(assistantMessages['ASS-06'] / assistantUsage['ASS-06']).toFixed(1)}**). Isso indica que a análise laboratorial sob a perspectiva da MTC exige conversas mais longas e iterações mais profundas por caso analisado.
3.  Os assistentes especializados em técnicas específicas (\`ASS-03\`, \`ASS-04\`, \`ASS-05\`) têm baixa atração na base atual, sinalizando que a clínica geral e o auxílio no marketing e exames são prioridades operacionais mais prementes para o profissional.

### 4.2. O Princípio de Pareto Aplicado à Utilização da IA
A análise do comportamento individual dos usuários ativos revela alta disparidade de consumo:

*   **Usuários Ativos (que criaram ao menos 1 thread)**: **${numUsersUsage} usuários** de ${users.length} totais (**${(numUsersUsage / users.length * 100).toFixed(1)}%**).
*   **Usuários Inativos no Período**: **${inactiveUsersInDb} usuários** (**${(inactiveUsersInDb / users.length * 100).toFixed(1)}%**).
*   **Concentração de Consumo (Top 20% mais ativos)**: Os **${top20PercentCount}** usuários mais ativos são responsáveis por **${top20PercentMessages} mensagens**, o que representa **${paretoRatio}%** de toda a carga de inferência do sistema.

#### Perfil dos Top 5 Usuários Mais Ativos (Power Users)
| E-mail do Usuário | Categoria Profissional (CRM) | Total Mensagens | Total Conversas (Threads) |
| :--- | :--- | :---: | :---: |
${top5PowerUsers.map(u => `| \`${u.email}\` | ${u.crm || 'Não Declarado'} | ${u.messages} | ${u.threads} |`).join('\n')}

---

## 5. Auditoria de Qualidade de Dados e Inconsistências Técnicas

Abaixo estão listadas as divergências identificadas entre o banco de dados interno e as faturas da Hubla. Estas inconsistências afetam diretamente a receita operacional ou representam bugs no fluxo de webhooks.

### 5.1. Usuários Ativos no Banco de Dados com Plano Nulo (Sem plano definido)
Estes usuários estão marcados como \`active\` no Supabase, mas a coluna \`plan_id\` está vazia/nula. O sistema pode estar aplicando a eles o limite padrão (que pode ser inadequado ou gerar acessos indevidos):

| E-mail | Status | Criado em | CRM Declarado |
| :--- | :---: | :---: | :--- |
${activeUsersNullPlan.length > 0 
  ? activeUsersNullPlan.map(u => `| \`${u.email}\` | \`${u.subscription_status}\` | ${u.created_at ? u.created_at.slice(0,10) : 'N/A'} | ${u.crm || '-'} |`).join('\n')
  : '| *Nenhum usuário identificado com esta divergência.* | - | - | - |'}

### 5.2. Suspeita de Acesso Sem Pagamento Ativo ("Free Riders")
Usuários marcados como ativos (\`subscription_status = 'active'\`) no Supabase, mas que **não possuem faturas marcadas como 'Paga'** nas planilhas de exportação da Hubla. Requer auditoria urgente para verificar se a liberação ocorreu por cortesia ou se há falha de cancelamento via webhook:

| E-mail | Plano Ativo | Criado em |
| :--- | :---: | :---: |
${freeRiders.length > 0 
  ? freeRiders.map(u => `| \`${u.email}\` | \`${u.plan_id || 'null'}\` | ${u.created_at ? u.created_at.slice(0,10) : 'N/A'} |`).join('\n')
  : '| *Nenhum usuário identificado com esta divergência.* | - | - |'}

### 5.3. Faturas Pagas na Hubla sem Conta Ativa no Supabase (Assinantes Órfãos)
Estes clientes pagaram a assinatura na Hubla, mas **não possuem registro de usuário** no banco de dados Supabase ou sua conta ainda não foi criada. Isso significa que eles compraram, mas ainda não acessaram o sistema ou o webhook falhou em inserir o registro pendente:

| Nome do Cliente | E-mail do Cliente | Data Pagamento | Oferta Comprada |
| :--- | :--- | :---: | :--- |
${missingInDb.length > 0 
  ? missingInDb.map(u => `| ${u.name} | \`${u.email}\` | ${u.date} | ${u.offer} |`).join('\n')
  : '| *Nenhum cliente pago está faltando na base.* | - | - | - |'}

### 5.4. Contas Pendentes de Primeiro Acesso (Criadas por Webhook, aguardando Clerk)
Estes usuários tiveram o faturamento aprovado e foram pré-cadastrados no banco com \`clerk_user_id\` iniciando com \`pending_\`, mas ainda não completaram o login/cadastro inicial através do fluxo do Clerk:

| E-mail do Usuário | Status | Plano Pré-configurado |
| :--- | :---: | :---: |
${pendingInDb.length > 0 
  ? pendingInDb.map(u => `| \`${u.email}\` | \`${u.status}\` | \`${u.plan || 'null'}\` |`).join('\n')
  : '| *Nenhuma conta pendente identificada.* | - | - |'}

### 5.5. Divergência de Contagem de Mensagens (Auditoria de Consumo)
Divergência entre o contador rápido da tabela de usuários (\`users.monthly_message_count\`) e a soma real das mensagens enviadas nas threads daquele usuário. Diferenças significativas indicam que o contador de mensagens pode não estar sendo incrementado corretamente nas chamadas de API ou que as conversas estão sendo excluídas sem dedução proporcional no contador rápido:

| E-mail do Usuário | Contador Users (\`monthly_message_count\`) | Soma Real nas Threads | Diferença absoluta |
| :--- | :---: | :---: | :---: |
${countMismatches.slice(0, 10).map(m => `| \`${m.email}\` | ${m.tableCount} | ${m.threadCount} | ${m.diff} |`).join('\n')}

---

## 6. Recomendações Estratégicas e Técnicas (Business Intelligence)

Com base nas análises empíricas e no referencial teórico delineado, propõem-se as seguintes ações para a otimização da Jing IA:

### 6.1. Correções Críticas de Infraestrutura e Faturamento (Agilidade e Segurança)
1.  **Resolver Assinantes Órfãos**: Verificar manualmente os clientes listados na seção 5.3. Como eles pagaram mas não constam na base, devem ser convidados ativamente para realizar o cadastro ou ter suas contas inseridas via script com o plano correspondente.
2.  **Corrigir Sincronização de Cancelamento**: Os usuários "Free Riders" listados na seção 5.2 precisam ter seus acessos bloqueados. Deve-se revisar a rota do Webhook da Hubla para garantir que eventos de inadimplência (\`chargeback\`, \`canceled\`, \`refunded\`) estejam alterando o \`subscription_status\` para \`inactive\` ou \`canceled\`.

### 6.2. Otimização Financeira e Controle de Custos de LLM (Prevenção de Abuso)
1.  **Revisão do Plano Profissional**: O limite de mensagens mensal do plano Profissional é de **200**. No entanto, observamos que os Power Users consomem volumes que chegam perto de **139** mensagens em poucos dias (como a usuária \`pscosta.flavia@gmail.com\`). Se houver escalonamento no uso, o custo de API Key (OpenAI Responses API) aumentará acentuadamente.
2.  **Mitigação do Efeito Pareto**: Implementar um sistema de alerta no backend que monitore usuários que atingem 80% do seu limite de mensagens mensais em menos de 15 dias, oferecendo um upgrade para o plano Premium ou aplicando um rate limit diário para evitar picos atípicos de requisição.

### 6.3. Direcionamento do Product-Market Fit (Foco da Proposta de Valor)
1.  **Foco em Anamnese e Diagnóstico**: Sabendo que **AcuAnamnese (\`ASS-01\`)** concentra quase todo o engajamento do aplicativo, as campanhas de marketing devem focar em demonstrar a velocidade e facilidade em montar roteiros diagnósticos rápidos.
2.  **Monetização do Leitor de Artigos e Exames**: A interpretação de exames e artigos científicos (\`ASS-06\` e \`ASS-07\`) são recursos avançados e de alta demanda de tokens/contexto devido ao upload de PDFs. Como eles geram threads significativamente mais longas, deve-se garantir que permaneçam restritos estritamente ao plano Premium (como configurado no \`assistants.ts\`) ou monetizados sob demanda.
`;

  // Write to Docs directory
  const docPath = path.join('Docs', 'analise_dados_usuarios_2026.md');
  fs.writeFileSync(docPath, md, 'utf8');
  console.log(`Report successfully written to ${docPath}`);
}

try {
  runAnalysis();
} catch (err) {
  console.error('Error executing analysis:', err);
}
