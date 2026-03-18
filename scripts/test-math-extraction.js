/**
 * Test Math PDF Extraction - Diagnose page-by-page issues
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const PDF_PATH = process.argv[2] || '/Users/apple/FinArna/edujourney---universal-teacher-studio/KCET_2024_Mathematics_Question_Paper_81dab7bc618896a8c141c546b4b6321f.pdf';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not set');
  process.exit(1);
}

// Convert PDF page to base64 image
async function pdfPageToImage(pdfPath, pageNum, scale = 2.5) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const { createCanvas } = await import('canvas');
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  await page.render({ canvasContext: context, viewport }).promise;

  const base64 = canvas.toDataURL('image/png', 1.0).split(',')[1];
  return { base64, width: viewport.width, height: viewport.height, totalPages: pdf.numPages };
}

// Extract questions from single page
async function extractPage(ai, pageNum, base64, totalPages) {
  const prompt = `Extract ALL Math MCQ questions from this page (Page ${pageNum} of ${totalPages}).

RULES:
1. Extract ACTUAL question numbers from PDF
2. Preserve ALL spaces between words
3. Use LaTeX: $\\frac{1}{2}$, $\\sqrt{x}$, etc.
4. Extract ALL questions - don't stop early
5. Return JSON only

Return: { "questions": [{"id": "1", "text": "...", "options": ["(A) ...", "(B) ...", "(C) ...", "(D) ..."], "correctOptionIndex": 0}] }`;

  const startTime = Date.now();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-8b',
      contents: [{
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64 } },
          { text: prompt }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 8192
      }
    });

    const elapsed = Date.now() - startTime;
    const text = response.text;
    const chars = text?.length || 0;
    const estimatedTokens = Math.ceil(chars / 4);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error(`   ❌ JSON Parse Error: ${e.message}`);
      console.error(`   Raw response (first 200 chars): ${text.substring(0, 200)}...`);
      return { success: false, questions: 0, chars, estimatedTokens, elapsed, error: 'JSON_PARSE_FAIL' };
    }

    const questions = parsed?.questions || [];
    return {
      success: questions.length > 0,
      questions: questions.length,
      chars,
      estimatedTokens,
      elapsed,
      questionIds: questions.map(q => q.id).join(', ')
    };

  } catch (error) {
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      questions: 0,
      chars: 0,
      estimatedTokens: 0,
      elapsed,
      error: error.message || 'UNKNOWN_ERROR'
    };
  }
}

// Main test
async function main() {
  console.log('🧪 MATH EXTRACTION DIAGNOSTIC TEST\n');
  console.log(`📄 PDF: ${PDF_PATH.split('/').pop()}`);

  if (!fs.existsSync(PDF_PATH)) {
    console.error(`❌ PDF not found: ${PDF_PATH}`);
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Get first page to know total pages
  const { totalPages } = await pdfPageToImage(PDF_PATH, 1, 2.5);
  console.log(`📊 Total pages: ${totalPages}\n`);

  console.log('═'.repeat(80));
  console.log('PAGE-BY-PAGE EXTRACTION RESULTS');
  console.log('═'.repeat(80));

  const results = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    console.log(`\n📄 Page ${pageNum}/${totalPages}:`);

    const { base64, width, height } = await pdfPageToImage(PDF_PATH, pageNum, 2.5);
    console.log(`   Image: ${width}x${height}px, ${Math.round(base64.length / 1024)}KB`);

    const result = await extractPage(ai, pageNum, base64, totalPages);
    results.push({ pageNum, ...result });

    if (result.success) {
      console.log(`   ✅ Extracted: ${result.questions} questions`);
      console.log(`   📝 IDs: ${result.questionIds}`);
    } else {
      console.log(`   ❌ FAILED: ${result.error || 'Got 0 questions'}`);
    }
    console.log(`   ⏱️  Time: ${result.elapsed}ms`);
    console.log(`   📊 Response: ${result.chars} chars (~${result.estimatedTokens} tokens)`);

    if (result.estimatedTokens > 7000) {
      console.log(`   ⚠️  WARNING: Response near token limit (8192)!`);
    }
  }

  console.log('\n═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));

  const totalQuestions = results.reduce((sum, r) => sum + r.questions, 0);
  const successPages = results.filter(r => r.success).length;
  const failedPages = results.filter(r => !r.success);
  const maxTokens = Math.max(...results.map(r => r.estimatedTokens));

  console.log(`\n✅ Total Questions Extracted: ${totalQuestions}`);
  console.log(`📊 Success Rate: ${successPages}/${totalPages} pages (${Math.round(successPages/totalPages*100)}%)`);
  console.log(`🔢 Max tokens used: ${maxTokens} (limit: 8192)`);

  if (failedPages.length > 0) {
    console.log(`\n❌ FAILED PAGES: ${failedPages.map(r => r.pageNum).join(', ')}`);
    console.log('\nFailure details:');
    failedPages.forEach(r => {
      console.log(`   Page ${r.pageNum}: ${r.error || 'Got 0 questions'} (${r.estimatedTokens} tokens)`);
    });
  }

  if (maxTokens > 7000) {
    console.log('\n⚠️  TOKEN LIMIT ISSUE DETECTED:');
    console.log(`   Some pages are near/exceeding the 8192 token limit`);
    console.log(`   Recommendation: Increase maxOutputTokens to 16384 or 32768`);
  }

  console.log('\n');
}

main().catch(console.error);
