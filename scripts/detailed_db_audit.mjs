#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const questionsToCheck = [2, 3, 8, 12, 14, 16, 17, 18, 19, 20, 21, 22, 26, 27, 28, 39, 43, 44];

console.log('═'.repeat(100));
console.log('DETAILED DATABASE AUDIT - All Requested Questions');
console.log('═'.repeat(100));
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

// Get questions
const { data: questions } = await supabase
  .from('questions')
  .select('question_order, text, options')
  .eq('scan_id', scans[0].id)
  .in('question_order', questionsToCheck)
  .order('question_order');

let totalWithTextWrapper = 0;
let totalWithDoubleBS = 0;
let totalClean = 0;

for (const q of questions) {
  const textWrappers = q.text?.match(/\\text\{[^}]+\}/g) || [];
  const optionWrappers = [];

  q.options?.forEach((opt, i) => {
    const matches = opt.match(/\\text\{[^}]+\}/g);
    if (matches) {
      optionWrappers.push(`Option ${String.fromCharCode(65 + i)}: ${matches.join(', ')}`);
    }
  });

  const hasTextWrapper = textWrappers.length > 0 || optionWrappers.length > 0;
  const hasDoubleBS = q.text?.includes('\\\\');

  if (hasTextWrapper) totalWithTextWrapper++;
  if (hasDoubleBS) totalWithDoubleBS++;
  if (!hasTextWrapper && !hasDoubleBS) totalClean++;

  if (hasTextWrapper || hasDoubleBS) {
    console.log(`❌ Q${q.question_order}: HAS ISSUES`);

    if (textWrappers.length > 0) {
      console.log(`   📝 Text \\text{} wrappers (${textWrappers.length}): ${textWrappers.slice(0, 5).join(', ')}`);
    }

    if (optionWrappers.length > 0) {
      console.log(`   📋 Option \\text{} wrappers:`);
      optionWrappers.forEach(ow => console.log(`      ${ow}`));
    }

    if (hasDoubleBS) {
      console.log(`   ⚠️  Double backslashes detected`);
    }

    console.log(`   TEXT: ${JSON.stringify(q.text).substring(0, 120)}..."`);
    console.log();
  } else {
    console.log(`✅ Q${q.question_order}: CLEAN`);
  }
}

console.log();
console.log('═'.repeat(100));
console.log('📊 SUMMARY');
console.log('═'.repeat(100));
console.log(`Total questions checked:      ${questions.length}`);
console.log(`Questions with \\text{} wrap:  ${totalWithTextWrapper}`);
console.log(`Questions with \\\\ (double):   ${totalWithDoubleBS}`);
console.log(`Questions clean:              ${totalClean}`);
console.log();

if (totalWithTextWrapper > 0 || totalWithDoubleBS > 0) {
  console.log('⚠️  DATABASE HAS ISSUES');
  console.log();
  console.log('📤 SOLUTION: Delete this scan and re-upload the PDF');
  console.log('   The fresh extraction (verified by verify_pdf_latex.mjs) shows 0 errors.');
  console.log('   Re-uploading will give you clean LaTeX rendering.');
} else {
  console.log('✅ ALL QUESTIONS CLEAN');
}
console.log('═'.repeat(100));
