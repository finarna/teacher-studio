/**
 * Analyze ACTUAL difficulty distribution from NEET Physics 2021-2025
 * To replace the 30/50/20 projection with empirical data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const YEARS = [2021, 2022, 2023, 2024, 2025];

async function analyzeActualDifficulty() {
  console.log('\n🔍 ANALYZING ACTUAL NEET PHYSICS DIFFICULTY DISTRIBUTION (2021-2025)\n');
  console.log('='.repeat(70));

  let totalQuestions = 0;
  let easyCount = 0;
  let moderateCount = 0;
  let hardCount = 0;

  const yearResults: any[] = [];

  for (const year of YEARS) {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, difficulty, year')
      .eq('subject', 'Physics')
      .eq('exam_context', 'NEET')
      .eq('year', year);

    if (error || !questions) {
      console.error(`❌ Error fetching ${year}:`, error);
      continue;
    }

    // Count by difficulty
    const yearEasy = questions.filter(q => q.difficulty === 'Easy').length;
    const yearModerate = questions.filter(q => q.difficulty === 'Moderate').length;
    const yearHard = questions.filter(q => q.difficulty === 'Hard').length;
    const yearTotal = questions.length;

    easyCount += yearEasy;
    moderateCount += yearModerate;
    hardCount += yearHard;
    totalQuestions += yearTotal;

    const yearEasyPct = (yearEasy / yearTotal * 100).toFixed(1);
    const yearModPct = (yearModerate / yearTotal * 100).toFixed(1);
    const yearHardPct = (yearHard / yearTotal * 100).toFixed(1);

    console.log(`\n📊 Year ${year}: ${yearTotal} questions`);
    console.log(`   Easy:     ${yearEasy.toString().padStart(2)} (${yearEasyPct}%)`);
    console.log(`   Moderate: ${yearModerate.toString().padStart(2)} (${yearModPct}%)`);
    console.log(`   Hard:     ${yearHard.toString().padStart(2)} (${yearHardPct}%)`);

    yearResults.push({
      year,
      total: yearTotal,
      easy: yearEasy,
      moderate: yearModerate,
      hard: yearHard,
      easyPct: parseFloat(yearEasyPct),
      moderatePct: parseFloat(yearModPct),
      hardPct: parseFloat(yearHardPct)
    });
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`\n📈 OVERALL DISTRIBUTION (${YEARS[0]}-${YEARS[YEARS.length-1]}):\n`);
  console.log(`   Total Questions: ${totalQuestions}`);
  console.log(`   Easy:            ${easyCount} (${(easyCount/totalQuestions*100).toFixed(1)}%)`);
  console.log(`   Moderate:        ${moderateCount} (${(moderateCount/totalQuestions*100).toFixed(1)}%)`);
  console.log(`   Hard:            ${hardCount} (${(hardCount/totalQuestions*100).toFixed(1)}%)`);

  const avgEasy = (easyCount / totalQuestions * 100).toFixed(0);
  const avgModerate = (moderateCount / totalQuestions * 100).toFixed(0);
  const avgHard = (hardCount / totalQuestions * 100).toFixed(0);

  console.log(`\n🎯 CALIBRATED DIFFICULTY DISTRIBUTION:`);
  console.log(`   Easy/Moderate/Hard: ${avgEasy}/${avgModerate}/${avgHard}`);
  console.log(`\n   ⚠️  Compare to assumed projection: 30/50/20`);
  console.log(`   Difference: Easy ${(parseFloat(avgEasy) - 30).toFixed(0)}%, Moderate ${(parseFloat(avgModerate) - 50).toFixed(0)}%, Hard ${(parseFloat(avgHard) - 20).toFixed(0)}%\n`);

  return {
    totalQuestions,
    easyCount,
    moderateCount,
    hardCount,
    easyPct: parseFloat(avgEasy),
    moderatePct: parseFloat(avgModerate),
    hardPct: parseFloat(avgHard),
    yearResults
  };
}

analyzeActualDifficulty()
  .then(results => {
    console.log('='.repeat(70));
    console.log('\n✅ Analysis complete\n');
  })
  .catch(console.error);
