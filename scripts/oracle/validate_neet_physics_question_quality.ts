import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validateQuestionQuality() {
  console.log('\n🔍 VALIDATING NEET PHYSICS QUESTION QUALITY (2021-2025)\n');
  console.log('======================================================================\n');

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, difficulty, topic, options, year')
    .eq('subject', 'Physics')
    .eq('exam_context', 'NEET')
    .gte('year', 2021)
    .lte('year', 2025);

  if (error || !questions) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  let missingText = 0;
  let missingDifficulty = 0;
  let missingTopic = 0;
  let badOptions = 0;
  const total = questions.length;

  questions.forEach(q => {
    if (!q.text || q.text.trim() === '') missingText++;
    if (!q.difficulty) missingDifficulty++;
    if (!q.topic || q.topic.trim() === '') missingTopic++;
    if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) badOptions++;
  });

  console.log(`Total Questions: ${total}`);
  console.log(`\n📋 Quality Checks:`);
  console.log(`   Missing Text: ${missingText} ${missingText === 0 ? '✅' : '❌'}`);
  console.log(`   Missing Difficulty: ${missingDifficulty} ${missingDifficulty === 0 ? '✅' : '❌'}`);
  console.log(`   Missing Topic: ${missingTopic} ${missingTopic === 0 ? '✅' : '❌'}`);
  console.log(`   Bad Options (≠4): ${badOptions} ${badOptions === 0 ? '✅' : '❌'}`);

  console.log(`\n======================================================================`);

  if (missingText === 0 && missingDifficulty === 0 && missingTopic === 0 && badOptions === 0) {
    console.log('✅ ALL QUALITY CHECKS PASSED - Data ready for calibration');
  } else {
    console.log('❌ QUALITY ISSUES DETECTED - Fix before proceeding');
  }

  console.log('');
}

validateQuestionQuality().catch(console.error);
