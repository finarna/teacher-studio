
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const ACTUAL_TEXT_PATH = './actual_2024_text.txt';
const ORACLE_JSON_PATH = './KCET_MATH_2024_PREDICTED_ORACLE.json';

async function main() {
    if (!GEMINI_API_KEY) return;

    const actualText = fs.readFileSync(ACTUAL_TEXT_PATH, 'utf-8');
    const oracleJson = JSON.parse(fs.readFileSync(ORACLE_JSON_PATH, 'utf-8'));

    const ai = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    // We will send the full actual text and the first 20 oracle questions for a deep dive
    const oracleSub = oracleJson.slice(0, 25).map((q: any, i: number) => ({
        id: i + 1,
        text: q.text,
        topic: q.topic,
        reasoning: q.aiReasoning,
        insight: q.predictiveInsight
    }));

    const prompt = `
  You are an expert KCET Item Auditor.
  I am providing you with the text of the ACTUAL KCET 2024 Math paper and a subset of my AI's IMPROVED "Oracle" prediction for 2024.
  
  TASK:
  1. Perform a "Semantic Match Map" - Find questions in the ACTUAL paper that share the same logical "DNA" or "Seam" as my predicted questions.
  2. For EACH of the 25 Predicted Questions, identify if there is a "Hit" in the actual paper (even if the values are different, the technique should match).
  3. Analyze the "Style Alignment": Does the Oracle now feel more like the actual paper (Shortcut-oriented, property-driven)?
  4. Create a "Match Score Card" for these 25 questions.
  
  --- ACTUAL 2024 PAPER ---
  ${actualText}
  
  --- IMPROVED ORACLE SUBSET (25 Questions) ---
  ${JSON.stringify(oracleSub, null, 2)}
  `;

    console.log('📊 Performing Q-by-Q Semantic Comparison...');
    const result = await model.generateContent(prompt);
    const report = result.response.text();

    fs.writeFileSync('REI_v3_Q_BY_Q_2024_ANALYSIS.md', report);
    console.log('✅ Q-by-Q Analysis complete: REI_v3_Q_BY_Q_2024_ANALYSIS.md');
}

main().catch(console.error);
