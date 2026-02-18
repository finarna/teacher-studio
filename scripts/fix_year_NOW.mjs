/**
 * FINAL FIX: Set year to 2025 for Biology scan
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixYearNow() {
  console.log('🔧 Setting year to 2025...\n');

  // Update scan
  const { error: scanError } = await supabase
    .from('scans')
    .update({ year: '2025' })
    .eq('id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c');

  if (scanError) {
    console.error('❌ Error updating scan:', scanError);
    return;
  }

  console.log('✅ Updated scan year to 2025');

  // Update all questions
  const { error: questionsError } = await supabase
    .from('questions')
    .update({ year: '2025' })
    .eq('scan_id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c');

  if (questionsError) {
    console.error('❌ Error updating questions:', questionsError);
    return;
  }

  const { count } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('scan_id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c');

  console.log(`✅ Updated ${count} questions with year 2025`);
  console.log('\n🎉 DONE! Check Learning Journey now - it should show under "2025"');
}

fixYearNow();
