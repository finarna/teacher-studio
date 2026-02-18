/**
 * Check all Biology scans to understand the extraction status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllBiologyScans() {
  console.log('🔍 Checking all Biology scans...\n');

  const { data: scans, error } = await supabase
    .from('scans')
    .select('*')
    .eq('subject', 'Biology')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Found ${scans.length} Biology scans:\n`);

  for (const scan of scans) {
    // Count questions for this scan
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('scan_id', scan.id);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Scan: ${scan.name || scan.file_name}`);
    console.log(`ID: ${scan.id}`);
    console.log(`Created: ${new Date(scan.created_at).toLocaleString()}`);
    console.log(`Year: ${scan.year || 'NULL'}`);
    console.log(`Exam: ${scan.exam_context}`);
    console.log(`Published: ${scan.is_system_scan ? 'YES ✓' : 'NO'}`);
    console.log(`Questions: ${count}`);
    console.log(`Status: ${scan.status || 'unknown'}`);
  }

  // Check for any unpublished scans with questions
  const unpublished = scans.filter(s => !s.is_system_scan);
  if (unpublished.length > 0) {
    console.log(`\n\n⚠️  Found ${unpublished.length} unpublished Biology scans.`);
    console.log('   Consider cleaning up or publishing these scans.');
  }

  // Check the published scan
  const published = scans.filter(s => s.is_system_scan);
  if (published.length > 0) {
    console.log(`\n\n✅ Found ${published.length} published Biology scan(s):`);
    published.forEach(s => {
      console.log(`   - ${s.name || s.file_name} (${s.year}): ID ${s.id}`);
    });
  }
}

checkAllBiologyScans();
