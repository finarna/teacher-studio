
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
  You are an expert exam auditor. I need a side-by-side comparison of the ACTUAL 2023 KCET Math paper and the AI-PREDICTED "Oracle" paper.
  
  TASK:
  For the most significant matches (Hits and Almost Same), show the exact text of the Actual question and the Oracle question.
  For the rest, provide a mapped list.
  
  FORMAT:
  ---
  ### Match: [Topic Name]
  | ACTUAL QUESTION (2023) | ORACLE PREDICTION | LOGIC SEAM / MATCH RATIONALE |
  | :--- | :--- | :--- |
  | [Full Text of Actual Q] | [Full Text of Oracle Q] | [Why this is a hit] |
  ---
  
  Focus on the top 15-20 strongest matches where the logic or "twist" was correctly predicted.
  Then list the remaining questions in a summary table at the end.

  --- ACTUAL 2023 TEXT ---
  ${actualText}
  
  --- PREDICTED ORACLE PAPER ---
  ${oracleContent}
  `;

    console.log('📑 Creating Side-by-Side Question Comparison...');
    const result = await model.generateContent(prompt);
    const report = result.response.text();

    fs.writeFileSync('ORACLE_SIDE_BY_SIDE_COMPARISON.md', report);
    console.log('✅ Side-by-side comparison generated: ORACLE_SIDE_BY_SIDE_COMPARISON.md');
}

main().catch(console.error);
