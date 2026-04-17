import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check2026Parameters() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  KCET MATH 2026 FLAGSHIP GENERATION PARAMETERS              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const EXAM = 'KCET';
  const SUBJECT = 'Math';

  // 1. Check rei_evolution_configs (Primary engine parameters)
  console.log('📊 1. ENGINE PARAMETERS (rei_evolution_configs)\n');

  const { data: config, error: configError } = await supabase
    .from('rei_evolution_configs')
    .select('*')
    .eq('exam_context', EXAM)
    .eq('subject', SUBJECT)
    .single();

  if (configError || !config) {
    console.error('   ❌ Error:', configError?.message || 'No config found');
  } else {
    console.log('   ✅ Calibrated Engine Parameters:');
    console.log(`      • Rigor Drift Multiplier: ${config.rigor_drift_multiplier}`);
    console.log(`      • IDS Baseline: ${config.ids_baseline}`);
    console.log(`      • Synthesis Weight: ${config.synthesis_weight}`);
    console.log(`      • Trap Density Weight: ${config.trap_density_weight}`);
    console.log(`      • Linguistic Load Weight: ${config.linguistic_load_weight}`);
    console.log(`      • Speed Requirement Weight: ${config.speed_requirement_weight}`);
  }

  // 2. Check exam_historical_patterns (Historical evolution)
  console.log('\n📊 2. HISTORICAL PATTERNS (exam_historical_patterns)\n');

  const { data: patterns, error: patternsError } = await supabase
    .from('exam_historical_patterns')
    .select('*')
    .eq('exam_context', EXAM)
    .eq('subject', SUBJECT)
    .order('year', { ascending: false })
    .limit(5);

  if (patternsError || !patterns || patterns.length === 0) {
    console.error('   ❌ Error:', patternsError?.message || 'No patterns found');
  } else {
    console.log(`   ✅ Historical Data (${patterns.length} years):\n`);

    for (const pattern of patterns.reverse()) {
      const identityVectorSize = Object.keys(pattern.intent_signature?.identityVector || {}).length;
      console.log(`   📅 Year ${pattern.year}:`);
      console.log(`      • IDS Actual: ${pattern.ids_actual || 'N/A'}`);
      console.log(`      • Board Signature: ${pattern.board_signature || 'N/A'}`);
      console.log(`      • Identities: ${identityVectorSize} unique`);
      console.log(`      • Synthesis: ${pattern.intent_signature?.synthesis || 'N/A'}`);
      console.log(`      • Trap Density: ${pattern.intent_signature?.trapDensity || 'N/A'}`);
      console.log(`      • Evolution: ${(pattern.evolution_note || '').substring(0, 80)}...`);
      console.log('');
    }

    // Show most recent year (2025)
    const recent = patterns[0];
    console.log('   🎯 MOST RECENT TREND (2025):');
    console.log(`      • Board Signature: ${recent.board_signature}`);
    console.log(`      • IDS Actual: ${recent.ids_actual}`);
    console.log(`      • Identities: ${Object.keys(recent.intent_signature?.identityVector || {}).length}`);
  }

  // 3. Check identity bank (JSON file)
  console.log('\n📊 3. IDENTITY BANK (lib/oracle/identities/kcet_math.json)\n');

  const identityBankPath = path.join(process.cwd(), 'lib/oracle/identities/kcet_math.json');

  if (!fs.existsSync(identityBankPath)) {
    console.log('   ❌ Identity bank not found');
  } else {
    const identityBank = JSON.parse(fs.readFileSync(identityBankPath, 'utf8'));
    const highConfidence = identityBank.identities.filter((id: any) => id.confidence >= 0.75);

    console.log('   ✅ Identity Bank Loaded:');
    console.log(`      • Total Identities: ${identityBank.identities.length}`);
    console.log(`      • High-Confidence (≥75%): ${highConfidence.length}`);
    console.log(`      • Version: ${identityBank.version || 'N/A'}`);
    console.log(`      • Calibration Status: ${identityBank.calibration?.status || 'N/A'}`);

    console.log('\n   🎯 Top 10 High-Confidence Identities:');
    const sorted = [...identityBank.identities].sort((a: any, b: any) => b.confidence - a.confidence);

    for (let i = 0; i < Math.min(10, sorted.length); i++) {
      const id = sorted[i];
      console.log(`      ${i + 1}. ${id.id} - ${id.topic} (${(id.confidence * 100).toFixed(1)}%)`);
    }
  }

  // 4. Prediction for 2026
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔮 2026 PREDICTION PARAMETERS (for Flagship Generation)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (config && patterns && patterns.length > 0) {
    const recent = patterns[0]; // 2025

    console.log('📊 ENGINE CONFIGURATION:');
    console.log(`   • Rigor Drift Multiplier: ${config.rigor_drift_multiplier.toFixed(4)}`);
    console.log(`   • Target IDS (Baseline): ${config.ids_baseline.toFixed(4)}`);
    console.log(`   • Synthesis Weight: ${config.synthesis_weight.toFixed(4)}`);
    console.log(`   • Trap Density: ${config.trap_density_weight.toFixed(4)}`);

    console.log('\n📊 EXPECTED CHARACTERISTICS (Based on 2025 Trend):');
    console.log(`   • Board Signature: ${recent.board_signature} (likely to continue)`);
    console.log(`   • Difficulty Level (IDS): ${(config.ids_baseline * 100).toFixed(1)}%`);
    console.log(`   • Synthesis Emphasis: ${(config.synthesis_weight * 100).toFixed(1)}%`);
    console.log(`   • Identity Focus: ${Object.keys(recent.intent_signature?.identityVector || {}).length}+ identities`);

    console.log('\n📊 FORECASTED DIFFICULTY MIX:');
    const rigorDrift = config.rigor_drift_multiplier;
    const baseHard = 20;
    const forecastedHard = Math.min(65, Math.max(15, baseHard + (rigorDrift - 1.0) * 20));
    const remaining = 100 - forecastedHard;
    const forecastedEasy = Math.round(remaining * 0.5);
    const forecastedModerate = 100 - forecastedHard - forecastedEasy;

    console.log(`   • Easy: ${forecastedEasy}%`);
    console.log(`   • Moderate: ${forecastedModerate}%`);
    console.log(`   • Hard: ${forecastedHard.toFixed(0)}%`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🚀 READY FOR FLAGSHIP GENERATION!');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Run the following command to generate SET A and SET B:\n');
  console.log('   npx tsx scripts/oracle/generate_flagship_oracle.ts Math\n');
  console.log('This will generate:');
  console.log('   • flagship_final.json (SET A)');
  console.log('   • flagship_final_b.json (SET B)');
  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

check2026Parameters().catch(console.error);
