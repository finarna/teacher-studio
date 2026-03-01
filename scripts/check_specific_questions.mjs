#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═'.repeat(80));
console.log('LaTeX Quality Check - Requested Questions');
console.log('═'.repeat(80));
console.log();

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

// Get all questions from this scan
const { data: questions } = await supabase
  .from('questions')
  .select('question_order, text, options')
  .eq('scan_id', scanId)
  .order('question_order', { ascending: true });

if (!questions || questions.length === 0) {
  console.log('❌ No questions found');
  process.exit(1);
}

// Questions to check
const checkQuestions = [2, 16, 17, 18, 19, 20, 21, 22, 26, 27, 28, 39, 43, 44];

let totalIssues = 0;

for (const qNum of checkQuestions) {
  const q = questions.find(q => q.question_order === qNum);
  if (!q) {
    console.log(`Q${qNum}: ❌ NOT FOUND`);
    continue;
  }

  const hasTextWrapper = q.text?.includes('\\text{');
  const hasDoubleBackslash = q.text?.includes('\\\\');

  if (hasTextWrapper || hasDoubleBackslash) {
    totalIssues++;
    console.log(`Q${qNum}: ❌ HAS ISSUES`);

    if (hasTextWrapper) {
      console.log(`  🔸 \\text{} wrapper detected`);
      const matches = q.text.match(/\\text\{[^}]+\}/g);
      if (matches) {
        console.log(`  Examples: ${matches.slice(0, 3).join(', ')}`);
      }
    }

    if (hasDoubleBackslash) {
      console.log(`  🔸 Double backslashes detected`);
    }

    console.log(`  Text preview: ${q.text?.substring(0, 120)}...`);
    console.log();
  } else {
    console.log(`Q${qNum}: ✅ CLEAN`);
  }
}

console.log();
console.log('─'.repeat(80));
console.log(`📊 SUMMARY`);
console.log(`   Questions checked: ${checkQuestions.length}`);
console.log(`   Issues found: ${totalIssues}`);
console.log(`   Status: ${totalIssues === 0 ? '✅ ALL CLEAN' : '❌ NEEDS FIX'}`);
console.log('─'.repeat(80));
