
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { loadGenerationContext } from './lib/examDataLoader';
import { generateTestQuestions } from './lib/aiQuestionGenerator';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

async function predict2023() {
    console.log('🔮 [REI v3.0] Generating Predicted 2023 KCET Math Oracle Paper...');
    console.log('================================================================');

    const EXAM = 'KCET';
    const SUBJECT = 'Math';
    const USER_ID = 'system-oracle-v3';

    // 1. Load context (this triggers REI Phase 2 automatically)
    const context = await loadGenerationContext(supabase, USER_ID, EXAM, SUBJECT);

    // 2. Force Oracle Phase 3 Settings
    context.generationRules.oracleMode = {
        enabled: true,
        idsTarget: 0.98, // Maximum precision
        directives: [
            "2021->2022 Rigor Reset detected. Expecting 2023 'Volatility Rebound'.",
            "Board Signature: SYNTHESIZER focus.",
            "Objective: Deterministic property-shortcut fusion."
        ],
        boardSignature: 'SYNTHESIZER'
    };
    context.generationRules.strategyMode = 'predictive_mock';
    context.examConfig.totalQuestions = 60; // Standard KCET length

    console.log('🚀 Starting AI Execution Chain...');
    const questions = await generateTestQuestions(context, API_KEY!);

    if (!questions || questions.length === 0) {
        console.error('❌ Critical Error: No questions were generated.');
        return;
    }

    // Calculate actual topic distribution for report
    const actualDist = new Map();
    questions.forEach(q => actualDist.set(q.topic, (actualDist.get(q.topic) || 0) + 1));

    // 3. Format into a professional Oracle Report
    let report = `# 🔮 REI v3.0 PREDICTED ORACLE PAPER: KCET MATH 2023\n`;
    report += `**Generated**: ${new Date().toLocaleString()}\n`;
    report += `**Intelligence Basis**: 2021 Baseline + 2022 Rigor Delta\n\n`;

    report += `## 📊 TOPIC DISTRIBUTION (ACTUAL GENERATED)\n`;
    report += `| Topic | Count | Weightage |\n| :--- | :--- | :--- |\n`;
    Array.from(actualDist.entries()).forEach(([topic, count]) => {
        report += `| ${topic} | ${count} | ${((count / questions.length) * 100).toFixed(1)}% |\n`;
    });
    report += `\n`;

    report += `## 📊 EXECUTION CALIBRATION\n`;
    report += `- **Total Questions**: 60\n`;
    report += `- **Wait States**: Deterministic Seam Mapping Active\n`;
    report += `- **IDS Target**: 0.98\n\n`;

    report += `--- \n\n`;

    questions.forEach((q, i) => {
        report += `### Q${i + 1} [${q.difficulty}] [${q.topic}]\n`;
        report += `${q.text}\n\n`;
        q.options.forEach((opt, idx) => {
            report += `${String.fromCharCode(65 + idx)}. ${opt}\n`;
        });
        report += `\n**Correct**: ${String.fromCharCode(65 + q.correctOptionIndex)}\n`;
        report += `**Deterministic Logic**: ${q.aiReasoning || 'N/A'}\n`;
        report += `**Evolution Insight**: ${q.predictiveInsight || 'N/A'}\n\n`;
        report += `---\n\n`;
    });

    const fileName = `KCET_MATH_2023_PREDICTED_ORACLE.md`;
    fs.writeFileSync(`./${fileName}`, report);

    console.log(`\n✅ Oracle Paper Generated: ${fileName}`);
}

predict2023().catch(console.error);
