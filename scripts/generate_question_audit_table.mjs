#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═'.repeat(150));
console.log('COMPREHENSIVE QUESTION AUDIT - TABULAR FORMAT');
console.log('═'.repeat(150));
console.log();

// Get latest scan
const { data: scans } = await supabase
  .from('scans')
  .select('id, name, created_at')
  .order('created_at', { ascending: false })
  .limit(1);

if (!scans || scans.length === 0) {
  console.log('❌ No scans found');
  process.exit(1);
}

console.log(`📄 Scan: ${scans[0].name}`);
console.log(`🆔 ID: ${scans[0].id.substring(0, 8)}...`);
console.log(`📅 Created: ${new Date(scans[0].created_at).toLocaleString()}`);
console.log();

// Get ALL questions
const { data: questions, error } = await supabase
  .from('questions')
  .select('question_order, text, options, correct_option_index, has_visual_element, visual_element_type')
  .eq('scan_id', scans[0].id)
  .order('question_order');

if (error) {
  console.log('❌ Error fetching questions:', error);
  process.exit(1);
}

if (!questions || questions.length === 0) {
  console.log('❌ No questions found for this scan');
  process.exit(1);
}

console.log(`Total Questions: ${questions.length}`);
console.log();

// Table header
console.log('═'.repeat(150));
console.log(
  'Q#'.padEnd(5) + '│ ' +
  'Status'.padEnd(8) + '│ ' +
  '\\text{}'.padEnd(8) + '│ ' +
  'Double\\\\'.padEnd(10) + '│ ' +
  'Options'.padEnd(8) + '│ ' +
  'Answer'.padEnd(8) + '│ ' +
  'Text Preview'.padEnd(80)
);
console.log('═'.repeat(150));

const issueLog = [];
let totalIssues = 0;

for (const q of questions) {
  const issues = [];

  // Check for \text{} wrappers
  const textWrappers = q.text?.match(/\\text\{[^}]+\}/g) || [];
  const optionWrappers = q.options?.filter(opt => opt?.includes('\\text{')).length || 0;

  // Check for double backslashes
  const doubleBS = q.text?.includes('\\\\') || q.options?.some(opt => opt?.includes('\\\\'));

  // Check options count
  const optionsCount = q.options?.length || 0;
  const hasAnswer = (q.correct_option_index !== null && q.correct_option_index !== undefined) ? '✓' : '✗';

  // Determine status
  let status = '✅ CLEAN';
  if (textWrappers.length > 0 || optionWrappers > 0) {
    status = '❌ LATEX';
    issues.push('LaTeX \\text{} wrappers');
    totalIssues++;
  }
  if (doubleBS) {
    status = '⚠️  DOUBLE';
    issues.push('Double backslashes');
    totalIssues++;
  }
  if (optionsCount !== 4) {
    status = '⚠️  OPT';
    issues.push(`Only ${optionsCount} options`);
    totalIssues++;
  }
  if (q.correct_option_index === null || q.correct_option_index === undefined) {
    status = '⚠️  ANS';
    issues.push('No answer');
    totalIssues++;
  }

  // Text preview (first 80 chars)
  const textPreview = q.text?.substring(0, 80).replace(/\n/g, ' ') || 'N/A';

  // Count \text{} instances
  const textCount = textWrappers.length + optionWrappers;
  const textStatus = textCount > 0 ? `${textCount}` : '-';
  const doubleStatus = doubleBS ? 'YES' : '-';

  console.log(
    `Q${q.question_order}`.padEnd(5) + '│ ' +
    status.padEnd(8) + '│ ' +
    textStatus.padEnd(8) + '│ ' +
    doubleStatus.padEnd(10) + '│ ' +
    `${optionsCount}/4`.padEnd(8) + '│ ' +
    hasAnswer.padEnd(8) + '│ ' +
    textPreview
  );

  if (issues.length > 0) {
    issueLog.push({
      question: q.question_order,
      issues: issues.join(', ')
    });
  }
}

console.log('═'.repeat(150));
console.log();

// Summary
console.log('📊 SUMMARY');
console.log('═'.repeat(150));
console.log(`Total Questions:           ${questions.length}`);
console.log(`Questions with Issues:     ${totalIssues}`);
console.log(`Questions Clean:           ${questions.length - totalIssues}`);
console.log();

if (issueLog.length > 0) {
  console.log('📋 DETAILED ISSUES:');
  console.log('─'.repeat(150));
  issueLog.forEach(item => {
    console.log(`Q${item.question}: ${item.issues}`);
  });
  console.log('─'.repeat(150));
  console.log();
} else {
  console.log('✅ ALL QUESTIONS PASSED ALL CHECKS!');
  console.log();
}

// Legend
console.log('📖 LEGEND:');
console.log('   Status Codes:');
console.log('   ✅ CLEAN   - Question has no issues');
console.log('   ❌ LATEX   - Question has \\text{} wrapper issues');
console.log('   ⚠️  DOUBLE  - Question has double backslash issues');
console.log('   ⚠️  OPT     - Question has incorrect number of options');
console.log('   ⚠️  ANS     - Question is missing correct answer');
console.log();
console.log('   Columns:');
console.log('   Q#         - Question number (0-59)');
console.log('   \\text{}    - Count of \\text{} wrappers in question and options');
console.log('   Double\\\\   - Presence of double backslashes');
console.log('   Options    - Number of options (should be 4)');
console.log('   Answer     - Whether correct answer is set');
console.log('   Text Preview - First 80 characters of question text');
console.log('═'.repeat(150));
