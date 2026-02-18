/**
 * Fix the newly uploaded Math scan
 * ID: 988c86f0-75a3-4e53-8308-2347a41df26b
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixNewMathScan() {
  const scanId = '988c86f0-75a3-4e53-8308-2347a41df26b';

  console.log('🔍 Checking new Math scan...\n');

  // Get scan details
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (scanError || !scan) {
    console.error('❌ Scan not found:', scanError);
    return;
  }

  console.log('📋 Scan Details:');
  console.log(`   ID: ${scan.id}`);
  console.log(`   Name: ${scan.name}`);
  console.log(`   Subject: ${scan.subject}`);
  console.log(`   Exam Context: ${scan.exam_context}`);
  console.log(`   Year: ${scan.year || 'NULL ❌'}`);
  console.log(`   Published: ${scan.is_system_scan ? 'YES ✓' : 'NO ❌'}`);
  console.log(`   Status: ${scan.status}`);

  // Get questions
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('id, topic, year')
    .eq('scan_id', scanId);

  if (qError) {
    console.error('❌ Error fetching questions:', qError);
    return;
  }

  console.log(`\n📊 Questions: ${questions.length} total`);

  const withTopic = questions.filter(q => q.topic && q.topic !== '').length;
  const withYear = questions.filter(q => q.year).length;

  console.log(`   With topic: ${withTopic}/${questions.length}`);
  console.log(`   With year: ${withYear}/${questions.length}`);

  // Check what needs to be fixed
  const fixes = [];

  if (!scan.year) {
    fixes.push('Add year field to scan (extract from name or set to 2026)');
  }

  if (!scan.is_system_scan) {
    fixes.push('Publish scan (set is_system_scan = true)');
  }

  if (withYear < questions.length) {
    fixes.push(`Set year field for ${questions.length - withYear} questions`);
  }

  if (withTopic < questions.length) {
    fixes.push(`${questions.length - withTopic} questions have no topic mapping`);
  }

  console.log('\n🔧 Fixes Needed:');
  fixes.forEach((fix, i) => console.log(`   ${i + 1}. ${fix}`));

  // Apply fixes
  console.log('\n🚀 Applying fixes...\n');

  // Fix 1: Extract year from name or set to 2026
  let year = scan.year;
  if (!year) {
    const yearMatch = scan.name?.match(/\b(20\d{2})\b/);
    year = yearMatch ? yearMatch[1] : '2026';

    const { error: updateScanError } = await supabase
      .from('scans')
      .update({ year })
      .eq('id', scanId);

    if (updateScanError) {
      console.error('❌ Error updating scan year:', updateScanError);
    } else {
      console.log(`✅ Set scan year to ${year}`);
    }
  }

  // Fix 2: Update all questions with year
  if (withYear < questions.length) {
    const { error: updateQuestionsError } = await supabase
      .from('questions')
      .update({ year })
      .eq('scan_id', scanId);

    if (updateQuestionsError) {
      console.error('❌ Error updating questions year:', updateQuestionsError);
    } else {
      console.log(`✅ Set year=${year} for all ${questions.length} questions`);
    }
  }

  // Fix 3: Publish if needed
  if (!scan.is_system_scan) {
    const { error: publishError } = await supabase
      .from('scans')
      .update({ is_system_scan: true })
      .eq('id', scanId);

    if (publishError) {
      console.error('❌ Error publishing scan:', publishError);
    } else {
      console.log('✅ Published scan (is_system_scan = true)');
    }
  }

  console.log('\n🎉 Done! Scan should now appear in Past Year Exams.');
  console.log('   Refresh the browser to see changes.');

  if (withTopic < questions.length) {
    console.log(`\n⚠️  NOTE: ${questions.length - withTopic} questions still have no topic mapping.`);
    console.log('   This is a data quality issue from extraction - topics were not detected.');
  }
}

fixNewMathScan();
