/**
 * Fix Published Scan - Copy questions to questions table
 *
 * This script fixes scans that were published before the bug fix.
 * It copies questions from analysis_data.questions to the questions table.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const scanId = '48aff221-8677-43fb-b018-1eb5417e653c';

async function fixPublishedScan() {
  console.log('🔧 Fixing published scan:', scanId);

  // Get scan details
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (scanError || !scan) {
    console.error('❌ Error fetching scan:', scanError);
    return;
  }

  console.log('\n📋 Scan:', scan.subject, scan.exam_context);
  console.log('   Is System Scan:', scan.is_system_scan);

  // Check questions in analysis_data
  const analysisQuestions = scan.analysis_data?.questions || [];
  console.log('\n📊 Questions in analysis_data:', analysisQuestions.length);

  if (analysisQuestions.length === 0) {
    console.log('❌ No questions found in analysis_data');
    return;
  }

  // Check if questions already exist in table
  const { data: existingQuestions } = await supabase
    .from('questions')
    .select('id')
    .eq('scan_id', scanId);

  if (existingQuestions && existingQuestions.length > 0) {
    console.log('\n⚠️  Questions already exist in table:', existingQuestions.length);
    console.log('   Skipping insert (run with --force to delete and re-insert)');
    return;
  }

  // Transform and insert questions
  console.log('\n📝 Inserting questions into questions table...');
  const questionsData = analysisQuestions.map((q, index) => ({
    scan_id: scanId,
    question_text: q.text || q.question || '',
    marks: parseInt(q.marks) || 1,
    difficulty: q.difficulty || 'Moderate',
    topic: q.topic || '',
    domain: q.domain || '',
    blooms: q.blooms || 'Understanding',
    options: q.options || [],
    correct_answer: q.correctAnswer || q.correct_answer || null,
    solution: q.solution || null,
    has_visual_element: q.hasVisualElement || false,
    visual_element_type: q.visualElementType || null,
    visual_element_description: q.visualElementDescription || null,
    visual_bounding_box: q.visualBoundingBox || null,
    question_order: index,
    subject: scan.subject,
    exam_context: scan.exam_context,
    year: scan.year || null,
  }));

  const { data: insertedQuestions, error: insertError } = await supabase
    .from('questions')
    .insert(questionsData)
    .select('id, topic');

  if (insertError) {
    console.error('\n❌ Error inserting questions:', insertError);
    return;
  }

  console.log('✅ Inserted', insertedQuestions.length, 'questions');

  // Now map questions to topics
  console.log('\n🔗 Creating topic mappings...');

  // Get official topics
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name')
    .eq('subject', scan.subject);

  if (!topics || topics.length === 0) {
    console.warn('❌ No official topics found for', scan.subject);
    return;
  }

  // Create mappings
  const mappings = [];
  let matched = 0;
  let unmatched = 0;

  for (const question of insertedQuestions) {
    if (!question.topic) {
      unmatched++;
      continue;
    }

    // Find matching official topic (case-insensitive, partial match)
    const matchingTopic = topics.find(t =>
      t.name.toLowerCase() === question.topic.toLowerCase() ||
      t.name.toLowerCase().includes(question.topic.toLowerCase()) ||
      question.topic.toLowerCase().includes(t.name.toLowerCase())
    );

    if (matchingTopic) {
      mappings.push({
        question_id: question.id,
        topic_id: matchingTopic.id
      });
      matched++;
    } else {
      unmatched++;
      console.log('   ⚠️  No topic match for:', question.topic);
    }
  }

  if (mappings.length > 0) {
    const { error: mappingError } = await supabase
      .from('topic_question_mapping')
      .insert(mappings);

    if (mappingError) {
      console.error('❌ Error creating mappings:', mappingError);
      return;
    }

    console.log('✅ Created', mappings.length, 'topic mappings');
    console.log('   Matched:', matched, '| Unmatched:', unmatched);
  }

  console.log('\n✅ Scan fixed successfully!');
  console.log('   Questions in table:', insertedQuestions.length);
  console.log('   Topic mappings:', mappings.length);
}

fixPublishedScan().catch(console.error);
