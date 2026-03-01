#!/usr/bin/env node

// Test the \text{} wrapper removal regex
const testCases = [
  {
    input: '\\text{sqrt}',
    expected: 'sqrt',
    description: 'Simple command without backslash'
  },
  {
    input: '\\text{\\sin}',
    expected: '\\sin',
    description: 'Command with backslash'
  },
  {
    input: '\\text{\\leq}',
    expected: '\\leq',
    description: 'Symbol with backslash'
  },
  {
    input: '\\text{end\\{pmatrix}}',
    expected: 'end\\{pmatrix}',
    description: 'Complex pattern with escaped braces'
  },
  {
    input: '\\text{\\pi}',
    expected: '\\pi',
    description: 'Greek letter'
  },
  {
    input: '$ f(x) = \\frac{1}{\\text{sqrt}([x]^2 - [x] - 6)} $',
    expected: '$ f(x) = \\frac{1}{sqrt([x]^2 - [x] - 6)} $',
    description: 'Full equation with \\text{sqrt}'
  }
];

const regex = /\\text\{((?:[^{}]|\\{|\\})+)\}/g;

console.log('Testing \\text{} wrapper removal regex:\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = test.input.replace(regex, '$1');
  const status = result === test.expected ? '✅' : '❌';

  console.log(`${status} ${test.description}`);
  console.log(`   Input:    "${test.input}"`);
  console.log(`   Expected: "${test.expected}"`);
  console.log(`   Got:      "${result}"`);

  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
  console.log();
}

console.log('─'.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(passed === testCases.length ? '🎉 All tests passed!' : '⚠️  Some tests failed');
