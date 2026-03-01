#!/usr/bin/env node
import { fixLatexErrors } from '../utils/simpleMathExtractor.ts';

const testInputs = [
  'The function $ f(x) = sqrt{3} sin 2x - cos 2x + 4 $ is one-one',
  'If vec{a} + vec{b} makes an angle',
  '5x + 4y geq 20, x leq 6'
];

console.log('Testing fixLatexErrors output:\n');

for (const input of testInputs) {
  const output = fixLatexErrors(input);

  console.log(`Input:  "${input}"`);
  console.log(`Output: "${output}"`);

  // Check for double backslashes
  const hasDoubleBS = output.includes('\\\\');
  console.log(`Has \\\\\\ (double backslash): ${hasDoubleBS ? '❌ YES' : '✅ NO'}`);

  // Show character codes for backslashes
  const backslashPositions = [];
  for (let i = 0; i < output.length; i++) {
    if (output[i] === '\\') {
      backslashPositions.push(i);
    }
  }

  if (backslashPositions.length > 0) {
    console.log(`Backslash positions: ${backslashPositions.join(', ')}`);

    // Check for consecutive backslashes
    for (let i = 0; i < backslashPositions.length - 1; i++) {
      if (backslashPositions[i + 1] === backslashPositions[i] + 1) {
        console.log(`⚠️  DOUBLE BACKSLASH at positions ${backslashPositions[i]}-${backslashPositions[i + 1]}`);
      }
    }
  }

  console.log();
}
