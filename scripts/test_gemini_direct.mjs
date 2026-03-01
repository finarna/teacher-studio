#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { GoogleGenAI, Type } from '@google/genai';
import { readFileSync } from 'fs';
import { fixLatexErrors, fixLatexInObject } from '../utils/simpleMathExtractor.ts';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Read first page of PDF
const pdfPath = '/Users/apple/FinArna/edujourney---universal-teacher-studio/01-KCET-Board-Exam-Mathematics-M1-2021.pdf';
const pdfBuffer = readFileSync(pdfPath);
const base64Pdf = pdfBuffer.toString('base64');

console.log('═'.repeat(100));
console.log('DIRECT GEMINI API TEST - Tracing Backslash Doubling');
console.log('═'.repeat(100));
console.log();

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.NUMBER },
      text: { type: Type.STRING },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      correctOptionIndex: { type: Type.NUMBER },
      marks: { type: Type.NUMBER },
      difficulty: { type: Type.STRING },
      topic: { type: Type.STRING },
      blooms: { type: Type.STRING },
      domain: { type: Type.STRING }
    },
    required: ['id', 'text', 'options', 'correctOptionIndex']
  }
};

const prompt = `
USE SINGLE BACKSLASHES in all LaTeX commands.
✅ CORRECT: \\frac{a}{b}   \\int dx   \\sqrt{x}   \\sin\\theta   \\vec{v}
❌ WRONG:   \\\\frac{a}{b}  \\\\int dx  \\\\sqrt{x}  \\\\sin\\theta  \\\\vec{v}

Extract ONLY questions 1-5 from this PDF.
`;

try {
  console.log('📤 STEP 1: Calling Gemini API...\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf
          }
        },
        { text: prompt }
      ]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1,
    },
  });

  const rawText = response.text;

  console.log('📥 STEP 2: Gemini Response (first 1000 chars):');
  console.log('─'.repeat(100));
  console.log(rawText.substring(0, 1000));
  console.log('─'.repeat(100));
  console.log();

  // Check for backslashes in raw response
  const rawHasDoubleBS = rawText.includes('\\\\\\\\');
  const rawHasSingleBS = rawText.includes('\\\\') && !rawText.includes('\\\\\\\\');
  console.log(`Raw response has \\\\\\\\\\\\\\\\: ${rawHasDoubleBS ? '❌ YES (4 backslashes in string literal)' : '✅ NO'}`);
  console.log(`Raw response has \\\\\\\\: ${rawHasSingleBS ? '✅ YES (2 backslashes in string literal = correct)' : '❌ NO'}`);
  console.log();

  console.log('📊 STEP 3: After JSON.parse()...');
  console.log('─'.repeat(100));

  const parsedData = JSON.parse(rawText);

  // Check Q2 which has LaTeX
  if (parsedData && parsedData[1]) {
    const q2Text = parsedData[1].text;
    console.log('Q2 text:', q2Text);
    console.log();
    console.log('Q2 text (JSON.stringify):', JSON.stringify(q2Text));
    console.log();

    // Count backslashes in the JavaScript string
    let backslashCount = 0;
    let doubleBackslashCount = 0;
    for (let i = 0; i < q2Text.length; i++) {
      if (q2Text[i] === '\\') {
        backslashCount++;
        if (i + 1 < q2Text.length && q2Text[i + 1] === '\\') {
          doubleBackslashCount++;
          i++; // Skip next backslash
        }
      }
    }
    console.log(`Backslash count in JavaScript string: ${backslashCount}`);
    console.log(`Double backslash sequences (\\\\): ${doubleBackslashCount}`);
    console.log();

    // Check if LaTeX commands have single or double backslashes
    const hasSqrt = q2Text.includes('\\sqrt');
    const hasDoubleSqrt = q2Text.includes('\\\\sqrt');
    console.log(`Contains \\sqrt (single): ${hasSqrt ? '✅ YES' : '❌ NO'}`);
    console.log(`Contains \\\\sqrt (double): ${hasDoubleSqrt ? '❌ YES (BUG!)' : '✅ NO'}`);
  }
  console.log('─'.repeat(100));
  console.log();

  console.log('🔧 STEP 4: After fixLatexErrors()...');
  console.log('─'.repeat(100));

  if (parsedData && parsedData[1]) {
    const fixed = fixLatexErrors(parsedData[1].text);
    console.log('Q2 text after fixLatexErrors:', fixed);
    console.log();
    console.log('Q2 text (JSON.stringify):', JSON.stringify(fixed));
    console.log();

    const hasDoubleSqrt = fixed.includes('\\\\sqrt');
    console.log(`Contains \\\\sqrt (double): ${hasDoubleSqrt ? '❌ YES (BUG!)' : '✅ NO'}`);
  }
  console.log('─'.repeat(100));
  console.log();

  console.log('🔧 STEP 5: After fixLatexInObject()...');
  console.log('─'.repeat(100));

  const fixedResult = fixLatexInObject(parsedData);

  if (fixedResult && fixedResult[1]) {
    const fixed = fixedResult[1].text;
    console.log('Q2 text after fixLatexInObject:', fixed);
    console.log();
    console.log('Q2 text (JSON.stringify):', JSON.stringify(fixed));
    console.log();

    const hasDoubleSqrt = fixed.includes('\\\\sqrt');
    console.log(`Contains \\\\sqrt (double): ${hasDoubleSqrt ? '❌ YES (BUG!)' : '✅ NO'}`);
  }
  console.log('─'.repeat(100));
  console.log();

  console.log('═'.repeat(100));
  console.log('CONCLUSION');
  console.log('═'.repeat(100));
  console.log('Compare the backslash count at each step to find where doubling occurs.');
  console.log('═'.repeat(100));

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error);
}
