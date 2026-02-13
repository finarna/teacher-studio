import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugSystemScan() {
  console.log('\n🔍 DEBUGGING SYSTEM SCAN QUESTIONS\n');
  console.log('='.repeat(70));

  // 1. Check system scan
  const { data: systemScans } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, is_system_scan, analysis_data')
    .eq('is_system_scan', true)
    .eq('subject', 'Math');

  console.log('\n📋 System Math Scan:\n');
  if (!systemScans || systemScans.length === 0) {
    console.log('❌ No system scans found!\n');
    return;
  }

  systemScans.forEach(s => {
    const qCount = s.analysis_data?.questions?.length || 0;
    console.log(`   ✅ ${s.name}`);
    console.log(`      ID: ${s.id}`);
    console.log(`      Questions in analysis_data: ${qCount}`);
  });

  const scanId = systemScans[0].id;

  // 2. Check if questions are in questions table
  const { data: questions, count: qCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact' })
    .eq('scan_id', scanId);

  console.log(`\n📊 Questions in questions table: ${qCount}\n`);

  if (qCount === 0) {
    console.log('❌ NO QUESTIONS IN QUESTIONS TABLE!');
    console.log('\n⚠️  Questions are stored in analysis_data JSONB.');
    console.log('   The aggregator expects questions in the questions table.');
    console.log('\n🔧 SOLUTION: Questions need to be migrated from analysis_data to questions table\n');
  } else {
    console.log(`✅ Found ${qCount} questions in questions table\n`);

    // Show first question
    if (questions && questions.length > 0) {
      console.log('Sample question:');
      console.log(`   Topic: ${questions[0].topic}`);
      console.log(`   Text: ${questions[0].text?.substring(0, 50)}...\n`);
    }
  }

  console.log('='.repeat(70) + '\n');
}

debugSystemScan().catch(console.error);
