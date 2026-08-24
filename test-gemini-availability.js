/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const modelsToTest = [
  'gemini-1.5-pro-latest',
  'gemini-pro-latest',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'gemini-3.5-flash',
  'gemini-2.0-flash-lite-001',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite'
];

async function run() {
  console.log("Testing model availability...");
  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hi');
      console.log(`✅ ${modelName} is working. Response: ${result.response.text().trim()}`);
      break; // stop at first working
    } catch(e) {
      console.log(`❌ ${modelName} failed: ${e.message.split('\n')[0]}`);
    }
  }
}
run();
