import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    console.log('❌ No auth session found');
    return;
  }

  console.log('✅ Auth token found');

  // Test the API endpoint
  const response = await fetch('http://localhost:9001/api/learning-journey/topics/Math/KCET', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();

  console.log('\n📊 API Response Status:', response.status);
  console.log('Topics returned:', result.topics?.length || 0);

  if (result.topics && result.topics.length > 0) {
    // Check topics with flashcards
    const topicsWithFlashcards = result.topics.filter(t => t.flashcards && t.flashcards.length > 0);
    console.log('Topics with flashcards:', topicsWithFlashcards.length);

    topicsWithFlashcards.forEach(topic => {
      console.log(`\n  📚 ${topic.topicName}:`);
      console.log(`     Questions: ${topic.totalQuestions}`);
      console.log(`     Sketches: ${topic.sketchPages?.length || 0}`);
      console.log(`     Flashcards: ${topic.flashcards?.length || 0}`);
    });
  } else {
    console.log('\n❌ No topics returned or error:', result);
  }
}

test();
