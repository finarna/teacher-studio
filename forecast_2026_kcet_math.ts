
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

async function predict2026() {
    console.log('🔮 [REI v4.0] Forecasting 2026 KCET Math Oracle Paper...');
    console.log('================================================================');
    console.log('DATE: March 5, 2026 (Live Forecast Mode)');
    console.log('INTELLIGENCE BASIS: 2021-2025 Full PyqChain Audit');

    const EXAM = 'KCET';
    const SUBJECT = 'Math';
    const USER_ID = 'system-oracle-v4.0';

    // 1. Load context (this triggers REI Phase 2 for 2026 Forecast)
    // The engine will now see the 2025 Signature we just seeded!
    const context = await loadGenerationContext(supabase, USER_ID, EXAM, SUBJECT);

    // 2. ORACLE FORECAST FOR 2026 (The "Structural Recognition" Year)
    context.generationRules.oracleMode = {
        enabled: true,
        idsTarget: 0.88, // Forecasted incline based on 2-year gradient
        boardSignature: 'SYNTHESIZER',
        directives: [
            "2026 THEME: 'Structural Recognition.' Questions should look complex but collapse into 1-step logic if the student recognizes the property.",
            "CALCULUS EVOLUTION: Focus on composite function derivatives and 'The Leibniz Wall' variants (Calculus-Limits fusions).",
            "3D GEOMETRY SHIFT: Move from distance to 'Mirror Images' and 'Orthogonal Projections' as the new logic seams.",
            "TRAP DENSITY: 15% increase in 'Plausible Distractors' (Index 42-45 style).",
            "ZERO ROTE: Every question must require an 'Observation' phase before calculation."
        ]
    };
    context.generationRules.strategyMode = 'predictive_mock';
    context.examConfig.totalQuestions = 60;

    console.log('🚀 Running AI Engine (REI v4.0 Forecast Chain)...');
    const questions = await generateTestQuestions(context, API_KEY!);

    if (!questions || questions.length === 0) {
        console.error('❌ Critical Error: No questions were generated.');
        return;
    }

    // 3. Document 2026 Forecast Logic
    let report = `# 🔮 REI v4.0 PREDICTED ORACLE PAPER: KCET MATH 2026\n`;
    report += `**Forecasted on**: ${new Date().toLocaleString()}\n`;
    report += `**Gradient Analysis**: Audited 2024-2025 Stability → 2026 Rigor Drift (+0.06 ids)\n\n`;

    report += `## 📊 2026 UPCOMING STRATEGY\n`;
    report += `- **Target IDS**: ${context.generationRules.oracleMode?.idsTarget}\n`;
    report += `- **Predicted Board Persona**: SYNTHESIZER (Elite Efficiency)\n`;
    report += `- **Evolution Core**: Shift from 'Calculus Calculation' to 'Calculus Observation'.\n\n`;

    report += `### 📄 FORECASTED Q-LIST PREVIEW (FIRST 60)\n`;
    questions.forEach((q, i) => {
        report += `### Q${i + 1} [${q.difficulty}] [${q.topic}]\n`;
        report += `${q.text}\n\n`;
        if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt, idx) => {
                report += `${String.fromCharCode(65 + idx)}. ${opt}\n`;
            });
        }
        report += `\n**Correct**: ${String.fromCharCode(65 + (q.correctOptionIndex ?? 0))}\n`;
        report += `**2026 Forecast Logic**: ${q.predictiveInsight}\n\n`;
        report += `---\n\n`;
    });

    const fileName = `KCET_MATH_2026_PREDICTED_ORACLE.md`;
    fs.writeFileSync(`./${fileName}`, report);
    console.log(`\n✅ 2026 Forecast Generated: ${fileName}`);
}

predict2026().catch(console.error);
