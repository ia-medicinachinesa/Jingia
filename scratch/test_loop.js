const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const openaiAnalista = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_ANALISTA || process.env.OPENAI_API_KEY || 'MISSING_API_KEY',
});

async function main() {
  const storeIds = ["vs_69f4252750388191b615430af3370631"];
  const tools = [{ type: "file_search", vector_store_ids: storeIds }];
  const systemPrompt = `Quando o usuário enviar exames, comece assim: "Vou organizar os resultados..." Depois prossiga imediatamente com a análise e a estrutura padrão do relatório completo.`;

  console.log("Chamando Responses API (Turno 1)...");
  let lastResponseId = null;
  let hasToolCall = false;

  const responseStream1 = await openaiAnalista.responses.create({
    model: "gpt-4.1",
    store: true,
    stream: true, 
    max_output_tokens: 16384,
    instructions: systemPrompt,
    input: [
      { role: "user", content: [{ type: "input_text", text: "Analise o laudo da minha paciente" }] }
    ],
    tools: tools,
    tool_choice: "auto"
  });

  for await (const chunk of responseStream1) {
    if (chunk.type === 'response.created') lastResponseId = chunk.response.id;
    if (chunk.type === 'response.output_text.delta') process.stdout.write(chunk.delta || '');
    if (chunk.type === 'response.output_item.done' && chunk.item.type === 'file_search_call') {
      hasToolCall = true;
    }
  }

  console.log("\n\nTurno 1 completo. hasToolCall:", hasToolCall, "lastResponseId:", lastResponseId);

  if (hasToolCall && lastResponseId) {
    console.log("Chamando Responses API (Turno 2)...");
    const responseStream2 = await openaiAnalista.responses.create({
      model: "gpt-4.1",
      store: true,
      stream: true,
      previous_response_id: lastResponseId,
      instructions: systemPrompt,
      tools: tools,
      input: [] // <--- vazio
    });

    for await (const chunk of responseStream2) {
      if (chunk.type === 'response.output_text.delta') process.stdout.write(chunk.delta || '');
    }
    console.log("\n\nTurno 2 completo.");
  }
}

main();
