import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyDifficulty() {
  console.log('\n🔍 INVESTIGATING NEET PHYSICS DIFFICULTY DATA QUALITY\n');
  console.log('='.repeat(70));

  // Check all questions
  const { data: questions } = await supabase
    .from('questions')
    .select('difficulty, year, text')
    .eq('subject', 'Physics')
    .eq('exam_context', 'NEET')
    .gte('year', 2021)
    .lte('year', 2025);

  if (!questions) {
    console.error('❌ No questions found');
    return;
  }

  // Check for null/undefined difficulties
  const nullDiff = questions.filter(q => !q.difficulty || q.difficulty === null);

  // Get unique difficulty values
  const uniqueDifficulties = [...new Set(questions.map(q => q.difficulty))];

  console.log(`\n📊 Difficulty Field Analysis:`);
  console.log(`   Total questions: ${questions.length}`);
  console.log(`   Questions with NULL difficulty: ${nullDiff.length}`);
  console.log(`   Unique difficulty values found: ${uniqueDifficulties.join(', ')}`);

  // Count by difficulty
  const counts: Record<string, number> = {};
  questions.forEach(q => {
    const diff = q.difficulty || 'NULL';
    counts[diff] = (counts[diff] || 0) + 1;
  });

  console.log(`\n📈 Distribution:`);
  Object.entries(counts).forEach(([diff, count]) => {
    const pct = (count / questions.length * 100).toFixed(1);
    console.log(`   ${diff}: ${count} (${pct}%)`);
  });

  // Show sample questions from each year with different difficulties
  console.log(`\n📝 Sample Questions by Year:\n`);

  for (let year = 2021; year <= 2025; year++) {
    const { data: yearQuestions } = await supabase
      .from('questions')
      .select('id, text, difficulty')
      .eq('subject', 'Physics')
      .eq('exam_context', 'NEET')
      .eq('year', year)
      .limit(5);

    console.log(`Year ${year} (showing first 5):`);
    yearQuestions?.forEach((q, idx) => {
      console.log(`   ${idx + 1}. [${q.difficulty || 'NULL'}] ${q.text.substring(0, 60)}...`);
    });
    console.log('');
  }

  // Check if there's a pattern in how difficulty was assigned
  console.log(`\n🔍 Checking if difficulty correlates with question characteristics...\n`);

  // Get a few "Hard" questions to verify
  const { data: hardQuestions } = await supabase
    .from('questions')
    .select('year, text, difficulty')
    .eq('subject', 'Physics')
    .eq('exam_context', 'NEET')
    .eq('difficulty', 'Hard')
    .limit(5);

  if (hardQuestions && hardQuestions.length > 0) {
    console.log(`Found ${hardQuestions.length} Hard questions. Examples:`);
    hardQuestions.forEach((q, idx) => {
      console.log(`\n${idx + 1}. Year ${q.year}:`);
      console.log(`   ${q.text.substring(0, 150)}...`);
    });
  } else {
    console.log(`⚠️  NO "Hard" difficulty questions found in database`);
  }

  console.log('\n' + '='.repeat(70));
}

verifyDifficulty().catch(console.error);
