import * as fs from 'fs';

function categorizeQuestion(text: string, topic: string): string {
  const t = text.toLowerCase();

  // Word problem indicators
  const wordKeywords = [
    'rectangle', 'square', 'perimeter', 'area', 'box', 'balls', 'cards',
    'shooter', 'target', 'probability of', 'find the number of', 'how many'
  ];
  if (wordKeywords.some(kw => t.includes(kw))) return 'word_problem';

  // Pattern recognition indicators
  const patternKeywords = ['sum of the series', 'σ', '∑', 'binomial coefficient', 'expansion of'];
  if (patternKeywords.some(kw => t.includes(kw))) return 'pattern_recognition';

  // Computational indicators
  const compKeywords = ['∫', 'integral', 'derivative', 'd/dx', 'limit', 'lim', 'evaluate', 'calculate'];
  if (compKeywords.some(kw => t.includes(kw)) && text.length < 150) return 'computational';

  // Property-based indicators
  const propKeywords = [
    'property', 'theorem', 'identity', 'greatest integer', '[x]', 'modulus',
    'symmetric', 'skew-symmetric', 'rank', 'determinant', 'adjoint',
    'inverse trigonometric', 'domain', 'range', 'bijective', 'surjective',
    'mean value theorem', 'rolle', 'continuity', 'differentiability'
  ];
  if (propKeywords.some(kw => t.includes(kw))) return 'property_based';

  // Abstract (conceptual, no numbers)
  if (!/\d/.test(text) && (t.includes('which of the following') || t.includes('statement'))) {
    return 'abstract';
  }

  return compKeywords.some(kw => t.includes(kw)) ? 'computational' : 'property_based';
}

function analyzeSet(filePath: string, setName: string) {
  console.log(`\n📊 Analyzing ${setName}...\n`);

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const questions = data.test_config.questions;

  const distribution: Record<string, number> = {
    property_based: 0,
    word_problem: 0,
    computational: 0,
    pattern_recognition: 0,
    abstract: 0
  };

  const examples: Record<string, string[]> = {
    property_based: [],
    word_problem: [],
    computational: [],
    pattern_recognition: [],
    abstract: []
  };

  questions.forEach((q: any, idx: number) => {
    if (!q.text) return;
    const type = categorizeQuestion(q.text, q.topic || '');
    distribution[type]++;

    if (examples[type].length < 3) {
      examples[type].push(`Q${idx + 1}: ${q.text.substring(0, 80)}...`);
    }
  });

  const total = questions.length;

  console.log(`Total Questions: ${total}\n`);
  console.log(`Question Type Distribution:`);
  Object.entries(distribution).forEach(([type, count]) => {
    const pct = ((count / total) * 100).toFixed(1);
    const status = type === 'property_based' && count >= 40 ? '✅' :
                   type === 'word_problem' && count >= 10 ? '✅' :
                   type === 'computational' && count >= 4 ? '✅' : '⚠️';
    console.log(`  ${status} ${type.padEnd(20)}: ${count} (${pct}%)`);
  });

  console.log(`\nExamples by Type:`);
  Object.entries(examples).forEach(([type, exs]) => {
    if (exs.length > 0) {
      console.log(`\n${type.toUpperCase()}:`);
      exs.forEach(ex => console.log(`  ${ex}`));
    }
  });

  // Difficulty distribution
  const diffDist = {
    Easy: questions.filter((q: any) => q.difficulty === 'Easy').length,
    Moderate: questions.filter((q: any) => q.difficulty === 'Moderate').length,
    Hard: questions.filter((q: any) => q.difficulty === 'Hard').length
  };

  console.log(`\nDifficulty Distribution:`);
  console.log(`  Easy: ${diffDist.Easy} (${((diffDist.Easy / total) * 100).toFixed(1)}%) - Target: 37%`);
  console.log(`  Moderate: ${diffDist.Moderate} (${((diffDist.Moderate / total) * 100).toFixed(1)}%) - Target: 48%`);
  console.log(`  Hard: ${diffDist.Hard} (${((diffDist.Hard / total) * 100).toFixed(1)}%) - Target: 15%`);

  return { distribution, diffDist, total };
}

console.log('═'.repeat(80));
console.log('🔍 FLAGSHIP PAPER QUALITY VERIFICATION (REI v17)');
console.log('═'.repeat(80));

const setA = analyzeSet('flagship_final.json', 'SET A');
const setB = analyzeSet('flagship_final_b.json', 'SET B');

console.log('\n\n═'.repeat(80));
console.log('📊 COMPARISON WITH REI v17 TARGET');
console.log('═'.repeat(80));

const target = {
  property_based: 69,
  word_problem: 19,
  computational: 8,
  pattern_recognition: 2,
  abstract: 2
};

console.log('\n| Type | Target % | SET A % | SET B % | Status |');
console.log('|------|----------|---------|---------|--------|');

Object.keys(target).forEach(type => {
  const targetPct = target[type as keyof typeof target];
  const setAPct = ((setA.distribution[type] / setA.total) * 100).toFixed(1);
  const setBPct = ((setB.distribution[type] / setB.total) * 100).toFixed(1);

  const diff = Math.abs(parseFloat(setAPct) - targetPct);
  const status = diff <= 5 ? '✅' : diff <= 10 ? '⚠️' : '❌';

  console.log(`| ${type.padEnd(18)} | ${targetPct}% | ${setAPct}% | ${setBPct}% | ${status} |`);
});

console.log('\n\n═'.repeat(80));
console.log('🎯 FINAL VERDICT');
console.log('═'.repeat(80));

const setAPropertyPct = (setA.distribution.property_based / setA.total) * 100;
const setBPropertyPct = (setB.distribution.property_based / setB.total) * 100;

if (setAPropertyPct >= 65 && setBPropertyPct >= 65) {
  console.log('\n✅ SUCCESS: REI v17 question type mandate is working!');
  console.log(`   Both sets have ${Math.min(setAPropertyPct, setBPropertyPct).toFixed(1)}%+ property-based questions (target: 69%)`);
} else {
  console.log('\n⚠️ WARNING: Question type distribution needs adjustment');
}

console.log('\n═'.repeat(80));
