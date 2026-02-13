import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncQuestions() {
  console.log('\n🔄 SYNCING QUESTIONS TABLE FROM ANALYSIS_DATA\n');
  console.log('='.repeat(70));

  // Get system scan
  const { data: systemScans } = await supabase
    .from('scans')
    .select('id, name, analysis_data')
    .eq('is_system_scan', true)
    .eq('subject', 'Math');

  if (!systemScans || systemScans.length === 0) {
    console.log('❌ No system scans\n');
    return;
  }

  const scan = systemScans[0];
  const questions = scan.analysis_data?.questions || [];

  console.log(`\n📋 Scan: ${scan.name}`);
  console.log(`   Questions in analysis_data: ${questions.length}\n`);

  // Get existing questions
  const { data: existingQuestions } = await supabase
    .from('questions')
    .select('id, topic')
    .eq('scan_id', scan.id);

  if (!existingQuestions || existingQuestions.length !== questions.length) {
    console.log('⚠️  Question count mismatch - need full resync\n');
    return;
  }

  console.log('🔄 Updating topic names from analysis_data...\n');

  let updated = 0;
  let unchanged = 0;

  for (let i = 0; i < questions.length; i++) {
    const analysisQ = questions[i];
    const dbQ = existingQuestions[i];

    if (analysisQ.topic !== dbQ.topic) {
      // Update topic
      const { error } = await supabase
        .from('questions')
        .update({ topic: analysisQ.topic })
        .eq('id', dbQ.id);

      if (error) {
        console.log(`   ❌ Error updating Q${i+1}: ${error.message}`);
      } else {
        console.log(`   ✅ Q${i+1}: "${dbQ.topic}" → "${analysisQ.topic}"`);
        updated++;
      }
    } else {
      unchanged++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SYNC COMPLETE:\n');
  console.log(`   Total questions: ${questions.length}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Unchanged: ${unchanged}\n`);
}

syncQuestions().catch(console.error);
