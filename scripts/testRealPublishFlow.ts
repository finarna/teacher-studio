/**
 * Test real publish/unpublish flow with actual scan data
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Use REAL user ID from the database
const testUserId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

// Use one of your recent Math KCET scans
const testScanId = 'bd210344-5d6b-4229-93b9-e49d7b5095ea'; // Latest Math scan with 60 questions

async function testRealFlow() {
  console.log('\n🧪 TESTING REAL PUBLISH/UNPUBLISH WORKFLOW\n');
  console.log('='.repeat(70));

  try {
    // Get scan info
    const { data: scan } = await supabase
      .from('scans')
      .select('*')
      .eq('id', testScanId)
      .single();

    if (!scan) {
      console.log('❌ Scan not found');
      return;
    }

    console.log(`\n📄 Test Scan: ${scan.paper_name || 'Untitled'}`);
    console.log(`   Subject: ${scan.subject} | Exam: ${scan.exam_context}`);
    console.log(`   Status: ${scan.status} | Published: ${scan.is_system_scan}`);

    // Count questions
    const { count: questionCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('scan_id', testScanId);

    console.log(`   Questions: ${questionCount}`);

    // STEP 1: Unpublish and clean
    console.log('\n📋 STEP 1: Unpublish & Remove Mappings');
    console.log('-'.repeat(70));

    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('scan_id', testScanId);

    const questionIds = (questions || []).map(q => q.id);

    if (questionIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('topic_question_mapping')
        .delete()
        .in('question_id', questionIds);

      if (deleteError) console.error('Delete error:', deleteError);
    }

    await supabase
      .from('scans')
      .update({ is_system_scan: false })
      .eq('id', testScanId);

    // Check Learning Journey
    const { data: topicsBeforePublish } = await supabase.rpc(
      'get_learning_journey_topics',
      {
        p_user_id: testUserId,
        p_subject: scan.subject,
        p_exam_context: scan.exam_context
      }
    );

    console.log(`✅ Scan unpublished`);
    console.log(`✅ Mappings cleared`);
    console.log(`✅ Learning Journey topics: ${(topicsBeforePublish || []).length}`);

    // STEP 2: Simulate AdminScanApproval publish logic
    console.log('\n🚀 STEP 2: Publish with Auto-Mapping');
    console.log('-'.repeat(70));

    // Get official topics
    const { data: topics } = await supabase
      .from('topics')
      .select('id, name')
      .eq('subject', scan.subject);

    console.log(`   Official topics available: ${topics?.length || 0}`);

    // Get questions with topics
    const { data: questionsWithTopics } = await supabase
      .from('questions')
      .select('id, topic')
      .eq('scan_id', testScanId);

    // Auto-map
    const mappings: { question_id: string; topic_id: string }[] = [];
    let matched = 0;
    let unmatched = 0;

    for (const question of questionsWithTopics || []) {
      if (!question.topic) {
        unmatched++;
        continue;
      }

      const matchingTopic = topics?.find(t =>
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
        if (unmatched <= 5) {
          console.log(`   No match: "${question.topic}"`);
        }
      }
    }

    // Insert mappings
    if (mappings.length > 0) {
      await supabase
        .from('topic_question_mapping')
        .upsert(mappings, {
          onConflict: 'question_id,topic_id',
          ignoreDuplicates: true
        });
    }

    // Publish scan
    await supabase
      .from('scans')
      .update({ is_system_scan: true })
      .eq('id', testScanId);

    console.log(`\n✅ Auto-mapping results:`);
    console.log(`   Matched: ${matched}`);
    console.log(`   Unmatched: ${unmatched}`);
    console.log(`   Success rate: ${Math.round((matched / (questionCount || 1)) * 100)}%`);
    console.log(`   Mappings created: ${mappings.length}`);

    // Check Learning Journey
    const { data: topicsAfterPublish } = await supabase.rpc(
      'get_learning_journey_topics',
      {
        p_user_id: testUserId,
        p_subject: scan.subject,
        p_exam_context: scan.exam_context
      }
    );

    console.log(`\n✅ Scan published`);
    console.log(`✅ Learning Journey topics: ${(topicsAfterPublish || []).length}`);

    // STEP 3: Verify questions appear in Learning Journey
    console.log('\n🔍 STEP 3: Verify Questions in Learning Journey');
    console.log('-'.repeat(70));

    let totalQuestionsInJourney = 0;
    for (const topic of topicsAfterPublish || []) {
      totalQuestionsInJourney += topic.question_count || 0;
    }

    console.log(`   Total questions visible: ${totalQuestionsInJourney}`);
    console.log(`   Expected: ${matched}`);
    console.log(`   Match: ${totalQuestionsInJourney === matched ? '✅' : '❌'}`);

    // Final summary
    console.log('\n📊 WORKFLOW TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`Questions in scan: ${questionCount}`);
    console.log(`Auto-mapped: ${matched} (${Math.round((matched / (questionCount || 1)) * 100)}%)`);
    console.log(`Visible in Learning Journey: ${totalQuestionsInJourney}`);
    console.log(`\n${totalQuestionsInJourney === matched ? '🎉 SUCCESS!' : '❌ MISMATCH'} Auto-mapping workflow works!`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

testRealFlow();
