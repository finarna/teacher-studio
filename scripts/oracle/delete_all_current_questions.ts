import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteAllQuestions() {
  const scanId = '2adcb415-9410-4468-b8f3-32206e5ae7cb';

  console.log('🔍 Finding all questions in NEET Physics scan...\n');

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, created_at')
    .eq('scan_id', scanId);

  if (error || !questions) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`   Total questions found: ${questions.length}`);
  console.log(`   All questions will be DELETED to prepare for flagship regeneration\n`);

  if (questions.length === 0) {
    console.log('✅ No questions to delete');
    return;
  }

  const idsToDelete = questions.map(q => q.id);

  console.log(`🗑️  Deleting ${idsToDelete.length} questions...`);

  const { error: deleteError } = await supabase
    .from('questions')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('❌ Delete error:', deleteError);
    return;
  }

  console.log('✅ Successfully deleted all questions');

  // Verify
  const { data: remaining } = await supabase
    .from('questions')
    .select('id')
    .eq('scan_id', scanId);

  console.log(`\n✅ Verification: ${remaining?.length || 0} questions remain in database`);
  console.log('   Ready for flagship regeneration with improved directives\n');
}

deleteAllQuestions().catch(console.error);
