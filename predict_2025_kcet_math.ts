
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

async function predict2025() {
    console.log('🔮 [REI v3.5] Generating Predicted 2025 KCET Math Oracle Paper...');
    console.log('================================================================');
    console.log('INTELLIGENCE BASIS: Audited 2024 Signature + Evolution Drift');

    const EXAM = 'KCET';
    const SUBJECT = 'Math';
    const USER_ID = 'system-oracle-v3.5';

    // 1. Load context (this triggers REI Phase 2 automatically)
    // The engine will now see the 2024 Actual Signature in the DB!
    const context = await loadGenerationContext(supabase, USER_ID, EXAM, SUBJECT);

    // 2. ORACLE FORECAST CALIBRATION (V3.5)
    // We are no longer hardcoding - we represent the "Intent" for 2025
    context.generationRules.oracleMode = {
        enabled: true,
        // The engine in loadGenerationContext should have already populated these 
        // from the ai_universal_calibration table (derived from PyqGradients)
        // But we can add specific directives for 2025 based on 2024 discoveries.
        idsTarget: context.generationRules.oracleMode?.idsTarget || 0.85,
        boardSignature: context.generationRules.oracleMode?.boardSignature || 'SYNTHESIZER',
        directives: [
            "2025 EVOLUTION: Expect 15% deeper synthesis in Calculus-Algebra seams.",
            "SHORTCUT DRIFT: Increase the density of questions where the standard formula is 3x slower than the property.",
            "RELIABILITY: Focus on the 'Textbook Accuracy' style found in 2024 but with a 1.1x rigor shift.",
            "KEY SEAM: Integration by parts hidden in logarithmic substitutions.",
            "NON-LINEAR: Matrix transformations combined with vector projections (Q51-52 style evolution)."
        ]
    };
    context.generationRules.strategyMode = 'predictive_mock';
    context.examConfig.totalQuestions = 60;

    console.log('🚀 Starting AI Execution Chain (using Audited 2024 Baseline)...');
    const questions = await generateTestQuestions(context, API_KEY!);

    if (!questions || questions.length === 0) {
        console.error('❌ Critical Error: No questions were generated.');
        return;
    }

    // Calculate actual topic distribution for report
    const actualDist = new Map();
    questions.forEach(q => actualDist.set(q.topicFullId || q.topic, (actualDist.get(q.topicFullId || q.topic) || 0) + 1));

    // 3. Format into a professional Oracle Report
    let report = `# 🔮 REI v3.5 PREDICTED ORACLE PAPER: KCET MATH 2025\n`;
    report += `**Generated**: ${new Date().toLocaleString()}\n`;
    report += `**Intelligence Basis**: Audited 2024 Signature + 2-Year Rigor Velocity (${context.generationRules.oracleMode?.idsTarget || '0.85'} ids)\n\n`;

    report += `## 📊 DYNAMIC CALIBRATION FOR 2025\n`;
    report += `- **Detected Board Persona**: ${context.generationRules.oracleMode?.boardSignature}\n`;
    report += `- **Forecasted IDS**: ${context.generationRules.oracleMode?.idsTarget}\n`;
    report += `- **Strategic Directives**:\n`;
    context.generationRules.oracleMode?.directives?.forEach(d => {
        report += `  * ${d}\n`;
    });
    report += `\n`;

    report += `## 📊 TOPIC DISTRIBUTION (PREDICTED 2025)\n`;
    report += `| Topic | Count | Weightage |\n| :--- | :--- | :--- |\n`;
    const sortedTopics = Array.from(actualDist.entries()).sort((a, b) => b[1] - a[1]);
    sortedTopics.forEach(([topic, count]) => {
        report += `| ${topic} | ${count} | ${((count / questions.length) * 100).toFixed(1)}% |\n`;
    });
    report += `\n`;

    report += `--- \n\n`;

    questions.forEach((q, i) => {
        report += `### Q${i + 1} [${q.difficulty}] [${q.topic}]\n`;
        report += `${q.text}\n\n`;
        if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt, idx) => {
                report += `${String.fromCharCode(65 + idx)}. ${opt}\n`;
            });
        }
        report += `\n**Correct**: ${String.fromCharCode(65 + (q.correctOptionIndex ?? 0))}\n`;
        report += `**Deterministic Logic**: ${q.aiReasoning || 'N/A'}\n`;
        report += `**Evolution Insight**: ${q.predictiveInsight || 'N/A'}\n\n`;
        report += `---\n\n`;
    });

    const fileName = `KCET_MATH_2025_PREDICTED_ORACLE.md`;
    fs.writeFileSync(`./${fileName}`, report);

    // Also save as JSON for comparison script
    fs.writeFileSync(`./KCET_MATH_2025_PREDICTED_ORACLE.json`, JSON.stringify(questions, null, 2));

    console.log(`\n✅ 2025 Oracle Paper Generated: ${fileName}`);
}

predict2025().catch(console.error);
