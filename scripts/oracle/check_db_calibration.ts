import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDB() {
  console.log('🔍 Checking ai_universal_calibration table...\n');

  const { data, error } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', 'KCET')
    .eq('subject', 'Math')
    .eq('target_year', 2026)
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('⚠️  No calibration found in ai_universal_calibration table');
    return;
  }

  console.log('✅ Found calibration in ai_universal_calibration:');
  console.log(JSON.stringify(data, null, 2));
}

checkDB().catch(console.error);
