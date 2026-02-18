#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testRecord = {
  user_id: '00000000-0000-0000-0000-000000000001',
  test_type: 'custom_mock',
  test_name: 'Migration Test',
  subject: 'Math',
  exam_context: 'NEET',
  total_questions: 25,
  duration_minutes: 45,
  status: 'in_progress',
  start_time: new Date().toISOString(),
  test_config: { topics: [], difficulty: { easy: 30, moderate: 50, hard: 20 } }
};

console.log('\n🧪 Testing custom_mock test creation...\n');
const { data, error } = await supabase
  .from('test_attempts')
  .insert(testRecord)
  .select()
  .single();

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('✅ Success! Custom mock test created');
  console.log('   ID:', data.id);
  console.log('   test_type:', data.test_type);
  console.log('   test_config:', JSON.stringify(data.test_config, null, 2));

  // Clean up
  await supabase.from('test_attempts').delete().eq('id', data.id);
  console.log('\n   (Test record cleaned up)\n');
}
