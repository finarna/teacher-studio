import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findSource() {
  console.log('\n🔍 FINDING WHERE QUESTIONS COME FROM\n');

  // Get Relations and Functions questions directly (no user filter)
  const { data: questions } = await supabase
    .from('questions')
    .select('id, text, topic, subject, exam_context, solution_steps, source, user_id, scan_id, created_at')
    .ilike('text', '%Domain of%')
    .ilike('text', '%1 - |x|%')
    .limit(10);

  if (!questions || questions.length === 0) {
    console.log('❌ No questions found\n');
    return;
  }

  console.log(`✅ Found ${questions.length} matching questions\n`);

  questions.forEach((q, idx) => {
    console.log(`${idx + 1}. ID: ${q.id}`);
    console.log(`   Text: ${q.text?.substring(0, 70)}...`);
    console.log(`   Topic: ${q.topic}`);
    console.log(`   Subject: ${q.subject || 'NULL'}`);
    console.log(`   Exam: ${q.exam_context || 'NULL'}`);
    console.log(`   Source: ${q.source || 'NOT SET'}`);
    console.log(`   User ID: ${q.user_id || 'NULL'}`);
    console.log(`   Scan ID: ${q.scan_id || 'NULL'}`);
    console.log(`   Solutions: ${q.solution_steps?.length || 0} steps`);
    console.log(`   Created: ${new Date(q.created_at).toLocaleString()}\n`);
  });

  // Check if scan exists
  if (questions[0]?.scan_id) {
    console.log('\n📄 Checking Scan Details...\n');
    const { data: scan } = await supabase
      .from('scans')
      .select('*')
      .eq('id', questions[0].scan_id)
      .single();

    if (scan) {
      console.log(`Scan Found:`);
      console.log(`  Name: ${scan.name}`);
      console.log(`  User ID: ${scan.user_id}`);
      console.log(`  Subject: ${scan.subject}`);
      console.log(`  Exam: ${scan.exam_context}`);
      console.log(`  Metadata: ${JSON.stringify(scan.metadata, null, 2)}`);
      console.log(`  Created: ${new Date(scan.created_at).toLocaleString()}\n`);
    } else {
      console.log('⚠️  Scan ID exists but scan not found (orphaned questions)\n');
    }
  }
}

findSource().catch(console.error);
