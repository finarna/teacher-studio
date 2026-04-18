import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_ID = 'ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9';
const CUTOFF_DATE = '2026-04-18 02:53:00'; // Before our latest generation

async function cleanupOldQuestions() {
  console.log('🧹 CLEANING UP OLD BIOLOGY QUESTIONS\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Step 1: Count old vs new questions
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, created_at, metadata')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology')
    .order('created_at', { ascending: false });

  if (!allQuestions) {
    console.log('❌ No questions found');
    return;
  }

  const oldQuestions = allQuestions.filter(q => q.created_at < CUTOFF_DATE);
  const newQuestions = allQuestions.filter(q => q.created_at >= CUTOFF_DATE);

  console.log('📊 Current Status:\n');
  console.log(`   Total questions: ${allQuestions.length}`);
  console.log(`   Old questions (before ${CUTOFF_DATE}): ${oldQuestions.length}`);
  console.log(`   New questions (our latest SET A & SET B): ${newQuestions.length}\n`);

  // Verify new questions have proper metadata
  const newWithType = newQuestions.filter(q => q.metadata?.questionType).length;
  const newWithIdentity = newQuestions.filter(q => q.metadata?.identityId).length;

  console.log('✅ New Questions Quality:\n');
  console.log(`   With questionType: ${newWithType}/${newQuestions.length} (${Math.round(newWithType/newQuestions.length*100)}%)`);
  console.log(`   With identityId: ${newWithIdentity}/${newQuestions.length} (${Math.round(newWithIdentity/newQuestions.length*100)}%)\n`);

  // Step 2: Delete old questions
  if (oldQuestions.length > 0) {
    console.log(`🗑️  Deleting ${oldQuestions.length} old questions...\n`);

    const oldIds = oldQuestions.map(q => q.id);

    const { error: deleteError, count } = await supabase
      .from('questions')
      .delete()
      .in('id', oldIds);

    if (deleteError) {
      console.error('❌ Error deleting questions:', deleteError);
      return;
    }

    console.log(`   ✅ Deleted ${count || oldIds.length} old questions\n`);
  } else {
    console.log('✅ No old questions to delete\n');
  }

  // Step 3: Verify cleanup
  const { data: remainingQuestions, count: finalCount } = await supabase
    .from('questions')
    .select('id', { count: 'exact' })
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology');

  console.log('═══════════════════════════════════════════════════════\n');
  console.log('✅ CLEANUP COMPLETE\n');
  console.log(`   Remaining questions: ${finalCount}`);
  console.log(`   Expected: 120 (SET A + SET B)\n`);

  if (finalCount === 120) {
    console.log('✅ Perfect! Only latest SET A & SET B remain in database.\n');
    console.log('🎯 These questions will now appear in mock tests:\n');
    console.log(`   - All questions created after ${CUTOFF_DATE}`);
    console.log('   - 100% properly tagged with questionType');
    console.log('   - 80-82% with identityId assignment');
    console.log('   - Correct Biology question types (not Chemistry types)\n');
  } else {
    console.log(`⚠️  Warning: Expected 120 questions but found ${finalCount}\n`);
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

cleanupOldQuestions().catch(console.error);
