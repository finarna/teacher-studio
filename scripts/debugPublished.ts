import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debug() {
  const { data, error } = await supabase
    .from('scans')
    .select('id, paper_name, is_system_scan')
    .eq('is_system_scan', true);

  console.log('Published scans:', data);
  console.log('Error:', error);

  if (data && data.length > 0) {
    const scanId = data[0].id;
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('scan_id', scanId)
      .not('visual_concept', 'is', null);

    console.log(`\nVisual concepts in scan ${scanId}: ${count}`);
  }
}

debug();
