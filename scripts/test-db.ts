
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  console.log('--- DB DIAGNOSTIC ---');
  const { data, error } = await s.from('exam_historical_patterns').insert([{
    exam_context: 'KCET',
    subject: 'Math',
    year: 2021,
    ids_actual: 0.85
  }]).select();
  
  if (error) {
    console.error('❌ Insert Failed:', error);
  } else {
    console.log('✅ Insert Successful:', data);
  }
}
run();
