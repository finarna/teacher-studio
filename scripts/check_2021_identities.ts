import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase
    .from('questions')
    .select('id, number, topic, identity_id')
    .eq('exam_context', 'NEET')
    .eq('subject', 'Physics')
    .eq('year', 2021)
    .order('number');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('📊 NEET 2021 Physics Identity Analysis\n');
  console.log('Total Questions:', data?.length);
  const withIdentity = data?.filter(q => q.identity_id) || [];
  const withoutIdentity = data?.filter(q => !q.identity_id) || [];

  console.log('✅ With Identity ID:', withIdentity.length);
  console.log('❌ Without Identity ID:', withoutIdentity.length);
  console.log('\n🔍 Sample questions WITHOUT identity:');
  withoutIdentity.slice(0, 15).forEach(q => {
    console.log(`   Q${q.number}: ${q.topic}`);
  });

  console.log('\n📈 Identity distribution:');
  const idCounts: Record<string, number> = {};
  withIdentity.forEach(q => {
    idCounts[q.identity_id] = (idCounts[q.identity_id] || 0) + 1;
  });
  Object.entries(idCounts).sort((a, b) => b[1] - a[1]).forEach(([id, count]) => {
    console.log(`   ${id}: ${count} questions`);
  });

  console.log(`\n⚠️  PROBLEM: Only ${withIdentity.length}/${data?.length} questions have identity_id`);
  console.log('   This explains why Identity Hit Rate is stuck at 30%!');
}

check().catch(console.error);
