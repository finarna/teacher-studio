
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
  You are an expert exam auditor. Compare the ACTUAL 2023 KCET Math paper against the PREDICTED AI Oracle paper question by question.
  
  TASK:
  Create a detailed "Item-Level Match Map". For every question in the ACTUAL paper (1 to 60), find the closest correspondent in the Oracle paper and label it:
  - **HIT [EXACT]**: The concept, question style, and logic are identical.
  - **HIT [CONCEPT]**: Different wording but tests the exact same trick/seam.
  - **ALMOST SAME**: Very close, maybe different numbers but same structure.
  - **LOSE**: Oracle failed to predict this type of question.
  - **DIFFERENT**: Predicted something similar but the actual exam used a different approach.

  Format as a Markdown Table:
  | Actual Q# | Oracle Q# | Status | Justification/Logic Match |
  | :--- | :--- | :--- | :--- |
  
  Then provide a summary of "Signature Patterns" that were successfully intercepted.

  --- ACTUAL 2023 TEXT ---
  ${actualText}
  
  --- PREDICTED ORACLE PAPER ---
  ${oracleContent}
  `;

    console.log('📝 Generating Question-by-Question Comparison Map...');
    const result = await model.generateContent(prompt);
    const report = result.response.text();

    fs.writeFileSync('ORACLE_ITEM_BY_ITEM_MATCH_MAP.md', report);
    console.log('✅ Match map generated: ORACLE_ITEM_BY_ITEM_MATCH_MAP.md');
}

main().catch(console.error);
