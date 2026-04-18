/**
 * KCET Biology Question Type Analysis (2022-2025)
 * REI v17 - Analyze actual KCET Biology papers to determine question type profile
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
  2022: '212ec1de-ca44-4953-a544-7c0259e5ec61', // KCET_2022_Biology [17:08] - System Scan
  2023: 'c21b7912-ad8d-4236-a8d6-a0b049e538cc', // 2023 KCET Biology [18:49] - System Scan
  2024: '8c789668-46f8-4a7d-800c-196ec5b2f73a', // KCET_2024_Biology - System Scan
  2025: '6f10ca9c-8431-466c-becf-1dc8ec8f6446'  // BIOLOGY_2025_kcet - System Scan
};

interface QuestionTypeAnalysis {
  year: number;
  totalQuestions: number;
  questionTypes: Record<string, number>;
  difficulty: { easy: number; moderate: number; hard: number };
  topicDistribution: Record<string, number>;
}

/**
 * Classify Biology question type based on text analysis
 */
function classifyBiologyQuestion(text: string, topic: string): string {
  const lowerText = text.toLowerCase();
  const lowerTopic = (topic || '').toLowerCase();

  // 1. Match-the-column: Pairing items, matching lists
  if (
    lowerText.match(/match.*column|match.*following|correctly matched/) ||
    lowerText.match(/column.*i.*column.*ii|list.*i.*list.*ii/)
  ) {
    return 'match_column';
  }

  // 2. Statement-based: True/false, assertion-reason, correct statements
  if (
    lowerText.match(/correct statement|incorrect statement|true|false|assertion.*reason/) ||
    lowerText.match(/which.*following.*correct|which.*following.*true/)
  ) {
    return 'statement_based';
  }

  // 3. Diagram-based: Structure identification, labeling, observation
  if (
    lowerText.match(/diagram|figure|structure|identify|label|observe/) ||
    lowerText.match(/shown.*figure|given.*structure|image/)
  ) {
    return 'diagram_based';
  }

  // 4. Application: Real-world scenarios, case studies, examples
  if (
    lowerText.match(/example of|used for|application|practical|disease|disorder/) ||
    lowerText.match(/role of|function of|significance/)
  ) {
    return 'application';
  }

  // 5. Comparative: Compare/contrast, differentiate
  if (
    lowerText.match(/difference between|distinguish|compare|contrast/) ||
    lowerText.match(/similar to|differs from|unlike/)
  ) {
    return 'comparative';
  }

  // 6. Reasoning/Mechanism: Explain why, process, mechanism
  if (
    lowerText.match(/why|how|explain|reason|process|mechanism/) ||
    lowerText.match(/occurs because|due to|result of/)
  ) {
    return 'reasoning';
  }

  // Default: Factual/Conceptual - definitions, facts, identification
  return 'factual_conceptual';
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
    const type = classifyBiologyQuestion(q.text || '', q.topic || '');
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
  console.log('\n📊 KCET BIOLOGY QUESTION TYPE ANALYSIS (2022-2025)');
  console.log('═'.repeat(70) + '\n');

  const yearlyAnalysis: QuestionTypeAnalysis[] = [];

  // Analyze each year
  for (const year of [2022, 2023, 2024, 2025]) {
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

  // Calculate 4-year average
  console.log('\n' + '='.repeat(70));
  console.log('\n📈 4-YEAR AGGREGATE ANALYSIS (2022-2025)\n');

  const totalQuestions = yearlyAnalysis.reduce((sum, y) => sum + y.totalQuestions, 0);
  const aggregateTypes: Record<string, number> = {};

  yearlyAnalysis.forEach(analysis => {
    Object.entries(analysis.questionTypes).forEach(([type, count]) => {
      aggregateTypes[type] = (aggregateTypes[type] || 0) + count;
    });
  });

  console.log(`Total Questions Analyzed: ${totalQuestions}\n`);
  console.log('Question Type Profile (4-year average):');

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

  console.log('\nDifficulty Profile (4-year average):');
  console.log(`  Easy:     ${Math.round((totalEasy / totalQuestions) * 100)}% (${totalEasy}/${totalQuestions})`);
  console.log(`  Moderate: ${Math.round((totalModerate / totalQuestions) * 100)}% (${totalModerate}/${totalQuestions})`);
  console.log(`  Hard:     ${Math.round((totalHard / totalQuestions) * 100)}% (${totalHard}/${totalQuestions})`);

  // Save results
  const resultsPath = 'docs/oracle/QUESTION_TYPE_ANALYSIS_2022_2025_BIOLOGY.json';
  fs.writeFileSync(resultsPath, JSON.stringify({
    subject: 'Biology',
    exam: 'KCET',
    years: '2022-2025',
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
  console.log('\n🎯 REI V17 BIOLOGY QUESTION TYPE PROFILE:');
  console.log('─'.repeat(70));
  sortedTypes.slice(0, 6).forEach(({ type, percentage }) => {
    console.log(`  "${type}": ${percentage}`);
  });
  console.log('\n✅ Ready to integrate into REI v17 system!\n');
}

runAnalysis().catch(console.error);
