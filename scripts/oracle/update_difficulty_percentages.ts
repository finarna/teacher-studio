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

async function updateDifficultyPercentages() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  UPDATE DIFFICULTY PERCENTAGES FROM ACTUAL PAPERS            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  for (const [year, scanId] of Object.entries(OFFICIAL_SCANS)) {
    console.log(`\n📊 Processing Year ${year}...`);

    // Fetch all questions for this year
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select('difficulty')
      .eq('scan_id', scanId);

    if (fetchError || !questions || questions.length === 0) {
      console.log(`   ❌ Could not fetch questions: ${fetchError?.message || 'No questions found'}`);
      continue;
    }

    // Calculate difficulty distribution
    const easyCount = questions.filter(q => q.difficulty === 'Easy').length;
    const moderateCount = questions.filter(q => q.difficulty === 'Moderate').length;
    const hardCount = questions.filter(q => q.difficulty === 'Hard').length;
    const total = questions.length;

    const easyPct = Math.round((easyCount / total) * 100);
    const moderatePct = Math.round((moderateCount / total) * 100);
    const hardPct = Math.round((hardCount / total) * 100);

    console.log(`   📝 Total questions: ${total}`);
    console.log(`   📊 Distribution: Easy=${easyPct}% (${easyCount}), Moderate=${moderatePct}% (${moderateCount}), Hard=${hardPct}% (${hardCount})`);

    // Update exam_historical_patterns
    const { error: updateError } = await supabase
      .from('exam_historical_patterns')
      .update({
        difficulty_easy_pct: easyPct,
        difficulty_moderate_pct: moderatePct,
        difficulty_hard_pct: hardPct
      })
      .eq('exam_context', 'KCET')
      .eq('subject', 'Math')
      .eq('year', parseInt(year));

    if (updateError) {
      console.log(`   ❌ Update failed: ${updateError.message}`);
    } else {
      console.log(`   ✅ Updated successfully`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ DIFFICULTY PERCENTAGES UPDATED!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Verify and show trend
  const { data: patterns } = await supabase
    .from('exam_historical_patterns')
    .select('year, difficulty_easy_pct, difficulty_moderate_pct, difficulty_hard_pct')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .order('year');

  if (patterns && patterns.length > 0) {
    console.log('📊 VERIFIED DIFFICULTY TREND (2021-2025):\n');
    console.log('Year | Easy | Moderate | Hard');
    console.log('-----|------|----------|-----');

    for (const p of patterns) {
      console.log(`${p.year} | ${p.difficulty_easy_pct}%  | ${p.difficulty_moderate_pct}%       | ${p.difficulty_hard_pct}%`);
    }

    // Calculate trend
    if (patterns.length >= 2) {
      const recent = patterns[patterns.length - 1];
      const previous = patterns[patterns.length - 2];
      const hardDrift = (recent.difficulty_hard_pct || 0) - (previous.difficulty_hard_pct || 0);

      console.log('\n🎯 RIGOR DRIFT (2024 → 2025):');
      console.log(`   Hard % change: ${previous.difficulty_hard_pct}% → ${recent.difficulty_hard_pct}% (${hardDrift > 0 ? '+' : ''}${hardDrift}%)`);

      if (hardDrift !== 0) {
        console.log('\n🔮 IMPACT ON 2026 FORECAST:');
        console.log(`   With rigor_drift_multiplier = 1.6817`);
        console.log(`   Forecasted Hard % = ${recent.difficulty_hard_pct} + (${hardDrift} × 1.6817)`);
        const forecastedHard = Math.min(65, Math.max(15, (recent.difficulty_hard_pct || 20) + (hardDrift * 1.6817)));
        console.log(`                     = ${forecastedHard.toFixed(1)}%`);

        const remaining = 100 - forecastedHard;
        const forecastedEasy = Math.round(remaining * 0.44); // 33/75 ratio
        const forecastedModerate = 100 - Math.round(forecastedHard) - forecastedEasy;

        console.log(`\n   2026 Forecasted Distribution:`);
        console.log(`   • Easy: ${forecastedEasy}%`);
        console.log(`   • Moderate: ${forecastedModerate}%`);
        console.log(`   • Hard: ${Math.round(forecastedHard)}%`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

updateDifficultyPercentages().catch(console.error);
