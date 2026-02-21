/**
 * Check what data is actually in the AI generator tables
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkData() {
  console.log('🔍 Checking AI Generator Database Data\n');
  console.log('======================================\n');

  // 1. Check exam configurations
  const { data: configs, error: configsError } = await supabase
    .from('exam_configurations')
    .select('*');

  console.log('1. Exam Configurations:');
  if (configsError) {
    console.error('   ❌ Error:', configsError.message);
  } else {
    console.log(`   ✅ Found ${configs?.length || 0} configurations`);
    configs?.forEach(c => {
      console.log(`      - ${c.exam_context} ${c.subject}: ${c.total_questions}Q, ${c.duration_minutes}min`);
    });
  }
  console.log('');

  // 2. Check topic metadata
  const { data: topics, error: topicsError } = await supabase
    .from('topic_metadata')
    .select('*');

  console.log('2. Topic Metadata:');
  if (topicsError) {
    console.error('   ❌ Error:', topicsError.message);
  } else {
    console.log(`   ✅ Found ${topics?.length || 0} topics`);
    topics?.slice(0, 5).forEach(t => {
      console.log(`      - ${t.topic_name} (${t.exam_context} ${t.subject})`);
    });
    if (topics && topics.length > 5) {
      console.log(`      ... and ${topics.length - 5} more`);
    }
  }
  console.log('');

  // 3. Check historical patterns
  const { data: patterns, error: patternsError } = await supabase
    .from('exam_historical_patterns')
    .select('*');

  console.log('3. Historical Patterns:');
  if (patternsError) {
    console.error('   ❌ Error:', patternsError.message);
  } else {
    console.log(`   ✅ Found ${patterns?.length || 0} patterns`);
    patterns?.forEach(p => {
      console.log(`      - ${p.year} ${p.exam_context} ${p.subject}: ${p.total_marks} marks`);
    });
  }
  console.log('');

  // 4. Check topic distributions
  const { data: distributions, error: distError } = await supabase
    .from('exam_topic_distributions')
    .select('*');

  console.log('4. Topic Distributions:');
  if (distError) {
    console.error('   ❌ Error:', distError.message);
  } else {
    console.log(`   ✅ Found ${distributions?.length || 0} distributions`);
    const sample = distributions?.slice(0, 3);
    sample?.forEach(d => {
      console.log(`      - Topic ${d.topic_id}: ${d.question_count} questions`);
    });
  }
  console.log('');

  // 5. Check generation rules
  const { data: rules, error: rulesError } = await supabase
    .from('generation_rules')
    .select('*');

  console.log('5. Generation Rules:');
  if (rulesError) {
    console.error('   ❌ Error:', rulesError.message);
  } else {
    console.log(`   ✅ Found ${rules?.length || 0} rules`);
    rules?.forEach(r => {
      console.log(`      - ${r.exam_context} ${r.subject || 'all'}: Pattern=${r.weight_predicted_pattern}, Weak=${r.weight_student_weak_areas}`);
    });
  }
  console.log('');

  // Summary
  console.log('📊 Summary:');
  console.log(`   Configurations: ${configs?.length || 0}`);
  console.log(`   Topics: ${topics?.length || 0}`);
  console.log(`   Historical Patterns: ${patterns?.length || 0}`);
  console.log(`   Topic Distributions: ${distributions?.length || 0}`);
  console.log(`   Generation Rules: ${rules?.length || 0}`);
  console.log('');

  if ((topics?.length || 0) === 0 || (patterns?.length || 0) === 0) {
    console.log('⚠️  WARNING: No data found!');
    console.log('   Run: npx tsx scripts/setupAIGenerator.ts');
  } else {
    console.log('✅ Database has data for AI generation');
  }
}

checkData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
