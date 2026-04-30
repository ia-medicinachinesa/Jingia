const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: 'test' });
console.log('--- root.vectorStores ---');
console.log(Object.keys(openai.vectorStores || {}));
console.log('--- root.responses ---');
console.log(Object.keys(openai.responses || {}));
if (openai.responses.create) console.log('responses.create exists');

console.log('--- beta.assistants ---');
if (openai.beta.assistants) console.log(Object.keys(openai.beta.assistants));
