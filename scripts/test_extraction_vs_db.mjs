#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractQuestionsSimplified } from '../utils/simpleMathExtractor.ts';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═'.repeat(100));
console.log('EXTRACTION vs DATABASE COMPARISON');
console.log('═'.repeat(100));
console.log();

// 1. Get Q17 from DATABASE
console.log('📊 STEP 1: Fetching Q17 from DATABASE...\n');

const { data: scans } = await supabase
  .from('scans')
  .select('id')
  .order('created_at', { ascending: false})
  .limit(1);

const { data: dbQuestions } = await supabase
  .from('questions')
  .select('question_order, text')
  .eq('scan_id', scans[0].id)
  .eq('question_order', 17);

console.log('DATABASE Q17 TEXT (raw JSON):');
console.log(JSON.stringify(dbQuestions[0].text));
console.log();

// Count backslashes
const dbText = dbQuestions[0].text;
const dbSingleBS = (dbText.match(/\\[a-z]/g) || []).length;
const dbDoubleBS = (dbText.match(/\\\\[a-z]/g) || []).length;

console.log(`Backslash Analysis:`);
console.log(`  Single backslash commands (\\x): ${dbSingleBS}`);
console.log(`  Double backslash commands (\\\\x): ${dbDoubleBS}`);
console.log();

// 2. Fresh extraction (just extract - no insert)
console.log('📤 STEP 2: Fresh extraction from PDF (in-memory only)...\n');

const pdfPath = '/Users/apple/FinArna/edujourney---universal-teacher-studio/01-KCET-Board-Exam-Mathematics-M1-2021.pdf';
const pdfBuffer = readFileSync(pdfPath);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

try {
  const freshQuestions = await extractQuestionsSimplified(
    pdfBuffer,
    'Mathematics',
    'KCET',
    genAI
  );

  const freshQ17 = freshQuestions.find(q => q.question_order === 17);

  if (freshQ17) {
    console.log('FRESH EXTRACTION Q17 TEXT (raw JSON):');
    console.log(JSON.stringify(freshQ17.text));
    console.log();

    const freshText = freshQ17.text;
    const freshSingleBS = (freshText.match(/\\[a-z]/g) || []).length;
    const freshDoubleBS = (freshText.match(/\\\\[a-z]/g) || []).length;

    console.log(`Backslash Analysis:`);
    console.log(`  Single backslash commands (\\x): ${freshSingleBS}`);
    console.log(`  Double backslash commands (\\\\x): ${freshDoubleBS}`);
    console.log();

    console.log('═'.repeat(100));
    console.log('COMPARISON');
    console.log('═'.repeat(100));
    console.log(`DATABASE:   ${dbDoubleBS > 0 ? '❌' : '✅'} Has ${dbDoubleBS} double backslashes`);
    console.log(`EXTRACTION: ${freshDoubleBS > 0 ? '❌' : '✅'} Has ${freshDoubleBS} double backslashes`);
    console.log();

    if (dbDoubleBS > 0 && freshDoubleBS === 0) {
      console.log('🔍 DIAGNOSIS: Double backslashes added AFTER extraction, during DB insertion');
    } else if (freshDoubleBS > 0) {
      console.log('🔍 DIAGNOSIS: Double backslashes present in extraction itself');
    } else {
      console.log('✅ Both extraction and database are clean!');
    }
  }
} catch (error) {
  console.error('Error during extraction:', error.message);
}
