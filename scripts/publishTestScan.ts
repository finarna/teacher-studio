/**
 * Quick script to publish a test scan for stats demo
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Latest Math scan with 60 questions
const testScanId = 'bd210344-5d6b-4229-93b9-e49d7b5095ea';

async function publishScan() {
  console.log(`\n📤 Publishing scan ${testScanId}...\n`);

  // Get scan info
  const { data: scan } = await supabase
    .from('scans')
    .select('subject')
    .eq('id', testScanId)
    .single();

  if (!scan) {
    console.log('❌ Scan not found');
    return;
  }

  // Publish
  await supabase
    .from('scans')
    .update({ is_system_scan: true })
    .eq('id', testScanId);

  // Auto-map questions
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name')
    .eq('subject', scan.subject);

  const { data: questions } = await supabase
    .from('questions')
    .select('id, topic')
    .eq('scan_id', testScanId);

  const mappings: any[] = [];
  for (const q of questions || []) {
    if (!q.topic) continue;

    const match = topics?.find(t =>
      t.name.toLowerCase() === q.topic.toLowerCase() ||
      t.name.toLowerCase().includes(q.topic.toLowerCase()) ||
      q.topic.toLowerCase().includes(t.name.toLowerCase())
    );

    if (match) {
      mappings.push({
        question_id: q.id,
        topic_id: match.id
      });
    }
  }

  if (mappings.length > 0) {
    await supabase
      .from('topic_question_mapping')
      .upsert(mappings, {
        onConflict: 'question_id,topic_id',
        ignoreDuplicates: true
      });
  }

  console.log(`✅ Published scan with ${mappings.length} question mappings\n`);
}

publishScan();
