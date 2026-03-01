#!/usr/bin/env node

/**
 * Test: Check current database LaTeX format vs. what it should be
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseLatex() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       Database LaTeX Format Analysis                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Get a sample of questions with LaTeX
  console.log('📊 Fetching questions with LaTeX from database...\n');

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text')
    .or('text.ilike.%begin{cases}%,text.ilike.%begin{bmatrix}%,text.ilike.%begin{vmatrix}%')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!questions || questions.length === 0) {
    console.log('⚠️  No questions with LaTeX found');
    return;
  }

  console.log(`✅ Found ${questions.length} questions with LaTeX\n`);
  console.log('═'.repeat(80));

  questions.forEach((q, idx) => {
    console.log(`\n📝 Question ${idx + 1} (ID: ${q.id})`);
    console.log('─'.repeat(80));
    console.log(`Text: ${q.text.substring(0, 150)}...`);

    // Check for LaTeX patterns
    const latexPatterns = {
      'quadBS_begin': /\\\\\\\\begin\{/g,
      'doubleBS_begin': /\\\\begin\{/g,
      'singleBS_begin': /\\begin\{/g,
      'spurious_b_prefix': /\\b\\begin\{/g,
      'dollar_delimiters': /\$/g,
    };

    console.log('\n🔍 Pattern Analysis:');
    Object.entries(latexPatterns).forEach(([name, pattern]) => {
      const matches = (q.text.match(pattern) || []).length;
      if (matches > 0) {
        const status = name.includes('quad') || name.includes('spurious') ? '❌' :
                      name.includes('double') ? '⚠️ ' : '✅';
        console.log(`   ${status} ${name}: ${matches} occurrences`);
      }
    });

    // Extract LaTeX portions
    const latexMatches = q.text.match(/\$([^$]+)\$/g) || [];
    if (latexMatches.length > 0) {
      console.log(`\n📐 LaTeX Expressions (${latexMatches.length} found):`);
      latexMatches.slice(0, 2).forEach((latex, i) => {
        const content = latex.slice(1, -1);
        console.log(`\n   Expression ${i + 1}:`);
        console.log(`   Full: ${latex}`);
        console.log(`   Content: ${content.substring(0, 80)}${content.length > 80 ? '...' : ''}`);
        console.log(`   JSON: ${JSON.stringify(content).substring(0, 100)}...`);

        // Diagnose the issue
        if (content.includes('\\\\\\\\begin')) {
          console.log(`   ❌ ISSUE: Quadruple backslashes detected`);
          console.log(`   FIX: Should be \\begin (single backslash)`);
        } else if (content.includes('\\\\begin')) {
          console.log(`   ⚠️  ISSUE: Double backslashes detected`);
          console.log(`   FIX: Should be \\begin (single backslash)`);
        } else if (content.includes('\\b\\begin')) {
          console.log(`   ❌ ISSUE: Spurious \\b prefix (word boundary escape gone wrong)`);
          console.log(`   FIX: Remove \\b, should be \\begin`);
        } else if (content.includes('\\begin')) {
          console.log(`   ✅ CORRECT: Single backslash format`);
        }

        // Check what it would look like correctly
        if (content.includes('\\\\')) {
          const fixed = content
            .replace(/\\\\\\\\begin/g, '\\begin')
            .replace(/\\\\\\\\end/g, '\\end')
            .replace(/\\\\begin/g, '\\begin')
            .replace(/\\\\end/g, '\\end')
            .replace(/\\\\frac/g, '\\frac')
            .replace(/\\\\leq/g, '\\leq')
            .replace(/\\\\pi/g, '\\pi')
            .replace(/\\b\\begin/g, '\\begin');

          console.log(`\n   💡 Fixed version: ${fixed.substring(0, 80)}${fixed.length > 80 ? '...' : ''}`);
        }
      });
    } else {
      console.log(`\n   ⚠️  No $ delimiters found - LaTeX not wrapped properly`);
    }

    console.log('\n' + '═'.repeat(80));
  });

  // Summary
  console.log('\n\n📊 SUMMARY:\n');

  const totalQuadBS = questions.reduce((sum, q) =>
    sum + (q.text.match(/\\\\\\\\begin/g) || []).length, 0
  );

  const totalDoubleBS = questions.reduce((sum, q) =>
    sum + (q.text.match(/(?<!\\\\)\\\\begin/g) || []).length, 0
  );

  const totalSpuriousB = questions.reduce((sum, q) =>
    sum + (q.text.match(/\\b\\begin/g) || []).length, 0
  );

  console.log(`❌ Quadruple backslashes (\\\\\\\\begin): ${totalQuadBS}`);
  console.log(`⚠️  Double backslashes (\\\\begin): ${totalDoubleBS}`);
  console.log(`❌ Spurious \\b prefix: ${totalSpuriousB}`);

  console.log('\n🔧 ROOT CAUSE:\n');
  console.log('  Gemini returns: $\\begin{cases} ... \\end{cases}$  (single \\)');
  console.log('  Current DB has: $\\\\\\\\begin{cases} ... \\\\\\\\end{cases}$ (quad \\\\\\\\)');
  console.log('  OR has: $\\b\\begin{vmatrix} ... $ (spurious \\b prefix)');

  console.log('\n✅ SOLUTION:\n');
  console.log('  1. Store EXACTLY what Gemini returns (no extra escaping)');
  console.log('  2. Use simple MathRenderer (no backslash collapsing)');
  console.log('  3. Re-scan all papers with corrected storage logic\n');
}

async function testCorrectFormat() {
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║       What Correct Format Should Look Like                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const examples = [
    {
      name: 'Piecewise function',
      gemini: 'If $f(x) = \\begin{cases} 2x; x > 3 \\\\ x^2; x \\leq 3 \\end{cases}$ then',
      correct: true
    },
    {
      name: 'Matrix',
      gemini: 'If $A = \\begin{bmatrix} 1 & -2 \\\\ 2 & 1 \\end{bmatrix}$ then',
      correct: true
    },
    {
      name: 'Current DB (quad backslash)',
      gemini: 'If $f(x) = \\\\\\\\begin{cases} 2x \\\\\\\\ x^2 \\\\\\\\end{cases}$ then',
      correct: false
    },
    {
      name: 'Current DB (spurious \\b)',
      gemini: '$A = \\b\\begin{vmatrix} 1 & -2 \\end{vmatrix}$',
      correct: false
    }
  ];

  examples.forEach(ex => {
    console.log(`${ex.correct ? '✅' : '❌'} ${ex.name}:`);
    console.log(`   String: ${ex.gemini}`);
    console.log(`   JSON: ${JSON.stringify(ex.gemini)}`);

    const latexMatch = ex.gemini.match(/\$([^$]+)\$/);
    if (latexMatch) {
      const latex = latexMatch[1];
      console.log(`   LaTeX for KaTeX: ${latex}`);
      console.log(`   Will render: ${ex.correct ? 'YES ✅' : 'NO ❌'}`);
    }
    console.log('');
  });

  console.log('═'.repeat(80));
  console.log('\nKey insight: JavaScript string literals need \\\\ to represent \\');
  console.log('But when stored in DB and retrieved, it becomes a single \\');
  console.log('PostgreSQL/Supabase stores the actual backslash character,');
  console.log('NOT the escape sequence.\n');
}

async function main() {
  await checkDatabaseLatex();
  await testCorrectFormat();
}

main().catch(console.error);
