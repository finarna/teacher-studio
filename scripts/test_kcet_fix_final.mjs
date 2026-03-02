
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

async function testKCETDirectPDF() {
    const pdfPath = path.join(__dirname, '../01-KCET-Board-Exam-Mathematics-M1-2021.pdf');
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ API Key Missing (VITE_GEMINI_API_KEY)');
        process.exit(1);
    }

    // Using the model identified from the user's codebase and listModels
    const modelName = "gemini-3-flash-preview";

    console.log(`🧪 Testing KCET Math 2021 PDF Extraction via Direct PDF (${modelName})\n`);

    const ai = new GoogleGenAI({ apiKey });

    const pdfData = fs.readFileSync(pdfPath);
    const base64Pdf = pdfData.toString('base64');

    const prompt = `
    Extract ALL 60 MCQs from this math exam PDF.
    
    Return a JSON array of objects with these fields:
    - id: The question number
    - text: The question text with LaTeX
    - options: Array of 4 strings for the options
    
    IMPORTANT: There are exactly 60 questions. Count them carefully.
  `;

    console.log(`📤 Sending full PDF to ${modelName}...`);
    const start = Date.now();

    try {
        const result = await ai.models.generateContent({
            model: modelName,
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: "application/pdf", data: base64Pdf } }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
            }
        });

        const end = Date.now();
        const text = result.text || result.response?.text?.() || "{}";

        console.log(`📥 Received response in ${((end - start) / 1000).toFixed(1)}s`);

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            console.log('JSON Parse failed, attempting salvage...');
            // Simple salvage
            const startIdx = text.indexOf('[');
            const endIdx = text.lastIndexOf(']');
            if (startIdx !== -1 && endIdx !== -1) {
                parsed = { questions: JSON.parse(text.substring(startIdx, endIdx + 1)) };
            } else {
                throw e;
            }
        }

        const questions = parsed.questions || parsed; // Handle both {questions:[]} and []
        const questionsArray = Array.isArray(questions) ? questions : [];

        console.log('\n' + '='.repeat(60));
        console.log(`📊 EXTRACTION RESULTS`);
        console.log(`Total questions found: ${questionsArray.length}`);
        console.log('='.repeat(60));

        // Show coverage
        const foundIds = questionsArray.map(q => parseInt(q.id || q.number)).filter(id => !isNaN(id)).sort((a, b) => a - b);
        const uniqueIds = [...new Set(foundIds)];

        console.log(`Unique IDs Found: ${uniqueIds.length}`);

        const missing = [];
        for (let i = 1; i <= 60; i++) {
            if (!uniqueIds.includes(i)) missing.push(i);
        }

        if (missing.length > 0) {
            console.warn(`⚠️  Missing IDs: ${missing.join(', ')}`);
        } else {
            console.log('✅ All IDs Q1-Q60 found!');
        }

        if (questionsArray.length > 0) {
            console.log('\n📝 Sample Question (Q' + (questionsArray[0].id || questionsArray[0].number) + '):');
            console.log((questionsArray[0].text || '').substring(0, 150) + '...');
        }

    } catch (err) {
        console.error('❌ Extraction failed:', err.message);
        if (err.stack) console.error(err.stack);
    }
}

testKCETDirectPDF().catch(console.error);
