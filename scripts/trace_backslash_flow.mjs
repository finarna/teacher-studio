#!/usr/bin/env node

/**
 * Trace the exact backslash transformation flow
 */

// Simulate what Gemini returns (properly escaped for JSON)
const geminiRawJSON = `{
  "text": "f(x) = \\\\begin{cases} 2x \\\\\\\\ x^2 \\\\end{cases}"
}`;

console.log('═══════════════════════════════════════════════════════════════');
console.log('BACKSLASH FLOW ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('1️⃣  GEMINI RETURNS (raw JSON string):');
console.log('   ', geminiRawJSON);
console.log('   Backslashes in raw JSON:', (geminiRawJSON.match(/\\/g) || []).length);

console.log('\n2️⃣  JAVASCRIPT PARSES JSON:');
const parsed = JSON.parse(geminiRawJSON);
console.log('   parsed.text =', parsed.text);
console.log('   JSON.stringify(parsed.text) =', JSON.stringify(parsed.text));
console.log('   Actual backslashes in string:', countBackslashes(parsed.text));

function countBackslashes(str) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) === 92) count++; // ASCII 92 is backslash
  }
  return count;
}

console.log('\n3️⃣  FIXER REGEX TEST:');
const text = parsed.text;

// This is what the fixer does (from latexFixer.ts line 151)
const cmd = 'begin';
const re = new RegExp(`\\\\\\\\(${cmd})(?=[^a-zA-Z]|$)`, 'g');

console.log('   Regex pattern:', re.toString());
console.log('   Looking for: \\\\\\\\begin (double backslash)');
console.log('   Text has:', JSON.stringify(text));

const matches = text.match(re);
console.log('   Matches found:', matches);

if (matches) {
  const fixed = text.replace(re, `\\$1`);
  console.log('   After fix:', JSON.stringify(fixed));
} else {
  console.log('   ⚠️  NO MATCH - fixer does nothing!');
}

console.log('\n4️⃣  WHAT IF TEXT ALREADY HAS DOUBLE BACKSLASHES?');
const doubleText = 'f(x) = \\\\begin{cases} 2x \\\\\\\\ x^2 \\\\end{cases}';
console.log('   Input:', JSON.stringify(doubleText));
console.log('   Actual backslashes:', countBackslashes(doubleText));

const fixedDouble = doubleText.replace(re, `\\$1`);
console.log('   After fixer:', JSON.stringify(fixedDouble));
console.log('   Actual backslashes after:', countBackslashes(fixedDouble));

console.log('\n5️⃣  DATABASE STORAGE SIMULATION:');
console.log('\n   SCENARIO A: Store Gemini response directly');
const geminiText = 'f(x) = \\begin{cases} 2x \\\\ x^2 \\end{cases}';
console.log('   String to store:', JSON.stringify(geminiText));
console.log('   Backslashes:', countBackslashes(geminiText));
console.log('   PostgreSQL stores this AS-IS (no extra escaping)');
console.log('   On retrieval, you get back:', JSON.stringify(geminiText));
console.log('   ✅ KaTeX receives: \\begin{cases} - CORRECT!\n');

console.log('   SCENARIO B: Accidentally double-escape before storage');
const doubled = geminiText.replace(/\\/g, '\\\\');
console.log('   String to store:', JSON.stringify(doubled));
console.log('   Backslashes:', countBackslashes(doubled));
console.log('   PostgreSQL stores this AS-IS');
console.log('   On retrieval, you get back:', JSON.stringify(doubled));
console.log('   ❌ KaTeX receives: \\\\begin{cases} - BROKEN!\n');

console.log('\n6️⃣  THE SMOKING GUN:');
console.log('   Your DB has BOTH formats:');
console.log('   - Question 5: single \\ (correct) ✅');
console.log('   - Questions 1-4: double \\\\ (broken) ❌');
console.log('\n   This means: TWO DIFFERENT CODE PATHS are storing questions!');
console.log('   One path stores correctly, one path doubles the backslashes.\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('\n💡 SOLUTION: Find which code path adds extra escaping');
console.log('   Check: supabase.from("questions").insert() calls');
console.log('   Look for: JSON.stringify() before insert');
console.log('   Look for: .replace(/\\\\/g, "\\\\\\\\") patterns\n');
