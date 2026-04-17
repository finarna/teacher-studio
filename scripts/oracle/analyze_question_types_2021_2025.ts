import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OFFICIAL_SCANS = {
  2021: 'eba5ed94-dde7-4171-80ff-aecbf0c969f7',
  2022: '0899f3e1-9980-48f4-9caa-91c65de53830',
  2023: 'eeed39eb-6ffe-4aaa-b752-b3139b311e6d',
  2024: '7019df69-f2e2-4464-afbb-cc56698cb8e9',
  2025: 'c202f81d-cc53-40b1-a473-8f621faac5ba'
};

type QuestionType = 'word_problem' | 'pattern_recognition' | 'computational' | 'property_based' | 'abstract';

interface QuestionTypeAnalysis {
  year: number;
  scanId: string;
  totalQuestions: number;
  distribution: Record<QuestionType, number>;
  distributionPct: Record<QuestionType, number>;
  examples: Record<QuestionType, string[]>;
}

/**
 * Categorize question based on text content analysis
 * Uses heuristics to identify question types from actual KCET patterns
 */
function categorizeQuestion(questionText: string, topic: string): QuestionType {
  const text = questionText.toLowerCase();

  // 1. WORD PROBLEM indicators
  const wordProblemKeywords = [
    'rectangle', 'square', 'perimeter', 'area', 'age', 'years old',
    'box', 'balls', 'red and black', 'coins', 'cards', 'drawn',
    'distance', 'speed', 'time', 'tank', 'filled', 'pipe',
    'money', 'rupees', 'cost', 'price', 'profit', 'loss',
    'shooter', 'target', 'hits', 'probability of',
    'students', 'committee', 'selected', 'arranged',
    'find the number of', 'how many', 'at least', 'at most'
  ];

  if (wordProblemKeywords.some(kw => text.includes(kw))) {
    return 'word_problem';
  }

  // 2. PATTERN RECOGNITION indicators
  const patternKeywords = [
    'sum of the series', 'σ', '∑', 'sum from',
    'c(n,r)', 'binomial coefficient', 'pascal',
    'the value of the sum', 'coefficient of',
    'expansion of', '(1+x)^n', 'general term',
    'sequence', 'arithmetic progression', 'geometric progression',
    'nth term', 'common difference', 'common ratio'
  ];

  if (patternKeywords.some(kw => text.includes(kw))) {
    return 'pattern_recognition';
  }

  // 3. COMPUTATIONAL indicators (direct formula application)
  const computationalKeywords = [
    'evaluate', 'calculate', 'find the value of',
    'sin(', 'cos(', 'tan(', 'log(', 'ln(',
    '∫', 'integral', 'derivative', 'd/dx',
    'limit', 'lim',
    'determinant', '|a|', 'inverse of'
  ];

  // Check if it's straightforward computation
  const hasCompKeyword = computationalKeywords.some(kw => text.includes(kw));
  const isShort = text.length < 150; // Short questions are usually computational

  if (hasCompKeyword && isShort) {
    return 'computational';
  }

  // 4. PROPERTY-BASED indicators (theorem, identity, property application)
  const propertyKeywords = [
    'property', 'theorem', 'identity', 'if and only if',
    'necessary and sufficient', 'rank', 'eigen',
    'symmetric', 'skew-symmetric', 'orthogonal',
    'inverse trigonometric', 'domain', 'range',
    'bijective', 'injective', 'surjective', 'onto', 'one-one',
    'equivalence relation', 'reflexive', 'symmetric', 'transitive',
    'greatest integer', 'modulus', 'signum',
    'mean value theorem', 'rolle', 'lagrange',
    'continuity', 'differentiability', 'monotonic'
  ];

  if (propertyKeywords.some(kw => text.includes(kw))) {
    return 'property_based';
  }

  // 5. ABSTRACT (proof-based, conceptual, no numbers)
  const hasNumbers = /\d/.test(text);
  const isConceptual = text.includes('which of the following') ||
                       text.includes('statement') ||
                       text.includes('assertion') ||
                       text.includes('reason');

  if (!hasNumbers && isConceptual) {
    return 'abstract';
  }

  // Default: computational if has formula/math, otherwise property-based
  if (hasCompKeyword) {
    return 'computational';
  }

  return 'property_based';
}

