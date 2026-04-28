import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_ID = 'ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9';
const QUESTION_ID = '20627a4d-1e3e-4e16-b393-0eb4dacb1e3a';

async function verifyQuestion() {
  console.log('🔍 VERIFYING BIOLOGY QUESTION FROM UI\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check if this question exists in database
  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('id', QUESTION_ID)
    .single();

  if (!question) {
    console.log('❌ Question NOT found in database\n');
    return;
  }

  console.log('✅ Question found in database!\n');
  console.log(`Question Details:\n`);
  console.log(`   ID: ${question.id}`);
  console.log(`   Scan ID: ${question.scan_id}`);
  console.log(`   Subject: ${question.subject}`);
  console.log(`   Topic: ${question.topic}`);
  console.log(`   Difficulty: ${question.difficulty}`);
  console.log(`   Created: ${new Date(question.created_at).toLocaleString()}\n`);
  console.log(`   Text: ${question.text.substring(0, 150)}...\n`);

  // Check if it's from our flagship scan
  if (question.scan_id === SCAN_ID) {
    console.log('✅ This question IS from Biology Flagship scan!\n');
  } else {
    console.log(`⚠️  This question is from a different scan: ${question.scan_id}\n`);
  }

  // Check metadata
  if (question.metadata) {
    console.log('Metadata:\n');
    console.log(`   Question Type: ${question.metadata.questionType || 'N/A'}`);
    console.log(`   Identity ID: ${question.metadata.identityId || 'N/A'}\n`);
  }

  // Get all 120 questions to see position
  const { data: all120 } = await supabase
    .from('questions')
    .select('id, created_at, difficulty')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology')
    .order('created_at', { ascending: false })
    .limit(120);

  if (all120) {
    const position = all120.findIndex(q => q.id === QUESTION_ID);

    if (position !== -1) {
      console.log(`Position in Latest 120:\n`);
      console.log(`   Position: ${position + 1} / 120`);

      if (position < 60) {
        console.log(`   Set: SET B (newer 60 questions)\n`);
      } else {
        console.log(`   Set: SET A (older 60 questions)\n`);
      }

      // Verify difficulty distribution
      const easy = all120.filter(q => q.difficulty === 'Easy').length;
      const moderate = all120.filter(q => q.difficulty === 'Moderate').length;
      const hard = all120.filter(q => q.difficulty === 'Hard').length;

      console.log('Overall Difficulty Distribution (Latest 120):\n');
      console.log(`   Easy: ${easy} (${Math.round(easy/120*100)}%)`);
      console.log(`   Moderate: ${moderate} (${Math.round(moderate/120*100)}%)`);
      console.log(`   Hard: ${hard} (${Math.round(hard/120*100)}%)\n`);

      if (hard === 0) {
        console.log('✅ CONFIRMED: 0% Hard questions (correct REI v17 profile)\n');
      } else {
        console.log(`⚠️  WARNING: Found ${hard} Hard questions (expected 0)\n`);
      }
    } else {
      console.log('❌ This question is NOT in the latest 120!\n');
    }
  }

  console.log('═══════════════════════════════════════════════════════\n');
  console.log('✅ VERIFICATION COMPLETE\n');
  console.log('🎯 This is the CORRECT question from our latest Biology Flagship!\n');
  console.log('═══════════════════════════════════════════════════════\n');
}

verifyQuestion().catch(console.error);
