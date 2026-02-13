import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

  console.log('=== VERIFICATION ===\n');

  // Check scans
  const { data: scans, count: scanCount } = await supabase
    .from('scans')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  console.log(`📊 Scans: ${scanCount}`);

  // Check questions (no user_id filter since questions table doesn't have it)
  const { data: allQuestions, count: questionCount } = await supabase
    .from('questions')
    .select('scan_id, topic, difficulty', { count: 'exact' });

  console.log(`❓ Total questions: ${questionCount}\n`);

  // Group by subject (via scan relationship)
  if (scans && scans.length > 0 && allQuestions && allQuestions.length > 0) {
    const scanIds = scans.map(s => s.id);
    const userQuestions = allQuestions.filter(q => scanIds.includes(q.scan_id));

    console.log(`❓ Questions for user: ${userQuestions.length}\n`);

    // Group by scan
    const bySubject: Record<string, number> = {};
    scans.forEach(scan => {
      const questionsForScan = userQuestions.filter(q => q.scan_id === scan.id);
      const key = `${scan.subject} (${scan.exam_context})`;
      bySubject[key] = (bySubject[key] || 0) + questionsForScan.length;
    });

    console.log('Questions by subject:');
    Object.entries(bySubject).forEach(([key, count]) => {
      console.log(`  ✅ ${key}: ${count} questions`);
    });
  }

  console.log('\n=== LEARNING JOURNEY TEST ===\n');

  // Test topic aggregation
  const { data: mathQuestions } = await supabase
    .from('questions')
    .select('scan_id, topic')
    .in('scan_id', scans?.filter(s => s.subject === 'Math').map(s => s.id) || []);

  const mathTopics = new Map<string, number>();
  mathQuestions?.forEach(q => {
    const topic = q.topic || 'Uncategorized';
    mathTopics.set(topic, (mathTopics.get(topic) || 0) + 1);
  });

  console.log(`Math topics: ${mathTopics.size}`);
  console.log('Top 5 Math topics:');
  Array.from(mathTopics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([topic, count]) => {
      console.log(`  - ${topic}: ${count} questions`);
    });
}

verify().catch(console.error);
