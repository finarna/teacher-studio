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

async function verifyQuestionTypeDistribution() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 7 STEP 7.4: QUESTION TYPE DISTRIBUTION (CRITICAL - NEET)   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  const scanId = '2adcb415-9410-4468-b8f3-32206e5ae7cb';

  // ========================================================================
  // STEP 1: Load Historical Question Type Analysis
  // ========================================================================
  console.log('📊 STEP 1: Loading Historical Question Type Analysis\n');

  const analysisPath = path.join(
    process.cwd(),
    'docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_PHYSICS.json'
  );

  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));

  console.log(`   Subject: ${analysis.subject}`);
  console.log(`   Exam: ${analysis.exam}`);
  console.log(`   Years Analyzed: ${analysis.years_analyzed}`);
  console.log(`   Total Historical Questions: ${analysis.total_questions}`);
  console.log(`   Answer Format: ${analysis.answer_format}`);

  // ========================================================================
  // STEP 2: Calculate Expected Distribution for 45 Questions
  // ========================================================================
  console.log('\n📐 STEP 2: Expected Distribution for 45 Questions\n');

  const questionTypeDistribution = analysis.question_type_distribution;
  const expectedCounts: Record<string, number> = {};
  let expectedTotal = 0;

  console.log('   Question Type Targets (45 questions):');
  Object.entries(questionTypeDistribution).forEach(([type, percentage]) => {
    const pct = percentage as number;
    if (pct > 0) {
      const count = Math.round(45 * pct / 100);
      expectedCounts[type] = count;
      expectedTotal += count;
      console.log(`      ${type.padEnd(30)}: ${count.toString().padStart(2)} questions (${pct}%)`);
    }
  });

  console.log(`\n   Total Expected: ${expectedTotal} questions`);

  // ========================================================================
  // STEP 3: Query Generated Questions
  // ========================================================================
  console.log('\n📝 STEP 3: Querying Generated Questions\n');

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, metadata')
    .eq('scan_id', scanId);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`   Total Questions Retrieved: ${questions?.length || 0}`);

  // ========================================================================
  // STEP 4: Analyze Actual Question Types
  // ========================================================================
  console.log('\n🔍 STEP 4: Analyzing Actual Question Types\n');

  const actualCounts: Record<string, number> = {};
  let unclassified = 0;

  // Initialize all types
  Object.keys(expectedCounts).forEach(type => {
    actualCounts[type] = 0;
  });

  questions?.forEach(q => {
    // Try to get question type from metadata
    const metadata = q.metadata as any;
    let qType = metadata?.questionType;

    // If not in metadata, try to classify by text analysis
    if (!qType && q.text) {
      qType = classifyQuestionType(q.text);
    }

    if (qType && actualCounts[qType] !== undefined) {
      actualCounts[qType]++;
    } else if (qType) {
      // Unknown type
      actualCounts[qType] = (actualCounts[qType] || 0) + 1;
    } else {
      unclassified++;
    }
  });

  console.log('   Actual Question Type Distribution:');
  Object.entries(actualCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      const expected = expectedCounts[type] || 0;
      const diff = count - expected;
      const status = Math.abs(diff) <= 1 ? '✅' : (Math.abs(diff) <= 2 ? '⚠️' : '❌');

      console.log(`      ${type.padEnd(30)}: ${count.toString().padStart(2)}/${expected.toString().padStart(2)} (${diff >= 0 ? '+' : ''}${diff}) ${status}`);
    });

  if (unclassified > 0) {
    console.log(`      unclassified: ${unclassified}`);
  }

  // ========================================================================
  // STEP 5: Calculate Accuracy Metrics
  // ========================================================================
  console.log('\n📊 STEP 5: Accuracy Metrics\n');

  let totalDiff = 0;
  let perfectMatches = 0;

  Object.keys(expectedCounts).forEach(type => {
    const expected = expectedCounts[type];
    const actual = actualCounts[type] || 0;
    const diff = Math.abs(actual - expected);

    totalDiff += diff;
    if (diff === 0) perfectMatches++;
  });

  const totalExpected = Object.values(expectedCounts).reduce((sum, count) => sum + count, 0);
  const accuracy = ((1 - (totalDiff / totalExpected)) * 100).toFixed(1);

  console.log(`   Overall Type Accuracy: ${accuracy}%`);
  console.log(`   Perfect Matches: ${perfectMatches}/${Object.keys(expectedCounts).length} types`);
  console.log(`   Total Deviation: ${totalDiff} questions`);
  console.log(`   Unclassified: ${unclassified} questions`);

  // ========================================================================
  // STEP 6: Quality Verdict
  // ========================================================================
  console.log('\n🎯 STEP 6: Quality Verdict\n');

  let status = '';
  if (parseFloat(accuracy) >= 85 && perfectMatches >= 2) {
    status = '✅ EXCELLENT';
  } else if (parseFloat(accuracy) >= 70 && perfectMatches >= 1) {
    status = '✅ GOOD';
  } else if (parseFloat(accuracy) >= 50) {
    status = '⚠️  ACCEPTABLE';
  } else {
    status = '❌ NEEDS IMPROVEMENT';
  }

  console.log(`   Question Type Distribution: ${status}`);

  if (status.includes('✅')) {
    console.log('   Status: PASS - Question types match historical distribution');
  } else if (status.includes('⚠️')) {
    console.log('   Status: PARTIAL - Some deviation from targets');
  } else {
    console.log('   Status: FAIL - Significant deviation, consider regeneration');
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║           QUESTION TYPE VERIFICATION SUMMARY                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log(`   Subject: NEET Physics`);
  console.log(`   Total Questions: ${questions?.length || 0}`);
  console.log(`   Type Accuracy: ${accuracy}%`);
  console.log(`   Perfect Matches: ${perfectMatches}/${Object.keys(expectedCounts).length}`);
  console.log(`   Final Status: ${status}`);

  console.log('\n   Phase 7 Step 7.4 COMPLETE\n');
}

// Helper function to classify question type by text analysis
function classifyQuestionType(text: string): string {
  const lowerText = text.toLowerCase();

  // Assertion-Reason pattern
  if (lowerText.includes('assertion') && lowerText.includes('reason')) {
    return 'assertion_reason_mcq';
  }

  // Match the following pattern
  if (lowerText.includes('match') || lowerText.includes('column i') && lowerText.includes('column ii')) {
    return 'match_following_mcq';
  }

  // Statement-based pattern
  if (lowerText.includes('statement') || lowerText.includes('which of the following statements')) {
    return 'statement_based_mcq';
  }

  // Diagram-based (look for diagram references or figure mentions)
  if (lowerText.includes('diagram') || lowerText.includes('figure') || lowerText.includes('shown in') || lowerText.includes('graph')) {
    return 'diagram_based_mcq';
  }

  // Calculation (look for numerical problems)
  if (lowerText.includes('calculate') || lowerText.includes('find the') || lowerText.includes('what is the value')) {
    return 'calculation_mcq';
  }

  // Definitional
  if (lowerText.includes('define') || lowerText.includes('definition') || lowerText.includes('is defined as')) {
    return 'definitional_mcq';
  }

  // Default: simple recall
  return 'simple_recall_mcq';
}

verifyQuestionTypeDistribution().catch(console.error);
