
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

async function analyzeActual2025() {
    const fullText = fs.readFileSync('./actual_2025_text.txt', 'utf8');

    const genAI = new GoogleGenerativeAI(API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `You are an expert Math teacher. Analyze the following text of the ACTUAL KCET 2025 Math paper.
    Extract the details of EVERY question (all 60).
    For each question, identify:
    1. Topic (Calculus, Algebra, Vectors, etc.)
    2. Concept (e.g., L'Hopital's, Dot Product, Matrix Inverse)
    3. Difficulty (Easy, Moderate, Hard) - Based on KCET standards.
    4. Style (e.g., Direct Property, Multi-step, Shortcut-heavy)

    Return a JSON array of 60 objects:
    {
      "index": 1,
      "topic": "...",
      "concept": "...",
      "difficulty": "Moderate",
      "style": "..."
    }

    TEXT:
    ${fullText.substring(0, 30000)} // First 30k chars usually enough for logic
    `;

    console.log('🧠 Analyzing Actual 2025 Paper...');
    const result = await model.generateContent(prompt);
    let jsonStr = result.response.text().trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/```json\s*|```/g, '');

    fs.writeFileSync('./actual_2025_analysis.json', jsonStr);
    console.log('✅ Actual 2025 Analysis saved to actual_2025_analysis.json');
}

analyzeActual2025().catch(console.error);
