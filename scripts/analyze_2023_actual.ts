
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const PDF_PATH = '/Users/apple/FinArna/edujourney---universal-teacher-studio/02-KCET-Board-Exam-Maths-20-05-2023-M7.pdf';

if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not set');
    process.exit(1);
}

const ai = new GoogleGenAI(GEMINI_API_KEY);

async function pdfPageToImage(pdfPath: string, pageNum: number, scale = 2.0) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    const base64 = canvas.toDataURL('image/png', 1.0).split(',')[1];
    return { base64, totalPages: pdf.numPages };
}

async function analyzePage(pageNum: number, base64: string, totalPages: number) {
    console.log(`🔍 Analyzing Page ${pageNum}/${totalPages}...`);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

    const prompt = `
  Analyze this KCET Math 2023 exam page. 
  Identify every question number and its Topic, Difficulty (Easy/Moderate/Hard), and the "Core Concept" tested.
  
  Return JSON format:
  {
    "questions": [
      { "id": 1, "topic": "Calculus", "difficulty": "Moderate", "concept": "Differentiation of composite functions" }
    ]
  }
  `;

    const result = await model.generateContent([
        { inlineData: { mimeType: 'image/png', data: base64 } },
        { text: prompt }
    ]);

    const text = result.response.text();
    try {
        const cleaned = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned).questions;
    } catch (e) {
        console.error(`❌ Failed to parse page ${pageNum}`);
        return [];
    }
}

async function main() {
    console.log('🚀 ANALYZING ACTUAL 2023 KCET MATH PAPER');
    const { totalPages } = await pdfPageToImage(PDF_PATH, 1);

    const allQuestions = [];
    for (let i = 1; i <= totalPages; i++) {
        const { base64 } = await pdfPageToImage(PDF_PATH, i);
        const qs = await analyzePage(i, base64, totalPages);
        allQuestions.push(...qs);
    }

    const topicCount: any = {};
    allQuestions.forEach(q => {
        topicCount[q.topic] = (topicCount[q.topic] || 0) + 1;
    });

    const report = {
        actualYear: 2023,
        totalQuestions: allQuestions.length,
        topicDistribution: topicCount,
        questions: allQuestions
    };

    fs.writeFileSync('actual_2023_analysis.json', JSON.stringify(report, null, 2));
    console.log('✅ Analysis complete. Data saved to actual_2023_analysis.json');
}

main().catch(console.error);
