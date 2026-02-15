/**
 * Get Comprehensive Stats Across All Subjects
 *
 * Shows:
 * - Total questions (from published scans)
 * - Total sketch notes
 * - Total flashcards
 * - Total practice tests/quizzes
 * - Breakdown by subject
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getComprehensiveStats() {
  console.log('\n📊 COMPREHENSIVE SYSTEM STATS\n');
  console.log('='.repeat(70));

  try {
    // Get all published scans
    const { data: publishedScans } = await supabase
      .from('scans')
      .select('id, subject, exam_context')
      .eq('is_system_scan', true);

    console.log(`\n✅ Published Scans: ${publishedScans?.length || 0}`);

    if (!publishedScans || publishedScans.length === 0) {
      console.log('\n⚠️  No published scans found. Please publish a scan first.');
      return;
    }

    const scanIds = publishedScans.map(s => s.id);

    // 1. Total Questions (from published scans)
    const { count: totalQuestions } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .in('scan_id', scanIds);

    // 2. Total Sketch Notes (from scans.analysis_data)
    const { data: scansWithAnalysis } = await supabase
      .from('scans')
      .select('analysis_data')
      .in('id', scanIds);

    let totalSketches = 0;
    scansWithAnalysis?.forEach(scan => {
      if (scan.analysis_data?.topicBasedSketches) {
        totalSketches += Object.keys(scan.analysis_data.topicBasedSketches).length;
      }
    });

    // 3. Total Flashcards (from flashcards table)
    // Flashcards are stored as JSONB arrays, sum up array lengths
    const { data: allFlashcardRecords } = await supabase
      .from('flashcards')
      .select('data')
      .in('scan_id', scanIds);

    let totalFlashcards = 0;
    allFlashcardRecords?.forEach(record => {
      if (record.data && Array.isArray(record.data)) {
        totalFlashcards += record.data.length;
      }
    });

    // 4. Total Topic Question Mappings (questions mapped to topics)
    const { count: totalMappedQuestions } = await supabase
      .from('topic_question_mapping')
      .select('*', { count: 'exact', head: true });

    // Overall Stats
    console.log('\n📈 OVERALL STATS');
    console.log('-'.repeat(70));
    console.log(`Total Questions: ${totalQuestions || 0}`);
    console.log(`Total Sketch Notes: ${totalSketches || 0}`);
    console.log(`Total Flashcards: ${totalFlashcards || 0}`);
    console.log(`Total Mapped Questions: ${totalMappedQuestions || 0}`);
    console.log(`Mapping Rate: ${totalQuestions ? Math.round((totalMappedQuestions / totalQuestions) * 100) : 0}%`);

    // Breakdown by Subject
    console.log('\n📚 BREAKDOWN BY SUBJECT');
    console.log('-'.repeat(70));

    const subjects = ['Math', 'Physics', 'Chemistry', 'Biology'];

    for (const subject of subjects) {
      const subjectScans = publishedScans.filter(s => s.subject === subject);

      if (subjectScans.length === 0) {
        console.log(`\n${subject}: No published scans`);
        continue;
      }

      const subjectScanIds = subjectScans.map(s => s.id);

      // Questions
      const { count: subjectQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .in('scan_id', subjectScanIds);

      // Sketches (from scans.analysis_data)
      const { data: subjectScansWithAnalysis } = await supabase
        .from('scans')
        .select('analysis_data')
        .in('id', subjectScanIds);

      let subjectSketches = 0;
      subjectScansWithAnalysis?.forEach(scan => {
        if (scan.analysis_data?.topicBasedSketches) {
          subjectSketches += Object.keys(scan.analysis_data.topicBasedSketches).length;
        }
      });

      // Flashcards (from flashcards table)
      // Count actual cards in JSONB arrays
      const { data: subjectFlashcardRecords } = await supabase
        .from('flashcards')
        .select('data')
        .in('scan_id', subjectScanIds);

      let subjectFlashcards = 0;
      subjectFlashcardRecords?.forEach(record => {
        if (record.data && Array.isArray(record.data)) {
          subjectFlashcards += record.data.length;
        }
      });

      // Topics
      const { count: subjectTopics } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true })
        .eq('subject', subject);

      // Mapped questions for this subject
      const { data: subjectQuestionsList } = await supabase
        .from('questions')
        .select('id')
        .in('scan_id', subjectScanIds);

      const questionIds = (subjectQuestionsList || []).map(q => q.id);

      let mappedCount = 0;
      if (questionIds.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < questionIds.length; i += chunkSize) {
          const chunk = questionIds.slice(i, i + chunkSize);
          const { count } = await supabase
            .from('topic_question_mapping')
            .select('*', { count: 'exact', head: true })
            .in('question_id', chunk);
          mappedCount += count || 0;
        }
      }

      console.log(`\n${subject}:`);
      console.log(`  Published Scans: ${subjectScans.length}`);
      console.log(`  Official Topics: ${subjectTopics || 0}`);
      console.log(`  Total Questions: ${subjectQuestions || 0}`);
      console.log(`  Mapped Questions: ${mappedCount}`);
      console.log(`  Mapping Rate: ${subjectQuestions ? Math.round((mappedCount / subjectQuestions) * 100) : 0}%`);
      console.log(`  Sketch Notes: ${subjectSketches || 0}`);
      console.log(`  Flashcards: ${subjectFlashcards || 0}`);
    }

    // Summary Table
    console.log('\n📋 SUMMARY TABLE');
    console.log('='.repeat(70));
    console.log('Subject      | Scans | Topics | Questions | Mapped | Sketches | Flashcards');
    console.log('-'.repeat(70));

    for (const subject of subjects) {
      const subjectScans = publishedScans.filter(s => s.subject === subject);

      if (subjectScans.length === 0) continue;

      const subjectScanIds = subjectScans.map(s => s.id);

      const { count: q } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .in('scan_id', subjectScanIds);

      // Sketches from scans.analysis_data
      const { data: summaryScansWithAnalysis } = await supabase
        .from('scans')
        .select('analysis_data')
        .in('id', subjectScanIds);

      let s = 0;
      summaryScansWithAnalysis?.forEach(scan => {
        if (scan.analysis_data?.topicBasedSketches) {
          s += Object.keys(scan.analysis_data.topicBasedSketches).length;
        }
      });

      // Flashcards from flashcards table
      // Count actual cards in JSONB arrays
      const { data: summaryFlashcardRecords } = await supabase
        .from('flashcards')
        .select('data')
        .in('scan_id', subjectScanIds);

      let f = 0;
      summaryFlashcardRecords?.forEach(record => {
        if (record.data && Array.isArray(record.data)) {
          f += record.data.length;
        }
      });

      const { count: t } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true })
        .eq('subject', subject);

      const { data: qList } = await supabase
        .from('questions')
        .select('id')
        .in('scan_id', subjectScanIds);

      const qIds = (qList || []).map(q => q.id);
      let m = 0;
      if (qIds.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < qIds.length; i += chunkSize) {
          const chunk = qIds.slice(i, i + chunkSize);
          const { count } = await supabase
            .from('topic_question_mapping')
            .select('*', { count: 'exact', head: true })
            .in('question_id', chunk);
          m += count || 0;
        }
      }

      console.log(
        `${subject.padEnd(12)} | ${String(subjectScans.length).padEnd(5)} | ${String(t || 0).padEnd(6)} | ${String(q || 0).padEnd(9)} | ${String(m).padEnd(6)} | ${String(s || 0).padEnd(8)} | ${f || 0}`
      );
    }

    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

getComprehensiveStats();
