import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data: patterns } = await supabase
    .from('exam_historical_patterns')
    .select('id, year')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .order('year');

  console.log('\nPatterns:', patterns);

  if (patterns && patterns.length > 0) {
    for (const p of patterns) {
      const { data: dists, count } = await supabase
        .from('exam_topic_distributions')
        .select('topic_id, question_count', { count: 'exact' })
        .eq('historical_pattern_id', p.id);

      console.log(`\nYear ${p.year}:`);
      console.log(`  Pattern ID: ${p.id}`);
      console.log(`  Distributions count: ${count || 0}`);
      if (dists && dists.length > 0) {
        dists.forEach(d => {
          console.log(`    ${d.topic_id}: ${d.question_count} questions`);
        });
      } else {
        console.log(`  ⚠️  No topic distributions - needs to run syncScanToAITables!`);
      }
    }
  }

  // Check scans
  const { data: scans } = await supabase
    .from('scans')
    .select('id, year, name')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .not('year', 'is', null);

  console.log('\n\nScans with year data:');
  scans?.forEach(s => {
    console.log(`  ${s.year} - ${s.name} (${s.id})`);
  });

  console.log('\n💡 If distributions are missing, run:');
  console.log('   npx tsx scripts/syncAllScansToAI.ts');
}

check().then(() => process.exit(0));
