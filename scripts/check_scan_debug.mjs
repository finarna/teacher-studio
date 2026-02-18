import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const scanId = '48aff221-8677-43fb-b018-1eb5417e653c';

async function checkScan() {
  console.log('🔍 Checking scan:', scanId);

  // Get scan details
  const { data: scan, error } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('\n📋 Scan Details:');
  console.log('  File:', scan.file_name);
  console.log('  Subject:', scan.subject);
  console.log('  Exam:', scan.exam_context);
  console.log('  Is System:', scan.is_system_scan);
  console.log('  Year:', scan.year);
  console.log('  User ID:', scan.user_id);

  // Check analysis_data.questions
  const analysisQuestions = scan.analysis_data?.questions || [];
  console.log('\n📊 Questions in analysis_data.questions:', analysisQuestions.length);
  if (analysisQuestions.length > 0) {
    console.log('  Sample question:', {
      id: analysisQuestions[0].id,
      domain: analysisQuestions[0].domain,
      topic: analysisQuestions[0].topic
    });
  }

  // Check questions table
  const { data: tableQuestions, error: qError } = await supabase
    .from('questions')
    .select('id, domain, question_text')
    .eq('scan_id', scanId);

  console.log('\n📊 Questions in questions table:', tableQuestions?.length || 0);
  if (tableQuestions && tableQuestions.length > 0) {
    console.log('  Sample question:', {
      id: tableQuestions[0].id,
      domain: tableQuestions[0].domain,
      text: tableQuestions[0].question_text.substring(0, 50) + '...'
    });
  }

  // Check mappings
  if (tableQuestions && tableQuestions.length > 0) {
    const questionIds = tableQuestions.map(q => q.id);
    const { data: mappings } = await supabase
      .from('topic_question_mapping')
      .select('question_id, topic_id')
      .in('question_id', questionIds);

    console.log('\n🔗 Question-topic mappings:', mappings?.length || 0);

    // Get topic names
    if (mappings && mappings.length > 0) {
      const topicIds = [...new Set(mappings.map(m => m.topic_id))];
      const { data: topics } = await supabase
        .from('topics')
        .select('id, name, subject')
        .in('id', topicIds);

      console.log('\n📚 Mapped to topics:');
      topics?.forEach(t => {
        const count = mappings.filter(m => m.topic_id === t.id).length;
        console.log(`  - ${t.name} (${t.subject}): ${count} questions`);
      });
    }
  }

  // Check if scan appears in Learning Journey query
  console.log('\n🧪 Testing Learning Journey query...');
  const testUserId = scan.user_id;
  const { data: journeyScans, error: journeyError } = await supabase
    .from('scans')
    .select('id, file_name, subject, is_system_scan')
    .or(`user_id.eq.${testUserId},is_system_scan.eq.true`)
    .eq('subject', scan.subject);

  if (journeyError) {
    console.error('❌ Journey query error:', journeyError);
  } else {
    const ourScan = journeyScans.find(s => s.id === scanId);
    console.log('  Scan found in journey query:', !!ourScan);
    console.log('  Total scans in query:', journeyScans.length);
  }
}

checkScan().catch(console.error);
