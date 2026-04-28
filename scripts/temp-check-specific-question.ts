import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_ID = 'ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9';

async function checkQuestion() {
  console.log('🔍 Checking if question is from Biology Flagship papers...\n');

  // Search for the question about pBR322 and PvuI
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology')
    .ilike('text', '%pBR322%')
    .or('text.ilike.%PvuI%');

  if (!questions || questions.length === 0) {
    console.log('❌ This question is NOT from our Biology Flagship papers.');
    console.log('   It might be from a different test or an older generation.\n');
    return;
  }

  console.log(`✅ Found ${questions.length} matching question(s) in our Flagship papers:\n`);

  questions.forEach((q, idx) => {
    console.log(`Question ${idx + 1}:`);
    console.log(`   ID: ${q.id}`);
    console.log(`   Created: ${new Date(q.created_at).toLocaleString()}`);
    console.log(`   Topic: ${q.topic}`);
    console.log(`   Difficulty: ${q.difficulty}`);
    console.log(`   Type: ${q.metadata?.questionType || 'N/A'}`);
    console.log(`   Identity: ${q.metadata?.identityId || 'N/A'}`);
    console.log(`   Text: ${q.text.substring(0, 150)}...\n`);
    console.log(`   Options:`);
    q.options?.forEach((opt: string, i: number) => {
      console.log(`      ${String.fromCharCode(65 + i)}. ${opt}`);
    });
    console.log();
  });

  // Determine which set
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, created_at')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology')
    .order('created_at', { ascending: false })
    .limit(120);

  if (allQuestions) {
    const setB = allQuestions.slice(0, 60);
    const setA = allQuestions.slice(60, 120);

    questions.forEach(q => {
      if (setA.find(a => a.id === q.id)) {
        console.log(`📄 This question is in SET A (Molecular Genetics + Ecosystem focus)`);
      } else if (setB.find(b => b.id === q.id)) {
        console.log(`📄 This question is in SET B (Genetics + Human Health focus)`);
      }
    });
  }

  console.log(`\n✅ Confirmation: This is from our latest Biology Flagship generation!`);
}

checkQuestion().catch(console.error);
