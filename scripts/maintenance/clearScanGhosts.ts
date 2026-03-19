import { supabaseAdmin } from '../../lib/supabaseServer';
import dotenv from 'dotenv';
dotenv.config();

async function runCleanup() {
  const scanId = 'de1200d5-2f5c-4e38-a2c4-8b6cf4497c3a';
  console.log(`🧹 [EMERGENCY CLEANUP] Clearing orphaned questions for scan: ${scanId}`);

  try {
    const { count, error } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('scan_id', scanId);

    if (error) throw error;
    console.log(`✅ Success! Wiped ghosts for Biology scan.`);

    // RESET THE SCAN SUMMARY TOO (This fixes the '1000' in the UI)
    const { error: scanErr } = await supabaseAdmin
      .from('scans')
      .update({
        analysis_data: null,
        summary: null,
        status: 'Processing'
      })
      .eq('id', scanId);

    if (scanErr) console.warn('⚠️ Could not reset scan summary, but questions are cleared.');
    else console.log('✨ [UI RESET] Dashboard stats cleared.');
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  }
}

runCleanup();
