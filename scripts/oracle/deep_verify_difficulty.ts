import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OFFICIAL_SCANS: Record<number, string> = {
  2021: 'eba5ed94-dde7-4171-80ff-aecbf0c969f7',
  2022: '0899f3e1-9980-48f4-9caa-91c65de53830',
  2023: 'eeed39eb-6ffe-4aaa-b752-b3139b311e6d',
  2024: '7019df69-f2e2-4464-afbb-cc56698cb8e9',
  2025: 'c202f81d-cc53-40b1-a473-8f621faac5ba'
};

async function deepVerify() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  DEEP VERIFICATION: ACTUAL DIFFICULTY FROM QUESTIONS         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  for (const [year, scanId] of Object.entries(OFFICIAL_SCANS)) {
    console.log(`\n${'═'.repeat(65)}`);
    console.log(`📅 YEAR ${year}`);
    console.log(`Scan ID: ${scanId}`);
    console.log(`${'═'.repeat(65)}\n`);

    // Fetch ALL questions with difficulty
    const { data: questions, error } = await supabase
      .from('questions')
      .select('question_order, text, difficulty, topic')
      .eq('scan_id', scanId)
      .order('question_order');

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      continue;
    }

    if (!questions || questions.length === 0) {
      console.log(`   ⚠️  No questions found for ${year}`);
      continue;
    }

    // Count by difficulty
    const difficultyCount: Record<string, number> = {};
    const difficultyExamples: Record<string, any[]> = {
      Easy: [],
      Moderate: [],
      Hard: []
    };

    questions.forEach(q => {
      const diff = q.difficulty || 'UNKNOWN';
      difficultyCount[diff] = (difficultyCount[diff] || 0) + 1;

      // Store first 3 examples of each difficulty
      if (difficultyExamples[diff] && difficultyExamples[diff].length < 3) {
        difficultyExamples[diff].push({
          order: q.question_order,
          topic: q.topic,
          text: q.text?.substring(0, 80)
        });
      }
    });

    const total = questions.length;
    console.log(`   📊 Total Questions: ${total}\n`);
    console.log(`   Difficulty Breakdown:`);

    for (const [diff, count] of Object.entries(difficultyCount).sort()) {
      const pct = ((count / total) * 100).toFixed(1);
      console.log(`      ${diff.padEnd(12)}: ${count.toString().padStart(2)} questions (${pct.padStart(5)}%)`);
    }

    // Show examples
    console.log(`\n   Sample Questions:\n`);

    if (difficultyExamples.Easy && difficultyExamples.Easy.length > 0) {
      console.log(`   ✅ EASY Examples:`);
      difficultyExamples.Easy.forEach((q, idx) => {
        console.log(`      ${idx + 1}. Q${q.order} [${q.topic}]: ${q.text}...`);
      });
      console.log('');
    }

    if (difficultyExamples.Moderate && difficultyExamples.Moderate.length > 0) {
      console.log(`   ⚠️  MODERATE Examples:`);
      difficultyExamples.Moderate.forEach((q, idx) => {
        console.log(`      ${idx + 1}. Q${q.order} [${q.topic}]: ${q.text}...`);
      });
      console.log('');
    }

    if (difficultyExamples.Hard && difficultyExamples.Hard.length > 0) {
      console.log(`   🔥 HARD Examples:`);
      difficultyExamples.Hard.forEach((q, idx) => {
        console.log(`      ${idx + 1}. Q${q.order} [${q.topic}]: ${q.text}...`);
      });
      console.log('');
    } else {
      console.log(`   ⚠️  NO HARD QUESTIONS FOUND IN ${year}\n`);
    }

    // Check for NULL or undefined difficulties
    const nullCount = questions.filter(q => !q.difficulty).length;
    if (nullCount > 0) {
      console.log(`   ⚠️  WARNING: ${nullCount} questions have NULL/undefined difficulty!`);
      console.log(`      These questions may need manual difficulty assignment.\n`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY TABLE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Year | Total | Easy | Moderate | Hard | NULL');
  console.log('-----|-------|------|----------|------|-----');

  for (const [year, scanId] of Object.entries(OFFICIAL_SCANS)) {
    const { data: questions } = await supabase
      .from('questions')
      .select('difficulty')
      .eq('scan_id', scanId);

    if (!questions) continue;

    const total = questions.length;
    const easy = questions.filter(q => q.difficulty === 'Easy').length;
    const moderate = questions.filter(q => q.difficulty === 'Moderate').length;
    const hard = questions.filter(q => q.difficulty === 'Hard').length;
    const nullDiff = questions.filter(q => !q.difficulty).length;

    console.log(`${year} | ${total.toString().padStart(5)} | ${easy.toString().padStart(4)} | ${moderate.toString().padStart(8)} | ${hard.toString().padStart(4)} | ${nullDiff.toString().padStart(4)}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

deepVerify().catch(console.error);
