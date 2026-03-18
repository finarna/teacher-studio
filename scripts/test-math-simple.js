/**
 * Simple Math PDF Test - Send whole PDF and check extraction
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const PDF_PATH = process.argv[2] || '/Users/apple/FinArna/edujourney---universal-teacher-studio/KCET_2024_Mathematics_Question_Paper_81dab7bc618896a8c141c546b4b6321f.pdf';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not set');
  process.exit(1);
}

async function testExtraction() {
  console.log('🧪 MATH PDF EXTRACTION TEST\n');
  console.log(`📄 PDF: ${PDF_PATH.split('/').pop()}`);

  if (!fs.existsSync(PDF_PATH)) {
    console.error(`❌ PDF not found`);
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const base64 = pdfBuffer.toString('base64');

  console.log(`📊 PDF Size: ${Math.round(pdfBuffer.length / 1024)}KB`);
  console.log(`📊 Base64 Size: ${Math.round(base64.length / 1024)}KB\n`);

  const prompt = `Extract ALL Math MCQ questions from this KCET exam paper.

CRITICAL RULES:
1. Extract the ACTUAL question number from PDF
2. Preserve ALL spaces between words
3. Use LaTeX: $\\frac{1}{2}$, $\\sqrt{x}$, $\\begin{cases}...$
4. Extract EVERY SINGLE question - don't truncate
5. Expected: 60 questions total

Return JSON: {"questions": [{"id": "1", "text": "...", "options": ["(A)...", "(B)...", "(C)...", "(D)..."], "topic": "...", "domain": "...", "difficulty": "...", "blooms": "..."}]}`;

  console.log('🚀 Sending to Gemini...\n');
  const startTime = Date.now();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64 } },
          { text: prompt }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 8192  // Current setting
      }
    });

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`⏱️  API completed in ${elapsed}s\n`);

    const text = response.text;
    console.log(`📊 Response: ${text?.length || 0} chars (~${Math.ceil((text?.length || 0) / 4)} tokens)\n`);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error(`❌ JSON Parse Error: ${e.message}`);
      console.error(`First 500 chars of response:\n${text.substring(0, 500)}...`);
      console.error(`\nLast 500 chars of response:\n...${text.substring(text.length - 500)}`);
      process.exit(1);
    }

    const questions = parsed?.questions || [];
    console.log(`✅ Extracted: ${questions.length} questions\n`);

    if (questions.length === 0) {
      console.error('❌ NO QUESTIONS EXTRACTED!');
      console.log('Response structure:', Object.keys(parsed));
      process.exit(1);
    }

    // Analyze extraction
    console.log('═'.repeat(80));
    console.log('EXTRACTION ANALYSIS');
    console.log('═'.repeat(80));

    const questionIds = questions.map(q => parseInt(q.id) || 0).filter(id => id > 0);
    const minId = Math.min(...questionIds);
    const maxId = Math.max(...questionIds);
    const missing = [];

    for (let i = minId; i <= maxId; i++) {
      if (!questionIds.includes(i)) {
        missing.push(i);
      }
    }

    console.log(`\n📊 Question IDs: ${minId} to ${maxId}`);
    console.log(`📊 Total extracted: ${questions.length}`);
    console.log(`📊 Expected: 60 questions`);

    if (missing.length > 0) {
      console.log(`\n⚠️  MISSING QUESTIONS: ${missing.join(', ')}`);
    }

    if (questions.length < 60) {
      console.log(`\n❌ INCOMPLETE EXTRACTION: Only ${questions.length}/60 questions`);
      console.log(`\n🔍 Possible causes:`);
      console.log(`   1. maxOutputTokens (${8192}) too low - response truncated`);
      console.log(`   2. Complex LaTeX caused token overflow`);
      console.log(`   3. Multi-page questions split incorrectly`);
      console.log(`\n💡 Solution: Increase maxOutputTokens to 16384 or 32768`);
    } else {
      console.log(`\n✅ COMPLETE: All ${questions.length} questions extracted!`);
    }

    // Sample questions
    console.log(`\n📝 Sample Questions:`);
    console.log(`   Q1: ${questions[0].text.substring(0, 80)}...`);
    if (questions.length >= 30) {
      console.log(`   Q30: ${questions[29].text.substring(0, 80)}...`);
    }
    console.log(`   Q${questions.length}: ${questions[questions.length - 1].text.substring(0, 80)}...`);

  } catch (error) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`\n❌ Extraction failed after ${elapsed}s`);
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

testExtraction();
