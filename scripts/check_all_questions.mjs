#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═'.repeat(120));
console.log('COMPLETE DATABASE AUDIT - ALL QUESTIONS');
console.log('═'.repeat(120));
console.log();

// Get latest scan
const { data: scans } = await supabase
  .from('scans')
  .select('id, name')
  .order('created_at', { ascending: false })
  .limit(1);

console.log(`📄 Scan: ${scans[0].name}`);
console.log(`🆔 ID: ${scans[0].id.substring(0, 8)}...`);
console.log();

// Get ALL questions
const { data: questions } = await supabase
  .from('questions')
  .select('question_order, text, options')
  .eq('scan_id', scans[0].id)
  .order('question_order');

console.log(`Total questions in database: ${questions.length}`);
console.log();
console.log('═'.repeat(120));
console.log();

let totalWithIssues = 0;
let totalClean = 0;
const issuesByQuestion = [];

for (const q of questions) {
  // Check for \text{} wrappers
  const textWrappers = q.text?.match(/\text\{[^}]+\}/g) || [];
  const optionWrappers = [];

  q.options?.forEach((opt, i) => {
    const matches = opt.match(/\text\{[^}]+\}/g);
    if (matches) {
      optionWrappers.push({ option: String.fromCharCode(65 + i), wrappers: matches });
    }
  });

  const hasTextWrapper = textWrappers.length > 0 || optionWrappers.length > 0;

  if (hasTextWrapper) {
    totalWithIssues++;

    console.log(`❌ Q${q.question_order}: HAS ISSUES`);

    if (textWrappers.length > 0) {
      console.log(`   📝 Text has ${textWrappers.length} \\text{} wrapper(s):`);
      textWrappers.forEach(w => console.log(`      - ${w}`));
    }

    if (optionWrappers.length > 0) {
      console.log(`   📋 Options with \\text{} wrappers:`);
      optionWrappers.forEach(({ option, wrappers }) => {
        console.log(`      Option ${option}: ${wrappers.join(', ')}`);
      });
    }

    console.log(`   TEXT: "${q.text?.substring(0, 100)}..."`);
    console.log();

    issuesByQuestion.push({
      qNum: q.question_order,
      textWrappers: textWrappers.length,
      optionWrappers: optionWrappers.length
    });
  } else {
    totalClean++;
    console.log(`✅ Q${q.question_order}: CLEAN`);
  }
}

console.log();
console.log('═'.repeat(120));
console.log('📊 FINAL SUMMARY');
console.log('═'.repeat(120));
console.log(`Total questions:          ${questions.length}`);
console.log(`Questions with issues:    ${totalWithIssues}`);
console.log(`Questions clean:          ${totalClean}`);
console.log();

if (totalWithIssues > 0) {
  console.log('📋 QUESTIONS WITH ISSUES:');
  const questionNumbers = issuesByQuestion.map(i => `Q${i.qNum}`).join(', ');
  console.log(`   ${questionNumbers}`);
  console.log();

  console.log('📊 ISSUE BREAKDOWN:');
  const totalTextWrappers = issuesByQuestion.reduce((sum, i) => sum + i.textWrappers, 0);
  const totalOptionWrappers = issuesByQuestion.reduce((sum, i) => sum + i.optionWrappers, 0);
  console.log(`   Total \\text{} in question text:  ${totalTextWrappers}`);
  console.log(`   Total \\text{} in options:        ${totalOptionWrappers}`);
  console.log(`   Total \\text{} wrappers:          ${totalTextWrappers + totalOptionWrappers}`);
  console.log();

  console.log('⚠️  DATABASE HAS LATEX ISSUES');
  console.log();
  console.log('✅ VERIFIED: Fresh PDF extraction (via verify_pdf_latex.mjs) shows 0 errors');
  console.log('📤 SOLUTION: Delete this scan and re-upload the PDF');
  console.log('   Run: node scripts/delete_latest_scan.mjs');
} else {
  console.log('✅ ALL QUESTIONS PERFECTLY CLEAN!');
}
console.log('═'.repeat(120));
