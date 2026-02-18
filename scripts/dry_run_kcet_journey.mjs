/**
 * Dry Run - KCET Learning Journey Status
 *
 * Checks all subjects for:
 * 1. Past Year Papers (scans with year field)
 * 2. Topicwise Preparation (topics with questions)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const subjects = ['Math', 'Physics', 'Chemistry', 'Biology'];
const examContext = 'KCET';

async function checkPastYearPapers(subject) {
  // Get scans with year field
  const { data: scans, error } = await supabase
    .from('scans')
    .select('id, name, year, is_system_scan, created_at')
    .eq('subject', subject)
    .eq('exam_context', examContext)
    .not('year', 'is', null)
    .order('year', { ascending: false });

  if (error) {
    console.error(`   ❌ Error fetching scans:`, error.message);
    return { scans: [], totalQuestions: 0, years: [] };
  }

  if (!scans || scans.length === 0) {
    return { scans: [], totalQuestions: 0, years: [] };
  }

  // Count questions for each scan
  const scansWithCounts = await Promise.all(
    scans.map(async (scan) => {
      const { data: questions } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('scan_id', scan.id);

      return {
        ...scan,
        questionCount: questions || 0
      };
    })
  );

  // Get total questions
  const scanIds = scans.map(s => s.id);
  const { count: totalQuestions } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .in('scan_id', scanIds);

  // Get unique years
  const years = [...new Set(scans.map(s => s.year))].sort((a, b) => b - a);

  return {
    scans: scansWithCounts,
    totalQuestions: totalQuestions || 0,
    years
  };
}

async function checkTopicwisePreparation(subject) {
  // Get official topics for this subject
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('id, name, exam_weightage')
    .eq('subject', subject);

  if (topicsError) {
    console.error(`   ❌ Error fetching topics:`, topicsError.message);
    return { topics: [], totalQuestions: 0 };
  }

  if (!topics || topics.length === 0) {
    return { topics: [], totalQuestions: 0 };
  }

  // Filter topics with KCET weightage > 0
  const kcetTopics = topics.filter(t => {
    const weightage = t.exam_weightage;
    return weightage && weightage[examContext] > 0;
  });

  // For each topic, count mapped questions
  const topicsWithCounts = await Promise.all(
    kcetTopics.map(async (topic) => {
      const { count: questionCount } = await supabase
        .from('topic_question_mapping')
        .select('question_id', { count: 'exact', head: true })
        .eq('topic_id', topic.id);

      return {
        ...topic,
        questionCount: questionCount || 0
      };
    })
  );

  const totalQuestions = topicsWithCounts.reduce((sum, t) => sum + t.questionCount, 0);

  return {
    topics: topicsWithCounts,
    totalQuestions
  };
}

async function dryRunKCETJourney() {
  console.log('🔍 DRY RUN: KCET Learning Journey Status\n');
  console.log('='.repeat(80));
  console.log(`Exam Context: ${examContext}`);
  console.log('='.repeat(80));

  for (const subject of subjects) {
    console.log(`\n📚 ${subject.toUpperCase()}\n`);
    console.log('-'.repeat(80));

    // 1. Past Year Papers
    console.log('📅 PAST YEAR PAPERS:');
    const pastYearData = await checkPastYearPapers(subject);

    if (pastYearData.scans.length === 0) {
      console.log('   ⚠️  No past year papers found (scans with year field)');
    } else {
      console.log(`   ✅ ${pastYearData.scans.length} papers found`);
      console.log(`   📊 ${pastYearData.totalQuestions} total questions`);
      console.log(`   📅 Years available: ${pastYearData.years.join(', ')}`);

      console.log('\n   Papers by year:');
      pastYearData.years.forEach(year => {
        const yearScans = pastYearData.scans.filter(s => s.year === year);
        const yearQuestions = yearScans.reduce((sum, s) => sum + (s.questionCount || 0), 0);
        console.log(`      ${year}: ${yearScans.length} paper(s), ${yearQuestions} questions`);

        yearScans.forEach(scan => {
          const systemTag = scan.is_system_scan ? ' [PUBLISHED]' : '';
          const name = scan.name || scan.id.substring(0, 20);
          console.log(`         - ${name}${systemTag} (${scan.questionCount || 0}Q)`);
        });
      });
    }

    // 2. Topicwise Preparation
    console.log('\n📖 TOPICWISE PREPARATION:');
    const topicData = await checkTopicwisePreparation(subject);

    if (topicData.topics.length === 0) {
      console.log('   ⚠️  No topics configured for KCET');
    } else {
      console.log(`   ✅ ${topicData.topics.length} topics available`);
      console.log(`   📊 ${topicData.totalQuestions} total questions mapped`);

      const topicsWithQuestions = topicData.topics.filter(t => t.questionCount > 0);
      const topicsWithoutQuestions = topicData.topics.filter(t => t.questionCount === 0);

      console.log(`   ✅ ${topicsWithQuestions.length} topics with questions`);
      console.log(`   ⚠️  ${topicsWithoutQuestions.length} topics without questions`);

      if (topicsWithQuestions.length > 0) {
        console.log('\n   Topics with questions:');
        topicsWithQuestions
          .sort((a, b) => b.questionCount - a.questionCount)
          .forEach(topic => {
            console.log(`      - ${topic.name}: ${topic.questionCount}Q`);
          });
      }

      if (topicsWithoutQuestions.length > 0 && topicsWithoutQuestions.length <= 5) {
        console.log('\n   Topics needing questions:');
        topicsWithoutQuestions.forEach(topic => {
          console.log(`      - ${topic.name}`);
        });
      } else if (topicsWithoutQuestions.length > 5) {
        console.log(`\n   ${topicsWithoutQuestions.length} topics need questions (list suppressed)`);
      }
    }

    console.log('\n' + '-'.repeat(80));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY\n');

  for (const subject of subjects) {
    const pastYear = await checkPastYearPapers(subject);
    const topics = await checkTopicwisePreparation(subject);

    const status =
      pastYear.scans.length > 0 && topics.totalQuestions > 0 ? '✅ Ready' :
      pastYear.scans.length > 0 ? '⚠️  Papers only' :
      topics.totalQuestions > 0 ? '⚠️  Topics only' :
      '❌ Not configured';

    console.log(`${subject.padEnd(12)} ${status.padEnd(20)} | Papers: ${String(pastYear.scans.length).padStart(2)} | Questions: ${String(topics.totalQuestions).padStart(4)}`);
  }

  console.log('='.repeat(80));
  console.log('\n✨ Dry run complete!\n');
}

dryRunKCETJourney();
