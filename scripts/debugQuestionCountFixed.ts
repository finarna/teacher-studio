import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugQuestionCount() {
  const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

  console.log('=== DEBUGGING QUESTION COUNT ===\n');

  // Get user scans
  const { data: userScans } = await supabase
    .from('scans')
    .select('id, subject, exam_context, name')
    .eq('user_id', userId);

  console.log(`User scans: ${userScans?.length || 0}`);

  if (!userScans || userScans.length === 0) {
    console.log('No scans found for user');
    return;
  }

  // Sample a few scan IDs
  console.log(`Sample scan IDs:`, userScans.slice(0, 3).map(s => s.id));

  // Get total questions
  const { count: totalQuestions } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });

  console.log(`Total questions in DB: ${totalQuestions}\n`);

  // Try getting questions for one scan first
  const firstScanId = userScans[0].id;
  const { data: sampleQuestions, count: sampleCount } = await supabase
    .from('questions')
    .select('id, topic, scan_id', { count: 'exact' })
    .eq('scan_id', firstScanId);

  console.log(`Questions for first scan (${userScans[0].name}): ${sampleCount}`);

  // Count questions for all user scans - do it in batches
  let totalUserQuestions = 0;
  const batchSize = 10;

  for (let i = 0; i < userScans.length; i += batchSize) {
    const batch = userScans.slice(i, i + batchSize);
    const batchIds = batch.map(s => s.id);

    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .in('scan_id', batchIds);

    if (count) {
      totalUserQuestions += count;
    }
  }

  console.log(`\nTotal questions for user's ${userScans.length} scans: ${totalUserQuestions}`);

  // Get questions by subject
  const mathScans = userScans.filter(s => s.subject === 'Math');
  const physicsScans = userScans.filter(s => s.subject === 'Physics');

  console.log(`\nMath scans: ${mathScans.length}`);
  console.log(`Physics scans: ${physicsScans.length}`);

  // Count Math questions
  let mathQuestions = 0;
  for (let i = 0; i < mathScans.length; i += batchSize) {
    const batch = mathScans.slice(i, i + batchSize);
    const batchIds = batch.map(s => s.id);
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .in('scan_id', batchIds);
    if (count) mathQuestions += count;
  }

  // Count Physics questions
  let physicsQuestions = 0;
  for (let i = 0; i < physicsScans.length; i += batchSize) {
    const batch = physicsScans.slice(i, i + batchSize);
    const batchIds = batch.map(s => s.id);
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .in('scan_id', batchIds);
    if (count) physicsQuestions += count;
  }

  console.log(`\nMath questions: ${mathQuestions}`);
  console.log(`Physics questions: ${physicsQuestions}`);

  // Get sample topics for Math
  if (mathScans.length > 0) {
    const { data: mathQs } = await supabase
      .from('questions')
      .select('topic')
      .in('scan_id', mathScans.slice(0, 5).map(s => s.id))
      .limit(100);

    if (mathQs) {
      const topics = new Map<string, number>();
      mathQs.forEach(q => {
        const topic = q.topic || 'Uncategorized';
        topics.set(topic, (topics.get(topic) || 0) + 1);
      });

      console.log(`\nSample Math topics (from first 5 scans, max 100 questions):`);
      Array.from(topics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([topic, count]) => {
          console.log(`  - ${topic}: ${count}`);
        });
    }
  }
}

debugQuestionCount().catch(console.error);
