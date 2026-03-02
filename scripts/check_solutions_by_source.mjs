import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

async function checkSolutions() {
  console.log('\n🔍 CHECKING SOLUTION DATA BY QUESTION SOURCE\n');

  // Get all user's scans
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, metadata')
    .eq('user_id', userId);

  if (!scans || scans.length === 0) {
    console.log('❌ No scans found\n');
    return;
  }

  console.log(`📄 Found ${scans.length} scans\n`);

  // Separate AI scans from regular scans
  const aiScans = scans.filter(s => s.metadata?.is_ai_practice_placeholder);
  const regularScans = scans.filter(s => !s.metadata?.is_ai_practice_placeholder);

  console.log(`  AI Practice Scans: ${aiScans.length}`);
  console.log(`  Regular Scans: ${regularScans.length}\n`);

  // Check questions from each type
  for (const scanType of ['AI', 'Regular']) {
    const scanList = scanType === 'AI' ? aiScans : regularScans;

    if (scanList.length === 0) continue;

    const scanIds = scanList.map(s => s.id);

    const { data: questions } = await supabase
      .from('questions')
      .select('id, text, topic, subject, exam_context, solution_steps, key_formulas, mastery_material, source, created_at')
      .in('scan_id', scanIds)
      .limit(100);

    console.log('='.repeat(80));
    console.log(`  ${scanType.toUpperCase()} SCAN QUESTIONS`);
    console.log('='.repeat(80));

    if (!questions || questions.length === 0) {
      console.log(`  No questions found\n`);
      continue;
    }

    const withSolutions = questions.filter(q => q.solution_steps && q.solution_steps.length > 0);
    const withFormulas = questions.filter(q => q.key_formulas && q.key_formulas.length > 0);
    const withMastery = questions.filter(q => q.mastery_material);

    console.log(`  Total Questions: ${questions.length}`);
    console.log(`  With Solutions: ${withSolutions.length} (${((withSolutions.length/questions.length)*100).toFixed(1)}%)`);
    console.log(`  With Formulas: ${withFormulas.length} (${((withFormulas.length/questions.length)*100).toFixed(1)}%)`);
    console.log(`  With Mastery Material: ${withMastery.length} (${((withMastery.length/questions.length)*100).toFixed(1)}%)\n`);

    // Sample questions
    console.log(`  📝 Sample Questions:\n`);
    questions.slice(0, 5).forEach((q, idx) => {
      console.log(`  ${idx + 1}. ${q.text?.substring(0, 60)}...`);
      console.log(`     Source: ${q.source || 'NOT SET'}`);
      console.log(`     Subject: ${q.subject || 'NULL'}`);
      console.log(`     Exam: ${q.exam_context || 'NULL'}`);
      console.log(`     Solutions: ${q.solution_steps?.length || 0} steps`);
      console.log(`     Formulas: ${q.key_formulas?.length || 0}`);
      console.log(`     Created: ${new Date(q.created_at).toLocaleString()}\n`);
    });

    console.log('');
  }

  // Check Relations and Functions specifically
  console.log('='.repeat(80));
  console.log('  RELATIONS AND FUNCTIONS - DETAILED');
  console.log('='.repeat(80));

  const { data: relQuestions } = await supabase
    .from('questions')
    .select('id, text, scan_id, subject, exam_context, solution_steps, source, created_at')
    .ilike('topic', '%relation%')
    .or('topic.ilike.%function%')
    .in('scan_id', scans.map(s => s.id));

  if (relQuestions && relQuestions.length > 0) {
    console.log(`\n  Found ${relQuestions.length} Relations/Functions questions\n`);

    relQuestions.forEach((q, idx) => {
      const scan = scans.find(s => s.id === q.scan_id);
      const scanType = scan?.metadata?.is_ai_practice_placeholder ? 'AI' : 'Regular';

      console.log(`  ${idx + 1}. ${q.text?.substring(0, 70)}...`);
      console.log(`     Scan Type: ${scanType}`);
      console.log(`     Source: ${q.source || 'NOT SET'}`);
      console.log(`     Subject: ${q.subject || 'NULL'} | Exam: ${q.exam_context || 'NULL'}`);
      console.log(`     Solutions: ${q.solution_steps?.length || 0} steps`);
      console.log(`     Created: ${new Date(q.created_at).toLocaleString()}\n`);
    });
  }
}

checkSolutions().catch(console.error);
