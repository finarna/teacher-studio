import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsxjwjinxkehsubzesml.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zeGp3amlueGtlaHN1Ynplc21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5OTUyMjAsImV4cCI6MjA0OTU3MTIyMH0.ypl0seRHYN7pдив8-L9F9CgBZ1yzw4Hm9sOZLJuqN1s'
);

async function checkMathScan() {
  console.log('🔍 SEARCHING FOR LATEST MATH SCAN\n');

  const { data: scans, error } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, status, created_at, analysis_data')
    .eq('subject', 'Math')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('Found', scans.length, 'recent Math scans:\n');

  scans.forEach((scan, idx) => {
    const qCount = scan.analysis_data && scan.analysis_data.questions ? scan.analysis_data.questions.length : 0;
    console.log((idx + 1) + '. ' + scan.name);
    console.log('   ID:', scan.id);
    console.log('   Status:', scan.status);
    console.log('   Created:', new Date(scan.created_at).toLocaleString());
    console.log('   Questions:', qCount);
    console.log('');
  });

  // Check the most recent one
  if (scans.length > 0) {
    const latest = scans[0];
    const questions = latest.analysis_data && latest.analysis_data.questions ? latest.analysis_data.questions : [];

    console.log('============================================================');
    console.log('ANALYZING:', latest.name);
    console.log('============================================================\n');

    if (questions.length === 0) {
      console.log('❌ NO QUESTIONS FOUND IN ANALYSIS DATA\n');
      return;
    }

    // Topic analysis
    const topicCount = new Map();
    const domainCount = new Map();

    questions.forEach(q => {
      const topic = q.topic || 'NO_TOPIC';
      const domain = q.domain || 'NO_DOMAIN';

      topicCount.set(topic, (topicCount.get(topic) || 0) + 1);
      domainCount.set(domain, (domainCount.get(domain) || 0) + 1);
    });

    console.log('📊 TOPIC BREAKDOWN:\n');
    const sortedTopics = Array.from(topicCount.entries()).sort((a, b) => b[1] - a[1]);
    sortedTopics.forEach(([topic, count]) => {
      console.log('   ' + topic + ': ' + count + ' questions');
    });

    console.log('\n📂 DOMAIN BREAKDOWN:\n');
    const sortedDomains = Array.from(domainCount.entries()).sort((a, b) => b[1] - a[1]);
    sortedDomains.forEach(([domain, count]) => {
      console.log('   ' + domain + ': ' + count + ' questions');
    });

    console.log('\n📝 SAMPLE QUESTIONS (First 3):\n');
    questions.slice(0, 3).forEach((q, idx) => {
      console.log('Q' + (idx + 1) + ':');
      console.log('  Topic: "' + q.topic + '"');
      console.log('  Domain: "' + q.domain + '"');
      console.log('  Difficulty:', q.difficulty);
      console.log('  Marks:', q.marks);
      const textPreview = q.text ? q.text.substring(0, 80) : 'No text';
      console.log('  Text:', textPreview + '...');
      console.log('');
    });

    console.log('🔗 CHECKING LEARNING JOURNEY INTEGRATION:\n');

    // Check if these topics exist in topics table
    const uniqueTopics = Array.from(topicCount.keys()).filter(t => t !== 'NO_TOPIC');

    for (const topic of uniqueTopics.slice(0, 5)) {
      const { data: officialTopic, error: topicError } = await supabase
        .from('topics')
        .select('id, name')
        .eq('name', topic)
        .eq('subject', 'Math')
        .single();

      if (officialTopic) {
        console.log('   ✅ "' + topic + '" → Found in topics table');
      } else {
        console.log('   ❌ "' + topic + '" → NOT in topics table (will not show in Learning Journey)');
      }
    }
  }
}

checkMathScan().catch(console.error);
