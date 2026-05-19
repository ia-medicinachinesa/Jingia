const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const openaiAnalista = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_ANALISTA || process.env.OPENAI_API_KEY,
});

async function main() {
  const storeIds = ["vs_69f4252750388191b615430af3370631"];
  const tools = [{ type: "file_search", vector_store_ids: storeIds }];

  console.log("=== TESTE: tool_choice required ===\n");
  
  const responseStream = await openaiAnalista.responses.create({
    model: "gpt-4.1",
    store: true,
    stream: true, 
    max_output_tokens: 16384,
    instructions: "Você é um analista clínico. Analise os exames encontrados e forneça um relatório completo.",
    input: [
      { role: "user", content: [{ type: "input_text", text: "Analise o laudo da minha paciente" }] }
    ],
    tools: tools,
    tool_choice: "required"
  });

  const outputItems = [];
  let fullText = '';

  for await (const chunk of responseStream) {
    if (chunk.type === 'response.output_text.delta') {
      process.stdout.write(chunk.delta || '');
      fullText += chunk.delta || '';
    }
    if (chunk.type === 'response.output_item.done') {
      outputItems.push({ type: chunk.item?.type, status: chunk.item?.status });
      if (chunk.item?.type === 'file_search_call') {
        console.log(`\n[FILE_SEARCH] queries: ${JSON.stringify(chunk.item.queries)}, results: ${chunk.item.results?.length ?? 'null'}`);
      }
    }
    if (chunk.type === 'response.completed' || chunk.type === 'response.done') {
      console.log(`\n\n[DONE] Status: ${chunk.response?.status}`);
      console.log(`[DONE] Output items: ${JSON.stringify(outputItems)}`);
      console.log(`[DONE] Texto total: ${fullText.length} caracteres`);
    }
  }
}

main().catch(console.error);
