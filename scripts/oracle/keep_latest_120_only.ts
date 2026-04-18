import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_ID = 'ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9';

async function keepLatest120() {
  console.log('🎯 KEEPING ONLY LATEST 120 BIOLOGY QUESTIONS\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Get all questions ordered by creation date
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, created_at, metadata')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology')
    .order('created_at', { ascending: false })
    .limit(300);

  if (!allQuestions) {
    console.log('❌ No questions found');
    return;
  }

  console.log(`📊 Found ${allQuestions.length} total questions\n`);

  // Show generation timestamps
  const timestamps = [...new Set(allQuestions.map(q => q.created_at.split('T')[0] + ' ' + q.created_at.split('T')[1].substring(0, 8)))];
  console.log('📅 Generation timestamps:\n');
  timestamps.slice(0, 5).forEach((ts, idx) => {
    const count = allQuestions.filter(q => q.created_at.startsWith(ts.replace(' ', 'T'))).length;
    console.log(`   ${idx + 1}. ${ts} - ${count} questions`);
  });
  console.log();

  // Keep the latest 120, delete the rest
  const latest120 = allQuestions.slice(0, 120);
  const toDelete = allQuestions.slice(120);

  console.log(`✅ Keeping latest 120 questions (created: ${latest120[0].created_at})`);
  console.log(`🗑️  Deleting ${toDelete.length} older questions\n`);

  if (toDelete.length > 0) {
    const deleteIds = toDelete.map(q => q.id);

    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .in('id', deleteIds);

    if (deleteError) {
      console.error('❌ Error:', deleteError);
      return;
    }

    console.log(`   ✅ Deleted ${toDelete.length} questions\n`);
  }

  // Verify
  const { count: finalCount } = await supabase
    .from('questions')
    .select('id', { count: 'exact' })
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology');

  console.log('═══════════════════════════════════════════════════════\n');
  console.log('✅ FINAL STATUS\n');
  console.log(`   Remaining questions: ${finalCount}`);
  console.log(`   Latest SET A: 60 questions (older of the 120)`);
  console.log(`   Latest SET B: 60 questions (newer of the 120)\n`);

  // Verify metadata quality
  const { data: final120 } = await supabase
    .from('questions')
    .select('metadata')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology')
    .limit(120);

  if (final120) {
    const withType = final120.filter(q => q.metadata?.questionType).length;
    const withIdentity = final120.filter(q => q.metadata?.identityId).length;

    console.log('✅ Quality Check:\n');
    console.log(`   questionType tagged: ${withType}/120 (${Math.round(withType/120*100)}%)`);
    console.log(`   identityId assigned: ${withIdentity}/120 (${Math.round(withIdentity/120*100)}%)\n`);
  }

  console.log('🎯 These 120 questions will now appear in mock tests!\n');
  console.log('═══════════════════════════════════════════════════════\n');
}

keepLatest120().catch(console.error);
