/**
 * Map questions to official topics based on topic name matching
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function mapQuestions() {
  console.log('=== MAPPING QUESTIONS TO OFFICIAL TOPICS ===\n');

  // Get all official topics
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name, subject');

  if (!topics) {
    console.log('No official topics found');
    return;
  }

  console.log(`Found ${topics.length} official topics\n`);

  // Get all questions (need to join with scans to get subject)
  const { data: questions } = await supabase
    .from('questions')
    .select('id, topic, scan_id, scans!inner(subject)');

  if (!questions) {
    console.log('No questions found');
    return;
  }

  console.log(`Found ${questions.length} questions\n`);

  // Create mappings
  const mappings: any[] = [];
  let matched = 0;
  let unmatched = 0;

  for (const question of questions) {
    if (!question.topic) {
      unmatched++;
      continue;
    }

    // Extract subject from joined scan data
    const questionSubject = (question as any).scans?.subject;

    if (!questionSubject) {
      unmatched++;
      continue;
    }

    // Find matching official topic (case-insensitive, partial match)
    const matchingTopic = topics.find(t =>
      t.subject === questionSubject &&
      (
        t.name.toLowerCase() === question.topic.toLowerCase() ||
        t.name.toLowerCase().includes(question.topic.toLowerCase()) ||
        question.topic.toLowerCase().includes(t.name.toLowerCase())
      )
    );

    if (matchingTopic) {
      mappings.push({
        question_id: question.id,
        topic_id: matchingTopic.id
      });
      matched++;
    } else {
      unmatched++;
      if (unmatched <= 10) {
        console.log(`No match for: "${question.topic}" (${question.subject})`);
      }
    }
  }

  console.log(`\nMatching results:`);
  console.log(`  Matched: ${matched}`);
  console.log(`  Unmatched: ${unmatched}`);

  if (mappings.length === 0) {
    console.log('\nNo mappings to create');
    return;
  }

  // Insert mappings in batches
  console.log(`\nInserting ${mappings.length} mappings...`);

  const batchSize = 1000;
  let inserted = 0;

  for (let i = 0; i < mappings.length; i += batchSize) {
    const batch = mappings.slice(i, i + batchSize);

    const { error } = await supabase
      .from('topic_question_mapping')
      .upsert(batch, {
        onConflict: 'question_id,topic_id',
        ignoreDuplicates: true
      });

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`  Inserted batch ${i / batchSize + 1}: ${batch.length} mappings`);
    }
  }

  console.log(`\n✅ Complete! Inserted ${inserted} question-topic mappings`);

  // Verify
  const { count } = await supabase
    .from('topic_question_mapping')
    .select('*', { count: 'exact', head: true });

  console.log(`Total mappings in database: ${count}`);
}

mapQuestions().catch(console.error);
