const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: 'test' });
console.log('OpenAI properties:', Object.keys(openai));
if (openai.beta) console.log('Beta properties:', Object.keys(openai.beta));
if (openai.responses) console.log('Responses properties:', Object.keys(openai.responses));
