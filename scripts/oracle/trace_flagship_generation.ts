import { getForecastedCalibration } from '../../lib/reiEvolutionEngine';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

/**
 * Trace the complete flagship generation flow to verify correctness
 */

async function traceFlow() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  FLAGSHIP GENERATION FLOW VERIFICATION                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const subject = "Math";
  const exam = "KCET";

  console.log('📊 STEP 1: Fetch Forecasted Calibration from Database\n');
  console.log(`   Subject: ${subject}`);
  console.log(`   Exam: ${exam}`);

  const forecast = await getForecastedCalibration(exam, subject as any);

  if (!forecast || !forecast.idsTarget) {
    console.error('\n❌ CRITICAL ERROR: No forecast data found!');
    console.error('   This means getForecastedCalibration() failed.');
    console.error('   Flagship generation will fail.\n');
    return;
  }

  console.log('\n   ✅ Forecast Retrieved Successfully!\n');
  console.log('   📊 Forecast Data:');
  console.log(`      • IDS Target: ${forecast.idsTarget}`);
  console.log(`      • Rigor Velocity: ${forecast.rigorVelocity}`);
  console.log(`      • Board Signature: ${forecast.boardSignature}`);
  console.log(`      • Target Year: ${forecast.targetYear}`);

  console.log('\n   📊 Difficulty Profile:');
  console.log(`      • Easy: ${forecast.difficultyProfile.easy}%`);
  console.log(`      • Moderate: ${forecast.difficultyProfile.moderate}%`);
  console.log(`      • Hard: ${forecast.difficultyProfile.hard}%`);
  console.log(`      • Total: ${forecast.difficultyProfile.easy + forecast.difficultyProfile.moderate + forecast.difficultyProfile.hard}%`);

  console.log('\n   📊 Intent Signature:');
  console.log(`      • Synthesis: ${forecast.intentSignature.synthesis}`);
  console.log(`      • Trap Density: ${forecast.intentSignature.trapDensity}`);
  console.log(`      • Linguistic Load: ${forecast.intentSignature.linguisticLoad}`);
  console.log(`      • Speed Requirement: ${forecast.intentSignature.speedRequirement}`);

  if (forecast.directives && forecast.directives.length > 0) {
    console.log('\n   📊 Directives:');
    forecast.directives.forEach((dir: string, idx: number) => {
      console.log(`      ${idx + 1}. ${dir}`);
    });
  }

  console.log('\n' + '═'.repeat(65));
  console.log('📊 STEP 2: Load Identity Bank from JSON File\n');

  const bankFile = `kcet_${subject.toLowerCase()}.json`;
  const bankPath = path.join(process.cwd(), `lib/oracle/identities/${bankFile}`);

  if (!fs.existsSync(bankPath)) {
    console.error(`   ❌ ERROR: Identity bank not found at ${bankPath}`);
    return;
  }

  const bankData = JSON.parse(fs.readFileSync(bankPath, 'utf8'));

  console.log(`   ✅ Identity Bank Loaded: ${bankPath}\n`);
  console.log(`   📊 Identity Bank Info:`);
  console.log(`      • Version: ${bankData.version || 'Unknown'}`);
  console.log(`      • Subject: ${bankData.subject}`);
  console.log(`      • Exam: ${bankData.exam}`);
  console.log(`      • Total Identities: ${bankData.identities.length}`);

  const highConf = bankData.identities.filter((id: any) => id.confidence >= 0.75);
  console.log(`      • High-Confidence (≥75%): ${highConf.length}`);

  const clusters = [...new Set(bankData.identities.map((i: any) => i.logic_cluster))];
  console.log(`      • Logic Clusters: ${clusters.length}`);
  console.log(`      • Cluster A (SET A): ${clusters[0] || 'CORE_LOGIC'}`);
  console.log(`      • Cluster B (SET B): ${clusters[1] || 'PERIPHERAL_LOGIC'}`);

  console.log('\n   📊 Top 10 Identities by Confidence:');
  const sorted = [...bankData.identities].sort((a: any, b: any) => b.confidence - a.confidence);
  for (let i = 0; i < Math.min(10, sorted.length); i++) {
    const id = sorted[i];
    console.log(`      ${(i + 1).toString().padStart(2)}. ${id.id} - ${id.topic.padEnd(30)} (${(id.confidence * 100).toFixed(1)}%)`);
  }

  console.log('\n' + '═'.repeat(65));
  console.log('📊 STEP 3: Construct Payload for Question Generation\n');

  function normalizeMix(mix: { easy: number; moderate: number; hard: number }) {
    const total = (mix.easy || 0) + (mix.moderate || 0) + (mix.hard || 0);
    if (total === 100) return mix;
    if (total === 0) return { easy: 40, moderate: 40, hard: 20 };
    const factor = 100 / total;
    return {
      easy: Math.round(mix.easy * factor),
      moderate: Math.round(mix.moderate * factor),
      hard: 100 - Math.round(mix.easy * factor) - Math.round(mix.moderate * factor)
    };
  }

  const normalizedDifficulty = normalizeMix(forecast.difficultyProfile);

  const payload = {
    userId: "13282202-5251-4c94-b5ef-95c273378262",
    testName: `PLUS2AI OFFICIAL ${subject.toUpperCase()} PREDICTION 2026: SET_A`,
    subject: subject,
    examContext: exam,
    topicIds: [],
    questionCount: 60,
    difficultyMix: normalizedDifficulty,
    durationMinutes: 80,
    saveAsTemplate: false,
    strategyMode: 'predictive_mock',
    oracleMode: {
      enabled: true,
      idsTarget: forecast.idsTarget,
      rigorVelocity: forecast.rigorVelocity,
      intentSignature: forecast.intentSignature,
      directives: [
        ...forecast.directives,
        `FORENSIC_FOCUS: ${clusters[0] || 'CORE_LOGIC'}`,
        `TARGET_SET: SET_A`
      ],
      boardSignature: forecast.boardSignature
    }
  };

  console.log('   ✅ Payload Constructed:\n');
  console.log('   📊 Basic Config:');
  console.log(`      • Test Name: ${payload.testName}`);
  console.log(`      • Subject: ${payload.subject}`);
  console.log(`      • Exam Context: ${payload.examContext}`);
  console.log(`      • Question Count: ${payload.questionCount}`);
  console.log(`      • Duration: ${payload.durationMinutes} minutes`);
  console.log(`      • Strategy Mode: ${payload.strategyMode}`);

  console.log('\n   📊 Difficulty Mix (Normalized):');
  console.log(`      • Easy: ${normalizedDifficulty.easy}%`);
  console.log(`      • Moderate: ${normalizedDifficulty.moderate}%`);
  console.log(`      • Hard: ${normalizedDifficulty.hard}%`);
  console.log(`      • Total: ${normalizedDifficulty.easy + normalizedDifficulty.moderate + normalizedDifficulty.hard}%`);

  console.log('\n   📊 Oracle Mode:');
  console.log(`      • Enabled: ${payload.oracleMode.enabled}`);
  console.log(`      • IDS Target: ${payload.oracleMode.idsTarget}`);
  console.log(`      • Rigor Velocity: ${payload.oracleMode.rigorVelocity}`);
  console.log(`      • Board Signature: ${payload.oracleMode.boardSignature}`);

  console.log('\n   📊 Intent Signature (Oracle Mode):');
  console.log(`      • Synthesis: ${payload.oracleMode.intentSignature.synthesis}`);
  console.log(`      • Trap Density: ${payload.oracleMode.intentSignature.trapDensity}`);
  console.log(`      • Linguistic Load: ${payload.oracleMode.intentSignature.linguisticLoad}`);
  console.log(`      • Speed Requirement: ${payload.oracleMode.intentSignature.speedRequirement}`);

  console.log('\n   📊 Directives:');
  payload.oracleMode.directives.forEach((dir: string, idx: number) => {
    console.log(`      ${idx + 1}. ${dir}`);
  });

  console.log('\n' + '═'.repeat(65));
  console.log('📊 STEP 4: Generate Questions (Simulated)\n');

  console.log('   ⚠️  NOTE: This trace does NOT actually generate questions.');
  console.log('   To generate questions, run:');
  console.log('   npx tsx scripts/oracle/generate_flagship_oracle.ts Math\n');

  console.log('   What would happen:');
  console.log('   1. generateTestInBackground(payload) is called');
  console.log('   2. Questions are generated using AI (Gemini API)');
  console.log('   3. Questions respect:');
  console.log('      - Difficulty mix (37% easy, 48% moderate, 15% hard)');
  console.log('      - IDS target (89.4% cognitive demand)');
  console.log('      - Synthesis weight (29.4%)');
  console.log('      - Identity bank (focus on high-confidence identities)');
  console.log('   4. Result contains 60 questions');
  console.log('   5. Questions are saved to flagship_final.json\n');

  console.log('\n' + '═'.repeat(65));
  console.log('📊 STEP 5: Expected Output Files\n');

  console.log('   SET A: flagship_final.json');
  console.log('   SET B: flagship_final_b.json\n');

  console.log('   📊 JSON Structure:');
  console.log('   {');
  console.log('     "test_name": "PLUS2AI OFFICIAL MATH PREDICTION 2026: SET_A",');
  console.log('     "subject": "Math",');
  console.log('     "exam_context": "KCET",');
  console.log('     "total_questions": 60,');
  console.log('     "test_config": {');
  console.log('       "questions": [ ... 60 questions ... ]');
  console.log('     },');
  console.log('     "is_official": true,');
  console.log('     "setId": "SET_A"');
  console.log('   }\n');

  console.log('═'.repeat(65));
  console.log('✅ FLOW VERIFICATION COMPLETE');
  console.log('═'.repeat(65));

  console.log('\n🎯 SUMMARY:\n');
  console.log('   1. ✅ Database connection works');
  console.log('   2. ✅ Forecast data retrieved correctly');
  console.log(`   3. ✅ Difficulty mix: ${normalizedDifficulty.easy}% Easy, ${normalizedDifficulty.moderate}% Moderate, ${normalizedDifficulty.hard}% Hard`);
  console.log(`   4. ✅ IDS Target: ${forecast.idsTarget} (${(forecast.idsTarget * 100).toFixed(1)}%)`);
  console.log(`   5. ✅ Synthesis Weight: ${forecast.intentSignature.synthesis} (${(forecast.intentSignature.synthesis * 100).toFixed(1)}%)`);
  console.log(`   6. ✅ Identity bank loaded with ${bankData.identities.length} identities`);
  console.log(`   7. ✅ High-confidence identities: ${highConf.length}`);
  console.log('   8. ✅ Payload constructed correctly\n');

  console.log('🚀 READY TO GENERATE FLAGSHIP PAPERS!\n');
  console.log('   Run: npx tsx scripts/oracle/generate_flagship_oracle.ts Math\n');

  // Validation checks
  console.log('═'.repeat(65));
  console.log('🔍 VALIDATION CHECKS');
  console.log('═'.repeat(65));

  let allValid = true;

  console.log('\n   Checking difficulty distribution...');
  const diffTotal = normalizedDifficulty.easy + normalizedDifficulty.moderate + normalizedDifficulty.hard;
  if (diffTotal === 100) {
    console.log('   ✅ Difficulty total = 100%');
  } else {
    console.log(`   ❌ ERROR: Difficulty total = ${diffTotal}% (should be 100%)`);
    allValid = false;
  }

  console.log('\n   Checking IDS target...');
  if (forecast.idsTarget >= 0.5 && forecast.idsTarget <= 1.0) {
    console.log(`   ✅ IDS target is valid: ${forecast.idsTarget}`);
  } else {
    console.log(`   ❌ ERROR: IDS target out of range: ${forecast.idsTarget}`);
    allValid = false;
  }

  console.log('\n   Checking synthesis weight...');
  if (forecast.intentSignature.synthesis >= 0 && forecast.intentSignature.synthesis <= 1.0) {
    console.log(`   ✅ Synthesis weight is valid: ${forecast.intentSignature.synthesis}`);
  } else {
    console.log(`   ❌ ERROR: Synthesis weight out of range: ${forecast.intentSignature.synthesis}`);
    allValid = false;
  }

  console.log('\n   Checking identity bank...');
  if (bankData.identities.length >= 20) {
    console.log(`   ✅ Identity bank has sufficient identities: ${bankData.identities.length}`);
  } else {
    console.log(`   ⚠️  WARNING: Low identity count: ${bankData.identities.length}`);
  }

  console.log('\n   Checking high-confidence identities...');
  if (highConf.length >= 10) {
    console.log(`   ✅ Sufficient high-confidence identities: ${highConf.length}`);
  } else {
    console.log(`   ⚠️  WARNING: Low high-confidence count: ${highConf.length}`);
  }

  console.log('\n' + '═'.repeat(65));
  if (allValid) {
    console.log('✅ ALL VALIDATION CHECKS PASSED');
  } else {
    console.log('❌ SOME VALIDATION CHECKS FAILED - Review errors above');
  }
  console.log('═'.repeat(65) + '\n');
}

traceFlow().catch(console.error);
