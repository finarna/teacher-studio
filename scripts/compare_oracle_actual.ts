
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const ACTUAL_TEXT_PATH = '/Users/apple/FinArna/edujourney---universal-teacher-studio/actual_2023_text.txt';
const ORACLE_PATH = '/Users/apple/FinArna/edujourney---universal-teacher-studio/KCET_MATH_2023_PREDICTED_ORACLE.md';

if (!GEMINI_API_KEY) {
    process.exit(1);
}

const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

async function main() {
    const actualText = fs.readFileSync(ACTUAL_TEXT_PATH, 'utf-8');
    const oracleContent = fs.readFileSync(ORACLE_PATH, 'utf-8');

    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
  You are an expert exam analyst.
  I am providing you with the text of the ACTUAL KCET 2023 Math paper and my AI's PREDICTED "Oracle" paper.
  
  TASK:
  1. Analyze the ACTUAL 2023 paper to get topic distribution (Integrals, Calculus, Algebra, etc.).
  2. Map out the Difficulty Profile of the ACTUAL paper.
  3. Compare the ACTUAL paper with the PREDICTED Oracle paper.
  4. Calculate a "Hit Rate" (0-100%) based on:
     - Topic Distribution accuracy.
     - Specific "Twists" predicted vs actual (e.g., did we predict a Functional Equation and did one appear?).
     - Rigor alignment.
  
  Return a detailed markdown report for the user.
  
  --- ACTUAL 2023 TEXT ---
  ${actualText}
  
  --- PREDICTED ORACLE PAPER ---
  ${oracleContent}
  `;

    console.log('📊 Comparing Oracle vs Actual 2023...');
    const result = await model.generateContent(prompt);
    const report = result.response.text();

    fs.writeFileSync('REI_v3_ORACLE_VS_ACTUAL_2023_REPORT.md', report);
    console.log('✅ Comparison report generated: REI_v3_ORACLE_VS_ACTUAL_2023_REPORT.md');
}

main().catch(console.error);
