import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const scanId = 'bd210344-5d6b-4229-93b9-e49d7b5095ea';

async function main() {
  console.log('🔍 CHECKING VISUAL DATA FOR SCAN\n');

  const { data: ps } = await supabase
    .from('published_scans')
    .select('*')
    .eq('scan_id', scanId);

  console.log('📋 PUBLISHED_SCANS:', (ps || []).length, 'rows');
  if (ps && ps[0]) {
    console.log('All fields:', Object.keys(ps[0]));
  }

  const { data: topics } = await supabase
    .from('topics')
    .select('*')
    .eq('scan_id', scanId);

  console.log('\n📚 TOPICS:', (topics || []).length);
  (topics || []).slice(0, 3).forEach((t, i) => {
    console.log('\nTopic', i+1, ':', t.name);
    const vFields = Object.keys(t).filter(k => k.includes('visual') || k.includes('sketch') || k.includes('pages') || k.includes('symbol'));
    if (vFields.length > 0) {
      console.log('Visual fields:', vFields);
      vFields.forEach(f => console.log('  ', f, ':', t[f]));
    }
  });

  const { data: questions } = await supabase
    .from('questions')
    .select('id, visual_concept, topic_id')
    .eq('scan_id', scanId)
    .not('visual_concept', 'is', null);

  console.log('\n🎨 QUESTIONS WITH VISUAL_CONCEPT:', (questions || []).length);
  if (questions && questions[0]) {
    console.log('Sample visual_concept:', questions[0].visual_concept);
  }
}

main().catch(console.error);
