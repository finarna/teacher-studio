#!/usr/bin/env node
/**
 * COMPREHENSIVE LaTeX/Unicode cleanup for flagship files
 * Handles ALL edge cases to eliminate rendering issues permanently
 */

const fs = require('fs');
const path = require('path');

// Complete unicode escape mapping
const UNICODE_MAP = {
  '\\u00d7': '×',    // multiplication
  '\\u00b5': 'μ',    // micro
  '\\u03bc': 'μ',    // mu
  '\\u2126': 'Ω',    // ohm
  '\\u03a9': 'Ω',    // Omega
  '\\u03c0': 'π',    // pi
  '\\u03b8': 'θ',    // theta
  '\\u03bb': 'λ',    // lambda
  '\\u03c3': 'σ',    // sigma
  '\\u03b1': 'α',    // alpha
  '\\u03b2': 'β',    // beta
  '\\u03b3': 'γ',    // gamma
  '\\u03b4': 'δ',    // delta
  '\\u03b5': 'ε',    // epsilon
  '\\u03c6': 'φ',    // phi
  '\\u03c8': 'ψ',    // psi
  '\\u03c4': 'τ',    // tau
  '\\u00b0': '°',    // degree
  '\\u2070': '⁰',
  '\\u00b9': '¹',
  '\\u00b2': '²',
  '\\u00b3': '³',
  '\\u2074': '⁴',
  '\\u2075': '⁵',
  '\\u2076': '⁶',
  '\\u2077': '⁷',
  '\\u2078': '⁸',
  '\\u2079': '⁹',
  '\\u207a': '⁺',
  '\\u207b': '⁻',
  '\\u2080': '₀',
  '\\u2081': '₁',
  '\\u2082': '₂',
  '\\u2083': '₃',
  '\\u2084': '₄',
  '\\u2085': '₅',
  '\\u2086': '₆',
  '\\u2087': '₇',
  '\\u2088': '₈',
  '\\u2089': '₉',
};

// Superscript mapping
const SUPERSCRIPTS = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '-': '⁻', '+': '⁺', 'n': 'ⁿ'
};

// Subscript mapping
const SUBSCRIPTS = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
};

function cleanText(str) {
  if (!str || typeof str !== 'string') return str;

  let cleaned = str;

  // 1. Decode ALL unicode escapes
  Object.keys(UNICODE_MAP).forEach(esc => {
    const regex = new RegExp(esc.replace(/\\/g, '\\\\'), 'g');
    cleaned = cleaned.replace(regex, UNICODE_MAP[esc]);
  });

  // 2. Handle \circ variants (degree symbol)
  cleaned = cleaned
    .replace(/\^\{?\\circ\}?C/g, '°C')
    .replace(/\^\{?\\circ\}?F/g, '°F')
    .replace(/\\circ/g, '°');

  // 3. Strip \text{} wrappers completely
  cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, (match, content) => content.trim());

  // 4. Handle \Omega (when not in math mode)
  const parts = cleaned.split(/(\$[^$]+\$|\$\$[^$]+\$\$)/g);
  cleaned = parts.map((part, i) => {
    if (i % 2 === 1) return part; // Skip math mode parts
    return part
      .replace(/\\Omega/g, 'Ω')
      .replace(/\\omega/g, 'ω')
      .replace(/\\mu/g, 'μ')
      .replace(/\\pi/g, 'π')
      .replace(/\\theta/g, 'θ')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\epsilon/g, 'ε')
      .replace(/\\phi/g, 'φ')
      .replace(/\\psi/g, 'ψ')
      .replace(/\\tau/g, 'τ')
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '·')
      .replace(/\\pm/g, '±')
      .replace(/\\div/g, '÷')
      // Handle superscripts: 10^{-6} or 10^6
      .replace(/\^\{([0-9\-+n]+)\}/g, (match, content) => {
        return content.split('').map(c => SUPERSCRIPTS[c] || c).join('');
      })
      .replace(/\^([0-9\-+n])/g, (match, digit) => SUPERSCRIPTS[digit] || digit)
      // Handle subscripts: H_2 or H_{2}
      .replace(/_\{([0-9]+)\}/g, (match, content) => {
        return content.split('').map(c => SUBSCRIPTS[c] || c).join('');
      })
      .replace(/_([0-9])/g, (match, digit) => SUBSCRIPTS[digit] || digit);
  }).join('');

  // 5. Handle \sqrt{2} outside math mode
  cleaned = cleaned.replace(/\\sqrt\{([^}]+)\}/g, '√$1');

  // 6. Clean up double spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

function processQuestion(q) {
  return {
    ...q,
    text: cleanText(q.text),
    options: q.options ? q.options.map(opt => cleanText(opt)) : q.options,
    solutionSteps: q.solutionSteps ? q.solutionSteps.map(step => cleanText(step)) : q.solutionSteps,
    examTip: cleanText(q.examTip),
    studyTip: cleanText(q.studyTip),
  };
}

function processFile(filePath) {
  console.log(`\n📖 Processing: ${path.basename(filePath)}`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found, skipping: ${filePath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const questions = data.test_config.questions;

  console.log(`🔧 Cleaning ${questions.length} questions...`);

  // Process all questions
  data.test_config.questions = questions.map(processQuestion);

  // Create backup
  const backupPath = filePath.replace('.json', '.pre-cleanup.json');
  if (!fs.existsSync(backupPath)) {
    console.log(`💾 Creating backup: ${path.basename(backupPath)}`);
    fs.writeFileSync(backupPath, fs.readFileSync(filePath));
  }

  // Write cleaned data
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Cleaned and saved: ${path.basename(filePath)}`);

  // Show sample fixes
  const sampleQuestion = data.test_config.questions.find(q =>
    q.text.includes('μ') || q.text.includes('°') || q.options?.some(o => o.includes('×'))
  );
  if (sampleQuestion) {
    console.log(`\n📝 Sample cleaned text:`);
    console.log(`   "${sampleQuestion.text.substring(0, 100)}..."`);
  }
}

async function main() {
  const rootDir = path.join(__dirname, '..');

  const files = [
    path.join(rootDir, 'flagship_neet_physics_2026_set_a.json'),
    path.join(rootDir, 'flagship_neet_physics_2026_set_b.json'),
  ];

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   COMPREHENSIVE LATEX/UNICODE CLEANUP                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  files.forEach(processFile);

  console.log('\n✨ ALL DONE! ✨');
  console.log('\nFixed issues:');
  console.log('  ✓ Unicode escapes: \\u00d7 → ×, \\u00b5 → μ, \\u2076 → ⁶');
  console.log('  ✓ LaTeX commands: \\text{}, \\Omega, \\times, \\circ');
  console.log('  ✓ Superscripts: 10^6 → 10⁶, 10^{-7} → 10⁻⁷');
  console.log('  ✓ Subscripts: H_2 → H₂');
  console.log('  ✓ Special: ^\\circC → °C');
  console.log('\n👉 Run update-flagship-db.ts to push to database');
}

main().catch(console.error);
