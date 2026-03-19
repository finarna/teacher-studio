
import { getGeminiClient, withGeminiRetry } from './utils/geminiClient';
import dotenv from 'dotenv';
import path from 'path';

// Load environment from .env
dotenv.config();

/**
 * 🕵️ TEST VERTEX AI SCRIPT
 */
async function testVertex() {
  console.log('--- 🧪 STARTING VERTEX AI TEST ---');
  console.log('Project:', process.env.VERTEX_PROJECT);
  console.log('Location:', process.env.VERTEX_LOCATION);
  console.log('Force Vertex:', process.env.FORCE_VERTEX_AI);
  console.log('Model:', process.env.GEMINI_MODEL);
  console.log('API Key (Access Token):', (process.env.GEMINI_API_KEY || '').substring(0, 10) + '...');

  try {
    const client = getGeminiClient();
    const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

    console.log(`📡 Sending test prompt to ${model}...`);

    const result = await withGeminiRetry(async () => {
      const resp = await client.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: [{ text: 'Respond with exactly "VERTEX_READY" if you can hear me.' }] }]
      });
      return resp;
    });

    console.log('✅ TEST SUCCESSFUL!');
    console.log('--- RESPONSE ---');
    console.log(result.text);
    console.log('----------------');

    if (result.text?.includes('VERTEX_READY')) {
      console.log('🏁 CONFIRMED: Vertex AI is up and running correctly.');
    } else {
      console.warn('⚠️  Response received but does not match expected output.');
    }
  } catch (err: any) {
    console.error('❌ TEST FAILED!');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

testVertex();
