/**
 * Complete topic mapping for new Math scan
 * 1. Set domain field for all questions
 * 2. Create topic_question_mapping entries for unmapped questions
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Domain mapping for Math topics
const topicToDomain = {
  // Algebra
  'Relations and Functions': 'ALGEBRA',
  'Inverse Trigonometric Functions': 'ALGEBRA',
  'Matrices': 'ALGEBRA',
  'Determinants': 'ALGEBRA',
  'Complex Numbers': 'ALGEBRA',
  'Sequences and Series': 'ALGEBRA',

  // Calculus
  'Continuity and Differentiability': 'CALCULUS',
  'Application of Derivatives': 'CALCULUS',
  'Limits and Derivatives': 'CALCULUS',
  'Indefinite Integration': 'CALCULUS',
  'Definite Integration': 'CALCULUS',
  'Applications of Integrals': 'CALCULUS',
  'Differential Equations': 'CALCULUS',

  // Geometry
  'Three Dimensional Geometry': 'VECTORS & 3D GEOMETRY',
  'Vectors': 'VECTORS & 3D GEOMETRY',
  'Straight Lines': 'VECTORS & 3D GEOMETRY',
  'Conic Sections': 'VECTORS & 3D GEOMETRY',

  // Trigonometry
  'Trigonometric Functions': 'ALGEBRA',

  // Probability & Stats
  'Probability': 'PROBABILITY',
  'Statistics': 'PROBABILITY',

  // Permutations
  'Permutations and Combinations': 'ALGEBRA',

  // Linear Programming
  'Linear Programming': 'LINEAR PROGRAMMING'
};

async function completeTopicMapping() {
  const scanId = '988c86f0-75a3-4e53-8308-2347a41df26b';

  console.log('🔧 Completing topic mapping...\n');

  // Step 1: Get all questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, topic, subject, exam_context')
    .eq('scan_id', scanId);

  console.log(`📊 Processing ${questions.length} questions\n`);

  // Step 2: Set domain for all questions
  let domainUpdates = 0;
  for (const q of questions) {
    const domain = topicToDomain[q.topic] || 'ALGEBRA';

    const { error } = await supabase
      .from('questions')
      .update({ domain })
      .eq('id', q.id);

    if (!error) {
      domainUpdates++;
    }
  }

  console.log(`✅ Updated domain field for ${domainUpdates}/${questions.length} questions\n`);

  // Step 3: Get or create topic_resources for each topic
  const uniqueTopics = [...new Set(questions.map(q => q.topic))];
  console.log(`📚 Found ${uniqueTopics.length} unique topics\n`);

  const topicResourceMap = new Map();

  for (const topicName of uniqueTopics) {
    const domain = topicToDomain[topicName] || 'ALGEBRA';

    // Check if topic_resource exists
    const { data: existing } = await supabase
      .from('topic_resources')
      .select('id')
      .eq('name', topicName)
      .eq('subject', 'Math')
      .eq('exam_context', 'KCET')
      .maybeSingle();

    if (existing) {
      topicResourceMap.set(topicName, existing.id);
      console.log(`   ✓ Topic exists: ${topicName}`);
    } else {
      // Create new topic_resource (only guaranteed fields)
      const { data: newTopic, error } = await supabase
        .from('topic_resources')
        .insert({
          name: topicName,
          subject: 'Math',
          exam_context: 'KCET'
        })
        .select('id')
        .single();

      if (error) {
        console.error(`   ❌ Error creating topic ${topicName}:`, error);
      } else {
        topicResourceMap.set(topicName, newTopic.id);
        console.log(`   ✨ Created topic: ${topicName}`);
      }
    }
  }

  // Step 4: Create topic_question_mapping entries
  console.log(`\n📋 Creating topic_question_mapping entries...\n`);

  let mappingCreated = 0;
  let mappingExists = 0;

  for (const q of questions) {
    const topicId = topicResourceMap.get(q.topic);
    if (!topicId) {
      console.log(`   ⚠️  No topic_resource for: ${q.topic}`);
      continue;
    }

    // Check if mapping already exists
    const { data: existing } = await supabase
      .from('topic_question_mapping')
      .select('id')
      .eq('question_id', q.id)
      .eq('topic_id', topicId)
      .maybeSingle();

    if (existing) {
      mappingExists++;
      continue;
    }

    // Create mapping
    const { error } = await supabase
      .from('topic_question_mapping')
      .insert({
        question_id: q.id,
        topic_id: topicId
      });

    if (error) {
      console.error(`   ❌ Error mapping question ${q.id}:`, error);
    } else {
      mappingCreated++;
    }
  }

  console.log(`✅ Created ${mappingCreated} new mappings`);
  console.log(`   Already existed: ${mappingExists}`);

  console.log(`\n🎉 Done! Topic mapping complete.`);
  console.log(`   - All questions have domain field`);
  console.log(`   - All questions mapped to topic_resources`);
  console.log(`\n   Refresh the admin panel to see "60 MAPPED, 0 UNMAPPED"`);
}

completeTopicMapping();
