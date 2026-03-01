#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get latest scan
const { data: scans } = await supabase
  .from('scans')
  .select('id, name')
  .order('created_at', { ascending: false })
  .limit(1);

if (!scans || scans.length === 0) {
  console.log('❌ No scans found');
  process.exit(1);
}

const scanId = scans[0].id;
console.log(`📄 Scan: ${scans[0].name}`);
console.log(`🆔 ID: ${scanId.substring(0, 8)}...`);
console.log();

// Questions to check
const questionsToCheck = [2, 3, 8, 12, 14, 16, 17, 18, 19, 20, 21, 22, 26, 27, 28, 39, 43, 44];

// Get questions
const { data: questions } = await supabase
  .from('questions')
  .select('question_order, text, options')
  .eq('scan_id', scanId)
  .in('question_order', questionsToCheck)
  .order('question_order');

console.log('═'.repeat(100));
console.log('DATABASE LATEX AUDIT - Question Text & Options');
console.log('═'.repeat(100));
console.log();

let totalIssues = 0;
const issueTypes = {
  textWrapper: 0,
  doubleBackslash: 0,
  clean: 0
};

for (const q of questions) {
  const issues = [];

  // Check question text
  const textHasWrapper = q.text?.includes('\\text{');
  const textHasDouble = q.text?.includes('\\\\');

  // Check options
  const optionsWithWrapper = q.options?.filter(opt => opt.includes('\\text{')).length || 0;
  const optionsWithDouble = q.options?.filter(opt => opt.includes('\\\\')).length || 0;

  if (textHasWrapper || textHasDouble || optionsWithWrapper > 0 || optionsWithDouble > 0) {
    totalIssues++;

    console.log(`❌ Q${q.question_order}: HAS ISSUES`);

    if (textHasWrapper) {
      issues.push(`Text has \\text{} wrappers`);
      issueTypes.textWrapper++;
      const matches = q.text.match(/\\text\{[^}]+\}/g);
      if (matches) {
        console.log(`   📝 Text: ${matches.slice(0, 5).join(', ')}`);
      }
    }

    if (textHasDouble) {
      issues.push(`Text has double backslashes`);
      issueTypes.doubleBackslash++;
    }

    if (optionsWithWrapper > 0) {
      console.log(`   📋 Options with \\text{}: ${optionsWithWrapper}/${q.options.length}`);
    }

    if (optionsWithDouble > 0) {
      console.log(`   📋 Options with \\\\: ${optionsWithDouble}/${q.options.length}`);
    }

    // Show preview
    console.log(`   Preview: ${q.text?.substring(0, 80)}...`);
    console.log();
  } else {
    issueTypes.clean++;
    console.log(`✅ Q${q.question_order}: CLEAN`);
  }
}

console.log();
console.log('═'.repeat(100));
console.log('📊 SUMMARY');
console.log('═'.repeat(100));
console.log(`   Questions checked:        ${questions.length}`);
console.log(`   Questions with issues:    ${totalIssues}`);
console.log(`   Questions clean:          ${issueTypes.clean}`);
console.log();
console.log(`   Issue breakdown:`);
console.log(`   - \\text{} wrappers:      ${issueTypes.textWrapper}`);
console.log(`   - Double backslashes:     ${issueTypes.doubleBackslash}`);
console.log();
console.log(`   Status: ${totalIssues === 0 ? '✅ ALL CLEAN' : '❌ NEEDS RE-UPLOAD'}`);
console.log('═'.repeat(100));
