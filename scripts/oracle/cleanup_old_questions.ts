import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteOldQuestions() {
  const scanId = '2adcb415-9410-4468-b8f3-32206e5ae7cb';

  console.log('🔍 Finding all questions in scan...\n');

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, created_at, topic, difficulty')
    .eq('scan_id', scanId)
    .order('created_at', { ascending: true });

  if (error || !questions) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`   Total questions found: ${questions.length}`);

  // Group by creation time
  const byTime = questions.reduce((acc: any, q: any) => {
    const timestamp = new Date(q.created_at).getTime();
    if (!acc[timestamp]) acc[timestamp] = [];
    acc[timestamp].push(q);
    return acc;
  }, {});

  const timestamps = Object.keys(byTime).sort();

  console.log(`\n📊 Questions by creation batch:`);
  timestamps.forEach((ts, idx) => {
    const date = new Date(parseInt(ts)).toISOString();
    console.log(`   Batch ${idx + 1}: ${byTime[ts].length} questions at ${date}`);
  });

  // We want to delete the OLDEST 90 questions
  const toDelete = questions.slice(0, 90);
  const toKeep = questions.slice(90);

  console.log(`\n🗑️  Planning to delete:`);
  console.log(`   Count: ${toDelete.length} questions (oldest batch)`);
  console.log(`   Created: ${new Date(toDelete[0].created_at).toISOString()}`);

  console.log(`\n✅ Planning to keep:`);
  console.log(`   Count: ${toKeep.length} questions (newest batch WITH strategic differentiation)`);
  console.log(`   Created: ${new Date(toKeep[0].created_at).toISOString()}`);

  // Delete old questions
  const idsToDelete = toDelete.map(q => q.id);

  console.log(`\n🚀 Deleting ${idsToDelete.length} old questions...`);

  const { error: deleteError } = await supabase
    .from('questions')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('❌ Delete error:', deleteError);
    return;
  }

  console.log('✅ Successfully deleted old questions');

  // Verify
  const { data: remaining } = await supabase
    .from('questions')
    .select('id')
    .eq('scan_id', scanId);

  console.log(`\n✅ Verification: ${remaining?.length || 0} questions remain in database`);
  console.log('   These are the NEW questions WITH strategic SET A/B differentiation');
}

deleteOldQuestions().catch(console.error);
