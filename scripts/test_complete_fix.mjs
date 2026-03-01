#!/usr/bin/env node

// Import the fixLatexErrors function
import { fixLatexErrors } from '../utils/simpleMathExtractor.ts';

const testCases = [
  {
    name: 'Q18',
    input: 'Domain of the function $ f(x) = \\frac{1}{\\text{sqrt}([x]^2 - [x] - 6)} $ where $ [x] $ is greatest integer $\\text{\\leq} x $ is',
    expected: 'Domain of the function $ f(x) = \\frac{1}{\\sqrt{([x]^2 - [x] - 6)} $ where $ [x] $ is greatest integer $\\leq x $ is'
  },
  {
    name: 'Q20',
    input: '$\\text{\\tan}^{-1} [ \\frac{1}{\\text{sqrt} 3} \\text{\\sin} \\frac{5\\text{\\pi}}{6} ] - \\text{\\sin}^{-1} [ \\text{\\cos} ( \\text{\\sin}^{-1} \\frac{-\\text{sqrt} 3}{2} ) ] = $',
    expected: '$\\tan^{-1} [ \\frac{1}{\\sqrt{ 3} \\sin \\frac{5\\pi}{6} ] - \\sin^{-1} [ \\cos ( \\sin^{-1} \\frac{-\\sqrt{ 3}{2} ) ] = $'
  },
  {
    name: 'Q21',
    input: 'If $ A = \\begin{pmatrix} 1 & -2 & 1 \\\\ 2 & 1 & 3 \\text{end\\{pmatrix}} $ $ B = \\begin{pmatrix} 2 & 1 \\\\ 3 & 2 \\\\ 1 & 1 \\text{end\\{pmatrix}} $ then $ (AB)\' $ is equal to',
    expected: 'If $ A = \\begin{pmatrix} 1 & -2 & 1 \\\\ 2 & 1 & 3 \\end{pmatrix} $ $ B = \\begin{pmatrix} 2 & 1 \\\\ 3 & 2 \\\\ 1 & 1 \\end{pmatrix} $ then $ (AB)\' $ is equal to'
  }
];

console.log('═'.repeat(80));
console.log('Testing Complete LaTeX Fix Pipeline');
console.log('═'.repeat(80));
console.log();

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = fixLatexErrors(test.input);
  const matches = result === test.expected;

  console.log(`${matches ? '✅' : '❌'} ${test.name}`);
  console.log(`   Input:    ${test.input.substring(0, 80)}...`);
  console.log(`   Expected: ${test.expected.substring(0, 80)}...`);
  console.log(`   Got:      ${result.substring(0, 80)}...`);

  if (!matches) {
    console.log('\n   🔍 Differences:');
    console.log(`   Expected length: ${test.expected.length}`);
    console.log(`   Got length:      ${result.length}`);
    console.log(`   Full Expected: "${test.expected}"`);
    console.log(`   Full Got:      "${result}"`);
  }

  if (matches) {
    passed++;
  } else {
    failed++;
  }
  console.log();
}

console.log('─'.repeat(80));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(passed === testCases.length ? '🎉 All tests passed!' : '⚠️  Some tests failed');
console.log('─'.repeat(80));
