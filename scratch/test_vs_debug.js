const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const openaiAnalista = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_ANALISTA || process.env.OPENAI_API_KEY,
});

async function main() {
  const vsId = "vs_69f4252750388191b615430af3370631";
  
  console.log("=== Listando arquivos na Vector Store ===");
  console.log("Vector Store:", vsId);
  
  const files = await openaiAnalista.vectorStores.files.list(vsId);
  
  for (const file of files.data) {
    console.log(`\n  ID: ${file.id}`);
    console.log(`  Status: ${file.status}`);
    console.log(`  Created: ${new Date(file.created_at * 1000).toISOString()}`);
    if (file.last_error) console.log(`  Error: ${JSON.stringify(file.last_error)}`);
  }
  
  console.log(`\nTotal: ${files.data.length} arquivos`);
  
  // Agora tentar busca direta
  console.log("\n=== Teste de busca direta ===");
  const searchResponse = await openaiAnalista.responses.create({
    model: "gpt-4.1",
    store: false,
    max_output_tokens: 16384,
    instructions: "Retorne EXATAMENTE o conteúdo encontrado pelo file_search. Não invente nada.",
    input: [
      { role: "user", content: [{ type: "input_text", text: "Quais exames laboratoriais existem neste arquivo? Liste os nomes dos exames encontrados." }] }
    ],
    tools: [{ type: "file_search", vector_store_ids: [vsId] }],
    tool_choice: "required",
    include: ["file_search_call.results"]
  });

  // Processar a resposta
  for (const item of searchResponse.output) {
    if (item.type === 'file_search_call') {
      console.log(`\nfile_search queries: ${JSON.stringify(item.queries)}`);
      console.log(`file_search results: ${item.results?.length ?? 'null'} documentos`);
      if (item.results) {
        item.results.forEach((r, i) => {
          console.log(`  [${i}] score=${r.score}, text=${r.text?.substring(0, 200)}...`);
        });
      }
    }
    if (item.type === 'message') {
      const text = item.content?.map(c => c.text).join('');
      console.log(`\nResposta do modelo:\n${text}`);
    }
  }
}

main().catch(console.error);
