/**
 * Test Script: Validate LaTeX/KaTeX Fixes
 *
 * Tests:
 * 1. Fetch recent Math scans from Supabase
 * 2. Check questions for common LaTeX errors
 * 3. Test auto-fix function
 * 4. Report findings
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Auto-fix LaTeX errors (imported logic from simpleMathExtractor.ts)
 */
function fixLatexErrors(text) {
  if (!text) return text;

  let fixed = text;
  let fixCount = 0;

  const fixes = [
    // Missing backslash before common commands
    [/\bfrac\{/g, '\\frac{'],
    [/\bint\b/g, '\\int'],
    [/\bsum\b/g, '\\sum'],
    [/\bprod\b/g, '\\prod'],
    [/\blim\b/g, '\\lim'],
    [/\bsqrt\{/g, '\\sqrt{'],

    // Trigonometric functions
    [/\bsin\b/g, '\\sin'],
    [/\bcos\b/g, '\\cos'],
    [/\btan\b/g, '\\tan'],
    [/\btan\^/g, '\\tan^'],
    [/\bcot\b/g, '\\cot'],
    [/\bsec\b/g, '\\sec'],
    [/\bcsc\b/g, '\\csc'],

    // Logarithms
    [/\blog\b/g, '\\log'],
    [/\bln\b/g, '\\ln'],

    // Left/Right delimiters
    [/\bleft\(/g, '\\left('],
    [/\bright\)/g, '\\right)'],
    [/\bleft\[/g, '\\left['],
    [/\bright\]/g, '\\right]'],

    // Accents
    [/\bbar\{/g, '\\bar{'],
    [/\bvec\{/g, '\\vec{'],
    [/\bhat\{/g, '\\hat{'],

    // Greek letters
    [/\balpha\b/g, '\\alpha'],
    [/\bbeta\b/g, '\\beta'],
    [/\bgamma\b/g, '\\gamma'],
    [/\btheta\b/g, '\\theta'],
    [/\bpi\b/g, '\\pi'],

    // Relations
    [/\bleq\b/g, '\\leq'],
    [/\bgeq\b/g, '\\geq'],
    [/\bneq\b/g, '\\neq'],

    // Remove trailing backslashes
    [/\\+(\s*[\)\]\}$])/g, '$1'],
  ];

  for (const [pattern, replacement] of fixes) {
    const before = fixed;
    fixed = fixed.replace(pattern, replacement);
    if (fixed !== before) {
      fixCount++;
    }
  }

  return { fixed, fixCount };
}

/**
 * Detect LaTeX errors in text
 */
function detectLatexErrors(text) {
  if (!text) return [];

  const errors = [];

  // Check for missing backslashes
  if (/\brac\{/.test(text)) errors.push('Missing \\frac');
  if (/\bint\s/.test(text) && !/\\int\s/.test(text)) errors.push('Missing \\int');
  if (/\bsqrt\{/.test(text) && !/\\sqrt\{/.test(text)) errors.push('Missing \\sqrt');
  if (/\btan\^/.test(text) && !/\\tan\^/.test(text)) errors.push('Missing \\tan');
  if (/\bsin\s/.test(text) && !/\\sin\s/.test(text)) errors.push('Missing \\sin');
  if (/\bcos\s/.test(text) && !/\\cos\s/.test(text)) errors.push('Missing \\cos');

  // Check for trailing backslashes
  if (/\\+[\)\]\}]\s*$/.test(text)) errors.push('Trailing backslash');

  // Check for common corruption patterns
  if (/\brac\b/.test(text)) errors.push('Corrupted \\frac → rac');
  if (/\bight\b/.test(text)) errors.push('Corrupted \\right → ight');
  if (/\ban\^/.test(text)) errors.push('Corrupted \\tan → an');

  return errors;
}

/**
 * Test a single scan
 */
function testScan(scan) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 SCAN: ${scan.name}`);
  console.log(`   ID: ${scan.id}`);
  console.log(`   Subject: ${scan.subject} | Exam: ${scan.exam_context}`);
  console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}`);

  const questions = scan.analysis_data?.questions || [];
  console.log(`   Questions: ${questions.length}`);

  if (questions.length === 0) {
    console.log('   ⚠️  No questions found in analysis_data');
    return { scanId: scan.id, questionsTested: 0, errorsFound: 0, fixesApplied: 0 };
  }

  let totalErrors = 0;
  let totalFixes = 0;
  let questionsWithErrors = [];

  // Test each question
  questions.forEach((q, idx) => {
    const questionText = q.text || '';
    const solutionSteps = q.solutionSteps || [];
    const masteryMaterial = q.masteryMaterial || {};

    // Check question text
    const questionErrors = detectLatexErrors(questionText);
    if (questionErrors.length > 0) {
      totalErrors += questionErrors.length;
      questionsWithErrors.push({
        id: q.id,
        location: 'question text',
        errors: questionErrors,
        preview: questionText.substring(0, 100)
      });
    }

    // Check solution steps
    solutionSteps.forEach((step, stepIdx) => {
      const stepErrors = detectLatexErrors(step);
      if (stepErrors.length > 0) {
        totalErrors += stepErrors.length;
        questionsWithErrors.push({
          id: q.id,
          location: `solution step ${stepIdx + 1}`,
          errors: stepErrors,
          preview: step.substring(0, 100)
        });
      }
    });

    // Check mastery material
    const coreConcept = masteryMaterial.coreConcept || '';
    const conceptErrors = detectLatexErrors(coreConcept);
    if (conceptErrors.length > 0) {
      totalErrors += conceptErrors.length;
      questionsWithErrors.push({
        id: q.id,
        location: 'mastery material',
        errors: conceptErrors,
        preview: coreConcept.substring(0, 100)
      });
    }

    // Test auto-fix on question text
    if (questionErrors.length > 0) {
      const { fixed, fixCount } = fixLatexErrors(questionText);
      totalFixes += fixCount;

      if (idx < 3) { // Show first 3 examples
        console.log(`\n   🔧 Q${idx + 1} AUTO-FIX TEST:`);
        console.log(`      Before: ${questionText.substring(0, 80)}...`);
        console.log(`      After:  ${fixed.substring(0, 80)}...`);
        console.log(`      Fixes:  ${fixCount} pattern(s) fixed`);
      }
    }
  });

  // Summary
  console.log(`\n   📊 RESULTS:`);
  if (totalErrors === 0) {
    console.log(`      ✅ No LaTeX errors detected!`);
  } else {
    console.log(`      ❌ Found ${totalErrors} LaTeX errors in ${questionsWithErrors.length} locations`);
    console.log(`      🔧 Auto-fix can repair ${totalFixes} patterns`);

    // Show first 5 errors
    console.log(`\n   🔍 ERROR DETAILS (first 5):`);
    questionsWithErrors.slice(0, 5).forEach((item, idx) => {
      console.log(`      ${idx + 1}. ${item.id} (${item.location}):`);
      console.log(`         Errors: ${item.errors.join(', ')}`);
      console.log(`         Preview: "${item.preview}..."`);
    });
  }

  return {
    scanId: scan.id,
    scanName: scan.name,
    questionsTested: questions.length,
    errorsFound: totalErrors,
    fixesApplied: totalFixes,
    questionsWithErrors: questionsWithErrors.length
  };
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 LATEX/KATEX FIX VALIDATION TEST');
  console.log('='.repeat(80));

  try {
    // Fetch recent Math scans (try both "Math" and "Mathematics")
    console.log('\n📥 Fetching recent Math/Mathematics scans from Supabase...');
    let { data: scans, error } = await supabase
      .from('scans')
      .select('id, name, subject, exam_context, status, created_at, analysis_data')
      .or('subject.eq.Math,subject.eq.Mathematics')
      .order('created_at', { ascending: false })
      .limit(5);

    // If no Math scans, try all scans
    if (!scans || scans.length === 0) {
      console.log('⚠️  No Math scans found. Checking all recent scans...');
      const result = await supabase
        .from('scans')
        .select('id, name, subject, exam_context, status, created_at, analysis_data')
        .order('created_at', { ascending: false })
        .limit(5);
      scans = result.data;
      error = result.error;
    }

    if (error) {
      console.error('❌ Supabase error:', error.message);
      process.exit(1);
    }

    if (!scans || scans.length === 0) {
      console.log('⚠️  No scans found in database');
      process.exit(0);
    }

    console.log(`✅ Found ${scans.length} scan(s) to test`);

    // Test each scan
    const results = [];
    for (const scan of scans) {
      const result = testScan(scan);
      results.push(result);
    }

    // Overall summary
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('📊 OVERALL SUMMARY');
    console.log('='.repeat(80));

    const totalScans = results.length;
    const totalQuestions = results.reduce((sum, r) => sum + r.questionsTested, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errorsFound, 0);
    const totalFixes = results.reduce((sum, r) => sum + r.fixesApplied, 0);
    const scansWithErrors = results.filter(r => r.errorsFound > 0).length;

    console.log(`\nScans tested:          ${totalScans}`);
    console.log(`Questions tested:      ${totalQuestions}`);
    console.log(`Scans with errors:     ${scansWithErrors}`);
    console.log(`Total errors found:    ${totalErrors}`);
    console.log(`Auto-fix can repair:   ${totalFixes} patterns`);

    if (totalErrors === 0) {
      console.log(`\n✅ SUCCESS! All Math scans have clean LaTeX formatting.`);
    } else {
      console.log(`\n⚠️  ISSUES FOUND: ${totalErrors} LaTeX errors detected.`);
      console.log(`\n💡 RECOMMENDATION:`);
      console.log(`   - Regenerate solutions for questions with errors`);
      console.log(`   - The auto-fix will apply automatically on next generation`);
      console.log(`   - Or re-extract the scans with the updated extractor`);
    }

    // List scans that need attention
    if (scansWithErrors > 0) {
      console.log(`\n📋 SCANS NEEDING ATTENTION:`);
      results.filter(r => r.errorsFound > 0).forEach((r, idx) => {
        console.log(`   ${idx + 1}. ${r.scanName}`);
        console.log(`      Errors: ${r.errorsFound} | Questions affected: ${r.questionsWithErrors}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('🏁 Test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
