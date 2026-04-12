import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkKCETDifficultyHistory() {
  console.log('📊 KCET MATH DIFFICULTY HISTORY (2021-2025)\n');
  console.log('='.repeat(80));

  // Query questions
  const { data: scans, error } = await supabase
    .from('questions')
    .select('year, difficulty, exam_context, subject')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Mathematics')
    .in('year', [2021, 2022, 2023, 2024, 2025]);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  // Group by year
  const yearData: Record<number, { easy: number; moderate: number; hard: number; total: number }> = {};

  scans?.forEach(q => {
    const year = q.year || 0;
    if (!yearData[year]) {
      yearData[year] = { easy: 0, moderate: 0, hard: 0, total: 0 };
    }
    yearData[year].total++;
    if (q.difficulty === 'Easy') yearData[year].easy++;
    if (q.difficulty === 'Moderate') yearData[year].moderate++;
    if (q.difficulty === 'Hard') yearData[year].hard++;
  });

  // Display results
  console.log('\nYear | Easy | Moderate | Hard | Total | Easy% | Mod% | Hard%');
  console.log('-'.repeat(80));

  const years = Object.keys(yearData).map(Number).sort((a, b) => b - a);

  years.forEach(year => {
    const data = yearData[year];
    const easyPct = ((data.easy / data.total) * 100).toFixed(1);
    const modPct = ((data.moderate / data.total) * 100).toFixed(1);
    const hardPct = ((data.hard / data.total) * 100).toFixed(1);

    console.log(
      `${year} | ${data.easy.toString().padStart(4)} | ${data.moderate.toString().padStart(8)} | ` +
      `${data.hard.toString().padStart(4)} | ${data.total.toString().padStart(5)} | ` +
      `${easyPct.padStart(5)}% | ${modPct.padStart(4)}% | ${hardPct.padStart(5)}%`
    );
  });

  // Calculate average of last 3 years
  const recent3Years = years.slice(0, 3);
  let totalEasy = 0, totalMod = 0, totalHard = 0, totalQ = 0;

  recent3Years.forEach(year => {
    const data = yearData[year];
    totalEasy += data.easy;
    totalMod += data.moderate;
    totalHard += data.hard;
    totalQ += data.total;
  });

  console.log('-'.repeat(80));
  console.log('\n📈 3-YEAR AVERAGE (Recent Trend):');
  console.log(`   Easy:     ${((totalEasy / totalQ) * 100).toFixed(1)}%`);
  console.log(`   Moderate: ${((totalMod / totalQ) * 100).toFixed(1)}%`);
  console.log(`   Hard:     ${((totalHard / totalQ) * 100).toFixed(1)}%`);

  // Check REI calibration
  console.log('\n🧠 REI MASTER CALIBRATION:\n');

  const { data: calibration } = await supabase
    .from('rei_master_calibrations')
    .select('*')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .order('year', { ascending: false })
    .limit(1)
    .single();

  if (calibration) {
    console.log(`   Year: ${calibration.year || 'Universal'}`);
    console.log(`   Easy:     ${calibration.difficulty_easy_pct || 'N/A'}%`);
    console.log(`   Moderate: ${calibration.difficulty_moderate_pct || 'N/A'}%`);
    console.log(`   Hard:     ${calibration.difficulty_hard_pct || 'N/A'}%`);
    console.log(`   IDS Target: ${calibration.ids_target || 'N/A'}`);
    console.log(`   Rigor Velocity: ${calibration.rigor_velocity || 'N/A'}`);
  } else {
    console.log('   No calibration found in database.');
  }

  console.log('\n' + '='.repeat(80));
}

checkKCETDifficultyHistory();
