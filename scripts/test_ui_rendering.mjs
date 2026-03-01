#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═'.repeat(100));
console.log('UI RENDERING TEST - Checking actual string values');
console.log('═'.repeat(100));
console.log();

//Get latest scan
const { data: scans } = await supabase
  .from('scans')
  .select('id')
  .order('created_at', { ascending: false })
  .limit(1);

const scanId = scans[0].id;

// Get Q17 (has \sqrt, \sin, \cos)
const { data: questions } = await supabase
  .from('questions')
  .select('question_order, text')
  .eq('scan_id', scanId)
  .eq('question_order', 17)
  .single();

console.log('Q17 TEXT (as stored in database):');
console.log('');

// Show the actual JavaScript string value
const text = questions.text;
console.log('JavaScript string value:', text);
console.log('');

// Count actual backslash CHARACTERS in the string
let singleBackslashCount = 0;
for (let i = 0; i < text.length; i++) {
  if (text[i] === '\\') {
    singleBackslashCount++;
  }
}

console.log(`Total backslash characters in string: ${singleBackslashCount}`);
console.log('');

// Check for specific patterns
console.log('Pattern checks:');
console.log(`  Has "\\sqrt" (JS string literal): ${text.includes('\\sqrt') ? '✅ YES' : '❌ NO'}`);
console.log(`  Has "\\sin":  ${text.includes('\\sin') ? '✅ YES' : '❌ NO'}`);
console.log(`  Has "\\cos":  ${text.includes('\\cos') ? '✅ YES' : '❌ NO'}`);
console.log('');

// Show what JSON.stringify produces (this is what gets sent over HTTP)
console.log('When sent as JSON (JSON.stringify output):');
console.log(JSON.stringify(text));
console.log('');

// Simulate what happens when client receives and parses JSON
const jsonString = JSON.stringify({ text });
const parsed = JSON.parse(jsonString);
console.log('After JSON.parse (what client receives):');
console.log('  Parsed text:', parsed.text);
console.log(`  Same as original: ${parsed.text === text ? '✅ YES' : '❌ NO'}`);
console.log('');

// Show character codes for first few backslashes
console.log('Character analysis of first \\sqrt occurrence:');
const sqrtIndex = text.indexOf('\\sqrt');
if (sqrtIndex !== -1) {
  const snippet = text.substring(sqrtIndex, sqrtIndex + 10);
  console.log(`  Substring: "${snippet}"`);
  console.log('  Character codes:');
  for (let i = 0; i < Math.min(6, snippet.length); i++) {
    const char = snippet[i];
    const code = snippet.charCodeAt(i);
    console.log(`    [${i}] "${char}" = ${code} ${char === '\\' ? '(BACKSLASH)' : ''}`);
  }
}

console.log('');
console.log('═'.repeat(100));
console.log('CONCLUSION:');
console.log('If char[0] is BACKSLASH (code 92), database is storing correctly.');
console.log('If KaTeX still fails to render, the issue is in the UI rendering logic.');
console.log('═'.repeat(100));
