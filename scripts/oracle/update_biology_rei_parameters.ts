/**
 * Update Biology REI v17 Parameters in Database
 * Inserts calibrated parameters into ai_universal_calibration table
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateBiologyREIParameters() {
  console.log('\n🔄 Updating Biology REI v17 Parameters in Database');
  console.log('═'.repeat(60) + '\n');

  // Load question type analysis
  const questionTypeAnalysisPath = path.join(
    process.cwd(),
    'docs/oracle/QUESTION_TYPE_ANALYSIS_2022_2025_BIOLOGY.json'
  );
  const questionTypeData = JSON.parse(fs.readFileSync(questionTypeAnalysisPath, 'utf8'));

  // Load calibration report for final parameters
  const calibrationReportPath = path.join(
    process.cwd(),
    'docs/oracle/calibration/KCET_BIOLOGY_CALIBRATION_REPORT_2022_2025.md'
  );

  console.log('📊 Biology Question Type Profile:');
  Object.entries(questionTypeData.questionTypeProfile).forEach(([type, pct]) => {
    console.log(`   ${type}: ${pct}%`);
  });

  console.log('\n📈 Difficulty Profile:');
  console.log(`   Easy: ${questionTypeData.difficultyProfile.easy}%`);
  console.log(`   Moderate: ${questionTypeData.difficultyProfile.moderate}%`);
  console.log(`   Hard: ${questionTypeData.difficultyProfile.hard}%`);

  // Final calibrated parameters from Biology calibration
  const reiParameters = {
    exam_type: 'KCET',
    subject: 'Biology',
    target_year: 2026,

    // From calibration report
    rigor_velocity: 1.622, // rigor_drift_multiplier

    // Board signature - Biology pattern
    board_signature: 'FACTUAL_DIAGRAM_APPLICATION',

    // Intent signature with question type profile and difficulty
    intent_signature: {
      synthesis: 0.258,
      trapDensity: 0.25, // Lower for Biology (more straightforward)
      linguisticLoad: 0.30, // Higher for Biology (more text-heavy)
      speedRequirement: 0.80, // Lower for Biology (60 mins for 60 questions)
      questionTypeProfile: questionTypeData.questionTypeProfile,
      // Include difficulty profile in intent_signature
      difficultyProfile: questionTypeData.difficultyProfile,
      idsTarget: 0.724 // Average IDS from historical data
    },

    // Calibration directives
    calibration_directives: [
      '🧬 BIOLOGY-SPECIFIC DIRECTIVES:',
      `ENFORCE QUESTION TYPE DISTRIBUTION: factual_conceptual=${questionTypeData.questionTypeProfile.factual_conceptual}%, diagram_based=${questionTypeData.questionTypeProfile.diagram_based}%, match_column=${questionTypeData.questionTypeProfile.match_column}%, statement_based=${questionTypeData.questionTypeProfile.statement_based}%, reasoning=${questionTypeData.questionTypeProfile.reasoning}%, application=${questionTypeData.questionTypeProfile.application}%`,
      'FOCUS: Test conceptual understanding with factual recall, diagram interpretation, and application',
      'BIOLOGY TAXONOMY: Include questions across Living World, Cell Biology, Plant Physiology, Human Physiology, Genetics, Evolution, Ecology',
      'EMPHASIS: Molecular Basis of Inheritance (highest frequency topic)',
      'DIAGRAM REQUIREMENT: 11% questions must include diagrams, structures, or visual identification',
      'MATCH-THE-COLUMN: 8% questions should use matching format for correlations',
      'STATEMENT FORMAT: 8% questions use true/false or assertion-reason format',
      'DIFFICULTY MIX: Heavy easy bias (87%), minimal moderate (13%), avoid hard questions',
      'TOPIC BALANCE: Genetics, Reproduction, and Biotechnology are high-frequency topics',
      'AVOID: Excessive calculations, pure memorization without conceptual understanding',
      'LANGUAGE: Clear, unambiguous terminology; avoid trick questions',
      'TIME ALLOCATION: 60 seconds per question average (60Q in 60 minutes)'
    ],

    // Additional metadata
    updated_at: new Date().toISOString()
  };

  console.log('\n💾 Inserting REI parameters into database...\n');

  // Check if record exists
  const { data: existing } = await supabase
    .from('ai_universal_calibration')
    .select('id')
    .eq('exam_type', 'KCET')
    .eq('subject', 'Biology')
    .eq('target_year', 2026)
    .single();

  if (existing) {
    console.log('⚠️  Record exists, updating...');
    const { error } = await supabase
      .from('ai_universal_calibration')
      .update(reiParameters)
      .eq('id', existing.id);

    if (error) {
      console.error('❌ Error updating:', error.message);
      process.exit(1);
    }
    console.log('✅ Biology REI parameters updated successfully!');
  } else {
    console.log('📝 Creating new record...');
    const { error } = await supabase
      .from('ai_universal_calibration')
      .insert([reiParameters]);

    if (error) {
      console.error('❌ Error inserting:', error.message);
      process.exit(1);
    }
    console.log('✅ Biology REI parameters inserted successfully!');
  }

  // Verify insertion
  const { data: verification } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', 'KCET')
    .eq('subject', 'Biology')
    .eq('target_year', 2026)
    .single();

  if (verification) {
    console.log('\n✅ Verification successful!');
    console.log(`   Subject: ${verification.subject}`);
    console.log(`   Exam: ${verification.exam_type}`);
    console.log(`   Target Year: ${verification.target_year}`);
    console.log(`   Rigor Velocity: ${verification.rigor_velocity}`);
    console.log(`   IDS Target: ${verification.ids_target}`);
    console.log(`   Board Signature: ${verification.board_signature}`);
    console.log(`   Match Rate: ${verification.match_rate_achieved}%`);
    console.log(`   Directives: ${verification.calibration_directives.length} items`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Biology REI v17 parameters ready for flagship generation!');
  console.log('═'.repeat(60) + '\n');
}

updateBiologyREIParameters().catch(console.error);
