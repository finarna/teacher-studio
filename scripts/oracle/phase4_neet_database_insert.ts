/**
 * NEET REPEATABLE WORKFLOW - PHASE 4: DATABASE CONFIGURATION
 *
 * Usage: npx tsx scripts/oracle/phase4_neet_database_insert.ts <Subject>
 * Example: npx tsx scripts/oracle/phase4_neet_database_insert.ts Physics
 *
 * Workflow Mapping:
 * - Step 4.1: Calculate REI Parameters (from calibration report)
 * - Step 4.2: Insert Calibration Record (upsert to database)
 * - Step 4.3: Verify Database Entry
 *
 * Prerequisites:
 * - Phase 2 must be complete (calibration report exists)
 * - Phase 3 must be complete (question type analysis exists)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

async function phase4DatabaseInsert(subject: string) {
  console.log(`\n🔧 PHASE 4: DATABASE CONFIGURATION - NEET ${subject.toUpperCase()}`);
  console.log('═'.repeat(70));

  // Validate subject
  if (!VALID_SUBJECTS.includes(subject)) {
    console.error(`\n❌ Invalid subject: ${subject}`);
    console.error(`   Valid subjects: ${VALID_SUBJECTS.join(', ')}\n`);
    process.exit(1);
  }

  // STEP 4.1: Calculate REI Parameters from calibration report
  console.log('\n📊 STEP 4.1: Calculate REI Parameters\n');

  const engineConfigPath = path.join(
    __dirname,
    `../../docs/oracle/calibration/engine_config_calibrated_neet_${subject.toLowerCase()}.json`
  );

  const questionTypeAnalysisPath = path.join(
    __dirname,
    `../../docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_${subject.toUpperCase()}.json`
  );

  // Check if calibration exists
  if (!fs.existsSync(engineConfigPath)) {
    console.error(`❌ Calibration not found: ${engineConfigPath}`);
    console.error(`\n   Phase 2 (Calibration) must be completed first for ${subject}`);
    console.error(`   Run: npx tsx scripts/oracle/neet_${subject.toLowerCase()}_iterative_calibration_2021_2025.ts\n`);
    process.exit(1);
  }

  if (!fs.existsSync(questionTypeAnalysisPath)) {
    console.error(`❌ Question type analysis not found: ${questionTypeAnalysisPath}`);
    console.error(`\n   Phase 3 (Question Type Analysis) must be completed first for ${subject}\n`);
    process.exit(1);
  }

  // Load calibration data
  const engineConfig = JSON.parse(fs.readFileSync(engineConfigPath, 'utf-8'));
  const questionTypeAnalysis = JSON.parse(fs.readFileSync(questionTypeAnalysisPath, 'utf-8'));

  console.log(`   ✅ Engine Config: ${engineConfig.rigor_drift_multiplier} rigor, ${engineConfig.ids_baseline} IDS`);
  console.log(`   ✅ Question Types: ${Object.keys(questionTypeAnalysis.question_type_distribution).length} types`);

  // Extract parameters
  const rigorVelocity = engineConfig.rigor_drift_multiplier;
  const idsTarget = engineConfig.ids_baseline;
  const questionTypeProfile = questionTypeAnalysis.question_type_distribution;

  // Read calibration report for difficulty distribution
  const calibrationReportPath = path.join(
    __dirname,
    `../../docs/oracle/calibration/NEET_${subject.toUpperCase()}_CALIBRATION_REPORT_2021_2025.md`
  );

  // For Physics: Use 2025 trend (user decision from Phase 2 analysis)
  // For other subjects: Will need to run difficulty analysis first
  let difficultyEasy = 30;
  let difficultyModerate = 50;
  let difficultyHard = 20;

  if (subject === 'Physics') {
    // 2025 NEET Physics trend: 20/71/9 (user-approved, based on actual data)
    difficultyEasy = 20;
    difficultyModerate = 71;
    difficultyHard = 9;
    console.log(`   ✅ Difficulty (2025 trend): ${difficultyEasy}/${difficultyModerate}/${difficultyHard}`);
  } else {
    console.log(`   ⚠️  Using default difficulty: ${difficultyEasy}/${difficultyModerate}/${difficultyHard}`);
    console.log(`   ⚠️  Run analyze_actual_neet_${subject.toLowerCase()}_difficulty.ts to get actual data`);
  }

  // Determine board signature from question types
  let boardSignature = 'SIMPLE_RECALL_NCERT'; // Default
  if (questionTypeProfile.diagram_based_mcq >= 10) {
    boardSignature = 'DIAGRAM_FORMULA_MCQ';
  } else if (questionTypeProfile.match_following_mcq >= 15) {
    boardSignature = 'MATCH_RECALL_MCQ';
  } else if (questionTypeProfile.calculation_mcq >= 10) {
    boardSignature = 'NUMERICAL_CALCULATION';
  }

  console.log(`   ✅ Board Signature (derived): ${boardSignature}`);

  // STEP 4.2: Insert Calibration Record
  console.log('\n📥 STEP 4.2: Insert Calibration Record\n');

  const calibrationData = {
    exam_type: 'NEET',
    subject: subject,
    target_year: 2026,
    rigor_velocity: rigorVelocity,
    board_signature: boardSignature,
    intent_signature: {
      idsTarget: idsTarget,
      synthesis: engineConfig.synthesis_weight || 0.3,
      trapDensity: engineConfig.trap_weight || 0.3,
      linguisticLoad: engineConfig.intent_learning_rate || 0.25,
      speedRequirement: 0.90,
      difficultyEasyPct: difficultyEasy,
      difficultyModeratePct: difficultyModerate,
      difficultyHardPct: difficultyHard,
      difficultyProfile: {
        easy: difficultyEasy,
        moderate: difficultyModerate,
        hard: difficultyHard
      },      questionTypeProfile: questionTypeProfile
    },
    calibration_directives: [
      `Calibrated from ${questionTypeAnalysis.years_analyzed} (${questionTypeAnalysis.total_questions} questions)`,
      `Target IDS: ${idsTarget}`,
      `Rigor Velocity: ${rigorVelocity}`,
      `Difficulty: ${difficultyEasy}/${difficultyModerate}/${difficultyHard}`,
      `Question Type Profile: ${Object.entries(questionTypeProfile).filter(([, v]) => v > 5).map(([k, v]) => `${k}=${v}%`).join(', ')}`
    ]
  };

  console.log('   Upserting calibration data...');

  const { data, error } = await supabase
    .from('ai_universal_calibration')
    .upsert(calibrationData, {
      onConflict: 'exam_type,subject,target_year'
    })
    .select();

  if (error) {
    console.error('\n❌ Error inserting calibration:', error);
    process.exit(1);
  }

  console.log('   ✅ Calibration inserted successfully');

  // STEP 4.3: Verify Database Entry
  console.log('\n🔍 STEP 4.3: Verify Database Entry\n');

  const { data: verification, error: verifyError } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', 'NEET')
    .eq('subject', subject)
    .eq('target_year', 2026)
    .single();

  if (verifyError || !verification) {
    console.error('\n❌ Verification failed:', verifyError);
    process.exit(1);
  }

  console.log(`   Exam Type: ${verification.exam_type}`);
  console.log(`   Subject: ${verification.subject}`);
  console.log(`   Target Year: ${verification.target_year}`);
  console.log(`   Rigor Velocity: ${verification.rigor_velocity}`);
  console.log(`   IDS Target: ${verification.intent_signature?.idsTarget}`);
  console.log(`   Board Signature: ${verification.board_signature}`);
  console.log(`   Difficulty: ${verification.intent_signature?.difficultyEasyPct}/${verification.intent_signature?.difficultyModeratePct}/${verification.intent_signature?.difficultyHardPct}`);

  if (verification.intent_signature?.questionTypeProfile) {
    console.log('\n   Question Type Profile:');
    Object.entries(verification.intent_signature.questionTypeProfile)
      .filter(([, pct]) => pct > 0)
      .forEach(([type, pct]) => {
        console.log(`     ${type.padEnd(25)}: ${pct}%`);
      });
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`✅ PHASE 4 COMPLETE: ${subject} calibration in database`);
  console.log('═'.repeat(70));
  console.log('\nNext: Phase 5 - Generator Setup\n');
}

// CLI execution
const subject = process.argv[2];

if (!subject) {
  console.error('\n❌ Missing subject argument');
  console.error('\nUsage: npx tsx scripts/oracle/phase4_neet_database_insert.ts <Subject>');
  console.error('\nValid subjects:');
  VALID_SUBJECTS.forEach(s => console.error(`  - ${s}`));
  console.error('');
  process.exit(1);
}

phase4DatabaseInsert(subject).catch(console.error);
