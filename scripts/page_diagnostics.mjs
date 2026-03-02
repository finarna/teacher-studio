
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pkg from 'canvas';
const { createCanvas } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY);

async function diagnosePage(pageNum) {
    console.log(`\n🔍 Diagnosing Page ${pageNum}...`);

    const pdfPath = path.join(__dirname, '../01-KCET-Board-Exam-Mathematics-M1-2021.pdf');
    const data = new Uint8Array(fs.readFileSync(pdfPath));

    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNum);

    // Use lower scale for diagnostic to avoid canvas issues
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    // We need to polyfill some things for pdfjs node rendering to work with images
    // but let's try just text first if rendering fails
    try {
        await page.render({ canvasContext: context, viewport }).promise;
    } catch (e) {
        console.error(`❌ Render failed: ${e.message}`);
        console.log('Falling back to text-only analysis');
    }

    const buffer = canvas.toBuffer('image/png');
    const base64Image = buffer.toString('base64');

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
        }
    });

    const prompt = `
    Extract ALL math questions from this exam page. 
    Return a JSON array of objects with "id" and "text" (full question text with LaTeX).
    Count the questions carefully. Do not skip any.
  `;

    console.log('📤 Sending to Gemini...');
    const start = Date.now();
    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                mimeType: "image/png",
                data: base64Image
            }
        }
    ]);
    const end = Date.now();

    const response = await result.response;
    const text = response.text();
    const tokens = response.usageMetadata?.totalTokenCount || 'unknown';

    console.log(`\n📥 Response received in ${((end - start) / 1000).toFixed(1)}s`);
    console.log(`📊 Tokens used: ${tokens}`);
    console.log(`📝 Raw text snippet: ${text.substring(0, 500)}...`);

    try {
        const parsed = JSON.parse(text);
        const count = Array.isArray(parsed) ? parsed.length : (parsed.questions ? parsed.questions.length : 0);
        console.log(`✅ Extracted ${count} questions`);
    } catch (e) {
        console.error(`❌ Parse failed: ${e.message}`);
    }
}

async function run() {
    await diagnosePage(5);
    await diagnosePage(6);
}

run().catch(console.error);
