/**
 * Fix Biology Scan Year Field
 *
 * Updates the published KCET Biology scan to have year=2025
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixBiologyYear() {
  console.log('🔧 Fixing Biology scan year field...\n');

  // Find the published Biology scan
  const { data: scans, error } = await supabase
    .from('scans')
    .select('id, name, year, is_system_scan')
    .eq('subject', 'Biology')
    .eq('exam_context', 'KCET')
    .eq('is_system_scan', true);

  if (error) {
    console.error('❌ Error fetching scan:', error);
    return;
  }

  if (!scans || scans.length === 0) {
    console.log('⚠️  No published Biology scan found');
    return;
  }

  const scan = scans[0];
  console.log(`📋 Found scan: ${scan.name}`);
  console.log(`   Current year: ${scan.year || 'NULL'}`);

  // Extract year from filename
  const extractYearFromFilename = (name) => {
    if (!name) return null;
    const yearMatch = name.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : null;
  };

  const extractedYear = extractYearFromFilename(scan.name);
  console.log(`   Extracted year: ${extractedYear}`);

  if (!extractedYear) {
    console.log('❌ Could not extract year from filename');
    return;
  }

  // Update scan year
  const { error: updateError } = await supabase
    .from('scans')
    .update({ year: extractedYear })
    .eq('id', scan.id);

  if (updateError) {
    console.error('❌ Error updating scan:', updateError);
    return;
  }

  console.log(`✅ Updated scan year to ${extractedYear}`);

  // Update all questions from this scan
  const { error: questionsError } = await supabase
    .from('questions')
    .update({ year: extractedYear })
    .eq('scan_id', scan.id);

  if (questionsError) {
    console.error('❌ Error updating questions:', questionsError);
    return;
  }

  const { count } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('scan_id', scan.id);

  console.log(`✅ Updated ${count} questions with year ${extractedYear}`);

  console.log('\n🎉 Fix complete! Scan should now appear in Past Year Exams under year', extractedYear);
}

fixBiologyYear();
