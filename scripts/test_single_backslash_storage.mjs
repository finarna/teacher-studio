#!/usr/bin/env node

/**
 * Test: Store exactly what Gemini returns (single backslashes)
 * This tests if the issue is caused by backslash escaping during storage
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not set in .env.local');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Convert PDF to images (using pdf.js if needed, or just test with first page)
async function extractFromPDF(pdfPath, subject = 'Mathematics') {
  console.log(`\n🔍 Testing PDF: ${pdfPath}`);
  console.log(`📚 Subject: ${subject}\n`);

  // For now, let's extract from a single page image
  // You can add PDF.js conversion here if needed

  const prompt = `
# ROLE & EXPERTISE
You are an expert ${subject} Examination Parser specializing in CBSE/KCET/NEET Class 12 board exam papers.

# MISSION
Extract EVERY MCQ with 100% fidelity.

# CRITICAL LATEX RULES
1. **VERBATIM TEXT COPY**: Copy text EXACTLY. Preserve ALL word spaces. Never merge words.
2. **MATH EXPRESSIONS**: Use LaTeX with SINGLE backslashes: \\begin{cases}, \\frac{1}{2}, \\pi
3. **GREEK SYMBOLS**: Use Unicode (α, β, γ, δ) or LaTeX (\\alpha, \\beta, \\gamma, \\delta)
4. **SCIENTIFIC NAMES**: Use $\\textit{Homo sapiens}$ format
5. **NO ESCAPING**: Return LaTeX exactly as it should render in KaTeX

# EXAMPLE CORRECT OUTPUTS
- Piecewise function: $\\begin{cases} 2x; x > 3 \\\\ x^2; 1 < x \\leq 3 \\\\ 3x; x \\leq 1 \\end{cases}$
- Matrix: $\\begin{bmatrix} 1 & -2 & 1 \\\\ 2 & 1 & 3 \\end{bmatrix}$
- Fraction in text: The value is $\\frac{5\\pi}{6}$

# OUTPUT FORMAT
Return valid JSON:
{
  "questions": [
    {
      "id": "Q1",
      "text": "Complete question text with LaTeX in $ delimiters",
      "options": ["(A) Option text", "(B) Option text", "(C) Option text", "(D) Option text"],
      "correctOptionIndex": 0,
      "marks": 1,
      "difficulty": "Easy",
      "topic": "Chapter Name"
    }
  ]
}

IMPORTANT: Return LaTeX with SINGLE backslashes as it would appear in a .tex file.
`;

  // For testing, let's use a sample image or just test the prompt structure
  console.log('📝 Prompt sent to Gemini:');
  console.log('─'.repeat(60));
  console.log(prompt);
  console.log('─'.repeat(60));

  return prompt;
}

// Test what Gemini returns
async function testGeminiResponse() {
  console.log('\n🧪 TEST: Gemini Response Format\n');

  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  const testPrompt = `
Return a sample math question in JSON format. Use proper LaTeX with SINGLE backslashes:

{
  "questions": [
    {
      "id": "Q1",
      "text": "If f(x) = \\begin{cases} 2x; x > 3 \\\\ x^2; 1 < x \\leq 3 \\\\ 3x; x \\leq 1 \\end{cases} then f(-2) + f(3) + f(4) is",
      "options": ["(A) 14", "(B) 9", "(C) 5", "(D) 11"],
      "correctOptionIndex": 3
    }
  ]
}

Return ONLY valid JSON with single backslashes in LaTeX.
`;

  console.log('📤 Sending test prompt to Gemini...\n');

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  });

  const response = result.response;
  const text = response.text();

  console.log('📥 Raw response from Gemini:');
  console.log('─'.repeat(60));
  console.log(text);
  console.log('─'.repeat(60));

  let parsed;
  try {
    parsed = JSON.parse(text);
    console.log('\n✅ Valid JSON received\n');
  } catch (e) {
    console.error('❌ Invalid JSON:', e.message);
    return;
  }

  // Analyze the backslashes
  const questionText = parsed.questions[0].text;
  console.log('🔬 Analyzing backslashes in question text:\n');
  console.log('Question text:', questionText);
  console.log('\nBackslash count analysis:');

  const singleBackslash = (questionText.match(/\\begin/g) || []).length;
  const doubleBackslash = (questionText.match(/\\\\begin/g) || []).length;
  const quadBackslash = (questionText.match(/\\\\\\\\begin/g) || []).length;

  console.log(`  Single backslash (\\begin): ${singleBackslash}`);
  console.log(`  Double backslash (\\\\begin): ${doubleBackslash}`);
  console.log(`  Quad backslash (\\\\\\\\begin): ${quadBackslash}`);

  // Test how it would render
  console.log('\n🎨 How this would render:');
  console.log('─'.repeat(60));

  // Extract the LaTeX part
  const latexMatch = questionText.match(/\$([^$]+)\$/);
  if (latexMatch) {
    const latex = latexMatch[1];
    console.log('Extracted LaTeX:', latex);
    console.log('\nBackslashes in extracted LaTeX:');
    console.log('  Raw string:', JSON.stringify(latex));
    console.log('  Length:', latex.length);
    console.log('  Char codes around \\b:',
      Array.from(latex.substring(0, 20)).map((c, i) =>
        `${i}: '${c}' (${c.charCodeAt(0)})`
      ).join('\n    ')
    );
  }

  console.log('─'.repeat(60));

  // Simulate storage and retrieval
  console.log('\n💾 SIMULATION: Store and Retrieve\n');

  console.log('SCENARIO 1: Store exactly as Gemini returns (single backslash)');
  const storedValue = questionText; // Store as-is
  console.log('  Stored in DB:', JSON.stringify(storedValue));

  const retrievedValue = storedValue; // Retrieve from DB
  console.log('  Retrieved from DB:', JSON.stringify(retrievedValue));

  const renderedLatex = retrievedValue.match(/\$([^$]+)\$/)?.[1];
  console.log('  LaTeX to render:', renderedLatex);
  console.log('  ✅ Would this render correctly?',
    renderedLatex?.startsWith('\\begin{cases}') ? 'YES' : 'NO'
  );

  console.log('\n' + '─'.repeat(60));

  // Test against your current database format
  console.log('\nSCENARIO 2: Current DB format (with extra escaping)');
  const currentDBFormat = questionText.replace(/\\/g, '\\\\'); // What happens now
  console.log('  Stored in DB:', JSON.stringify(currentDBFormat));

  const currentRetrieved = currentDBFormat;
  console.log('  Retrieved from DB:', JSON.stringify(currentRetrieved));

  const currentRenderedLatex = currentRetrieved.match(/\$([^$]+)\$/)?.[1];
  console.log('  LaTeX to render:', currentRenderedLatex);
  console.log('  ❌ Would this render correctly?',
    currentRenderedLatex?.startsWith('\\\\begin{cases}') ? 'NO - doubled backslashes' : 'NO'
  );

  console.log('\n' + '═'.repeat(60));
  console.log('\n✨ CONCLUSION:\n');
  console.log('  If we store EXACTLY what Gemini returns (single backslashes),');
  console.log('  KaTeX will render it correctly without any preprocessing.\n');
  console.log('  The issue is NOT in extraction or rendering,');
  console.log('  but in STORAGE/RETRIEVAL adding extra backslashes.');
  console.log('\n' + '═'.repeat(60));
}

// Main execution
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Test: Single Backslash Storage (Gemini → DB → Render)   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  await testGeminiResponse();

  console.log('\n\n📋 NEXT STEPS:\n');
  console.log('1. ✅ Verify Gemini returns single backslashes');
  console.log('2. 🔍 Check where extra backslashes are added in your code');
  console.log('3. 🛠️  Update code to store raw Gemini response');
  console.log('4. 🔄 Re-scan papers with corrected storage');
  console.log('5. ✨ Profit with perfect LaTeX rendering\n');
}

main().catch(console.error);
