/**
 * Test Biology Extraction with KCET 2022 PDF
 * Validates the fix for 5-minute hangs
 */

import { readFileSync } from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ Missing VITE_GEMINI_API_KEY in .env.local');
  process.exit(1);
}

const pdfPath = '/Users/apple/Downloads/KCET 2022 Question Paper for Biology - Free PDF Download.pdf';

async function testBiologyExtraction() {
  console.log('🧪 Testing Biology Extraction Performance\n');
  console.log('='.repeat(70));
  console.log(`📄 PDF: ${pdfPath}`);
  console.log('='.repeat(70));

  try {
    // Read PDF and convert to base64
    console.log('\n📖 Reading PDF file...');
    const pdfBuffer = readFileSync(pdfPath);
    const base64Data = pdfBuffer.toString('base64');
    console.log(`✅ PDF loaded: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-1.5-pro'; // PRO: Most reliable for large PDFs + schema

    console.log(`\n🚀 Using model: ${model} (reliable for schema extraction)`);
    console.log(`⏱️  Starting timer... (Pro may take 30-60 seconds)`);

    const startTime = Date.now();

    // Define schema
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER, description: "Question number" },
          text: { type: Type.STRING, description: "Question text" },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "A, B, C, or D" },
                text: { type: Type.STRING, description: "Option text" },
                isCorrect: { type: Type.BOOLEAN, description: "Is correct" },
              },
              required: ["id", "text", "isCorrect"],
            },
          },
          topic: { type: Type.STRING },
          domain: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          blooms: { type: Type.STRING },
          hasVisualElement: { type: Type.BOOLEAN },
        },
        required: ["id", "text", "options", "hasVisualElement", "topic", "domain", "difficulty", "blooms"],
      },
    };

    const extractionPrompt = `Extract ALL Biology MCQs from this KCET Class 12 exam paper.

CRITICAL RULES:
1. PRESERVE SPACES: "Human Hormone" NOT "HumanHormone"
2. Scientific names: Use $\\textit{Homo sapiens}$ format
3. Greek symbols: Use Unicode (α, β, γ) NOT LaTeX
4. Match-the-following: Format as "List-I: 1) Item, 2) Item..."
5. Visual elements: Set hasVisualElement=true for diagrams/tables/figures

Extract ALL questions (typically 50-60 for KCET).`;

    // Add timeout (Pro needs more time)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('⏱️  TIMEOUT after 2 minutes')), 120000)
    );

    console.log('\n🔄 Sending request to Gemini API...\n');

    const responsePromise = ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data,
            },
          },
          {
            text: extractionPrompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
        maxOutputTokens: 100000, // Pro can handle larger responses
      },
    });

    const response = await Promise.race([responsePromise, timeoutPromise]);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Response received in ${elapsed} seconds\n`);

    const text = response.text || '[]';
    console.log(`📏 Response length: ${text.length} characters`);

    // Parse questions
    const questions = JSON.parse(text);

    if (!Array.isArray(questions)) {
      throw new Error('Response is not an array');
    }

    console.log(`\n📊 RESULTS:`);
    console.log(`   ✅ Questions extracted: ${questions.length}`);
    console.log(`   🖼️  Visual elements: ${questions.filter(q => q.hasVisualElement).length}`);
    console.log(`   ⏱️  Total time: ${elapsed} seconds`);

    // Show sample questions
    console.log(`\n📋 Sample Questions:`);
    questions.slice(0, 3).forEach((q, i) => {
      console.log(`\n   ${i + 1}. Question ${q.id}: ${q.text.substring(0, 80)}...`);
      console.log(`      Domain: ${q.domain}`);
      console.log(`      Topic: ${q.topic}`);
      console.log(`      Options: ${q.options.length}`);
    });

    // Domain distribution
    console.log(`\n🗂️  Domain Distribution:`);
    const domainCounts = {};
    questions.forEach(q => {
      domainCounts[q.domain] = (domainCounts[q.domain] || 0) + 1;
    });
    Object.entries(domainCounts).forEach(([domain, count]) => {
      console.log(`   ${domain}: ${count} questions`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('🎉 VALIDATION SUCCESSFUL!');
    console.log(`   Model: ${model}`);
    console.log(`   Time: ${elapsed}s (target: <60s for Pro)`);
    console.log(`   Status: ${elapsed < 60 ? '✅ GOOD' : elapsed < 120 ? '⚠️  SLOW' : '❌ TIMEOUT'}`);
    console.log('='.repeat(70));

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n❌ FAILED after ${elapsed} seconds`);
    console.error(`   Error: ${error.message}`);

    if (elapsed > 90) {
      console.error(`   ⏱️  TIMEOUT: Request exceeded 90 seconds`);
    }

    process.exit(1);
  }
}

// Run test
const startTime = Date.now();
testBiologyExtraction().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
