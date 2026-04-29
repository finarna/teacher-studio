/**
 * NEET REPEATABLE WORKFLOW - PHASE 5 & 6: GENERATOR SETUP & FLAGSHIP GENERATION
 *
 * Usage: npx tsx scripts/oracle/phase_generate_flagship_neet.ts <Subject>
 * Example: npx tsx scripts/oracle/phase_generate_flagship_neet.ts Physics
 *
 * Workflow Mapping:
 * - Phase 5 Step 5.1: Check generator prerequisites
 * - Phase 5 Step 5.2: Customize generator with calibration data
 * - Phase 5 Step 5.3: Test generator (dry run)
 * - Phase 6 Step 6.1: Run flagship generator (actual generation)
 *
 * Prerequisites:
 * - Phase 4 must be complete (calibration in database)
 */

import { createClient } from '@supabase/supabase-js';
import { createCustomTest } from '../../api/learningJourneyEndpoints.js';
import { getForecastedCalibration } from '../../lib/reiEvolutionEngine';
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

// NEET 2026 Format: 45 questions per subject (Section A: 35 + Section B: 10 of 15)
const NEET_QUESTIONS_PER_SET = 45;

function normalizeMix(mix: { easy: number; moderate: number; hard: number }) {
    const total = (mix.easy || 0) + (mix.moderate || 0) + (mix.hard || 0);
    if (total === 100) return mix;
    if (total === 0) return { easy: 30, moderate: 50, hard: 20 };
    const factor = 100 / total;
    return {
        easy: Math.round(mix.easy * factor),
        moderate: Math.round(mix.moderate * factor),
        hard: 100 - Math.round(mix.easy * factor) - Math.round(mix.moderate * factor)
    };
}

