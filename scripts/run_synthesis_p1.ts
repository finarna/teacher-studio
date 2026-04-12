import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { synthesizeScanIntelligence } from '../lib/intelligenceSynthesis';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); 

async function runSynthesis() {
  const scanId = 'a4fd0914-2d16-4e07-bed0-9e62b0eb290c';
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No API key');

  console.log('🚀 Starting synthesis for Scan ID:', scanId);
  const result = await synthesizeScanIntelligence(supabase, scanId, apiKey);
  console.log('Result:', result);
}

runSynthesis();
