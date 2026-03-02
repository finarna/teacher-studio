
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function diagnosticExtraction() {
    const pdfPath = path.join(__dirname, '../01-KCET-Board-Exam-Mathematics-M1-2021.pdf');
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ API Key Missing');
        process.exit(1);
    }

    const modelName = "gemini-3-flash-preview";
    const ai = new GoogleGenAI({ apiKey });

    const pdfData = fs.readFileSync(pdfPath);
    const base64Pdf = pdfData.toString('base64');

    // USING THE EXACT PROMPT FROM simpleMathExtractor.ts
    const megaPrompt = `
      Extract ALL 60 MCQs from this PDF.
      Return a JSON array of objects with ONLY these fields:
      - id: (string) question number
      - page: (number) page number (1-7)
      - text: (string) question text with LaTeX
      - options: (array of 4) {id: "a", text: "...", isCorrect: false}
      
      🚨 LATEX: Use single backslashes only.
      🚨 IMPORTANT: Check carefully, there are exactly 60 questions.
    `;

    console.log(`🚀 Starting Diagnostic Extraction on ${modelName}...`);
    const start = Date.now();

    try {
        const result = await ai.models.generateContent({
            model: modelName,
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: megaPrompt },
                        { inlineData: { mimeType: "application/pdf", data: base64Pdf } }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
            }
        });

        const end = Date.now();
        const rawText = result.text || result.response?.text?.() || "[]";
        console.log(`📥 Received response in ${((end - start) / 1000).toFixed(1)}s`);

        let questions = JSON.parse(rawText);
        if (!Array.isArray(questions) && questions.questions) questions = questions.questions;

        console.log(`\n📊 ANALYSIS OF ${questions.length} QUESTIONS:`);

        // 1. Check Q56 (The one that should have an image)
        const q56 = questions.find(q => q.id == '56' || q.id == 'Q56');
        if (q56) {
            console.log(`\n✅ QUESTION 56 FOUND:`);
            console.log(`   Page: ${q56.page}`);
            console.log(`   Text Snippet: ${q56.text.substring(0, 100)}...`);
            console.log(`   Options Format: ${Array.isArray(q56.options) ? 'ARRAY' : 'NOT ARRAY'}`);
            if (Array.isArray(q56.options) && q56.options[0]) {
                console.log(`   Sample Option:`, q56.options[0]);
            }
        } else {
            console.warn(`❌ QUESTION 56 MISSING!`);
        }

        // 2. Check Options Format for Q33-37
        const range = [33, 34, 35, 36, 37];
        console.log(`\n✅ CHECKING OPTIONS FORMAT FOR Q33-37:`);
        range.forEach(id => {
            const q = questions.find(q => q.id == id.toString() || q.id == `Q${id}`);
            if (q) {
                const isCorrectFormat = Array.isArray(q.options) && q.options.every(o => typeof o === 'object' && o.text);
                console.log(`   Q${id}: ${isCorrectFormat ? 'PASS (Object-based)' : 'FAIL (String or missing)'}`);
            }
        });

        // 3. Verify IDs
        const ids = questions.map(q => parseInt(q.id.replace(/\D/g, ''))).filter(n => !isNaN(n)).sort((a, b) => a - b);
        console.log(`\n✅ ID COVERAGE: Found ${ids.length} unique numbers.`);
        if (ids.length < 60) {
            const missing = [];
            for (let i = 1; i <= 60; i++) if (!ids.includes(i)) missing.push(i);
            console.log(`   Missing: ${missing.join(', ')}`);
        } else {
            console.log(`   Full Coverage (Q1-Q60) achieved.`);
        }

    } catch (err) {
        console.error('❌ Diagnostic failed:', err.message);
    }
}

diagnosticExtraction();
