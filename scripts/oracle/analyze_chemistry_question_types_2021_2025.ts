/**
 * KCET Chemistry Question Type Analysis (2021-2025)
 * REI v17 - Analyze actual KCET Chemistry papers to determine question type profile
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OFFICIAL_SCANS: Record<number, string> = {
  2021: '5bfcb13b-9ed6-48c9-ad2f-ee995d9d9a72',
  2022: '6c77a7a3-fd6b-40ef-9f42-f092905bcd5d',
  2023: '709486c9-317a-4fd0-8921-e8f123595648',
  2024: 'ed2ba125-4215-4a12-a148-97bc52a1cee3',
  2025: '61b7d6a9-d68d-4bb3-9f75-a481d59226d0'
};

interface QuestionTypeAnalysis {
  year: number;
  totalQuestions: number;
  questionTypes: Record<string, number>;
  difficulty: { easy: number; moderate: number; hard: number };
  topicDistribution: Record<string, number>;
}

/**
 * Classify Chemistry question type based on text analysis
 */
function classifyChemistryQuestion(text: string, topic: string): string {
  const lowerText = text.toLowerCase();
  const lowerTopic = (topic || '').toLowerCase();

  // 1. Reaction-based: Chemical equations, reactions, products
  if (
    lowerText.match(/reaction|equation|balance|product|reactant|yield|when.*react|gives|forms/) ||
    lowerText.match(/synthesize|preparation|formed from/)
  ) {
    return 'reaction_based';
  }

  // 2. Property-based: Characteristics, trends, comparisons
  if (
    lowerText.match(/property|characteristic|trend|compare|order of|highest|lowest|which.*following/) ||
    lowerText.match(/correct|incorrect|true|false|statement/) ||
    lowerText.match(/increases|decreases|greater|lesser|more.*than|less.*than/)
  ) {
    return 'property_based';
  }

  // 3. Structure-based: Bonding, geometry, hybridization, VSEPR
  if (
    lowerText.match(/structure|bond|geometry|hybridization|shape|vsepr|orbital|electron.*configuration/) ||
    lowerText.match(/lewis|molecular.*shape|bond.*angle|sp3|sp2|sp/)
  ) {
    return 'structure_based';
  }

  // 4. Calculation: Numerical problems with units
  if (
    lowerText.match(/calculate|compute|determine|find.*value|molarity|mass|volume|pressure/) ||
    lowerText.match(/\d+\s*(g|kg|l|ml|mol|m\/s|°c|k|atm|pa|mm)/) ||
    lowerText.match(/concentration|dilution|titration/)
  ) {
    return 'calculation';
  }

  // 5. Nomenclature/IUPAC: Naming, formulas
  if (
    lowerText.match(/iupac|name.*compound|formula.*compound|molecular.*formula/) ||
    lowerText.match(/nomenclature|systematic.*name/)
  ) {
    return 'nomenclature';
  }

  // 6. Application: Industrial, real-world, uses
  if (
    lowerText.match(/application|used.*in|industrial|manufacture|process|real.*world/) ||
    lowerText.match(/everyday|practical|commercial/)
  ) {
    return 'application';
  }

  // 7. Mechanism: Reaction mechanisms, intermediates
  if (
    lowerText.match(/mechanism|intermediate|carbocation|carbanion|nucleophile|electrophile/) ||
    lowerText.match(/sn1|sn2|e1|e2|addition|substitution|elimination/)
  ) {
    return 'mechanism';
  }

  // Default: Theory/Conceptual
  return 'theory_conceptual';
}

async function analyzeYear(year: number): Promise<QuestionTypeAnalysis> {
  const scanId = OFFICIAL_SCANS[year];

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('scan_id', scanId);

  if (!questions || questions.length === 0) {
    throw new Error(`No questions found for year ${year}`);
  }

  // Analyze question types
  const questionTypes: Record<string, number> = {};
  questions.forEach(q => {
    const type = classifyChemistryQuestion(q.text || '', q.topic || '');
    questionTypes[type] = (questionTypes[type] || 0) + 1;
  });

  // Calculate difficulty distribution
  const easy = questions.filter(q => q.difficulty === 'Easy').length;
  const moderate = questions.filter(q => q.difficulty === 'Moderate').length;
  const hard = questions.filter(q => q.difficulty === 'Hard').length;

  // Topic distribution
  const topicDistribution: Record<string, number> = {};
  questions.forEach(q => {
    if (q.topic) {
      topicDistribution[q.topic] = (topicDistribution[q.topic] || 0) + 1;
    }
  });

  return {
    year,
    totalQuestions: questions.length,
    questionTypes,
    difficulty: { easy, moderate, hard },
    topicDistribution
  };
}