async function phase5NEETGenerator(subject: string, dryRun: boolean = true) {
  const exam = 'NEET';

  console.log(`\n🧪 PHASE ${dryRun ? '5' : '6'}: ${dryRun ? 'GENERATOR SETUP (DRY RUN)' : 'FLAGSHIP GENERATION'} - NEET ${subject.toUpperCase()}`);
  console.log('═'.repeat(70));

  // Validate subject
  if (!VALID_SUBJECTS.includes(subject)) {
    console.error(`\n❌ Invalid subject: ${subject}`);
    console.error(`   Valid subjects: ${VALID_SUBJECTS.join(', ')}\n`);
    process.exit(1);
  }

  // STEP 5.1: Check Prerequisites
  console.log('\n📋 STEP 5.1: Check Prerequisites\n');

  // Check Phase 4 (database calibration)
  const { data: calibrationCheck, error: calibrationError } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', exam)
    .eq('subject', subject)
    .eq('target_year', 2026)
    .single();

  if (calibrationError || !calibrationCheck) {
    console.error(`❌ No calibration found for NEET ${subject}`);
    console.error(`\n   Phase 4 (Database Configuration) must be completed first`);
    console.error(`   Run: npx tsx scripts/oracle/phase4_neet_database_insert.ts ${subject}\n`);
    process.exit(1);
  }

  console.log(`   ✅ Phase 4 complete: Calibration found in database`);
  console.log(`   ✅ IDS Target: ${calibrationCheck.intent_signature?.idsTarget}`);
  console.log(`   ✅ Difficulty: ${calibrationCheck.intent_signature?.difficultyEasyPct}/${calibrationCheck.intent_signature?.difficultyModeratePct}/${calibrationCheck.intent_signature?.difficultyHardPct}`);

  // Check identity bank exists
  const identityPath = path.join(
    __dirname,
    `../../lib/oracle/identities/neet_${subject.toLowerCase()}.json`
  );

  if (!fs.existsSync(identityPath)) {
    console.error(`\n❌ Identity bank not found: ${identityPath}\n`);
    process.exit(1);
  }

  const identityBank = JSON.parse(fs.readFileSync(identityPath, 'utf-8'));
  console.log(`   ✅ Identity bank: ${identityBank.identities.length} identities`);

  // Check question type analysis exists
  const questionTypeAnalysisPath = path.join(
    __dirname,
    `../../docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_${subject.toUpperCase()}.json`
  );

  if (!fs.existsSync(questionTypeAnalysisPath)) {
    console.error(`\n❌ Question type analysis not found: ${questionTypeAnalysisPath}\n`);
    process.exit(1);
  }

  const questionTypeAnalysis = JSON.parse(fs.readFileSync(questionTypeAnalysisPath, 'utf-8'));
  console.log(`   ✅ Question type analysis: ${questionTypeAnalysis.total_questions} questions analyzed`);

  // STEP 5.2: Customize Generator with Calibration Data
  console.log('\n📊 STEP 5.2: Load Calibration Data from Database\n');

  const forecast = await getForecastedCalibration(exam, subject);
  if (!forecast.idsTarget) {
    console.error(`\n❌ Could not load calibration forecast for NEET ${subject}\n`);
    process.exit(1);
  }

  console.log(`   Forecast IDS Target: ${forecast.idsTarget}`);
  console.log(`   Forecast Rigor Velocity: ${forecast.rigorVelocity}`);
  console.log(`   Difficulty Mix: ${JSON.stringify(forecast.difficultyProfile)}`);
  console.log(`   Board Signature: ${forecast.boardSignature}`);

  // Get high-yield identities
  const sortedIdentities = [...identityBank.identities].sort((a: any, b: any) =>
    b.empiricalFrequency.avgPerYear - a.empiricalFrequency.avgPerYear
  );
  const highYieldIdentities = sortedIdentities.slice(0, 10).map((i: any) => i.id);

  console.log(`\n   🎯 High-yield identities (top 10):`);
  sortedIdentities.slice(0, 5).forEach((i: any) => {
    console.log(`      ${i.id}: ${i.name} (${i.empiricalFrequency.avgPerYear} Q/year)`);
  });

  // Calculate question type counts
  const questionTypeDistribution = questionTypeAnalysis.question_type_distribution;
  const questionTypeCounts: Record<string, number> = {};

  for (const [qType, percentage] of Object.entries(questionTypeDistribution)) {
    if ((percentage as number) > 0) {
      questionTypeCounts[qType] = Math.round(NEET_QUESTIONS_PER_SET * (percentage as number) / 100);
    }
  }

  console.log(`\n   📋 Question Type Distribution (for ${NEET_QUESTIONS_PER_SET} questions):`);
  Object.entries(questionTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([qType, count]) => {
      const pct = questionTypeDistribution[qType as keyof typeof questionTypeDistribution];
      console.log(`      ${qType.padEnd(25)}: ${count.toString().padStart(2)} questions (${pct}%)`);
    });

  // Build directives
  const directives = [
    `🎯 CRITICAL: NEET ${subject.toUpperCase()} QUESTION TYPE DISTRIBUTION`,
    '',
    '⚠️ IMPORTANT: All questions use MCQ answer format (4 options, single correct)',
    '⚠️ However, QUESTION TYPES within MCQ format must match historical distribution:',
    ''
  ];

  // Add question type directives
  Object.entries(questionTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([qType, count]) => {
      if (count > 0) {
        directives.push(`GENERATE EXACTLY ${count} ${qType.toUpperCase()} questions`);
      }
    });

  directives.push('');
  directives.push('📋 QUESTION TYPE GUIDELINES:');
  directives.push('');
  directives.push('• SIMPLE_RECALL_MCQ:');
  directives.push('  Standard 4-option MCQ testing direct recall');
  directives.push('');
  directives.push('• DIAGRAM_BASED_MCQ:');
  directives.push('  Questions with diagrams, graphs, circuits, ray diagrams');
  directives.push('');
  directives.push('• MATCH_FOLLOWING_MCQ:');
  directives.push('  Column I (A,B,C,D) and Column II (p,q,r,s)');
  directives.push('  Options: (a) A-p,B-q,C-r,D-s (b) A-q,B-p,C-s,D-r ...');
  directives.push('');
  directives.push('• CALCULATION_MCQ:');
  directives.push('  Numerical problems requiring calculations');
  directives.push('');
  directives.push('• ASSERTION_REASON_MCQ:');
  directives.push('  Assertion (A): [statement]. Reason (R): [statement].');
  directives.push('  Options: (a) Both true, R explains A (b) Both true, R doesn\'t explain A');
  directives.push('           (c) A true, R false (d) A false, R true');
  directives.push('');
  directives.push(`Target IDS: ${forecast.idsTarget}`);
  directives.push('');
  directives.push('🎯 HIGH-YIELD TOPICS:');

  sortedIdentities.slice(0, 5).forEach((i: any) => {
    directives.push(`   • ${i.name}: ${i.empiricalFrequency.avgPerYear} Q/year`);
  });

  directives.push('');
  directives.push('📚 NCERT ALIGNMENT:');
  directives.push('   ALL questions must be traceable to NCERT');
  directives.push(`   Board Signature: ${forecast.boardSignature}`);

  // Merge database directives
  if (forecast.directives && forecast.directives.length > 0) {
    directives.push('');
    directives.push('📊 CALIBRATION INSIGHTS:');
    forecast.directives.forEach((d: string) => directives.push(`   ${d}`));
  }

  console.log(`\n   📝 Total directives: ${directives.length}`);

  // STEP 5.3 / 6.1: Generate (Dry Run or Actual)
  if (dryRun) {
    console.log('\n' + '═'.repeat(70));
    console.log('✅ PHASE 5 COMPLETE: Generator configured and validated');
    console.log('═'.repeat(70));
    console.log('\n📋 Configuration Summary:');
    console.log(`   Subject: ${subject}`);
    console.log(`   Exam: ${exam}`);
    console.log(`   Questions per set: ${NEET_QUESTIONS_PER_SET}`);
    console.log(`   IDS Target: ${forecast.idsTarget}`);
    console.log(`   Difficulty: ${JSON.stringify(normalizeMix(forecast.difficultyProfile))}`);
    console.log(`   High-yield identities: ${highYieldIdentities.length}`);
    console.log(`   Directives: ${directives.length}`);
    console.log('\nNext: Run with --generate flag to create flagship papers');
    console.log(`   npx tsx scripts/oracle/phase_generate_flagship_neet.ts ${subject} --generate\n`);
    return;
  }

  // PHASE 6: Actual Generation
  console.log('\n' + '═'.repeat(70));
  console.log('📡 PHASE 6: FLAGSHIP GENERATION');
  console.log('═'.repeat(70));

  const generatePayload = (setName: string) => {
    // SET A/B Strategic Differentiation (Approach 3: Hybrid)
    // Maintains same IDS, Rigor, Difficulty - varies question style emphasis
    const setSpecificDirectives = setName === 'SET_A' ? [
      '',
      '🎯 SET A STRATEGIC EMPHASIS: FORMULA FOR CALCULATION',
      '   ⚡ COMPUTATIONAL MASTERY & NUMERICAL PROBLEM-SOLVING',
      '',
      '   FOUNDATIONAL APPROACH:',
      '   • Emphasize quantitative problem-solving',
      '   • Include multi-step calculations where applicable',
      '   • Focus on numerical accuracy and precision',
      '   • Derive relationships using mathematical expressions',
      '   • Apply formulas to solve real-world numerical problems',
      '   • Test mathematical reasoning and computational skills',
      '',
      '   SPECIFIC STRATEGIC FOCUS: Use formulas for CALCULATION (plug numbers, compute answer)',
      '   • Provide specific numerical values with units (e.g., m=5kg, v=10m/s)',
      '   • Require students to substitute values into formulas',
      '   • Demand multi-step calculations with intermediate results',
      '   • Test ability to manipulate equations algebraically before substitution',
      '   • Focus on precision: "Calculate to 2 decimal places"',
      '   • Include unit conversions (cm to m, g to kg, etc.)',
      '   • Emphasize getting the CORRECT NUMERICAL ANSWER',
      '',
      '   QUESTION STYLE EXAMPLES:',
      '   • "A particle of mass 0.5 kg moving at 20 m/s... Calculate the final velocity."',
      '   • "Given R₁=10Ω, R₂=20Ω in parallel, find the equivalent resistance."',
      '   • "If refractive index μ=1.5 and radius R=30cm, calculate focal length."',
      '',
      '   GOAL: Test computational skills and numerical accuracy',
      ''
    ] : [
      '',
      '🎯 SET B STRATEGIC EMPHASIS: FORMULA FOR UNDERSTANDING',
      '   🧠 CONCEPTUAL RELATIONSHIPS & PHYSICAL MEANING',
      '',
      '   FOUNDATIONAL APPROACH:',
      '   • Prioritize questions testing deep conceptual understanding',
      '   • Emphasize qualitative reasoning and logical deduction',
      '   • Include real-world applications and practical contexts',
      '   • Focus on principle-based problem solving',
      '   • Test cause-and-effect relationships',
      '   • Analyze phenomena using fundamental concepts',
      '   • Develop intuitive understanding over rote calculation',
      '',
      '   SPECIFIC STRATEGIC FOCUS: Use formulas for UNDERSTANDING (test relationships, dependencies, physical meaning)',
      '   • Present formulas to test understanding of RELATIONSHIPS (not calculate)',
      '   • Ask "what happens when X increases" using formula dependencies',
      '   • Test cause-effect: "If X doubles, what happens to Y?"',
      '   • Focus on PROPORTIONALITY and DEPENDENCIES in equations',
      '   • Emphasize WHY formulas have certain form (physical reasoning)',
      '   • Test GRAPHICAL interpretation of formula relationships',
      '   • Ask about LIMITING CASES and special conditions',
      '',
      '   QUESTION STYLE EXAMPLES:',
      '   • "According to F=ma, if mass doubles while force stays constant, acceleration will..."',
      '   • "The formula P=V²/R shows that power is inversely proportional to resistance. Why?"',
      '   • "When frequency of light increases, using E=hf, what happens to photon energy?"',
      '   • "The relationship V∝1/r in Coulomb\'s law means that when distance doubles..."',
      '',
      '   GOAL: Test understanding of physical relationships encoded in formulas',
      ''
    ];

    return {
      testName: `NEET ${subject.toUpperCase()} 2026 PREDICTION: ${setName}`,
      subject: subject,
      examContext: exam,
      questionCount: NEET_QUESTIONS_PER_SET,
      difficultyMix: normalizeMix(forecast.difficultyProfile),
      strategyMode: 'predictive_mock',
      oracleMode: {
        enabled: true,
        idsTarget: forecast.idsTarget,
        rigorVelocity: forecast.rigorVelocity,
        intentSignature: forecast.intentSignature,
        directives: [
          ...directives,
          ...setSpecificDirectives,
          `TARGET_SET: ${setName}`,
          `HIGH_YIELD_FOCUS: ${highYieldIdentities.join(', ')}`
        ],
        boardSignature: forecast.boardSignature
      }
    };
  };

  const mockRes = {
    status: (code: number) => ({
      json: (data: any) => console.log(`\n📩 Response (${code}):`, JSON.stringify(data, null, 2))
    }),
    json: (data: any) => console.log(`\n📩 Success:`, JSON.stringify(data, null, 2)),
    headersSent: false
  };

  const adminUserId = "13282202-5251-4c94-b5ef-95c273378262";

  // Generate Set A
  console.log('\n📡 GENERATING SET A (Formula for CALCULATION)...\n');
  console.log('   ⚡ Strategic Focus: Computational mastery - plug numbers, compute answers');
  console.log('   📊 Calibration: IDS ' + forecast.idsTarget.toFixed(3) + ', Difficulty ' +
    `${forecast.difficultyProfile.easy}/${forecast.difficultyProfile.moderate}/${forecast.difficultyProfile.hard}`);
  console.log('   🎯 Approach: Numerical problem-solving with specific values');
  try {
    await createCustomTest({
      body: { userId: adminUserId, ...generatePayload('SET_A') }
    } as any, mockRes as any);
    console.log('✅ SET A generation requested');
  } catch (error) {
    console.error('❌ SET A failed:', error);
    throw error;
  }

  // Generate Set B
  console.log('\n📡 GENERATING SET B (Formula for UNDERSTANDING)...\n');
  console.log('   🧠 Strategic Focus: Conceptual relationships - test dependencies, physical meaning');
  console.log('   📊 Calibration: IDS ' + forecast.idsTarget.toFixed(3) + ', Difficulty ' +
    `${forecast.difficultyProfile.easy}/${forecast.difficultyProfile.moderate}/${forecast.difficultyProfile.hard}`);
  console.log('   🎯 Approach: Proportionality, cause-effect, "what happens when..."');
  try {
    await createCustomTest({
      body: { userId: adminUserId, ...generatePayload('SET_B') }
    } as any, mockRes as any);
    console.log('✅ SET B generation requested');
  } catch (error) {
    console.error('❌ SET B failed:', error);
    throw error;
  }

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 PHASE 6 COMPLETE: FLAGSHIP GENERATION INITIATED');
  console.log('═'.repeat(70));
  console.log(`\n   Total sets: 2 (SET_A + SET_B)`);
  console.log(`   Questions per set: ${NEET_QUESTIONS_PER_SET}`);
  console.log(`   Total questions: ${NEET_QUESTIONS_PER_SET * 2}`);
  console.log('\n📊 Strategic Differentiation (Approach 3: Hybrid):');
  console.log('   • SET A: Formula/Numerical emphasis (maintains same IDS/difficulty)');
  console.log('   • SET B: Conceptual/Qualitative emphasis (maintains same IDS/difficulty)');
  console.log('   • Both sets predict NEET 2026 with IDS ' + forecast.idsTarget.toFixed(3));
  console.log('   • Pedagogical variety through directive-based emphasis shift');
  console.log('\n✅ Async pipeline running in background...\n');
}

// CLI execution
const subject = process.argv[2];
const generateFlag = process.argv[3] === '--generate';

if (!subject) {
  console.error('\n❌ Missing subject argument');
  console.error('\nUsage:');
  console.error('  Phase 5 (Dry Run):  npx tsx scripts/oracle/phase_generate_flagship_neet.ts <Subject>');
  console.error('  Phase 6 (Generate): npx tsx scripts/oracle/phase_generate_flagship_neet.ts <Subject> --generate');
  console.error('\nValid subjects:');
  VALID_SUBJECTS.forEach(s => console.error(`  - ${s}`));
  console.error('');
  process.exit(1);
}

phase5NEETGenerator(subject, !generateFlag).catch(console.error);
