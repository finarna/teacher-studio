import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPublished() {
  // Get published scan
  const { data: published } = await supabase
    .from('scans')
    .select('id, paper_name, subject')
    .eq('is_system_scan', true)
    .single();

  if (!published) {
    console.log('No published scan found');
    return;
  }

  console.log(`\nPublished Scan: ${published.paper_name || 'Untitled'} (${published.subject})`);
  console.log(`ID: ${published.id}\n`);

  // Check for visual concepts in THIS scan
  const { count: visualCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('scan_id', published.id)
    .not('visual_concept', 'is', null);

  console.log(`Visual concepts in THIS scan: ${visualCount || 0}`);

  // Check a sample question
  const { data: sampleQ } = await supabase
    .from('questions')
    .select('id, topic, visual_concept')
    .eq('scan_id', published.id)
    .limit(3);

  console.log(`\nSample questions:`);
  for (const q of sampleQ || []) {
    console.log(`  - ${q.topic}: has visual_concept = ${!!q.visual_concept}, value = "${q.visual_concept?.substring(0, 50)}..."`);
  }
}

checkPublished();
