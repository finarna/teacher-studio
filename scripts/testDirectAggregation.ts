/**
 * Test aggregateTopicsForUser directly (bypass RPC)
 */
import { createClient } from '@supabase/supabase-js';
import { aggregateTopicsForUser } from '../lib/topicAggregator';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const testUserId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

async function testDirectAggregation() {
  console.log('\n🧪 TESTING DIRECT TOPIC AGGREGATION\n');
  console.log('='.repeat(70));

  try {
    console.log(`User ID: ${testUserId}`);
    console.log(`Subject: Math`);
    console.log(`Exam: KCET\n`);

    const topics = await aggregateTopicsForUser(
      supabase,
      testUserId,
      'Math',
      'KCET'
    );

    console.log(`✅ Retrieved ${topics.length} topics`);
    console.log('\nTopics with questions:\n');

    let totalQuestions = 0;
    for (const topic of topics) {
      if (topic.totalQuestions > 0) {
        console.log(`- ${topic.topicName}: ${topic.totalQuestions} questions`);
        totalQuestions += topic.totalQuestions;
      }
    }

    console.log(`\n📊 Total questions across all topics: ${totalQuestions}`);

    if (totalQuestions > 0) {
      console.log('\n🎉 SUCCESS! Auto-mapping workflow works!');
    } else {
      console.log('\n❌ No questions visible - investigating...');

      // Debug: Check if scans are found
      const { data: scans } = await supabase
        .from('scans')
        .select('id, subject, is_system_scan, user_id')
        .or(`user_id.eq.${testUserId},is_system_scan.eq.true`)
        .eq('subject', 'Math');

      console.log(`\nDebug: Found ${scans?.length || 0} scans for Math`);
      for (const scan of scans || []) {
        console.log(`  - ${scan.id.substring(0, 8)}... (published: ${scan.is_system_scan}, user_id: ${scan.user_id?.substring(0, 8)}...)`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testDirectAggregation();
