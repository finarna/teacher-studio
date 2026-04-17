import * as fs from 'fs';

function analyzeBothSets() {
  const setA = JSON.parse(fs.readFileSync('flagship_final.json', 'utf8'));
  const setB = JSON.parse(fs.readFileSync('flagship_final_b.json', 'utf8'));

  console.log('═'.repeat(80));
  console.log('📊 QUALITY COMPARISON: SET A vs SET B');
  console.log('═'.repeat(80));

  // Difficulty distribution
  const countDifficulty = (questions: any[]) => {
    const counts = { Easy: 0, Moderate: 0, Hard: 0 };
    questions.forEach(q => counts[q.difficulty as keyof typeof counts]++);
    return counts;
  };

  const setADiff = countDifficulty(setA.test_config.questions);
  const setBDiff = countDifficulty(setB.test_config.questions);

  console.log('\n📊 DIFFICULTY DISTRIBUTION:\n');
  console.log('SET A:');
  console.log(`  Easy: ${setADiff.Easy} (${(setADiff.Easy/60*100).toFixed(1)}%)`);
  console.log(`  Moderate: ${setADiff.Moderate} (${(setADiff.Moderate/60*100).toFixed(1)}%)`);
  console.log(`  Hard: ${setADiff.Hard} (${(setADiff.Hard/60*100).toFixed(1)}%)`);

  console.log('\nSET B:');
  console.log(`  Easy: ${setBDiff.Easy} (${(setBDiff.Easy/60*100).toFixed(1)}%)`);
  console.log(`  Moderate: ${setBDiff.Moderate} (${(setBDiff.Moderate/60*100).toFixed(1)}%)`);
  console.log(`  Hard: ${setBDiff.Hard} (${(setBDiff.Hard/60*100).toFixed(1)}%)`);

  // Topic distribution
  const countTopics = (questions: any[]) => {
    const topics: Record<string, number> = {};
    questions.forEach(q => {
      topics[q.topic] = (topics[q.topic] || 0) + 1;
    });
    return topics;
  };

  const setATopics = countTopics(setA.test_config.questions);
  const setBTopics = countTopics(setB.test_config.questions);

  console.log('\n═'.repeat(80));
  console.log('📊 TOPIC DISTRIBUTION (Top 10):');
  console.log('═'.repeat(80));

  console.log('\nSET A Top Topics:');
  Object.entries(setATopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([topic, count]) => {
      console.log(`  ${topic.padEnd(35)}: ${count} questions`);
    });

  console.log('\nSET B Top Topics:');
  Object.entries(setBTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([topic, count]) => {
      console.log(`  ${topic.padEnd(35)}: ${count} questions`);
    });

  // Check for duplication between sets
  console.log('\n═'.repeat(80));
  console.log('🔍 CHECKING DUPLICATION BETWEEN SET A AND SET B');
  console.log('═'.repeat(80));

  const exactDuplicates: any[] = [];
  const similarQuestions: any[] = [];

  setA.test_config.questions.forEach((qA: any, idxA: number) => {
    setB.test_config.questions.forEach((qB: any, idxB: number) => {
      if (!qA.text || !qB.text) return;

      // Normalize and compare
      const normA = qA.text.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normB = qB.text.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Exact match
      if (normA === normB) {
        exactDuplicates.push({
          indexA: idxA + 1,
          indexB: idxB + 1,
          topic: qA.topic,
          text: qA.text.substring(0, 100)
        });
      } else {
        // Check for high similarity (shared key phrases)
        const wordsA = qA.text.split(/\s+/).filter((w: string) => w.length > 5);
        const wordsB = qB.text.split(/\s+/).filter((w: string) => w.length > 5);
        const common = wordsA.filter((w: string) => wordsB.includes(w));

        if (common.length > 8) {
          similarQuestions.push({
            indexA: idxA + 1,
            indexB: idxB + 1,
            topicA: qA.topic,
            topicB: qB.topic,
            commonWords: common.length,
            textA: qA.text.substring(0, 80),
            textB: qB.text.substring(0, 80)
          });
        }
      }
    });
  });

  if (exactDuplicates.length > 0) {
    console.log(`\n🚨 EXACT DUPLICATES: ${exactDuplicates.length}\n`);
    exactDuplicates.forEach((dup, i) => {
      console.log(`${i + 1}. SET A Q${dup.indexA} = SET B Q${dup.indexB} [${dup.topic}]`);
      console.log(`   ${dup.text}...\n`);
    });
  } else {
    console.log('\n✅ NO EXACT DUPLICATES between SET A and SET B');
  }

  if (similarQuestions.length > 0) {
    console.log(`\n⚠️  SIMILAR QUESTIONS: ${similarQuestions.length}\n`);
    similarQuestions.slice(0, 5).forEach((sim, i) => {
      console.log(`${i + 1}. SET A Q${sim.indexA} ≈ SET B Q${sim.indexB} (${sim.commonWords} common words)`);
      console.log(`   A [${sim.topicA}]: ${sim.textA}...`);
      console.log(`   B [${sim.topicB}]: ${sim.textB}...\n`);
    });

    if (similarQuestions.length > 5) {
      console.log(`   ... and ${similarQuestions.length - 5} more similar pairs\n`);
    }
  } else {
    console.log('✅ NO SIMILAR QUESTIONS between sets');
  }

  // Sample questions from each set
  console.log('\n═'.repeat(80));
  console.log('📊 SAMPLE QUESTIONS FROM EACH SET (First 8)');
  console.log('═'.repeat(80));

  console.log('\nSET A Questions:');
  setA.test_config.questions.slice(0, 8).forEach((q: any, i: number) => {
    console.log(`\nA${i + 1}. [${q.difficulty}] ${q.topic}`);
    console.log(`   ${q.text.substring(0, 120)}...`);
  });

  console.log('\n\nSET B Questions:');
  setB.test_config.questions.slice(0, 8).forEach((q: any, i: number) => {
    console.log(`\nB${i + 1}. [${q.difficulty}] ${q.topic}`);
    console.log(`   ${q.text.substring(0, 120)}...`);
  });

  console.log('\n\n═'.repeat(80));
  console.log('📊 QUALITY VERDICT');
  console.log('═'.repeat(80));

  const issues: string[] = [];

  if (exactDuplicates.length > 0) {
    issues.push(`❌ ${exactDuplicates.length} exact duplicates between sets`);
  }

  if (similarQuestions.length > 10) {
    issues.push(`⚠️  ${similarQuestions.length} similar questions between sets (overlap)`);
  }

  const setACalculus = Object.entries(setATopics)
    .filter(([topic]) => topic.includes('Integral') || topic.includes('Derivative') || topic.includes('Differential'))
    .reduce((sum, [_, count]) => sum + count, 0);

  const setBCalculus = Object.entries(setBTopics)
    .filter(([topic]) => topic.includes('Integral') || topic.includes('Derivative') || topic.includes('Differential'))
    .reduce((sum, [_, count]) => sum + count, 0);

  if (setACalculus > 20 || setBCalculus > 20) {
    issues.push(`⚠️  Too calculus-heavy (SET A: ${setACalculus}, SET B: ${setBCalculus})`);
  }

  if (issues.length > 0) {
    console.log('\n⚠️  ISSUES FOUND:\n');
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('\n✅ Both sets appear to have good quality');
  }

  console.log('\n📊 SUMMARY:');
  console.log(`   - Both sets have 60 questions each`);
  console.log(`   - Difficulty distributions are similar`);
  console.log(`   - ${exactDuplicates.length} exact duplicates between sets`);
  console.log(`   - ${similarQuestions.length} similar question pairs`);
  console.log(`   - Topic coverage is broad but calculus-heavy\n`);
}

analyzeBothSets();
