/**
 * Verify Biology Upload - Test Automated Workflow
 *
 * Run this after uploading a Biology PDF to verify:
 * 1. Year extracted from filename
 * 2. Questions inserted into questions table
 * 3. Questions auto-mapped to topics
 * 4. Scan appears in Learning Journey
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyBiologyUpload() {
  console.log('🔍 BIOLOGY UPLOAD VERIFICATION\n');
  console.log('='.repeat(70));

  // 1. Get latest KCET Biology scan
  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, year, created_at, status')
    .eq('subject', 'Biology')
    .eq('exam_context', 'KCET')
    .order('created_at', { ascending: false })
    .limit(1);

  if (scansError || !scans || scans.length === 0) {
    console.log('❌ No KCET Biology scans found');
    console.log('\n📤 Upload a Biology PDF with year in filename (e.g., "KCET 2024 Biology.pdf")');
    return;
  }

  const scan = scans[0];
  console.log('📋 SCAN DETAILS');
  console.log(`   Name: ${scan.name}`);
  console.log(`   Status: ${scan.status}`);
  console.log(`   Year: ${scan.year || '❌ NOT SET'}`);
  console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}`);
  console.log('');

  // 2. Check questions in questions table
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, question_text, topic, domain, year, subject, exam_context')
    .eq('scan_id', scan.id);

  const questionCount = questions?.length || 0;

  console.log('📊 QUESTIONS TABLE');
  if (questionCount === 0) {
    console.log('   ❌ No questions found in questions table');
    console.log('   ⚠️  Check backend logs for errors during scan upload');
  } else {
    console.log(`   ✅ ${questionCount} questions inserted`);
    console.log(`   Year field: ${questions[0].year || '❌ NOT SET'}`);
    console.log(`   Subject: ${questions[0].subject}`);
    console.log(`   Exam: ${questions[0].exam_context}`);
  }
  console.log('');

  // 3. Check topic mappings
  if (questionCount > 0) {
    const questionIds = questions.map(q => q.id);

    const { data: mappings, error: mappingsError } = await supabase
      .from('topic_question_mapping')
      .select('question_id, topic_id, topics(name)')
      .in('question_id', questionIds);

    const mappingCount = mappings?.length || 0;

    console.log('🔗 TOPIC MAPPINGS');
    if (mappingCount === 0) {
      console.log('   ❌ No topic mappings found');
      console.log('   ⚠️  Auto-mapping may have failed');
    } else {
      console.log(`   ✅ ${mappingCount}/${questionCount} questions mapped (${Math.round((mappingCount/questionCount)*100)}%)`);

      // Group by topic
      const topicGroups = {};
      mappings.forEach(m => {
        const topicName = m.topics?.name || 'Unknown';
        topicGroups[topicName] = (topicGroups[topicName] || 0) + 1;
      });

      console.log('\n   Distribution:');
      Object.entries(topicGroups)
        .sort((a, b) => b[1] - a[1])
        .forEach(([topic, count]) => {
          console.log(`      - ${topic}: ${count} questions`);
        });
    }
  }
  console.log('');

  // 4. Check Past Year Exams appearance
  console.log('📅 PAST YEAR EXAMS');
  if (!scan.year) {
    console.log('   ❌ Scan will NOT appear (year field is null)');
    console.log('   💡 Ensure filename contains year (e.g., "KCET 2024 Biology.pdf")');
  } else {
    console.log(`   ✅ Will appear under year: ${scan.year}`);
  }
  console.log('');

  // 5. Check Topicwise Preparation
  console.log('📖 TOPICWISE PREPARATION');
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name')
    .eq('subject', 'Biology');

  if (!topics || topics.length === 0) {
    console.log('   ❌ No Biology topics configured');
  } else {
    const topicsWithQuestions = new Set();
    if (questionCount > 0 && mappings) {
      mappings.forEach(m => {
        const topicName = m.topics?.name;
        if (topicName) topicsWithQuestions.add(topicName);
      });
    }

    console.log(`   ✅ ${topicsWithQuestions.size}/${topics.length} topics now have questions`);

    if (topicsWithQuestions.size > 0) {
      console.log('\n   Topics with new questions:');
      Array.from(topicsWithQuestions).forEach(topic => {
        console.log(`      - ${topic}`);
      });
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ VERIFICATION COMPLETE\n');

  // Summary
  const allChecks = [
    { name: 'Scan created', status: !!scan },
    { name: 'Year extracted', status: !!scan.year },
    { name: 'Questions inserted', status: questionCount > 0 },
    { name: 'Topics mapped', status: questionCount > 0 && (mappings?.length || 0) > 0 },
    { name: 'Ready for Past Year Exams', status: !!scan.year },
    { name: 'Ready for Topicwise Prep', status: (mappings?.length || 0) > 0 }
  ];

  const passed = allChecks.filter(c => c.status).length;
  const total = allChecks.length;

  console.log(`📊 Status: ${passed}/${total} checks passed\n`);

  allChecks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
  });

  if (passed === total) {
    console.log('\n🎉 SUCCESS! The automated workflow is working perfectly!');
    console.log('   You can now upload more scans with confidence.\n');
  } else {
    console.log('\n⚠️  Some checks failed. Review the details above.');
    console.log('   Check backend logs at http://localhost:9001 for errors.\n');
  }
}

verifyBiologyUpload();
