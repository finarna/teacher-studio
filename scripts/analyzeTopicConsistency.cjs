const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeLearningJourneyTopics() {
  console.log('\n\n=== LEARNING JOURNEY TOPIC STRUCTURE ===\n');

  // Check topics table
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('*')
    .order('subject', { ascending: true })
    .order('name', { ascending: true });

  if (topicsError) {
    console.error('Error fetching topics:', topicsError);
    return;
  }

  console.log(`Total topics in topics table: ${topics.length}\n`);

  // Group by subject
  const bySubject = {};
  topics.forEach(topic => {
    const subject = topic.subject || 'unknown';
    if (!bySubject[subject]) {
      bySubject[subject] = [];
    }
    bySubject[subject].push(topic);
  });

  Object.keys(bySubject).sort().forEach(subject => {
    console.log(`\n${subject} (${bySubject[subject].length} topics):`);
    console.log('='.repeat(60));
    bySubject[subject].forEach(topic => {
      console.log(`  - ${topic.name} (chapter: ${topic.chapter || 'none'}, domain: ${topic.domain || 'none'})`);
    });
  });

  // Check topic_resources table
  console.log('\n\n=== TOPIC RESOURCES ===\n');
  const { data: resources, error: resourcesError } = await supabase
    .from('topic_resources')
    .select('id, topic_id, question_id')
    .limit(10);

  if (resourcesError) {
    console.error('Error fetching topic_resources:', resourcesError);
  } else {
    console.log(`Sample topic_resources (first 10):`);
    resources.forEach(r => {
      console.log(`  topic_id: ${r.topic_id}, question_id: ${r.question_id}`);
    });

    // Get total count
    const { count } = await supabase
      .from('topic_resources')
      .select('*', { count: 'exact', head: true });
    console.log(`\nTotal topic_resources: ${count}`);
  }

  // Check if scan questions match topics table
  console.log('\n\n=== SCAN TOPICS vs TOPICS TABLE ===\n');
  const { data: scans } = await supabase
    .from('scans')
    .select('analysis_data')
    .not('analysis_data', 'is', null);

  const scanTopics = new Set();
  scans.forEach(scan => {
    const questions = scan.analysis_data?.questions || [];
    questions.forEach(q => {
      if (q.topic) scanTopics.add(q.topic);
    });
  });

  const topicsTableNames = new Set(topics.map(t => t.name));

  console.log(`Unique topics in scans: ${scanTopics.size}`);
  console.log(`Topics in topics table: ${topicsTableNames.size}`);

  // Topics in scans but not in topics table
  const missingInTable = [...scanTopics].filter(t => !topicsTableNames.has(t));
  if (missingInTable.length > 0) {
    console.log(`\n❌ Topics in scans but NOT in topics table (${missingInTable.length}):`);
    missingInTable.sort().slice(0, 20).forEach(t => console.log(`  - ${t}`));
    if (missingInTable.length > 20) {
      console.log(`  ... and ${missingInTable.length - 20} more`);
    }
  }

  // Topics in table but not in scans
  const missingInScans = [...topicsTableNames].filter(t => !scanTopics.has(t));
  if (missingInScans.length > 0) {
    console.log(`\n⚠️  Topics in topics table but NOT in scans (${missingInScans.length}):`);
    missingInScans.sort().slice(0, 20).forEach(t => console.log(`  - ${t}`));
    if (missingInScans.length > 20) {
      console.log(`  ... and ${missingInScans.length - 20} more`);
    }
  }
}

analyzeLearningJourneyTopics().catch(console.error);
