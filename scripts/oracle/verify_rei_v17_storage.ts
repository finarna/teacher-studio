import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyREIv17Storage() {
  console.log('🔍 VERIFYING REI v17 STORAGE LOCATIONS\n');
  console.log('═'.repeat(80));

  // 1. Check ai_universal_calibration table
  console.log('\n📊 1. MASTER CALIBRATION TABLE (ai_universal_calibration)\n');

  const { data: masterCalib, error: masterError } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', 'KCET')
    .eq('subject', 'Math')
    .eq('target_year', 2026)
    .single();

  if (masterError) {
    console.log(`   ❌ Error: ${masterError.message}`);
  } else if (!masterCalib) {
    console.log('   ❌ No calibration found for KCET Math 2026');
  } else {
    console.log('   ✅ Master calibration found');
    console.log(`   Updated: ${masterCalib.updated_at}`);
    console.log(`\n   📊 Rigor Velocity: ${masterCalib.rigor_velocity}`);
    console.log(`   📊 Board Signature: ${masterCalib.board_signature}`);

    if (masterCalib.intent_signature) {
      const sig = masterCalib.intent_signature;
      console.log('\n   Intent Signature:');
      console.log(`     - Synthesis: ${sig.synthesis}`);
      console.log(`     - Trap Density: ${sig.trapDensity}`);
      console.log(`     - IDS Target: ${sig.idsTarget}`);

      if (sig.difficultyProfile) {
        console.log(`\n   Difficulty Profile:`);
        console.log(`     - Easy: ${sig.difficultyProfile.easy}%`);
        console.log(`     - Moderate: ${sig.difficultyProfile.moderate}%`);
        console.log(`     - Hard: ${sig.difficultyProfile.hard}%`);
      } else {
        console.log('   ⚠️  Difficulty Profile: NOT FOUND');
      }

      if (sig.questionTypeProfile) {
        console.log(`\n   ✅ Question Type Profile (REI v17):`);
        console.log(`     - Property-Based: ${sig.questionTypeProfile.property_based}%`);
        console.log(`     - Word Problems: ${sig.questionTypeProfile.word_problem}%`);
        console.log(`     - Computational: ${sig.questionTypeProfile.computational}%`);
        console.log(`     - Pattern Recognition: ${sig.questionTypeProfile.pattern_recognition}%`);
        console.log(`     - Abstract: ${sig.questionTypeProfile.abstract}%`);
      } else {
        console.log('   ❌ Question Type Profile: NOT FOUND (Need to run calibration!)');
      }
    }
  }

  // 2. Check rei_evolution_configs
  console.log('\n\n═'.repeat(80));
  console.log('📊 2. REI EVOLUTION CONFIGS TABLE\n');

  const { data: reiConfig, error: reiError } = await supabase
    .from('rei_evolution_configs')
    .select('*')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .single();

  if (reiError) {
    console.log(`   ❌ Error: ${reiError.message}`);
  } else if (!reiConfig) {
    console.log('   ❌ No config found for KCET Math');
  } else {
    console.log('   ✅ REI config found');
    console.log(`\n   Engine Parameters:`);
    console.log(`     - Rigor Drift Multiplier: ${reiConfig.rigor_drift_multiplier}`);
    console.log(`     - IDS Baseline: ${reiConfig.ids_baseline}`);
    console.log(`     - Synthesis Weight: ${reiConfig.synthesis_weight}`);
    console.log(`     - Trap Density Weight: ${reiConfig.trap_density_weight || 'N/A'}`);
  }

  // 3. Check exam_historical_patterns
  console.log('\n\n═'.repeat(80));
  console.log('📊 3. HISTORICAL PATTERNS TABLE (2021-2025)\n');

  const { data: patterns, error: patternsError } = await supabase
    .from('exam_historical_patterns')
    .select('year, ids_actual, difficulty_easy_pct, difficulty_moderate_pct, difficulty_hard_pct, intent_signature')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .order('year', { ascending: true });

  if (patternsError) {
    console.log(`   ❌ Error: ${patternsError.message}`);
  } else if (!patterns || patterns.length === 0) {
    console.log('   ❌ No historical patterns found');
  } else {
    console.log(`   ✅ Found ${patterns.length} years of data\n`);
    patterns.forEach(p => {
      console.log(`   ${p.year}: IDS=${p.ids_actual?.toFixed(3) || 'N/A'}, Diff=${p.difficulty_easy_pct || 'N/A'}/${p.difficulty_moderate_pct || 'N/A'}/${p.difficulty_hard_pct || 'N/A'}`);
    });
  }

  // 4. Check identity bank JSON
  console.log('\n\n═'.repeat(80));
  console.log('📊 4. IDENTITY BANK (JSON File)\n');

  const identityPath = 'lib/oracle/identities/kcet_math.json';
  if (!fs.existsSync(identityPath)) {
    console.log('   ❌ Identity bank not found');
  } else {
    const bankData = JSON.parse(fs.readFileSync(identityPath, 'utf8'));
    console.log(`   ✅ Identity bank loaded`);
    console.log(`   Version: ${bankData.version}`);
    console.log(`   Total Identities: ${bankData.identities.length}`);

    if (bankData.calibration) {
      console.log(`\n   Calibration Status: ${bankData.calibration.status}`);
      console.log(`   Last Updated: ${bankData.calibration.updated_at}`);
      console.log(`   Final Match Rate: ${(bankData.calibration.final_match_rate * 100).toFixed(1)}%`);
    }

    // Check if any identity has question_types field
    const hasQuestionTypes = bankData.identities.some((id: any) => id.question_types);
    if (hasQuestionTypes) {
      console.log('   ✅ Identities have question_types field (REI v17)');
    } else {
      console.log('   ⚠️  Identities DO NOT have question_types field (Need enhancement)');
    }

    // Show high-confidence identities
    const highConf = bankData.identities.filter((id: any) => id.confidence > 0.90);
    console.log(`\n   High-Confidence Identities (>90%): ${highConf.length}`);
    highConf.slice(0, 5).forEach((id: any) => {
      console.log(`     - ${id.id}: ${id.name} (${(id.confidence * 100).toFixed(1)}%)`);
    });
  }

  // 5. Check question type analysis JSON
  console.log('\n\n═'.repeat(80));
  console.log('📊 5. QUESTION TYPE ANALYSIS (JSON Report)\n');

  const analysisPath = 'docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025.json';
  if (!fs.existsSync(analysisPath)) {
    console.log('   ❌ Question type analysis not found');
  } else {
    const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    console.log(`   ✅ Analysis report loaded`);
    console.log(`   Analysis Date: ${analysisData.analysis_date}`);
    console.log(`   Total Questions Analyzed: ${analysisData.total_questions_analyzed}`);

    console.log(`\n   Average Distribution (2021-2025):`);
    console.log(`     - Property-Based: ${analysisData.average_distribution.property_based}%`);
    console.log(`     - Word Problems: ${analysisData.average_distribution.word_problem}%`);
    console.log(`     - Computational: ${analysisData.average_distribution.computational}%`);
    console.log(`     - Pattern Recognition: ${analysisData.average_distribution.pattern_recognition}%`);
    console.log(`     - Abstract: ${analysisData.average_distribution.abstract}%`);
  }

  // Summary
  console.log('\n\n═'.repeat(80));
  console.log('📊 SUMMARY\n');

  const hasQuestionTypeInDB = masterCalib?.intent_signature?.questionTypeProfile !== undefined;
  const hasQuestionTypeInJSON = fs.existsSync(analysisPath);
  const hasIdentityBank = fs.existsSync(identityPath);

  console.log(`Storage Locations:`);
  console.log(`  ${hasQuestionTypeInDB ? '✅' : '❌'} Database (ai_universal_calibration.intent_signature.questionTypeProfile)`);
  console.log(`  ${hasQuestionTypeInJSON ? '✅' : '❌'} JSON Report (docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025.json)`);
  console.log(`  ${hasIdentityBank ? '✅' : '❌'} Identity Bank (lib/oracle/identities/kcet_math.json)`);

  if (hasQuestionTypeInDB && hasQuestionTypeInJSON && hasIdentityBank) {
    console.log(`\n✅ REI v17 is READY for flagship generation!`);
  } else {
    console.log(`\n⚠️  REI v17 setup is INCOMPLETE. Run calibration to update all storage locations.`);
  }

  console.log('\n═'.repeat(80));
}

verifyREIv17Storage().catch(console.error);
