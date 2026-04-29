/**
 * Investigate 2023 NEET Physics Topic Tagging Issue
 *
 * Problem: Topic accuracy for 2023 is 60% vs 76-86% for other years
 * Goal: Identify what's wrong with 2023 topic tags
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OFFICIAL_SCANS: Record<number, string> = {
  2021: 'ca38a537-5516-469a-abd4-967a76b32028', // NEET 2021 Combined Paper
  2022: 'b19037fb-980a-41e1-89a0-d28a5e1c0033', // NEET 2022 Combined Paper
  2023: 'e3767338-1664-4e03-b0f6-1fab41ff5838', // NEET 2023 Combined Paper
  2024: '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5', // NEET 2024 Combined Paper
  2025: '4f682118-d0ce-4f6f-95c7-6141e496579f'  // NEET 2025 Combined Paper
};

async function investigate2023Topics() {
  console.log('🔍 Investigating 2023 NEET Physics Topic Tagging Issue\n');
  console.log('=' .repeat(70));

  // 1. Get all 2023 NEET Physics questions
  const scan_id = OFFICIAL_SCANS[2023];

  const { data: questions2023, error } = await supabase
    .from('questions')
    .select('id, question_order, topic, difficulty, text')
    .eq('scan_id', scan_id)
    .eq('subject', 'Physics')
    .order('question_order', { ascending: true });

  if (error || !questions2023) {
    console.error('Error fetching 2023 questions:', error);
    return;
  }

  console.log(`\n📊 Total 2023 NEET Physics Questions: ${questions2023.length}`);

  // 2. Group by topic
  const topicGroups = new Map<string, number>();
  let missingTopics = 0;
  let nullTopics = 0;

  for (const q of questions2023) {
    if (!q.topic) {
      nullTopics++;
    } else if (q.topic.trim() === '') {
      missingTopics++;
    } else {
      topicGroups.set(q.topic, (topicGroups.get(q.topic) || 0) + 1);
    }
  }

  console.log(`\n⚠️  Issues Found:`);
  console.log(`   - NULL topics: ${nullTopics}`);
  console.log(`   - Empty topics: ${missingTopics}`);
  console.log(`   - Valid topics: ${topicGroups.size}`);

  // 3. Show topic distribution
  console.log(`\n📋 Topic Distribution (2023):\n`);
  console.log('   Topic'.padEnd(50) + 'Count');
  console.log('   ' + '-'.repeat(70));

  const sortedTopics = Array.from(topicGroups.entries())
    .sort((a, b) => b[1] - a[1]);

  for (const [topic, count] of sortedTopics) {
    console.log(`   ${topic.padEnd(50)}${count}`);
  }

  // 4. Compare with other years
  console.log(`\n\n🔍 Comparing with Other Years:\n`);

  for (const year of [2021, 2022, 2024, 2025]) {
    const { data: questionsYear } = await supabase
      .from('questions')
      .select('topic')
      .eq('scan_id', OFFICIAL_SCANS[year])
      .eq('subject', 'Physics');

    if (!questionsYear) {
      console.log(`   Year ${year}: No questions found`);
      continue;
    }

    const nullCount = questionsYear.filter(q => !q.topic).length;
    const uniqueTopics = new Set(questionsYear.filter(q => q.topic).map(q => q.topic!)).size;

    console.log(`   Year ${year}: ${questionsYear.length} questions, ${nullCount} null topics, ${uniqueTopics} unique topics`);
  }

  // 5. Check if topics match NTA official units
  console.log(`\n\n🎯 Checking NTA Unit Alignment:\n`);

  const ntaUnits = [
    'PHYSICS AND MEASUREMENT',
    'KINEMATICS',
    'LAWS OF MOTION',
    'WORK, ENERGY, AND POWER',
    'ROTATIONAL MOTION',
    'GRAVITATION',
    'PROPERTIES OF SOLIDS AND LIQUIDS',
    'THERMODYNAMICS',
    'KINETIC THEORY OF GASES',
    'OSCILLATIONS AND WAVES',
    'ELECTROSTATICS',
    'CURRENT ELECTRICITY',
    'MAGNETIC EFFECTS OF CURRENT AND MAGNETISM',
    'ELECTROMAGNETIC INDUCTION AND ALTERNATING CURRENTS',
    'ELECTROMAGNETIC WAVES',
    'OPTICS',
    'DUAL NATURE OF MATTER AND RADIATION',
    'ATOMS AND NUCLEI',
    'ELECTRONIC DEVICES',
  ];

  let aligned = 0;
  let misaligned = 0;

  for (const [topic] of sortedTopics) {
    const topicUpper = topic.toUpperCase();
    const isAligned = ntaUnits.some(unit =>
      topicUpper === unit || topicUpper.includes(unit) || unit.includes(topicUpper)
    );

    if (isAligned) {
      aligned++;
    } else {
      misaligned++;
      console.log(`   ❌ Misaligned: "${topic}"`);
    }
  }

  console.log(`\n   ✅ Aligned with NTA: ${aligned}/${sortedTopics.length}`);
  console.log(`   ❌ Misaligned: ${misaligned}/${sortedTopics.length}`);

  // 6. Sample questions with topics
  console.log(`\n\n📝 Sample Questions (First 10):\n`);

  for (let i = 0; i < Math.min(10, questions2023.length); i++) {
    const q = questions2023[i];
    const questionPreview = q.text ? q.text.substring(0, 60) + '...' : '';
    console.log(`   Q${q.question_order}: ${q.topic || 'NO TOPIC'} - ${questionPreview}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Investigation Complete\n');
}

investigate2023Topics().catch(console.error);
