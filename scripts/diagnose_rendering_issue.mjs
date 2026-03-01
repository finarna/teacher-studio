#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═'.repeat(100));
console.log('RENDERING DIAGNOSTIC - Simulating RenderWithMath Component Logic');
console.log('═'.repeat(100));
console.log();

const { data: scans } = await supabase
  .from('scans')
  .select('id')
  .order('created_at', { ascending: false })
  .limit(1);

const { data: questions } = await supabase
  .from('questions')
  .select('question_order, text')
  .eq('scan_id', scans[0].id)
  .in('question_order', [17, 49, 50, 55, 56]);

for (const q of questions) {
  console.log(`Q${q.question_order}:`);
  console.log('');

  const text = q.text;

  // Step 1: Original text from database
  console.log('1. Original from DB:');
  console.log(`   "${text}"`);
  console.log('');

  // Step 2: Simulate RenderWithMath cleanText logic (line 281-285)
  let cleanText = text
    .replace(/\\\\n/g, '\n')  // Double backslash-n to newline (from JSON)
    .replace(/\\\\r/g, '\r')  // Double backslash-r to carriage return (from JSON)
    .replace(/\\\\"/g, '"')   // Double backslash-quote to quote (from JSON)
    .replace(/\n{3,}/g, '\n\n'); // Collapse excessive newlines

  console.log('2. After "junk removal" (lines 281-285):');
  console.log(`   "${cleanText}"`);
  console.log('');

  // Step 3: Simulate normalization logic (line 324)
  const before324 = cleanText;
  cleanText = cleanText.replace(/\\\\\\+/g, '\\');

  console.log('3. After /\\\\\\\\\\\\+/g replacement (line 324):');
  console.log(`   "${cleanText}"`);
  if (before324 !== cleanText) {
    console.log('   ⚠️  TEXT WAS MODIFIED!');
  } else {
    console.log('   ✅ No change');
  }
  console.log('');

  // Step 4: Simulate double-backslash fix (line 326)
  const before326 = cleanText;
  cleanText = cleanText.replace(/\\\\(begin|end|frac|sqrt|sin|cos|tan|det|vmatrix|int|sum|lim|theta|alpha|beta|gamma)/g, '\\$1');

  console.log('4. After double-backslash fix (line 326):');
  console.log(`   "${cleanText}"`);
  if (before326 !== cleanText) {
    console.log('   ⚠️  TEXT WAS MODIFIED - This regex REMOVED backslashes!');
    console.log(`   Before: "${before326}"`);
    console.log(`   After:  "${cleanText}"`);
  } else {
    console.log('   ✅ No change');
  }
  console.log('');

  // Final check
  console.log('5. Final text that would reach KaTeX:');
  console.log(`   "${cleanText}"`);
  console.log('');

  // Check if LaTeX commands are intact
  const hasBackslashSqrt = cleanText.includes('\\sqrt');
  const hasSqrt = cleanText.includes('sqrt');
  const hasBackslashSin = cleanText.includes('\\sin');
  const hasSin = cleanText.includes('sin');

  console.log('LaTeX command check:');
  console.log(`   Has \\sqrt: ${hasBackslashSqrt ? '✅' : '❌'}`);
  console.log(`   Has sqrt (no backslash): ${hasSqrt && !hasBackslashSqrt ? '⚠️  YES - BROKEN!' : '✅ No'}`);
  console.log(`   Has \\sin: ${hasBackslashSin ? '✅' : '❌'}`);
  console.log(`   Has sin (no backslash): ${hasSin && !hasBackslashSin ? '⚠️  YES - BROKEN!' : '✅ No'}`);

  console.log('');
  console.log('─'.repeat(100));
  console.log('');
}

console.log('═'.repeat(100));
console.log('DIAGNOSIS COMPLETE');
console.log('If text was modified by line 326, that is the bug location!');
console.log('═'.repeat(100));
