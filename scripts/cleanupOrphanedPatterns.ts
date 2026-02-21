/**
 * Delete orphaned historical patterns that don't have corresponding scans
 * This ensures trends only show years with actual papers available
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupOrphanedPatterns() {
  console.log('🧹 Cleaning up orphaned historical patterns...\n');
  console.log('='.repeat(70));

  // Get all scans with years
  const { data: scans } = await supabase
    .from('scans')
    .select('year, exam_context, subject')
    .not('year', 'is', null);

  if (!scans || scans.length === 0) {
    console.log('\n❌ No scans found with year data');
    return;
  }

  // Group by exam/subject/year
  const scanKeys = new Set(
    scans.map(s => `${s.exam_context}|${s.subject}|${s.year}`)
  );

  console.log(`\n✅ Found ${scans.length} scans with year data`);
  console.log(`   Years with actual papers: ${[...new Set(scans.map(s => s.year))].sort().join(', ')}\n`);

  // Get all historical patterns
  const { data: patterns } = await supabase
    .from('exam_historical_patterns')
    .select('id, year, exam_context, subject');

  if (!patterns || patterns.length === 0) {
    console.log('✅ No historical patterns to check');
    return;
  }

  console.log(`📊 Found ${patterns.length} historical patterns total\n`);

  // Find orphans (patterns without corresponding scans)
  const orphans = patterns.filter(p => {
    const key = `${p.exam_context}|${p.subject}|${p.year}`;
    return !scanKeys.has(key);
  });

  if (orphans.length === 0) {
    console.log('✅ No orphaned patterns found - all patterns have corresponding scans!\n');
    return;
  }

  console.log(`⚠️  Found ${orphans.length} orphaned patterns (no corresponding scans):\n`);

  const orphansByExamSubject: Record<string, number[]> = {};
  orphans.forEach(p => {
    const key = `${p.exam_context} ${p.subject}`;
    if (!orphansByExamSubject[key]) {
      orphansByExamSubject[key] = [];
    }
    orphansByExamSubject[key].push(p.year);
  });

  Object.entries(orphansByExamSubject).forEach(([key, years]) => {
    console.log(`   ${key}: ${years.sort().join(', ')}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n🗑️  Deleting orphaned patterns...\n');

  // Delete orphaned patterns
  const orphanIds = orphans.map(p => p.id);

  // First delete topic distributions linked to these patterns
  const { error: distError, count: distCount } = await supabase
    .from('exam_topic_distributions')
    .delete()
    .in('historical_pattern_id', orphanIds);

  if (distError) {
    console.error('❌ Error deleting topic distributions:', distError);
    return;
  }

  console.log(`   ✅ Deleted ${distCount || 0} topic distributions`);

  // Then delete the patterns themselves
  const { error: patternError, count: patternCount } = await supabase
    .from('exam_historical_patterns')
    .delete()
    .in('id', orphanIds);

  if (patternError) {
    console.error('❌ Error deleting historical patterns:', patternError);
    return;
  }

  console.log(`   ✅ Deleted ${patternCount || 0} historical patterns`);

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ CLEANUP COMPLETE!\n');
  console.log('   Now trends will only show years with actual papers available.');
  console.log('   Restart the app to see updated trends.\n');
}

cleanupOrphanedPatterns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
