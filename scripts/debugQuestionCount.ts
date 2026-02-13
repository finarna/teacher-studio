import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugQuestionCount() {
  const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

  console.log('=== DEBUGGING QUESTION COUNT ===\n');

  // Get all scans
  const { data: allScans, count: totalScans } = await supabase
    .from('scans')
    .select('*', { count: 'exact' });

  console.log(`Total scans in DB: ${totalScans}`);

  // Get user scans
  const { data: userScans, count: userScanCount } = await supabase
    .from('scans')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  console.log(`User scans: ${userScanCount}`);

  // Get all questions
  const { data: allQuestions, count: totalQuestions } = await supabase
    .from('questions')
    .select('scan_id', { count: 'exact' });

  console.log(`Total questions in DB: ${totalQuestions}\n`);

  // Get questions for user's scans
  if (userScans && userScans.length > 0) {
    const userScanIds = userScans.map(s => s.id);

    const { data: userQuestions, count: userQuestionCount } = await supabase
      .from('questions')
      .select('scan_id, topic, subject', { count: 'exact' })
      .in('scan_id', userScanIds);

    console.log(`Questions for user's scans: ${userQuestionCount}\n`);

    // Group by subject
    if (userQuestions && userQuestions.length > 0) {
      const bySubject: Record<string, Set<string>> = {
        'Math': new Set(),
        'Physics': new Set()
      };

      userQuestions.forEach(q => {
        const scanInfo = userScans.find(s => s.id === q.scan_id);
        if (scanInfo) {
          const subject = scanInfo.subject;
          if (bySubject[subject]) {
            bySubject[subject].add(q.scan_id);
          }
        }
      });

      console.log('Questions by subject:');
      for (const [subject, scanIds] of Object.entries(bySubject)) {
        const subjectQuestions = userQuestions.filter(q => {
          const scan = userScans.find(s => s.id === q.scan_id);
          return scan?.subject === subject;
        });
        console.log(`  ${subject}: ${subjectQuestions.length} questions from ${scanIds.size} scans`);

        // Show topic distribution
        const topics = new Map<string, number>();
        subjectQuestions.forEach(q => {
          const topic = q.topic || 'Uncategorized';
          topics.set(topic, (topics.get(topic) || 0) + 1);
        });

        console.log(`    Topics: ${topics.size} unique`);
        const topTopics = Array.from(topics.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        topTopics.forEach(([topic, count]) => {
          console.log(`      - ${topic}: ${count}`);
        });
      }
    }
  }

  // Check for orphaned questions (questions without valid scans)
  const { data: orphanedQuestions, count: orphanedCount } = await supabase
    .from('questions')
    .select('scan_id', { count: 'exact' })
    .not('scan_id', 'in', `(${userScans?.map(s => `'${s.id}'`).join(',')})`);

  if (orphanedCount && orphanedCount > 0) {
    console.log(`\n⚠️  Orphaned questions (no matching scan): ${orphanedCount}`);
  }
}

debugQuestionCount().catch(console.error);
