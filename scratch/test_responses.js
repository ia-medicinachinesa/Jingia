const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const openaiAnalista = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_ANALISTA || process.env.OPENAI_API_KEY || 'MISSING_API_KEY',
});

async function main() {
  const storeIds = ["vs_69f4252750388191b615430af3370631"];
  const tools = [
    { 
      type: "file_search",
      vector_store_ids: storeIds
    }
  ];

  const systemPrompt = `Quando o usuário enviar exames, comece assim: "Vou organizar os resultados..." Depois prossiga imediatamente com a análise e a estrutura padrão do relatório completo.`;

  console.log("Chamando Responses API...");
  try {
    const responseStream = await openaiAnalista.responses.create({
      model: "gpt-4.1",
      store: true,
      stream: true, 
      max_output_tokens: 16384,
      instructions: systemPrompt,
      input: [
        { 
          role: "user", 
          content: [{ type: "input_text", text: "Analise o laudo da minha paciente" }]
        }
      ],
      tools: tools,
      tool_choice: "auto"
    });

    for await (const chunk of responseStream) {
      if (chunk.type === 'response.output_item.done') {
        console.log('\n[ITEM DONE]', JSON.stringify(chunk.item, null, 2));
      } else if (chunk.type === 'response.done') {
        console.log('\n\n[DONE]', chunk.response?.status);
      } else if (chunk.type === 'response.completed') {
        console.log('\n[COMPLETED]', chunk.response?.status);
      }
    }
  } catch (e) {
    console.error("Erro:", e);
  }
}

main();
