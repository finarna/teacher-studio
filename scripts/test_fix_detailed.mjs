#!/usr/bin/env node

// Import the fixLatexErrors function
import { fixLatexErrors } from '../utils/simpleMathExtractor.ts';

// Test with actual problematic patterns
const tests = [
  {
    name: 'Remove \\text{sqrt}',
    input: '\\text{sqrt}',
    shouldContain: '\\sqrt',
    shouldNotContain: '\\text{'
  },
  {
    name: 'Remove \\text{\\sin}',
    input: '\\text{\\sin}',
    shouldContain: '\\sin',
    shouldNotContain: '\\text{'
  },
  {
    name: 'Remove \\text{end\\{pmatrix}}',
    input: '\\text{end\\{pmatrix}}',
    shouldContain: '\\end{pmatrix}',
    shouldNotContain: '\\text{'
  },
  {
    name: 'Q18 full',
    input: 'Domain of the function $ f(x) = \\frac{1}{\\text{sqrt}([x]^2 - [x] - 6)} $ where $ [x] $ is greatest integer $\\text{\\leq} x $ is',
    shouldContain: '\\sqrt',
    shouldNotContain: '\\text{'
  },
  {
    name: 'Q20 excerpt',
    input: '$\\text{\\tan}^{-1} [ \\frac{1}{\\text{sqrt} 3} \\text{\\sin} \\frac{5\\text{\\pi}}{6} ]$',
    shouldContain: '\\tan',
    shouldNotContain: '\\text{'
  },
  {
    name: 'Q21 excerpt',
    input: '$ A = \\begin{pmatrix} 1 & -2 & 1 \\\\ 2 & 1 & 3 \\text{end\\{pmatrix}} $',
    shouldContain: '\\end{pmatrix}',
    shouldNotContain: '\\text{'
  }
];

console.log('═'.repeat(80));
console.log('LaTeX Fix Detailed Test');
console.log('═'.repeat(80));
console.log();

for (const test of tests) {
  console.log(`📝 ${test.name}`);
  console.log(`   Input: ${test.input}`);

  const result = fixLatexErrors(test.input);
  console.log(`   Output: ${result}`);

  const checks = [];

  if (test.shouldContain) {
    const contains = result.includes(test.shouldContain);
    checks.push(contains ? `✅ Contains "${test.shouldContain}"` : `❌ Missing "${test.shouldContain}"`);
  }

  if (test.shouldNotContain) {
    const notContains = !result.includes(test.shouldNotContain);
    checks.push(notContains ? `✅ Removed "${test.shouldNotContain}"` : `❌ Still has "${test.shouldNotContain}"`);
  }

  checks.forEach(c => console.log(`   ${c}`));
  console.log();
}
