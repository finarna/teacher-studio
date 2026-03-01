#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═'.repeat(120));
console.log('COMPREHENSIVE RENDERING ISSUE AUDIT');
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

const issues = [];

for (const q of questions) {
  const qIssues = [];

  // Check 1: Naked LaTeX commands outside $ delimiters
  const nakedCommands = [];

  // Look for \command patterns that are NOT inside $ delimiters
  // First, remove all content inside $ ... $ and $$ ... $$
  let textWithoutMath = q.text;
  textWithoutMath = textWithoutMath.replace(/\$\$[\s\S]+?\$\$/g, ''); // Remove display math
  textWithoutMath = textWithoutMath.replace(/\$[^$]+?\$/g, ''); // Remove inline math

  // Now check for LaTeX commands in the remaining text
  const commandPattern = /\\([a-zA-Z]+)/g;
  let match;
  while ((match = commandPattern.exec(textWithoutMath)) !== null) {
    nakedCommands.push(`\\${match[1]}`);
  }

  // Check 2: Words that should be symbols
  const wordIssues = [];
  if (textWithoutMath.match(/\bpi\b/) && !textWithoutMath.match(/\bpitfalls\b|principle|pinned|spin\b/i)) {
    wordIssues.push('word "pi" instead of π symbol');
  }
  if (textWithoutMath.match(/\bsum\b/) && !textWithoutMath.match(/\bsummary|assume\b/i)) {
    wordIssues.push('word "sum" instead of Σ symbol');
  }
  if (textWithoutMath.match(/\btheta\b/)) {
    wordIssues.push('word "theta" instead of θ symbol');
  }
  if (textWithoutMath.match(/\balpha\b/)) {
    wordIssues.push('word "alpha" instead of α symbol');
  }
  if (textWithoutMath.match(/\bbeta\b/)) {
    wordIssues.push('word "beta" instead of β symbol');
  }

  // Check 3: Set notation outside math delimiters
  if (textWithoutMath.includes('\\{') || textWithoutMath.includes('\\}')) {
    wordIssues.push('Set notation braces (\\{, \\}) outside $ delimiters');
  }

  // Check 4: Missing $ before \in, \cap, \cup, \subset etc
  const setOperators = ['\\in', '\\cap', '\\cup', '\\subset', '\\subseteq', '\\times', '\\to', '\\rightarrow'];
  setOperators.forEach(op => {
    if (textWithoutMath.includes(op)) {
      wordIssues.push(`Set operator ${op} outside $ delimiters`);
    }
  });

  // Check options too
  q.options?.forEach((opt, i) => {
    let optWithoutMath = opt;
    optWithoutMath = optWithoutMath.replace(/\$\$[\s\S]+?\$\$/g, '');
    optWithoutMath = optWithoutMath.replace(/\$[^$]+?\$/g, '');

    if (optWithoutMath.match(/\\([a-zA-Z]+)/)) {
      qIssues.push(`Option ${String.fromCharCode(65 + i)}: LaTeX commands outside $ delimiters`);
    }
  });

  if (nakedCommands.length > 0) {
    qIssues.push(`Naked LaTeX commands: ${nakedCommands.slice(0, 5).join(', ')}`);
  }

  if (wordIssues.length > 0) {
    qIssues.push(...wordIssues);
  }

  if (qIssues.length > 0) {
    issues.push({
      qNum: q.question_order,
      issues: qIssues,
      textPreview: q.text.substring(0, 120)
    });

    console.log(`❌ Q${q.question_order}: ${qIssues.length} rendering issue(s)`);
    qIssues.forEach(issue => console.log(`   - ${issue}`));
    console.log(`   Preview: ${q.text.substring(0, 100)}...`);
    console.log();
  }
}

console.log('═'.repeat(120));
console.log('📊 SUMMARY');
console.log('═'.repeat(120));
console.log(`Total questions checked:       ${questions.length}`);
console.log(`Questions with rendering issues: ${issues.length}`);
console.log(`Questions clean:               ${questions.length - issues.length}`);
console.log();

if (issues.length > 0) {
  console.log('🔴 QUESTIONS WITH RENDERING ISSUES:');
  const questionNumbers = issues.map(i => `Q${i.qNum}`).join(', ');
  console.log(`   ${questionNumbers}`);
  console.log();

  console.log('⚠️  These questions have LaTeX commands or math notation OUTSIDE dollar sign delimiters.');
  console.log('   This causes them to render as raw text instead of proper mathematical symbols.');
  console.log();
  console.log('📋 RECOMMENDED ACTION:');
  console.log('   1. Re-run PDF extraction with improved LaTeX delimiter detection');
  console.log('   2. OR: Fix the MathRenderer to auto-wrap these patterns');
  console.log('   3. OR: Run a database migration to fix the delimiter placement');
} else {
  console.log('✅ ALL QUESTIONS HAVE PROPER MATH DELIMITERS!');
}
console.log('═'.repeat(120));
