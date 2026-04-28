import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBiologyData() {
  console.log('📊 PHASE 1: Data Preparation - KCET Biology\n');
  console.log('Step 1.1: Verifying Historical Data...\n');

  const { data, error } = await supabase
    .from('questions')
    .select('subject, exam_context, source, difficulty, topic')
    .eq('subject', 'Biology')
    .eq('exam_context', 'KCET')
    .order('source');

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('❌ No Biology KCET data found in database!');
    process.exit(1);
  }

  // Group by year
  const byYear = data.reduce((acc: any, q: any) => {
    const yearMatch = q.source?.match(/202[1-5]/);
    const year = yearMatch ? yearMatch[0] : 'Unknown';
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});

  console.log('subject | exam_context | year | question_count | status');
  console.log('--------|--------------|------|----------------|--------');

  ['2021', '2022', '2023', '2024', '2025'].forEach(year => {
    const count = byYear[year] || 0;
    const status = count === 60 ? '✅ Good' : count > 0 ? '⚠️  Incomplete' : '❌ Missing';
    console.log(`Biology | KCET         | ${year} | ${count.toString().padEnd(14)} | ${status}`);
  });

  const total = Object.values(byYear).reduce((sum: number, count: any) => sum + count, 0);
  console.log('--------|--------------|------|----------------|--------');
  console.log(`Total   |              |      | ${total}           |`);

  if (total !== 300) {
    console.log(`\n⚠️  Warning: Expected 300 questions (60 per year × 5 years), found ${total}`);
  }

  // Check difficulty distribution
  console.log('\n📈 Step 1.2: Difficulty Distribution\n');
  const byDifficulty = data.reduce((acc: any, q: any) => {
    const diff = q.difficulty || 'Unknown';
    acc[diff] = (acc[diff] || 0) + 1;
    return acc;
  }, {});

  Object.entries(byDifficulty).forEach(([diff, count]) => {
    const pct = ((count as number / total) * 100).toFixed(1);
    console.log(`  ${diff.padEnd(10)}: ${count.toString().padStart(3)} (${pct.padStart(5)}%)`);
  });

  // Check topic distribution
  console.log('\n📚 Step 1.3: Topic Coverage\n');
  const byTopic = data.reduce((acc: any, q: any) => {
    const topic = q.topic || 'Unknown';
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {});

  const uniqueTopics = Object.keys(byTopic).length;
  console.log(`  Total Unique Topics: ${uniqueTopics}`);
  console.log(`  Questions per Topic (avg): ${(total / uniqueTopics).toFixed(1)}`);

  // Show top 10 topics
  console.log('\n  Top 10 Topics:');
  Object.entries(byTopic)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 10)
    .forEach(([topic, count], idx) => {
      console.log(`    ${(idx + 1).toString().padStart(2)}. ${topic.substring(0, 50).padEnd(50)} : ${count}`);
    });

  // Quality checks
  console.log('\n🔍 Step 1.4: Data Quality Validation\n');
  const missingText = data.filter(q => !q.topic || q.topic.trim() === '').length;
  const missingDifficulty = data.filter(q => !q.difficulty).length;
  const missingTopic = data.filter(q => !q.topic).length;

  console.log(`  Missing Text:       ${missingText === 0 ? '✅' : '❌'} ${missingText} questions`);
  console.log(`  Missing Difficulty: ${missingDifficulty === 0 ? '✅' : '❌'} ${missingDifficulty} questions`);
  console.log(`  Missing Topic:      ${missingTopic === 0 ? '✅' : '❌'} ${missingTopic} questions`);

  const qualityScore = ((total - missingText - missingDifficulty - missingTopic) / (total * 3)) * 100;
  console.log(`\n  Overall Data Quality: ${qualityScore.toFixed(1)}%`);

  if (qualityScore === 100) {
    console.log('\n✅ Phase 1 Complete: All historical data verified and quality checks passed!');
  } else {
    console.log('\n⚠️  Phase 1 Warning: Some data quality issues detected. Review above.');
  }

  process.exit(0);
}

checkBiologyData().catch(console.error);