async function analyzeQuestionTypes(): Promise<void> {
  console.log('🔍 ANALYZING QUESTION TYPES FROM ACTUAL KCET PAPERS (2021-2025)\n');
  console.log('═'.repeat(80));

  const allYearResults: QuestionTypeAnalysis[] = [];

  for (const [year, scanId] of Object.entries(OFFICIAL_SCANS)) {
    console.log(`\n📊 Analyzing Year ${year}...`);

    const { data: questions, error } = await supabase
      .from('questions')
      .select('text, topic, difficulty')
      .eq('scan_id', scanId)
      .order('question_order');

    if (error || !questions) {
      console.error(`   ❌ Error fetching ${year}: ${error?.message}`);
      continue;
    }

    console.log(`   ✓ Loaded ${questions.length} questions`);

    const distribution: Record<QuestionType, number> = {
      word_problem: 0,
      pattern_recognition: 0,
      computational: 0,
      property_based: 0,
      abstract: 0
    };

    const examples: Record<QuestionType, string[]> = {
      word_problem: [],
      pattern_recognition: [],
      computational: [],
      property_based: [],
      abstract: []
    };

    questions.forEach(q => {
      if (!q.text) return;

      const type = categorizeQuestion(q.text, q.topic || '');
      distribution[type]++;

      // Store first 3 examples of each type
      if (examples[type].length < 3) {
        const shortText = q.text.substring(0, 100).replace(/\n/g, ' ');
        examples[type].push(shortText);
      }
    });

    const total = questions.length;
    const distributionPct: Record<QuestionType, number> = {
      word_problem: Math.round((distribution.word_problem / total) * 100),
      pattern_recognition: Math.round((distribution.pattern_recognition / total) * 100),
      computational: Math.round((distribution.computational / total) * 100),
      property_based: Math.round((distribution.property_based / total) * 100),
      abstract: Math.round((distribution.abstract / total) * 100)
    };

    const result: QuestionTypeAnalysis = {
      year: parseInt(year),
      scanId,
      totalQuestions: total,
      distribution,
      distributionPct,
      examples
    };

    allYearResults.push(result);

    console.log(`\n   Question Type Distribution:`);
    console.log(`     Word Problems:        ${distribution.word_problem} (${distributionPct.word_problem}%)`);
    console.log(`     Pattern Recognition:  ${distribution.pattern_recognition} (${distributionPct.pattern_recognition}%)`);
    console.log(`     Computational:        ${distribution.computational} (${distributionPct.computational}%)`);
    console.log(`     Property-Based:       ${distribution.property_based} (${distributionPct.property_based}%)`);
    console.log(`     Abstract:             ${distribution.abstract} (${distributionPct.abstract}%)`);
  }

  console.log('\n\n═'.repeat(80));
  console.log('📊 AGGREGATE ANALYSIS (2021-2025)\n');

  const avgDistribution: Record<QuestionType, number> = {
    word_problem: 0,
    pattern_recognition: 0,
    computational: 0,
    property_based: 0,
    abstract: 0
  };

  allYearResults.forEach(yr => {
    avgDistribution.word_problem += yr.distributionPct.word_problem;
    avgDistribution.pattern_recognition += yr.distributionPct.pattern_recognition;
    avgDistribution.computational += yr.distributionPct.computational;
    avgDistribution.property_based += yr.distributionPct.property_based;
    avgDistribution.abstract += yr.distributionPct.abstract;
  });

  const yearCount = allYearResults.length;
  Object.keys(avgDistribution).forEach(key => {
    avgDistribution[key as QuestionType] = Math.round(avgDistribution[key as QuestionType] / yearCount);
  });

  console.log('AVERAGE QUESTION TYPE DISTRIBUTION:');
  console.log(`  Word Problems:        ${avgDistribution.word_problem}%`);
  console.log(`  Pattern Recognition:  ${avgDistribution.pattern_recognition}%`);
  console.log(`  Computational:        ${avgDistribution.computational}%`);
  console.log(`  Property-Based:       ${avgDistribution.property_based}%`);
  console.log(`  Abstract:             ${avgDistribution.abstract}%`);

  console.log('\n\n═'.repeat(80));
  console.log('📝 SAMPLE QUESTIONS BY TYPE (From 2024)\n');

  const samples2024 = allYearResults.find(yr => yr.year === 2024);
  if (samples2024) {
    Object.entries(samples2024.examples).forEach(([type, examples]) => {
      console.log(`\n${type.toUpperCase().replace(/_/g, ' ')}:`);
      examples.forEach((ex, i) => {
        console.log(`  ${i + 1}. ${ex}...`);
      });
    });
  }

  console.log('\n\n═'.repeat(80));
  console.log('💾 SAVING RESULTS TO DATABASE\n');

  // Update exam_historical_patterns with question type distribution
  for (const result of allYearResults) {
    const { error } = await supabase
      .from('exam_historical_patterns')
      .update({
        question_type_distribution: {
          word_problem: result.distributionPct.word_problem,
          pattern_recognition: result.distributionPct.pattern_recognition,
          computational: result.distributionPct.computational,
          property_based: result.distributionPct.property_based,
          abstract: result.distributionPct.abstract
        },
        updated_at: new Date().toISOString()
      })
      .eq('exam_context', 'KCET')
      .eq('subject', 'Math')
      .eq('year', result.year);

    if (error) {
      console.error(`   ❌ Error updating ${result.year}: ${error.message}`);
    } else {
      console.log(`   ✓ Updated ${result.year} question type distribution`);
    }
  }

  // Update ai_universal_calibration with average distribution for 2026
  const { error: calibError } = await supabase
    .from('ai_universal_calibration')
    .update({
      intent_signature: {
        synthesis: 0.294,
        trapDensity: 0.30,
        linguisticLoad: 0.25,
        speedRequirement: 1.12,
        idsTarget: 0.8942,
        difficultyProfile: {
          easy: 37,
          moderate: 48,
          hard: 15
        },
        questionTypeProfile: {
          word_problem: avgDistribution.word_problem,
          pattern_recognition: avgDistribution.pattern_recognition,
          computational: avgDistribution.computational,
          property_based: avgDistribution.property_based,
          abstract: avgDistribution.abstract
        }
      },
      updated_at: new Date().toISOString()
    })
    .eq('exam_type', 'KCET')
    .eq('subject', 'Math')
    .eq('target_year', 2026);

  if (calibError) {
    console.error(`   ❌ Error updating master calibration: ${calibError.message}`);
  } else {
    console.log(`   ✓ Updated master calibration with question type profile`);
  }

  // Save detailed report
  const report = {
    analysis_date: new Date().toISOString(),
    years_analyzed: '2021-2025',
    total_questions_analyzed: allYearResults.reduce((sum, yr) => sum + yr.totalQuestions, 0),
    average_distribution: avgDistribution,
    year_by_year: allYearResults.map(yr => ({
      year: yr.year,
      total: yr.totalQuestions,
      distribution: yr.distributionPct
    })),
    recommendation_2026: {
      word_problem: avgDistribution.word_problem,
      pattern_recognition: avgDistribution.pattern_recognition,
      computational: avgDistribution.computational,
      property_based: avgDistribution.property_based,
      abstract: avgDistribution.abstract,
      notes: 'Use these percentages for 2026 flagship generation to match KCET patterns'
    }
  };

  fs.writeFileSync(
    'docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025.json',
    JSON.stringify(report, null, 2)
  );

  console.log(`\n   ✓ Saved detailed report to docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025.json`);

  console.log('\n\n✅ ANALYSIS COMPLETE\n');
  console.log('═'.repeat(80));
}

analyzeQuestionTypes().catch(console.error);
