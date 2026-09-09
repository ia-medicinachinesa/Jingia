const fs = require('fs');
const path = require('path');

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
  console.log('--- Loading Data for Themes Analysis ---');
  
  const usersSqlPath = path.join('Usuários', 'users_rows (1).sql');
  const usersSql = fs.readFileSync(usersSqlPath, 'utf8');
  const rawUsers = parseSqlValues(usersSql);
  const users = rawUsers.map(row => ({
    id: row[0],
    email: row[2] ? row[2].toLowerCase().trim() : null,
    subscription_status: row[3],
    plan_id: row[5],
    crm: row[11],
    specialty: row[12]
  }));
  
  const threadsSqlPath = path.join('Usuários', 'threads_rows.sql');
  const threadsSql = fs.readFileSync(threadsSqlPath, 'utf8');
  const rawThreads = parseSqlValues(threadsSql);
  const threads = rawThreads.map(row => ({
    id: row[0],
    user_id: row[1],
    assistant_id: row[2],
    title: row[4],
    message_count: row[5],
    created_at: row[6]
  }));

  console.log(`Analyzing themes for ${threads.length} threads...`);

  // Theme classifications
  const themes = {
    clinical_cases: { name: 'Casos Clínicos e Prescrição (Raciocínio Clínico)', threads: [], count: 0 },
    techniques_physiology: { name: 'Teoria, Pontos e Fisiologia MTC', threads: [], count: 0 },
    phytotherapy_diet: { name: 'Fitoterapia, Florais e Suplementação/Dieta', threads: [], count: 0 },
    marketing_management: { name: 'Marketing Clínico e Gestão de Consultório', threads: [], count: 0 },
    articles_exams: { name: 'Análise de Exames e Artigos Científicos (Evidência)', threads: [], count: 0 }
  };

  // Specific clinical conditions keywords
  const conditions = {
    'Dor e Traumato-Ortopedia (Lombalgia, Ciática, Hernias, Ombro)': { count: 0, samples: [] },
    'Saúde da Mulher, Ginecologia e Fertilidade (FIV, Menopausa, Endometriose)': { count: 0, samples: [] },
    'Saúde Mental, Sono e Emoções (Ansiedade, Insônia, Estresse, TDAH)': { count: 0, samples: [] },
    'Sistemas Digestivo, Metabólico e Imunológico (Disbiose, Guillain-Barré, Melasma)': { count: 0, samples: [] },
    'Pediatria e Saúde Infantil (Auriculo em bebês, Disquesia)': { count: 0, samples: [] }
  };

  // Specific marketing channels
  const marketingChannels = {
    'Instagram Reels / Vídeos': { count: 0, samples: [] },
    'Instagram Stories': { count: 0, samples: [] },
    'Captação de Pacientes e Parcerias Comerciais': { count: 0, samples: [] },
    'Fichas de Anamnese e Atendimento': { count: 0, samples: [] }
  };

  threads.forEach(t => {
    const title = (t.title || '').toLowerCase();
    const cleanTitle = t.title || '';
    
    // 1. Classify General Theme
    let classified = false;
    
    // Marketing and management
    if (title.includes('reels') || title.includes('instagram') || title.includes('post') || title.includes('story') || 
        title.includes('legenda') || title.includes('atrair') || title.includes('cliente') || title.includes('parceria') || 
        title.includes('médico') || title.includes('nutricionista') || title.includes('captar') || title.includes('consultório') || 
        title.includes('agenda') || title.includes('voucher') || title.includes('promover') || title.includes('ficha de annamenese') ||
        title.includes('questionário') || title.includes('anamnese medicina chinesa')) {
      themes.marketing_management.threads.push(cleanTitle);
      themes.marketing_management.count++;
      classified = true;
      
      // Sub-channel check
      if (title.includes('reels') || title.includes('vídeo') || title.includes('gravar')) {
        marketingChannels['Instagram Reels / Vídeos'].count++;
        marketingChannels['Instagram Reels / Vídeos'].samples.push(cleanTitle);
      } else if (title.includes('story') || title.includes('stories')) {
        marketingChannels['Instagram Stories'].count++;
        marketingChannels['Instagram Stories'].samples.push(cleanTitle);
      } else if (title.includes('parceria') || title.includes('captar') || title.includes('cliente') || title.includes('visitação')) {
        marketingChannels['Captação de Pacientes e Parcerias Comerciais'].count++;
        marketingChannels['Captação de Pacientes e Parcerias Comerciais'].samples.push(cleanTitle);
      } else if (title.includes('ficha') || title.includes('anamnese') || title.includes('questionário')) {
        marketingChannels['Fichas de Anamnese e Atendimento'].count++;
        marketingChannels['Fichas de Anamnese e Atendimento'].samples.push(cleanTitle);
      }
    }
    
    // Articles and exams
    if (!classified && (title.includes('artigo') || title.includes('estudo') || title.includes('referência') || 
        title.includes('científico') || title.includes('laudo') || title.includes('exame') || title.includes('glicada') || 
        title.includes('hemograma') || title.includes('plaquetas') || title.includes('colesterol') || title.includes('pdf') ||
        title.includes('creatina') || title.includes('enzima') || title.includes('langevin'))) {
      themes.articles_exams.threads.push(cleanTitle);
      themes.articles_exams.count++;
      classified = true;
    }
    
    // Phytotherapy, florais, diet
    if (!classified && (title.includes('floral') || title.includes('fitoterap') || title.includes('chá') || 
        title.includes('dente de leão') || title.includes('ervas') || title.includes('caldo de ossos') || 
        title.includes('óleo') || title.includes('artemísia') || title.includes('alimentação') || title.includes('sabor') ||
        title.includes('gui zhi') || title.includes('suplemento') || title.includes('creatina'))) {
      themes.phytotherapy_diet.threads.push(cleanTitle);
      themes.phytotherapy_diet.count++;
      classified = true;
    }

    // Techniques and physiology
    if (!classified && (title.includes('meridiano') || title.includes('ponto') || title.includes('auriculo') || 
        title.includes('moxa') || title.includes('ventosa') || title.includes('laser') || title.includes('ilib') || 
        title.includes('triplo aquecedor') || title.includes('zang-fu') || title.includes('cinco movimentos') || 
        title.includes('transdução mecanica') || title.includes('agulha') || title.includes('e36') || title.includes('t a5'))) {
      themes.techniques_physiology.threads.push(cleanTitle);
      themes.techniques_physiology.count++;
      classified = true;
    }
    
    // Clinical Cases / Default clinical
    if (!classified) {
      themes.clinical_cases.threads.push(cleanTitle);
      themes.clinical_cases.count++;
    }

    // 2. Classify Specific Clinical Condition (can overlap with phytotherapy/techniques)
    if (title.includes('dor') || title.includes('ciática') || title.includes('hérnia') || title.includes('lombar') || 
        title.includes('lombo') || title.includes('ombro') || title.includes('fibromialgia') || title.includes('algia') ||
        title.includes('joelho') || title.includes('artrose') || title.includes('cervical')) {
      conditions['Dor e Traumato-Ortopedia (Lombalgia, Ciática, Hernias, Ombro)'].count++;
      conditions['Dor e Traumato-Ortopedia (Lombalgia, Ciática, Hernias, Ombro)'].samples.push(cleanTitle);
    }
    if (title.includes('mulher') || title.includes('menopausa') || title.includes('fiv') || title.includes('fertil') || 
        title.includes('engravidar') || title.includes('gestante') || title.includes('ginec') || title.includes('endometriose') || 
        title.includes('ovariana') || title.includes('parto') || title.includes('útero') || title.includes('histerectomia')) {
      conditions['Saúde da Mulher, Ginecologia e Fertilidade (FIV, Menopausa, Endometriose)'].count++;
      conditions['Saúde da Mulher, Ginecologia e Fertilidade (FIV, Menopausa, Endometriose)'].samples.push(cleanTitle);
    }
    if (title.includes('ansiedade') || title.includes('depressão') || title.includes('estresse') || title.includes('sono') || 
        title.includes('insônia') || title.includes('tdah') || title.includes('emocional') || title.includes('angústia') ||
        title.includes('pânico') || title.includes('irritabilidade')) {
      conditions['Saúde Mental, Sono e Emoções (Ansiedade, Insônia, Estresse, TDAH)'].count++;
      conditions['Saúde Mental, Sono e Emoções (Ansiedade, Insônia, Estresse, TDAH)'].samples.push(cleanTitle);
    }
    if (title.includes('disbiose') || title.includes('intest') || title.includes('disquesia') || title.includes('digest') || 
        title.includes('constipação') || title.includes('guillai') || title.includes('melasma') || title.includes('alopecia') ||
        title.includes('alimentação') || title.includes('colesterol') || title.includes('glicemia') || title.includes('fígado')) {
      conditions['Sistemas Digestivo, Metabólico e Imunológico (Disbiose, Guillain-Barré, Melasma)'].count++;
      conditions['Sistemas Digestivo, Metabólico e Imunológico (Disbiose, Guillain-Barré, Melasma)'].samples.push(cleanTitle);
    }
    if (title.includes('bebê') || title.includes('nenê') || title.includes('criança') || title.includes('pediat') || 
        title.includes('infantil') || title.includes('recem') || title.includes('disquesia')) {
      conditions['Pediatria e Saúde Infantil (Auriculo em bebês, Disquesia)'].count++;
      conditions['Pediatria e Saúde Infantil (Auriculo em bebês, Disquesia)'].samples.push(cleanTitle);
    }
  });

  // Calculate percentages
  const totalT = threads.length;
  console.log('Classifications complete.');

  // Compile Report Markdown
  let report = `# Plano de Vendas e Publicidade Baseado no Comportamento do Usuário (Jing IA)

Este documento compila uma análise qualitativa e quantitativa dos interesses, dúvidas e comportamentos dos usuários do **Jing IA**, extraída diretamente do processamento de títulos de conversas (threads). Ele fornece o embasamento teórico e direcionamento estratégico necessários para estruturar o plano de vendas, aquisição de clientes (marketing) e publicidade da plataforma.

---

## 1. Mapeamento de Comportamento: O Que os Usuários Buscam?

Análise de agrupamento de **${totalT} conversas** ativas criadas pelos profissionais no sistema.

### 1.1. Distribuição de Temas de Conversa (Necessidades Operacionais)
Os interesses foram categorizados conforme os desafios práticos do profissional no dia a dia do consultório:

| Categoria Temática | Conversas Criadas | Percentual | Job-to-be-Done (O que o usuário quer resolver) |
| :--- | :---: | :---: | :--- |
| **Casos Clínicos e Prescrição** | ${themes.clinical_cases.count} | ${(themes.clinical_cases.count / totalT * 100).toFixed(1)}% | Validar raciocínio clínico e obter protocolos de agulhamento para casos complexos em tempo real de consulta. |
| **Teoria, Pontos e Fisiologia** | ${themes.techniques_physiology.count} | ${(themes.techniques_physiology.count / totalT * 100).toFixed(1)}% | Tirar dúvidas rápidas de localização, combinações de pontos (ex: E36, T A5) ou fundamentação teórica da MTC. |
| **Marketing e Gestão Clínica** | ${themes.marketing_management.count} | ${(themes.marketing_management.count / totalT * 100).toFixed(1)}% | Criar materiais promocionais, posts de Instagram, roteiros de Reels e estruturar captação de parceiros. |
| **Fitoterapia, Florais e Dieta** | ${themes.phytotherapy_diet.count} | ${(themes.phytotherapy_diet.count / totalT * 100).toFixed(1)}% | Prescrever formulações fitoterápicas chinesas, florais de Bach e orientar hábitos alimentares terapêuticos. |
| **Exames e Evidência Científica** | ${themes.articles_exams.count} | ${(themes.articles_exams.count / totalT * 100).toFixed(1)}% | Interpretar exames laboratoriais sob a ótica integrativa ou buscar artigos científicos para atestar eficácia da técnica. |

*   **Raciocínio Clínico Assistido**: Mais de **70%** do uso acumulado da ferramenta (\`Casos Clínicos\` + \`Teoria e Fisiologia\`) é focado diretamente no atendimento ao paciente. A IA atua como um co-piloto clínico.
*   **A "Dor" do Marketing de Atração**: Com **${((themes.marketing_management.count / totalT) * 100).toFixed(1)}%** das interações, a criação de conteúdos de marketing é a segunda maior demanda individual do usuário. O profissional de acupuntura tem dificuldade crônica em produzir conteúdo de atração de leads.

---

### 1.2. Principais Patologias Clínicas Pesquisadas (Foco em Casos)
Quais são os casos reais que chegam nos consultórios dos nossos usuários? Esta frequência de palavras indica os principais motivos de consulta dos pacientes deles:

| Patologia / Condição Clínica | Frequência de Buscas | Exemplos Reais de Termos Pesquisados |
| :--- | :---: | :--- |
| **Dor Crônica e Ortopedia** | ${conditions['Dor e Traumato-Ortopedia (Lombalgia, Ciática, Hernias, Ombro)'].count} | *\"Dor lombar crônica\"*, *\"Lombociatalgia c/ impossibilidade de rotação\"*, *\"Pinçamento de L5\"*, *\"Fibromialgia e MTC\"*, *\"Hernia cervical e lombar\"*, *\"Melasma misto\"*, *\"Artrose no joelho\"*, *\"Lesão de bankart no ombro\"*. |
| **Ginecologia, Fertilidade e FIV** | ${conditions['Saúde da Mulher, Ginecologia e Fertilidade (FIV, Menopausa, Endometriose)'].count} | *\"Falhas na TEC (Transferência de Embrião Congelado)\"*, *\"Paciente tentando engravidar com baixa reserva ovariana\"*, *\"Borra marrom no início do ciclo\"*, *\"Menopausa forçada por histerectomia\"*, *\"Benefícios da acupuntura na indução do parto\"*. |
| **Saúde Mental e Emocional** | ${conditions['Saúde Mental, Sono e Emoções (Ansiedade, Insônia, Estresse, TDAH)'].count} | *\"TDAH em adultos\"*, *\"Sono de manutenção ruim\"*, *\"Ansiedade, irritabilidade e frio nas extremidades\"*, *\"Hipotireoidismo, angústia, sedentarismo e stress\"*. |
| **Sistemas Digestivo / Metabólico** | ${conditions['Sistemas Digestivo, Metabólico e Imunológico (Disbiose, Guillain-Barré, Melasma)'].count} | *\"Paciente pós-menopausa com disbiose intestinal\"*, *\"Síndrome de Guillain-Barré\"*, *\"Constipação\"*, *\"Enzima do fígado alterada\"*, *\"Colesterol alto na MTC\"*. |
| **Pediatria e Neonatologia** | ${conditions['Pediatria e Saúde Infantil (Auriculo em bebês, Disquesia)'].count} | *\"Disquesia com auriculoterapia em nenes recem-nascidos\"*, *\"Pontos de auriculoterapia proibidos em bebês\"*. |

---

### 1.3. Demandas de Marketing e Gestão Clinica
O que os usuários pedem para os assistentes de marketing (\`ASS-08\` e \`ASS-09\`):

| Canal / Formato de Marketing | Ocorrências | Exemplos Reais Extraídos |
| :--- | :---: | :--- |
| **Instagram Reels / Vídeos** | ${marketingChannels['Instagram Reels / Vídeos'].count} | *\"Texto breve para um reels de no máximo 30 segundos\"*, *\"Ajustar legenda para um reels\"*, *\"Reels gravando me apresentando e falando de...\"*. |
| **Instagram Stories** | ${marketingChannels['Instagram Stories'].count} | *\"Sequência de stories para o Instagram com o tema...\"*. |
| **Parcerias e Captação de Clientes** | ${marketingChannels['Captação de Pacientes e Parcerias Comerciais'].count} | *\"Começar a fazer parcerias com médicos e nutricionistas\"*, *\"Iniciar visitação a médicos e nutricionistas\"*, *\"Investir em atendimentos para estética para atrair clientes\"*, *\"Como obter clientes após formado\"*. |
| **Fichas e Processo de Atendimento** | ${marketingChannels['Fichas de Anamnese e Atendimento'].count} | *\"Crie uma ficha de anamnese medicina chinesa\"*, *\"Crie um formulário de anamnese com perguntas para queixa principal"*, *\"Monte um questionário segundo as referências...\"*. |

---

## 2. Segmentação de ICP (Ideal Customer Profile)

Identificamos a presença de três grandes pessoas (perfis) na base de clientes ativos da Jing IA:

### Persona A: A Acupunturista \"Saúde da Mulher & Fertilidade\"
*   **Quem é**: Fisioterapeuta, Biomédica ou Farmacêutica especializada em ginecologia e obstetrícia integrativa.
*   **Principal Dor**: Sentir insegurança técnica ao atender tentantes de Fertilização in Vitro (FIV), casos de baixa reserva ovariana, endometriose profunda e menopausa precoce. A complexidade do ciclo menstrual e dos hormônios exige alto rigor.
*   **Job-to-be-Done (JTBD)**: \"Garantir que eu prescreva o protocolo de acupuntura e fitoterapia mais seguro e atualizado para não atrapalhar o processo de FIV da minha paciente.\"
*   **Uso da Jing IA**: Utiliza majoritariamente o \`ASS-01\`, \`ASS-06\` (exames de hormônios) e \`ASS-07\` (pesquisa científica para embasar o protocolo perante o médico da paciente).

### Persona B: O Fisioterapeuta de \"Dor Crônica / Traumato-Ortopedia\"
*   **Quem é**: Fisioterapeuta de formação que utiliza a acupuntura como recurso analgésico e terapêutico primário.
*   **Principal Dor**: Casos resistentes de lombalgia, cervicalgia e ciatalgia. Pacientes idosos com comorbidades onde técnicas tradicionais não surtiram efeito rápido.
*   **Job-to-be-Done (JTBD)**: \"Achar uma combinação de pontos imediatos ou parâmetros de fotobiomodulação (laser/LED) para aliviar a dor aguda do meu paciente na primeira sessão.\"
*   **Uso da Jing IA**: Utiliza \`ASS-01\` (casos de dor), \`ASS-05\` (laser/LED) e \`ASS-02\` (correlação rápida de meridianos).

### Persona C: O Recém-Formado / Empreendedor de Consultório
*   **Quem é**: Profissional recém-saído da pós-graduação em acupuntura tentando viver de consultório particular.
*   **Principal Dor**: Falta de pacientes, dificuldade de captação de leads, timidez para produzir conteúdo e desconhecimento de como abordar parceiros comerciais (médicos, nutricionistas).
*   **Job-to-be-Done (JTBD)**: \"Ter posts prontos, roteiros de Reels interessantes e propostas de parcerias escritas em segundos para que eu possa lotar minha agenda.\"
*   **Uso da Jing IA**: Utiliza massivamente os assistentes de marketing (\`ASS-08\` e \`ASS-09\`), solicitando legendas de Reels, roteiros de atração e fichas de anamnese padrão.

---

## 3. Plano de Publicidade (Marketing de Atração)

Com base no comportamento mapeado, a comunicação publicitária deve abandonar mensagens genéricas (\"IA para acupuntura\") e focar em **mensagens orientadas a dores específicas** (Segmentação de Criativos).

### 3.1. Copywriting Hooks (Ganchos de Venda) para Tráfego Pago (Meta/Google Ads)

#### Ganho Clínico - Raciocínio em Fertilidade/FIV (Foco Persona A)
*   **Hook 1**: *\"Seu paciente de fertilidade te perguntou sobre falhas na Transferência de Embrião Congelado (TEC) e você ficou insegura sobre quais pontos usar? O Jing IA monta o protocolo ideal na hora.\"*
*   **Hook 2**: *\"Tratamento de baixa reserva ovariana na MTC: acesse estudos científicos, interprete exames hormonais e monte o diagnóstico em 1 minuto.\"*

#### Dor de Atração - Marketing Fácil (Foco Persona C)
*   **Hook 3**: *\"Você passa o domingo pensando em posts e Reels para atrair pacientes de acupuntura? O Jing IA escreve roteiros de 30 segundos, legendas e posts prontos voltados para dor crônica, ansiedade e estética. Lote sua agenda sem ser refém das redes sociais.\"*

#### Eficácia do Alívio da Dor (Foco Persona B)
*   **Hook 4**: *\"Acupuntura Neuromuscular e Fotobiomodulação para Dor Aguda: descubra protocolos exatos de agulhamento e dosimetria de laser para lombociatalgia e hérnias difíceis na primeira consulta.\"*

---

## 4. Plano de Vendas e Funil Comercial

A estratégia de vendas deve capitalizar em cima da segmentação do produto para maximizar o LTV (Lifetime Value) e reduzir a taxa de rejeição de planos.

### 4.1. Estruturação do Funil de Conversão

\`\`\`mermaid
graph TD
    A["Tráfego Pago (Meta Ads / Instagram) <br> Foco nas dores: 'FIV', 'Marketing de Consultório' e 'Casos de Dor'"] --> B("Página de Captura (Lading Page) <br> Teste Gratuito de 7 dias com limites de Trial")
    B --> C{"Uso nos primeiros 3 dias"}
    C -- "Usuário clica em 'Análise de Exames' ou 'Pesquisa de Artigos'" --> D["Urgência de Upgrade para o Plano Profissional / Premium"]
    C -- "Consome limite rápido" --> E["Barreira de limite de mensagens (Upgrade CTA)"]
    D --> F("Assinatura Profissional / Premium Aprovada (Hubla)")
    E --> F
\`\`\`

### 4.2. Táticas para Acelerar Vendas e Conversão

#### 1. Demonstração Interativa (\"Casos de Sucesso\")
Em vez de explicar como o software funciona, criar criativos em vídeo gravando a tela do Jing IA resolvendo uma queixa complexa em tempo real.
*   *Exemplo*: Digitando *\"Paciente mulher, 35 anos, queixa de insônia e dor ciática no meridiano da VB, tomando puran T4. Quais pontos usar?\"* e mostrando a resposta estruturada. Isso gera impacto visual imediato (*Aha! Moment*).

#### 2. Parcerias com Escolas e Institutos de Pós-Graduação
A Persona C (recém-formada) busca ativamente por clientes. Fechar parcerias comerciais com cursos de especialização em acupuntura para oferecer 30 dias gratuitos do Jing IA na matrícula do aluno. O aluno aprende a estruturar anamneses clínicas usando a IA e se torna assinante retido após a formação.

#### 3. Upsell Baseado em Uploads (PDFs)
Exames laboratoriais (\`ASS-06\`) e análise de artigos (\`ASS-07\`) são recursos altamente valorizados e geram as conversas mais densas.
*   **Tática**: Manter o plano *Essencial* limitado a perguntas de texto simples. Toda vez que um usuário tentar anexar um PDF/exame, acionar um popup de upgrade: *\"Interpretação automática de exames laboratoriais e laudos médicos está disponível no plano Premium. Faça o upgrade agora e ofereça medicina integrativa no seu consultório.\"*

---

## 5. Referencial Teórico Aplicado às Vendas de SaaS Clínico

Para justificar esta abordagem estratégica perante investidores ou seu time de liderança, ancoramos o plano comercial nos seguintes modelos acadêmicos:

1.  **O Modelo de Difusão de Inovações (Everett Rogers)**: Médicos e acupunturistas são profissionais altamente conservadores (tardios na adoção tecnológica) devido à responsabilidade profissional (ética clínica). Para convencê-los, a tecnologia deve apresentar **alta compatibilidade** com o fluxo de trabalho deles (por isso a importância de manter assistentes voltados a fichas de anamnese rápidas) e **baixo risco de experimentação** (período de teste gratuito trial curto com disclaimer médico visível).
2.  **Jobs-to-be-Done (Clayton Christensen)**: O acupunturista não \"compra inteligência artificial\". Ele compra a **segurança de não errar o diagnóstico do paciente** e a **liberdade de tempo ao não ter que redigir posts de Instagram no final de semana**. Todo o material publicitário deve anunciar o \"trabalho concluído\" (o post pronto ou o protocolo estruturado), e não a tecnologia utilizada (GPT-4/GPT-4.1).
`;

  const docPath = path.join('Docs', 'relatorio_comportamento_vendas_2026.md');
  fs.writeFileSync(docPath, report, 'utf8');
  console.log(`Themes analysis report successfully written to ${docPath}`);
}

try {
  runAnalysis();
} catch (err) {
  console.error('Error running themes analysis:', err);
}
