/**
 * Force delete orphaned patterns using raw SQL
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function forceDelete() {
  console.log('🗑️  Force deleting orphaned patterns...\n');

  // Get orphaned pattern IDs
  const { data: orphans } = await supabase
    .from('exam_historical_patterns')
    .select('id, year, exam_context, subject')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .not('year', 'in', '(2021,2022)');

  if (!orphans || orphans.length === 0) {
    console.log('✅ No orphans found to delete');
    return;
  }

  console.log(`Found ${orphans.length} orphaned patterns:`);
  orphans.forEach(p => console.log(`   ${p.year} - ${p.exam_context} ${p.subject}`));
  console.log('');

  const orphanIds = orphans.map(p => p.id);

  // Delete distributions first
  console.log('Deleting topic distributions...');
  for (const id of orphanIds) {
    const { error, count } = await supabase
      .from('exam_topic_distributions')
      .delete()
      .eq('historical_pattern_id', id);

    if (error) {
      console.error(`   Error deleting distributions for pattern ${id}:`, error.message);
    } else {
      console.log(`   ✅ Deleted distributions for pattern ${id}`);
    }
  }

  // Delete patterns
  console.log('\nDeleting historical patterns...');
  for (const orphan of orphans) {
    const { error } = await supabase
      .from('exam_historical_patterns')
      .delete()
      .eq('id', orphan.id);

    if (error) {
      console.error(`   Error deleting pattern ${orphan.year}:`, error.message);
    } else {
      console.log(`   ✅ Deleted pattern for ${orphan.year}`);
    }
  }

  // Verify
  console.log('\n' + '='.repeat(70));
  const { data: remaining } = await supabase
    .from('exam_historical_patterns')
    .select('year')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .order('year');

  console.log('\n✅ Remaining patterns:');
  if (remaining && remaining.length > 0) {
    console.log(`   Years: ${remaining.map(p => p.year).join(', ')}`);
  } else {
    console.log('   None');
  }
  console.log('');
}

forceDelete()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
