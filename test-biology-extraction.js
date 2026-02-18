/**
 * Test Biology Extraction - Mimics file upload flow
 */

import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = 'AIzaSyAKqwcOh0O5C3mi172QhCkPeaqn-8zAzdY';
const PDF_PATH = '/Users/apple/Downloads/KCET_2024_Biology_Question_Paper_da1769df106b3ea9e4d48557d5e777d3.pdf';

// Read PDF and convert to base64 (mimics browser FileReader)
function pdfToBase64(filePath) {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
}

async function testUltraFastExtraction() {
  console.log('🧪 Testing Ultra-Fast Biology Extraction');
  console.log('📄 File:', path.basename(PDF_PATH));
  console.log('');

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const base64Data = pdfToBase64(PDF_PATH);

  console.log(`📊 PDF Size: ${(fs.statSync(PDF_PATH).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📊 Base64 Size: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB`);
  console.log('');

  // MINIMAL PROMPT - just extract, don't analyze
  const prompt = `Extract ALL Biology MCQ questions from this exam paper.

RULES:
1. Preserve word spaces between words
2. Use LaTeX for scientific names: $\\textit{Homo sapiens}$
3. For match-the-following tables, use: $$\\begin{array}{ll} A. Item & I. Value \\\\ B. Item2 & II. Value2 \\end{array}$$
4. Map options to A, B, C, D
5. If answer key is visible, mark the correct option
6. Extract ALL questions - no truncation

Return JSON array of questions.`;

  // MINIMAL SCHEMA - just the facts
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER },
        text: { type: Type.STRING },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              isCorrect: { type: Type.BOOLEAN },
            },
            required: ["id", "text", "isCorrect"],
          },
        },
      },
      required: ["id", "text", "options"],
    },
  };

  console.log('🚀 Starting extraction...');
  const startTime = Date.now();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
        maxOutputTokens: 65536,
      },
    });

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`⚡ API completed in ${elapsed}s`);
    console.log('');

    if (!response.text) {
      throw new Error('No response from Gemini API');
    }

    let cleanText = response.text.trim();

    console.log(`📊 Output: ${cleanText.length} chars (${(cleanText.length / 1024).toFixed(2)} KB)`);
    console.log(`📊 Token estimate: ~${Math.ceil(cleanText.length / 4)} tokens`);
    console.log('');

    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const questions = JSON.parse(cleanText);

    console.log(`✅ Successfully extracted ${questions.length} questions in ${elapsed}s`);
    console.log('');

    // Sample questions
    console.log('📝 Sample Questions:');
    console.log('');
    console.log(`Q1: ${questions[0].text.substring(0, 100)}...`);
    console.log(`   Options: ${questions[0].options.length}`);
    console.log(`   Correct: ${questions[0].options.find(o => o.isCorrect)?.id || 'Not marked'}`);
    console.log('');

    if (questions.length >= 11) {
      console.log(`Q11 (Match-the-following): ${questions[10].text.substring(0, 150)}...`);
      console.log(`   Options: ${questions[10].options.length}`);
      console.log(`   Correct: ${questions[10].options.find(o => o.isCorrect)?.id || 'Not marked'}`);
      console.log('');
    }

    console.log(`Q${questions.length}: ${questions[questions.length - 1].text.substring(0, 100)}...`);
    console.log(`   Correct: ${questions[questions.length - 1].options.find(o => o.isCorrect)?.id || 'Not marked'}`);
    console.log('');

    // Statistics
    const correctAnswersMarked = questions.filter(q =>
      q.options.some(o => o.isCorrect)
    ).length;

    console.log('📊 EXTRACTION STATISTICS:');
    console.log(`   Total Questions: ${questions.length}/60`);
    console.log(`   Correct Answers Marked: ${correctAnswersMarked}/${questions.length}`);
    console.log(`   Extraction Time: ${elapsed}s`);
    console.log(`   Speed: ${(questions.length / elapsed).toFixed(1)} questions/second`);
    console.log('');

    // Save to file
    const outputPath = '/Users/apple/FinArna/edujourney---universal-teacher-studio/test-extraction-output.json';
    fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
    console.log(`💾 Full output saved to: ${outputPath}`);

    if (questions.length === 60) {
      console.log('');
      console.log('🎉 SUCCESS! Extracted all 60 questions!');
    } else {
      console.log('');
      console.log(`⚠️  WARNING: Only extracted ${questions.length}/60 questions`);
    }

  } catch (error) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.error(`❌ Extraction failed after ${elapsed}s`);
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

// Run the test
testUltraFastExtraction();
