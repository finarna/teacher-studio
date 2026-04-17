import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

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

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\$[^$]*\$/g, 'MATH') // Replace LaTeX with placeholder
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function calculateSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);

  if (norm1.length === 0 || norm2.length === 0) return 0;

  // Simple substring match
  if (norm1.includes(norm2.substring(0, 50)) || norm2.includes(norm1.substring(0, 50))) {
    return 0.9;
  }

  // Character overlap
  const len = Math.min(norm1.length, norm2.length);
  let matches = 0;
  for (let i = 0; i < len; i++) {
    if (norm1[i] === norm2[i]) matches++;
  }

  return matches / Math.max(norm1.length, norm2.length);
}

async function checkDuplication() {
  console.log('🔍 CHECKING FOR QUESTION DUPLICATION\n');
  console.log('Loading generated flagship papers...\n');

  // Load generated papers
  const setA = JSON.parse(fs.readFileSync('flagship_final.json', 'utf8'));
  const setB = JSON.parse(fs.readFileSync('flagship_final_b.json', 'utf8'));

  const generatedQuestions = [
    ...setA.test_config.questions.map((q: any) => ({ ...q, set: 'A' })),
    ...setB.test_config.questions.map((q: any) => ({ ...q, set: 'B' }))
  ];

  console.log(`✅ Loaded ${generatedQuestions.length} generated questions\n`);
  console.log('Loading actual KCET questions (2021-2025)...\n');

  // Load all actual KCET questions
  const allActualQuestions: any[] = [];

  for (const [year, scanId] of Object.entries(OFFICIAL_SCANS)) {
    const { data: questions } = await supabase
      .from('questions')
      .select('text, topic, difficulty, question_order')
      .eq('scan_id', scanId);

    if (questions) {
      allActualQuestions.push(...questions.map(q => ({ ...q, year: parseInt(year) })));
    }
  }

  console.log(`✅ Loaded ${allActualQuestions.length} actual KCET questions\n`);
  console.log('═'.repeat(80));
  console.log('CHECKING FOR DUPLICATES AND SIMILARITIES\n');
  console.log('═'.repeat(80));

  const duplicates: any[] = [];
  const highSimilarity: any[] = [];

  generatedQuestions.forEach((genQ, idx) => {
    if (!genQ.text) return;

    allActualQuestions.forEach(actualQ => {
      if (!actualQ.text) return;

      const similarity = calculateSimilarity(genQ.text, actualQ.text);

      if (similarity > 0.85) {
        duplicates.push({
          generatedSet: genQ.set,
          generatedIndex: idx,
          generatedText: genQ.text.substring(0, 120),
          generatedTopic: genQ.topic,
          actualYear: actualQ.year,
          actualText: actualQ.text.substring(0, 120),
          actualTopic: actualQ.topic,
          similarity: (similarity * 100).toFixed(1)
        });
      } else if (similarity > 0.6) {
        highSimilarity.push({
          generatedSet: genQ.set,
          generatedIndex: idx,
          generatedText: genQ.text.substring(0, 100),
          actualYear: actualQ.year,
          actualText: actualQ.text.substring(0, 100),
          similarity: (similarity * 100).toFixed(1)
        });
      }
    });
  });

  console.log(`\n📊 ANALYSIS RESULTS:\n`);
  console.log(`   Total Generated Questions: ${generatedQuestions.length}`);
  console.log(`   Total Actual KCET Questions (2021-2025): ${allActualQuestions.length}`);
  console.log(`   Exact/Near Duplicates (>85% similar): ${duplicates.length}`);
  console.log(`   High Similarity (60-85%): ${highSimilarity.length}`);
  console.log(`   Unique Questions: ${generatedQuestions.length - duplicates.length - highSimilarity.length}\n`);

  if (duplicates.length > 0) {
    console.log('═'.repeat(80));
    console.log('🚨 EXACT/NEAR DUPLICATES FOUND (>85% similarity)');
    console.log('═'.repeat(80));

    duplicates.slice(0, 10).forEach((dup, i) => {
      console.log(`\n${i + 1}. SET ${dup.generatedSet} Q${dup.generatedIndex + 1} ≈ ${dup.actualYear} (${dup.similarity}% match)`);
      console.log(`   Topic: ${dup.generatedTopic} vs ${dup.actualTopic}`);
      console.log(`   Generated: ${dup.generatedText}...`);
      console.log(`   Actual ${dup.actualYear}: ${dup.actualText}...`);
    });

    if (duplicates.length > 10) {
      console.log(`\n   ... and ${duplicates.length - 10} more duplicates\n`);
    }
  } else {
    console.log('✅ NO EXACT DUPLICATES FOUND!\n');
  }

  if (highSimilarity.length > 0) {
    console.log('\n═'.repeat(80));
    console.log('⚠️  HIGH SIMILARITY QUESTIONS (60-85%)');
    console.log('═'.repeat(80));
    console.log(`Found ${highSimilarity.length} questions with high similarity\n`);

    highSimilarity.slice(0, 5).forEach((sim, i) => {
      console.log(`${i + 1}. SET ${sim.generatedSet} Q${sim.generatedIndex + 1} ≈ ${sim.actualYear} (${sim.similarity}% match)`);
      console.log(`   Generated: ${sim.generatedText}...`);
      console.log(`   Actual: ${sim.actualText}...\n`);
    });
  }

  // Check for repetition between SET A and SET B
  console.log('\n═'.repeat(80));
  console.log('🔍 CHECKING DUPLICATION BETWEEN SET A AND SET B');
  console.log('═'.repeat(80));

  const setAQuestions = setA.test_config.questions;
  const setBQuestions = setB.test_config.questions;
  const interSetDuplicates: any[] = [];

  setAQuestions.forEach((qA: any, idxA: number) => {
    setBQuestions.forEach((qB: any, idxB: number) => {
      if (!qA.text || !qB.text) return;

      const similarity = calculateSimilarity(qA.text, qB.text);

      if (similarity > 0.7) {
        interSetDuplicates.push({
          setAIndex: idxA,
          setBIndex: idxB,
          textA: qA.text.substring(0, 100),
          textB: qB.text.substring(0, 100),
          topicA: qA.topic,
          topicB: qB.topic,
          similarity: (similarity * 100).toFixed(1)
        });
      }
    });
  });

  console.log(`\n   Found ${interSetDuplicates.length} similar questions between SET A and SET B\n`);

  if (interSetDuplicates.length > 0) {
    interSetDuplicates.slice(0, 5).forEach((dup, i) => {
      console.log(`${i + 1}. SET A Q${dup.setAIndex + 1} ≈ SET B Q${dup.setBIndex + 1} (${dup.similarity}% match)`);
      console.log(`   Topic: ${dup.topicA} vs ${dup.topicB}`);
      console.log(`   SET A: ${dup.textA}...`);
      console.log(`   SET B: ${dup.textB}...\n`);
    });
  } else {
    console.log('✅ NO DUPLICATION BETWEEN SET A AND SET B!\n');
  }

  // Summary
  console.log('\n═'.repeat(80));
  console.log('📊 FINAL VERDICT');
  console.log('═'.repeat(80));

  const duplicateRate = (duplicates.length / generatedQuestions.length * 100).toFixed(1);
  const similarityRate = (highSimilarity.length / generatedQuestions.length * 100).toFixed(1);
  const uniqueRate = (100 - parseFloat(duplicateRate) - parseFloat(similarityRate)).toFixed(1);

  console.log(`\n   Duplicate Rate: ${duplicateRate}% (${duplicates.length}/${generatedQuestions.length})`);
  console.log(`   High Similarity Rate: ${similarityRate}% (${highSimilarity.length}/${generatedQuestions.length})`);
  console.log(`   Unique/Original Rate: ${uniqueRate}%\n`);

  if (parseFloat(duplicateRate) > 10) {
    console.log('🚨 WARNING: More than 10% questions are duplicates from previous years!');
  } else if (parseFloat(duplicateRate) > 0) {
    console.log('⚠️  CAUTION: Some questions duplicate previous years.');
  } else {
    console.log('✅ GOOD: No exact duplicates found!');
  }

  console.log('\n═'.repeat(80));
}

checkDuplication().catch(console.error);
