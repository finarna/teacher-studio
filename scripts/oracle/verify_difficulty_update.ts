import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
  const { data } = await supabase
    .from('exam_historical_patterns')
    .select('year, difficulty_easy_pct, difficulty_moderate_pct, difficulty_hard_pct')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .order('year');

  console.log('\nDatabase values:');
  console.log(JSON.stringify(data, null, 2));
}

verify().catch(console.error);
