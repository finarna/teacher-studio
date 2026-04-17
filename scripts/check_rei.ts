import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkConfigs() {
  const { data: config } = await supabase
    .from('rei_evolution_configs')
    .select('*')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .single();

  console.log('rei_evolution_configs:', JSON.stringify(config, null, 2));
}

checkConfigs().catch(console.error);
