#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { extractQuestionsSimplified } from '../utils/simpleMathExtractor.ts';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═'.repeat(100));
console.log('COMPARISON: Database (Old) vs Fresh Extraction (New)');
console.log('═'.repeat(100));
console.log();

// 1. Get Q18, Q20, Q21 from DATABASE
console.log('📊 STEP 1: Fetching from DATABASE...\n');

const { data: scans } = await supabase
  .from('scans')
  .select('id, name')
  .order('created_at', { ascending: false})
  .limit(1);

const questionsToCheck = [2, 3, 8, 12, 14, 16, 17, 18, 19, 20, 21, 22, 26, 27, 28, 39, 43, 44];

const { data: dbQuestions } = await supabase
  .from('questions')
  .select('question_order, text, options')
  .eq('scan_id', scans[0].id)
  .in('question_order', questionsToCheck)
  .order('question_order');

console.log(`Database Scan: ${scans[0].name}`);
console.log();

// 2. Extract FRESH from PDF
console.log('📤 STEP 2: Fresh extraction from PDF...\n');

const pdfPath = '/Users/apple/FinArna/edujourney---universal-teacher-studio/01-KCET-Board-Exam-Mathematics-M1-2021.pdf';
const pdfBuffer = readFileSync(pdfPath);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Extract just these questions
const freshQuestions = await extractQuestionsSimplified(
  pdfBuffer,
  'Mathematics',
  'KCET',
  genAI
);

console.log(`Extracted ${freshQuestions.length} questions from PDF\n`);

// 3. Compare
console.log('═'.repeat(100));
console.log('COMPARISON RESULTS');
console.log('═'.repeat(100));
console.log();

let dbIssues = 0;
let freshIssues = 0;
let improved = 0;

for (const qNum of questionsToCheck) {
  const dbQ = dbQuestions.find(q => q.question_order === qNum);
  const freshQ = freshQuestions.find(q => q.question_order === qNum);

  if (!dbQ || !freshQ) {
    console.log(`❌ Q${qNum}: Missing in one of the sources`);
    continue;
  }

  console.log(`Q${qNum}:`);
  console.log('─'.repeat(100));

  // Check for issues
  const dbHasTextWrapper = dbQ.text.includes('\\text{');
  const freshHasTextWrapper = freshQ.text?.includes('\\text{');

  const dbHasDoubleBS = dbQ.text.includes('\\\\');
  const freshHasDoubleBS = freshQ.text?.includes('\\\\');

  console.log(`DATABASE (Old Scan):`);
  console.log(`  \\text{} wrappers:  ${dbHasTextWrapper ? '❌ YES' : '✅ NO'}`);
  console.log(`  Double backslash:   ${dbHasDoubleBS ? '❌ YES' : '✅ NO'}`);
  if (dbHasTextWrapper) {
    const matches = dbQ.text.match(/\\text\{[^}]+\}/g);
    console.log(`  Examples: ${matches?.slice(0, 3).join(', ') || 'none'}`);
  }
  console.log();

  console.log(`FRESH EXTRACTION (New):`);
  console.log(`  \\text{} wrappers:  ${freshHasTextWrapper ? '❌ YES' : '✅ NO'}`);
  console.log(`  Double backslash:   ${freshHasDoubleBS ? '❌ YES' : '✅ NO'}`);
  console.log();

  console.log(`DATABASE TEXT:`);
  console.log(`  ${JSON.stringify(dbQ.text)}`);
  console.log();

  console.log(`FRESH TEXT:`);
  console.log(`  ${JSON.stringify(freshQ.text)}`);
  console.log();

  const dbHasIssue = dbHasTextWrapper || dbHasDoubleBS;
  const freshHasIssue = freshHasTextWrapper || freshHasDoubleBS;
  const isImproved = dbHasIssue && !freshHasIssue;

  if (dbHasIssue) dbIssues++;
  if (freshHasIssue) freshIssues++;
  if (isImproved) improved++;

  console.log(`Result: ${isImproved ? '✅ FRESH IS BETTER' : dbHasIssue ? '⚠️  BOTH HAVE ISSUES' : '✅ BOTH CLEAN'}`);
  console.log();
}

console.log('═'.repeat(100));
console.log('STATISTICS');
console.log('═'.repeat(100));
console.log(`Questions checked:        ${questionsToCheck.length}`);
console.log(`Database issues:          ${dbIssues}`);
console.log(`Fresh extraction issues:  ${freshIssues}`);
console.log(`Improved by fresh:        ${improved}`);
console.log();

console.log('═'.repeat(100));
console.log('CONCLUSION');
console.log('═'.repeat(100));
console.log('If FRESH extraction shows ✅ and DATABASE shows ❌,');
console.log('then delete the old scan and re-upload to get clean LaTeX.');
console.log('═'.repeat(100));
