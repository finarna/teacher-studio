import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTopicQuestions() {
  const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

  console.log('=== TESTING TOPIC QUESTION RETRIEVAL ===\n');

  // Call the API endpoint
  const response = await fetch(
    `http://localhost:9001/api/learning-journey/topics?userId=${userId}&subject=Math&examContext=KCET`
  );

  if (!response.ok) {
    console.error('API Error:', response.statusText);
    return;
  }

  const result = await response.json();

  console.log(`API returned ${result.data.length} topics`);
  console.log(`Total questions across all topics: ${result.meta.totalQuestions}\n`);

  // Show first 5 topics
  console.log('First 5 topics:');
  result.data.slice(0, 5).forEach((topic: any, idx: number) => {
    console.log(`${idx + 1}. ${topic.topicName}: ${topic.totalQuestions} questions (mastery: ${topic.masteryLevel}%)`);
  });

  // Now test actual question retrieval for the first topic
  const firstTopic = result.data[0];
  console.log(`\n=== Testing Question Retrieval for "${firstTopic.topicName}" ===\n`);

  // Get the official topic from database
  const { data: officialTopic } = await supabase
    .from('topics')
    .select('*')
    .eq('name', firstTopic.topicName)
    .eq('subject', 'Math')
    .single();

  if (!officialTopic) {
    console.log('Topic not found in database');
    return;
  }

  console.log(`Official topic ID: ${officialTopic.id}`);
  console.log(`Topic description: ${officialTopic.description || 'N/A'}`);

  // Get questions mapped to this topic
  const { data: questionMappings } = await supabase
    .from('question_topic_mapping')
    .select('question_id')
    .eq('topic_id', officialTopic.id);

  console.log(`Questions mapped via mapping table: ${questionMappings?.length || 0}`);

  // Get actual questions
  if (questionMappings && questionMappings.length > 0) {
    const questionIds = questionMappings.map(m => m.question_id);

    const { data: questions } = await supabase
      .from('questions')
      .select('id, text, topic, difficulty, marks')
      .in('id', questionIds.slice(0, 5)); // Get first 5

    console.log('\nSample questions:');
    questions?.forEach((q, idx) => {
      console.log(`${idx + 1}. [${q.difficulty}] ${q.text.substring(0, 80)}...`);
    });
  } else {
    console.log('\n⚠️  No questions mapped to this topic yet');

    // Check if there are questions with this topic name (unmapped)
    const { data: unmappedQuestions, count } = await supabase
      .from('questions')
      .select('id, text, topic, difficulty', { count: 'exact' })
      .ilike('topic', `%${firstTopic.topicName}%`)
      .limit(5);

    console.log(`\nQuestions with topic name in text: ${count}`);
    if (unmappedQuestions && unmappedQuestions.length > 0) {
      console.log('Sample unmapped questions:');
      unmappedQuestions.forEach((q, idx) => {
        console.log(`${idx + 1}. Topic field: "${q.topic}" - ${q.text.substring(0, 60)}...`);
      });
    }
  }

  // Check resources for this topic
  const { data: resources } = await supabase
    .from('topic_resources')
    .select('resource_type, content')
    .eq('topic_id', officialTopic.id);

  console.log(`\nResources available: ${resources?.length || 0}`);
  if (resources && resources.length > 0) {
    const byType: Record<string, number> = {};
    resources.forEach(r => {
      byType[r.resource_type] = (byType[r.resource_type] || 0) + 1;
    });
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
  }
}

testTopicQuestions().catch(console.error);
