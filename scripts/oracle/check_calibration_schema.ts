import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  console.log('\n🔍 CHECKING ai_universal_calibration SCHEMA\n');

  const { data, error } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  }

  if (data && data.length > 0) {
    console.log('Available columns:');
    Object.keys(data[0]).forEach(col => console.log(`  - ${col}`));
  }
}

checkSchema().catch(console.error);
