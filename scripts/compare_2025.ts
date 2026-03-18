
import fs from 'fs';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

async function compare2025() {
    console.log('📊 Comparing Oracle 2025 vs Actual 2025...');

    const oracleQuestions = JSON.parse(fs.readFileSync('./KCET_MATH_2025_PREDICTED_ORACLE.json', 'utf8'));
    const actualQuestions = JSON.parse(fs.readFileSync('./actual_2025_analysis.json', 'utf8'));

    const genAI = new GoogleGenerativeAI(API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // 1. Semantic Match Analysis
    const prompt = `Compare these two sets of questions for KCET 2025 Math. 
    ORACLE (PREDICTED): ${JSON.stringify(oracleQuestions.slice(0, 30))}...
    ACTUAL: ${JSON.stringify(actualQuestions.slice(0, 30))}...

    Identify:
    1. EXCITING HITS: Where the Oracle predicted a specific concept/twist that appeared in the actual paper.
    2. THEME ALIGNMENT %: How well the difficulty and topic distribution matched.
    3. STYLE MATCH: Did the "Synthesizer" persona correctly anticipate the 2025 paper's style?

    Return a Markdown report.
    `;

    const result = await model.generateContent(prompt);
    const comparisonText = result.response.text();

    let report = `# 🏁 REI v3.5 PERFORMANCE AUDIT: 2025 ORACLE VS ACTUAL\n\n`;
    report += comparisonText;

    fs.writeFileSync('./REI_v3_ORACLE_VS_ACTUAL_2025_REPORT.md', report);
    console.log('✅ Comparison Report saved: REI_v3_ORACLE_VS_ACTUAL_2025_REPORT.md');
}

compare2025().catch(console.error);