async function runAnalysis() {
  console.log('\n📊 KCET CHEMISTRY QUESTION TYPE ANALYSIS (2021-2025)');
  console.log('═'.repeat(70) + '\n');

  const yearlyAnalysis: QuestionTypeAnalysis[] = [];

  // Analyze each year
  for (const year of [2021, 2022, 2023, 2024, 2025]) {
    console.log(`\n📅 Analyzing Year ${year}...`);
    const analysis = await analyzeYear(year);
    yearlyAnalysis.push(analysis);

    console.log(`   Total Questions: ${analysis.totalQuestions}`);
    console.log(`   Question Types:`);
    Object.entries(analysis.questionTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const pct = ((count / analysis.totalQuestions) * 100).toFixed(1);
        console.log(`      ${type}: ${count} (${pct}%)`);
      });
    console.log(`   Difficulty: E:${analysis.difficulty.easy} M:${analysis.difficulty.moderate} H:${analysis.difficulty.hard}`);
  }

  // Calculate 5-year average
  console.log('\n' + '='.repeat(70));
  console.log('\n📈 5-YEAR AGGREGATE ANALYSIS (2021-2025)\n');

  const totalQuestions = yearlyAnalysis.reduce((sum, y) => sum + y.totalQuestions, 0);
  const aggregateTypes: Record<string, number> = {};

  yearlyAnalysis.forEach(analysis => {
    Object.entries(analysis.questionTypes).forEach(([type, count]) => {
      aggregateTypes[type] = (aggregateTypes[type] || 0) + count;
    });
  });

  console.log(`Total Questions Analyzed: ${totalQuestions}\n`);
  console.log('Question Type Profile (5-year average):');

  const sortedTypes = Object.entries(aggregateTypes)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / totalQuestions) * 100)
    }));

  sortedTypes.forEach(({ type, count, percentage }) => {
    const bar = '█'.repeat(Math.floor(percentage / 2));
    console.log(`  ${type.padEnd(25)} ${percentage}% ${bar} (${count}/${totalQuestions})`);
  });

  // Difficulty analysis
  const totalEasy = yearlyAnalysis.reduce((sum, y) => sum + y.difficulty.easy, 0);
  const totalModerate = yearlyAnalysis.reduce((sum, y) => sum + y.difficulty.moderate, 0);
  const totalHard = yearlyAnalysis.reduce((sum, y) => sum + y.difficulty.hard, 0);

  console.log('\nDifficulty Profile (5-year average):');
  console.log(`  Easy:     ${Math.round((totalEasy / totalQuestions) * 100)}% (${totalEasy}/${totalQuestions})`);
  console.log(`  Moderate: ${Math.round((totalModerate / totalQuestions) * 100)}% (${totalModerate}/${totalQuestions})`);
  console.log(`  Hard:     ${Math.round((totalHard / totalQuestions) * 100)}% (${totalHard}/${totalQuestions})`);

  // Save results
  const resultsPath = 'docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_CHEMISTRY.json';
  fs.writeFileSync(resultsPath, JSON.stringify({
    subject: 'Chemistry',
    exam: 'KCET',
    years: '2021-2025',
    totalQuestions,
    questionTypeProfile: Object.fromEntries(
      sortedTypes.map(({ type, percentage }) => [type, percentage])
    ),
    difficultyProfile: {
      easy: Math.round((totalEasy / totalQuestions) * 100),
      moderate: Math.round((totalModerate / totalQuestions) * 100),
      hard: Math.round((totalHard / totalQuestions) * 100)
    },
    yearlyBreakdown: yearlyAnalysis,
    analysisDate: new Date().toISOString()
  }, null, 2));

  console.log(`\n✅ Results saved to: ${resultsPath}`);

  console.log('\n' + '='.repeat(70));
  console.log('\n🎯 REI V17 CHEMISTRY QUESTION TYPE PROFILE:');
  console.log('─'.repeat(70));
  sortedTypes.slice(0, 6).forEach(({ type, percentage }) => {
    console.log(`  "${type}": ${percentage}`);
  });
  console.log('\n✅ Ready to integrate into REI v17 system!\n');
}

runAnalysis().catch(console.error);
