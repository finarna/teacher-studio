import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  // Get ALL patterns for KCET Math
  const { data: all, error } = await supabase
    .from('exam_historical_patterns')
    .select('id, year, exam_context, subject')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .order('year');

  console.log('All patterns for KCET Math:', all);
  if (error) console.error('Error:', error);

  // Delete year 2020
  if (all && all.length > 0) {
    const toDelete = all.filter(p => p.year !== 2021 && p.year !== 2022);
    console.log('\nPatterns to delete:', toDelete.map(p => p.year));

    for (const pattern of toDelete) {
      console.log(`\nDeleting year ${pattern.year}...`);

      // Delete distributions first
      const { error: distErr } = await supabase
        .from('exam_topic_distributions')
        .delete()
        .eq('historical_pattern_id', pattern.id);

      if (distErr) {
        console.error('  Error deleting distributions:', distErr.message);
      } else {
        console.log('  ✅ Distributions deleted');
      }

      // Delete pattern
      const { error: patErr } = await supabase
        .from('exam_historical_patterns')
        .delete()
        .eq('id', pattern.id);

      if (patErr) {
        console.error('  Error deleting pattern:', patErr.message);
      } else {
        console.log('  ✅ Pattern deleted');
      }
    }
  }

  // Verify final state
  const { data: final } = await supabase
    .from('exam_historical_patterns')
    .select('year')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .order('year');

  console.log('\nFinal patterns:', final?.map(p => p.year));
}

test().then(() => process.exit(0));
