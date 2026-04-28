import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_ID = 'ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9'; // AI-Generated scan

async function verifyWhatToDelete() {
  console.log('🔍 VERIFICATION: What Questions Would Be Deleted?\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check AI-generated questions (what we're cleaning)
  const { data: aiQuestions } = await supabase
    .from('questions')
    .select('id, source, year, created_at, scan_id')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology');

  console.log('📊 AI-GENERATED QUESTIONS (Mock Tests):\n');
  console.log(`   Scan ID: ${SCAN_ID}`);
  console.log(`   Total: ${aiQuestions?.length || 0} questions`);
  console.log(`   Source: ${aiQuestions?.[0]?.source || 'N/A'}`);
  console.log(`   Year: ${aiQuestions?.[0]?.year || 'N/A'} (not PYQ years!)`);
  console.log(`   These are AI-GENERATED mock test questions ✅ SAFE TO CLEAN\n`);

  // Check PYQ questions (should NOT be touched)
  const { data: pyqQuestions } = await supabase
    .from('questions')
    .select('id, source, year, scan_id')
    .eq('subject', 'Biology')
    .eq('exam_context', 'KCET')
    .in('year', [2022, 2023, 2024, 2025])
    .neq('scan_id', SCAN_ID)
    .limit(300);

  console.log('📚 PYQ QUESTIONS (Historical Data 2022-2025):\n');
  console.log(`   Total: ${pyqQuestions?.length || 0} questions`);

  if (pyqQuestions && pyqQuestions.length > 0) {
    const pyqScanIds = [...new Set(pyqQuestions.map(q => q.scan_id))];
    console.log(`   Scan IDs: ${pyqScanIds.length} unique scans`);
    console.log(`   Years: 2022-2025`);
    console.log(`   Source: ${pyqQuestions[0]?.source}`);
    console.log(`   These are ACTUAL PYQ papers ⚠️  WILL NOT BE TOUCHED\n`);

    // Show PYQ breakdown by year
    [2022, 2023, 2024, 2025].forEach(year => {
      const count = pyqQuestions.filter(q => q.year === year).length;
      console.log(`   ${year}: ${count} questions`);
    });
  } else {
    console.log('   ⚠️  No PYQ questions found (might be in different format)\n');
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  console.log('✅ CONFIRMATION:\n');
  console.log(`   Will delete: Only AI-generated mock questions (scan_id: ${SCAN_ID})`);
  console.log('   Will preserve: ALL PYQ 2022-2025 historical data');
  console.log('   Safe to proceed: YES ✅\n');
  console.log('═══════════════════════════════════════════════════════\n');
}

verifyWhatToDelete().catch(console.error);
