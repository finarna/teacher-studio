import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * This script shows EXACTLY how the difficulty distribution (Easy/Moderate/Hard %)
 * is calculated from the Rigor Drift Multiplier for KCET Math 2026
 */

async function explainDifficultyCalculation() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  DIFFICULTY DISTRIBUTION CALCULATION EXPLAINED               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Fetch historical patterns
  const { data: patterns } = await supabase
    .from('exam_historical_patterns')
    .select('*')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .order('year', { ascending: false })
    .limit(2);

  if (!patterns || patterns.length < 2) {
    console.log('Not enough historical data');
    return;
  }

  const recent = patterns[0]; // 2025
  const previous = patterns[1]; // 2024

  console.log('📊 STEP 1: Fetch Historical Patterns\n');
  console.log(`   Most Recent (${recent.year}):`);
  console.log(`      • difficulty_hard_pct: ${recent.difficulty_hard_pct || 'NULL (defaults to 20)'}`);
  console.log(`      • difficulty_moderate_pct: ${recent.difficulty_moderate_pct || 'NULL'}`);
  console.log(`      • difficulty_easy_pct: ${recent.difficulty_easy_pct || 'NULL'}`);

  console.log(`\n   Previous (${previous.year}):`);
  console.log(`      • difficulty_hard_pct: ${previous.difficulty_hard_pct || 'NULL (defaults to 20)'}`);

  // Fetch calibrated config
  const { data: config } = await supabase
    .from('rei_evolution_configs')
    .select('*')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .single();

  console.log('\n📊 STEP 2: Get Calibrated Rigor Drift Multiplier\n');
  console.log(`   • rigor_drift_multiplier: ${config?.rigor_drift_multiplier || 1.8}`);

  // KCET Baseline Profile
  const baseline = {
    easy: 33,
    moderate: 42,
    hard: 25
  };

  console.log('\n📊 STEP 3: KCET Baseline Profile (System Default)\n');
  console.log(`   • Easy: ${baseline.easy}%`);
  console.log(`   • Moderate: ${baseline.moderate}%`);
  console.log(`   • Hard: ${baseline.hard}%`);

  // Calculate rigorDrift
  const recentHardPct = recent.difficulty_hard_pct || 20;
  const previousHardPct = previous.difficulty_hard_pct || 20;
  const rigorDrift = recentHardPct - previousHardPct;

  console.log('\n📊 STEP 4: Calculate Rigor Drift (Year-over-Year Change)\n');
  console.log(`   Formula: rigorDrift = recent.difficulty_hard_pct - previous.difficulty_hard_pct`);
  console.log(`   rigorDrift = ${recentHardPct} - ${previousHardPct} = ${rigorDrift}%`);

  // Calculate forecastedHard
  const driftMultiplier = config?.rigor_drift_multiplier || 1.8;
  let forecastedHard = recentHardPct + (rigorDrift * driftMultiplier);

  console.log('\n📊 STEP 5: Forecast Hard % for 2026\n');
  console.log(`   Formula: forecastedHard = recent.difficulty_hard_pct + (rigorDrift × driftMultiplier)`);
  console.log(`   Initial calculation: ${recentHardPct} + (${rigorDrift} × ${driftMultiplier.toFixed(4)})`);
  console.log(`                      = ${recentHardPct} + ${(rigorDrift * driftMultiplier).toFixed(2)}`);
  console.log(`                      = ${forecastedHard.toFixed(2)}%`);

  // Apply constraints
  forecastedHard = Math.min(65, Math.max(15, forecastedHard));
  console.log(`   With constraints [15%, 65%]: ${forecastedHard.toFixed(2)}%`);
  console.log(`   Rounded: ${Math.round(forecastedHard)}%`);

  // Calculate remaining
  const remaining = 100 - forecastedHard;

  console.log('\n📊 STEP 6: Calculate Easy % (Proportional Split)\n');
  console.log(`   Formula: forecastedEasy = remaining × (baseline.easy / (baseline.easy + baseline.moderate))`);
  console.log(`   remaining = 100 - ${forecastedHard.toFixed(2)} = ${remaining.toFixed(2)}%`);
  console.log(`   ratio = baseline.easy / (baseline.easy + baseline.moderate)`);
  console.log(`        = ${baseline.easy} / (${baseline.easy} + ${baseline.moderate})`);
  console.log(`        = ${baseline.easy} / ${baseline.easy + baseline.moderate}`);
  console.log(`        = ${(baseline.easy / (baseline.easy + baseline.moderate)).toFixed(4)}`);

  const forecastedEasy = Math.round(remaining * (baseline.easy / (baseline.easy + baseline.moderate)));
  console.log(`   forecastedEasy = ${remaining.toFixed(2)} × ${(baseline.easy / (baseline.easy + baseline.moderate)).toFixed(4)}`);
  console.log(`                  = ${(remaining * (baseline.easy / (baseline.easy + baseline.moderate))).toFixed(2)}%`);
  console.log(`   Rounded: ${forecastedEasy}%`);

  // Calculate moderate
  const forecastedModerate = 100 - Math.round(forecastedHard) - forecastedEasy;

  console.log('\n📊 STEP 7: Calculate Moderate % (Remainder)\n');
  console.log(`   Formula: forecastedModerate = 100 - forecastedHard - forecastedEasy`);
  console.log(`   forecastedModerate = 100 - ${Math.round(forecastedHard)} - ${forecastedEasy}`);
  console.log(`                      = ${forecastedModerate}%`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 FINAL 2026 DIFFICULTY DISTRIBUTION');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`   • Easy: ${forecastedEasy}%`);
  console.log(`   • Moderate: ${forecastedModerate}%`);
  console.log(`   • Hard: ${Math.round(forecastedHard)}%`);
  console.log(`   • Total: ${forecastedEasy + forecastedModerate + Math.round(forecastedHard)}%\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔑 KEY INSIGHT');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('The Rigor Drift Multiplier (1.6817) amplifies the year-over-year');
  console.log('trend in Hard question percentage. Since the recent trend shows');
  console.log(`a drift of ${rigorDrift}%, the system forecasts that this trend will`);
  console.log(`continue with ${driftMultiplier.toFixed(4)}x amplification for 2026.`);
  console.log('\nThe Easy/Moderate split maintains the KCET baseline proportion');
  console.log('(33:42 ratio) for the remaining percentage after Hard % is set.\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

explainDifficultyCalculation().catch(console.error);
