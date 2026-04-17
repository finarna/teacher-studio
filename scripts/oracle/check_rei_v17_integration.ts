import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkIntegration() {
  console.log('\n🔍 REI v17 Integration Verification\n');
  console.log('='.repeat(60));

  // 1. Check database storage
  console.log('\n1️⃣ Checking ai_universal_calibration table...\n');

  const { data, error } = await supabase
    .from('ai_universal_calibration')
    .select('exam_context, subject, rigor_velocity, ids_target, intent_signature, created_at, updated_at')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .single();

  if (error) {
    console.log('   ❌ Error:', error.message);
    return;
  }

  if (!data) {
    console.log('   ⚠️ No calibration record found for KCET Math');
    return;
  }

  console.log('   ✅ Record Found:');
  console.log(`      Exam: ${data.exam_context} ${data.subject}`);
  console.log(`      IDS Target: ${data.ids_target}`);
  console.log(`      Rigor Velocity: ${data.rigor_velocity}`);
  console.log(`      Last Updated: ${data.updated_at}`);

  // Check intent signature
  console.log('\n   Intent Signature:');
  if (data.intent_signature) {
    const sig = data.intent_signature as any;
    console.log(`      Synthesis: ${sig.synthesis}`);
    console.log(`      Trap Density: ${sig.trapDensity}`);

    if (sig.difficultyProfile) {
      console.log(`      Difficulty Profile: E=${sig.difficultyProfile.easy}, M=${sig.difficultyProfile.moderate}, H=${sig.difficultyProfile.hard}`);
    }

    if (sig.questionTypeProfile) {
      console.log('\n   ✅ Question Type Profile (REI v17):');
      console.log(`      Property-Based: ${sig.questionTypeProfile.property_based}%`);
      console.log(`      Word Problems: ${sig.questionTypeProfile.word_problem}%`);
      console.log(`      Computational: ${sig.questionTypeProfile.computational}%`);
      console.log(`      Pattern Recognition: ${sig.questionTypeProfile.pattern_recognition}%`);
      console.log(`      Abstract: ${sig.questionTypeProfile.abstract}%`);
    } else {
      console.log('\n   ⚠️ Question Type Profile MISSING (REI v17 not integrated)');
    }
  }

  // 2. Check if analysis file exists
  console.log('\n2️⃣ Checking question type analysis file...\n');

  const fs = await import('fs');
  const path = await import('path');

  const analysisPath = path.join(process.cwd(), 'docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025.json');

  if (fs.existsSync(analysisPath)) {
    console.log('   ✅ Analysis file exists:', analysisPath);
    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    console.log(`      Total Papers Analyzed: ${analysis.yearsAnalyzed?.length || 0}`);
    console.log(`      Average Property-Based: ${analysis.averageDistribution?.property_based}%`);
  } else {
    console.log('   ⚠️ Analysis file NOT found');
  }

  // 3. Check if calibration scripts have integration
  console.log('\n3️⃣ Checking calibration script integration...\n');

  const calibScriptPath = path.join(process.cwd(), 'scripts/oracle/kcet_math_iterative_calibration_2021_2025.ts');

  if (fs.existsSync(calibScriptPath)) {
    const content = fs.readFileSync(calibScriptPath, 'utf8');

    const hasPhase15 = content.includes('Phase 1.5') || content.includes('analyzeQuestionTypes');
    const hasQuestionTypeProfile = content.includes('questionTypeProfile');
    const hasPhase7 = content.includes('Phase 7') && content.includes('ai_universal_calibration');

    console.log(`   ${hasPhase15 ? '✅' : '⚠️'} Phase 1.5 (Question Type Analysis): ${hasPhase15 ? 'Found' : 'Missing'}`);
    console.log(`   ${hasQuestionTypeProfile ? '✅' : '⚠️'} questionTypeProfile references: ${hasQuestionTypeProfile ? 'Found' : 'Missing'}`);
    console.log(`   ${hasPhase7 ? '✅' : '⚠️'} Phase 7 (Database Update): ${hasPhase7 ? 'Found' : 'Missing'}`);
  } else {
    console.log('   ⚠️ Calibration script NOT found');
  }

  // 4. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 INTEGRATION STATUS SUMMARY\n');

  const dbHasProfile = data?.intent_signature && (data.intent_signature as any).questionTypeProfile;
  const fileExists = fs.existsSync(analysisPath);

  if (dbHasProfile && fileExists) {
    console.log('✅ REI v17 FULLY INTEGRATED');
    console.log('   - Database has question type profile');
    console.log('   - Analysis file exists');
    console.log('   - Ready for Physics replication\n');
  } else {
    console.log('⚠️ REI v17 PARTIALLY INTEGRATED');
    console.log(`   - Database: ${dbHasProfile ? '✅' : '❌'} Question Type Profile`);
    console.log(`   - Files: ${fileExists ? '✅' : '❌'} Analysis JSON`);
    console.log('\n   ACTION REQUIRED: Complete integration before Physics\n');
  }
}

checkIntegration().catch(console.error);
