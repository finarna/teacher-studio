/**
 * Cleanup KCET Biology Scans
 *
 * Removes all KCET Biology scans and their associated data:
 * - Questions from questions table
 * - Topic mappings from topic_question_mapping
 * - Scans from scans table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupKCETBiology() {
  console.log('🧹 Starting cleanup of KCET Biology scans...\n');

  try {
    // 1. Find all KCET Biology scans
    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select('id, name, year, is_system_scan, created_at')
      .eq('subject', 'Biology')
      .eq('exam_context', 'KCET');

    if (scansError) {
      console.error('❌ Error fetching scans:', scansError);
      return;
    }

    if (!scans || scans.length === 0) {
      console.log('✅ No KCET Biology scans found. Nothing to clean up.');
      return;
    }

    console.log(`📋 Found ${scans.length} KCET Biology scans:\n`);
    scans.forEach((s, i) => {
      const systemTag = s.is_system_scan ? ' [PUBLISHED]' : '';
      const yearTag = s.year ? ` (${s.year})` : ' (no year)';
      console.log(`   ${i + 1}. ${s.name || s.id.substring(0, 8)}${yearTag}${systemTag}`);
    });

    console.log('\n⚠️  This will DELETE:');
    console.log(`   - ${scans.length} scans`);
    console.log(`   - All associated questions`);
    console.log(`   - All topic mappings`);
    console.log(`   - All practice answers/progress`);

    console.log('\n🔄 Proceeding with deletion in 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const scanIds = scans.map(s => s.id);

    // 2. Get question count before deletion
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id')
      .in('scan_id', scanIds);

    const questionCount = questions?.length || 0;
    console.log(`📊 Found ${questionCount} questions to delete\n`);

    // 3. Delete topic mappings first (if foreign key doesn't cascade)
    if (questionCount > 0) {
      const questionIds = questions.map(q => q.id);

      const { data: mappings } = await supabase
        .from('topic_question_mapping')
        .select('question_id')
        .in('question_id', questionIds);

      const mappingCount = mappings?.length || 0;

      if (mappingCount > 0) {
        console.log(`🔗 Deleting ${mappingCount} topic mappings...`);
        const { error: mappingError } = await supabase
          .from('topic_question_mapping')
          .delete()
          .in('question_id', questionIds);

        if (mappingError) {
          console.error('❌ Error deleting mappings:', mappingError);
        } else {
          console.log(`✅ Deleted ${mappingCount} topic mappings\n`);
        }
      }
    }

    // 4. Delete practice answers
    if (questionCount > 0) {
      const questionIds = questions.map(q => q.id);

      const { count: practiceCount } = await supabase
        .from('practice_answers')
        .select('id', { count: 'exact', head: true })
        .in('question_id', questionIds);

      if (practiceCount && practiceCount > 0) {
        console.log(`📝 Deleting ${practiceCount} practice answers...`);
        const { error: practiceError } = await supabase
          .from('practice_answers')
          .delete()
          .in('question_id', questionIds);

        if (practiceError) {
          console.error('❌ Error deleting practice answers:', practiceError);
        } else {
          console.log(`✅ Deleted ${practiceCount} practice answers\n`);
        }
      }
    }

    // 5. Delete questions (this will cascade delete mappings if FK is set up)
    if (questionCount > 0) {
      console.log(`📝 Deleting ${questionCount} questions...`);
      const { error: deleteQuestionsError } = await supabase
        .from('questions')
        .delete()
        .in('scan_id', scanIds);

      if (deleteQuestionsError) {
        console.error('❌ Error deleting questions:', deleteQuestionsError);
        return;
      }
      console.log(`✅ Deleted ${questionCount} questions\n`);
    }

    // 6. Delete flashcards if any
    const { count: flashcardCount } = await supabase
      .from('flashcards')
      .select('id', { count: 'exact', head: true })
      .in('scan_id', scanIds);

    if (flashcardCount && flashcardCount > 0) {
      console.log(`🎴 Deleting ${flashcardCount} flashcard sets...`);
      const { error: flashcardError } = await supabase
        .from('flashcards')
        .delete()
        .in('scan_id', scanIds);

      if (flashcardError) {
        console.error('❌ Error deleting flashcards:', flashcardError);
      } else {
        console.log(`✅ Deleted ${flashcardCount} flashcard sets\n`);
      }
    }

    // 7. Finally delete scans
    console.log(`🗑️  Deleting ${scans.length} scans...`);
    const { error: deleteScansError } = await supabase
      .from('scans')
      .delete()
      .in('id', scanIds);

    if (deleteScansError) {
      console.error('❌ Error deleting scans:', deleteScansError);
      return;
    }

    console.log(`✅ Deleted ${scans.length} scans\n`);

    // 8. Verify cleanup
    const { data: remainingScans } = await supabase
      .from('scans')
      .select('id')
      .eq('subject', 'Biology')
      .eq('exam_context', 'KCET');

    const { data: remainingQuestions } = await supabase
      .from('questions')
      .select('id')
      .in('scan_id', scanIds);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 CLEANUP COMPLETE!\n');
    console.log(`✅ Deleted:`);
    console.log(`   - ${scans.length} scans`);
    console.log(`   - ${questionCount} questions`);
    console.log(`   - All associated mappings and progress`);
    console.log('\n📊 Verification:');
    console.log(`   - Remaining KCET Biology scans: ${remainingScans?.length || 0}`);
    console.log(`   - Orphaned questions: ${remainingQuestions?.length || 0}`);
    console.log('='.repeat(60));
    console.log('\n✨ You can now upload fresh KCET Biology scans!\n');

  } catch (error) {
    console.error('\n❌ Fatal error during cleanup:', error);
  }
}

cleanupKCETBiology();
