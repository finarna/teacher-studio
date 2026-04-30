/**
 * CLEAN 2022 NEET DUPLICATES
 *
 * Issue: 2022 scan has 400 questions (100 per subject) but only 200 unique questions.
 * Each subject has 50 duplicates that need to be removed.
 *
 * Strategy:
 * - For each subject, identify duplicate question texts
 * - Keep the first occurrence (by created_at)
 * - Delete the duplicate occurrences
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const SCAN_ID_2022 = 'b19037fb-980a-41e1-89a0-d28a5e1c0033';

async function cleanDuplicates() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧹 CLEANING 2022 NEET DUPLICATES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Scan ID: ${SCAN_ID_2022}\n`);

  // Process each subject
  const subjects = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

  for (const subject of subjects) {
    console.log(`\n📚 Processing ${subject}...`);

    // Get all questions for this subject, ordered by creation time
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, text, created_at')
      .eq('scan_id', SCAN_ID_2022)
      .eq('subject', subject)
      .order('created_at', { ascending: true });

    if (error || !questions) {
      console.error(`   ❌ Error fetching ${subject} questions:`, error);
      continue;
    }

    console.log(`   Found ${questions.length} questions`);

    // Track seen texts and duplicates to delete
    const seenTexts = new Set<string>();
    const duplicatesToDelete: string[] = [];

    for (const q of questions) {
      if (seenTexts.has(q.text)) {
        // This is a duplicate - mark for deletion
        duplicatesToDelete.push(q.id);
      } else {
        // First occurrence - keep it
        seenTexts.add(q.text);
      }
    }

    console.log(`   Unique questions: ${seenTexts.size}`);
    console.log(`   Duplicates found: ${duplicatesToDelete.length}`);

    if (duplicatesToDelete.length === 0) {
      console.log(`   ✅ No duplicates to remove`);
      continue;
    }

    // Delete duplicates
    console.log(`   🗑️  Deleting ${duplicatesToDelete.length} duplicates...`);

    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .in('id', duplicatesToDelete);

    if (deleteError) {
      console.error(`   ❌ Error deleting duplicates:`, deleteError);
    } else {
      console.log(`   ✅ Successfully deleted ${duplicatesToDelete.length} duplicates`);
    }
  }

  // Verify final state
  console.log('\n\n📊 VERIFICATION - Final Question Count:');

  for (const subject of subjects) {
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('scan_id', SCAN_ID_2022)
      .eq('subject', subject);

    const count = questions?.length || 0;
    const status = count === 50 ? '✅' : '❌';
    console.log(`   ${subject}: ${count} ${status}`);
  }

  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id')
    .eq('scan_id', SCAN_ID_2022);

  console.log(`\n   TOTAL: ${allQuestions?.length || 0} questions (Expected: 200)`);

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

cleanDuplicates().catch(console.error);
