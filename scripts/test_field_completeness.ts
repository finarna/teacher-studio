import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runValidation() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🔍 Starting Field Completeness Validation...');

    // Fetch the 5 most recent questions that have mastery_material
    const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .not('mastery_material', 'is', null)
        .order('id', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error fetching questions:', error);
        return;
    }

    if (!questions || questions.length === 0) {
        console.log('⚠️ No questions found with mastery_material.');
        return;
    }

    questions.forEach((q, i) => {
        console.log(`\n--- [${i + 1}/5] Validating Q ID: ${q.id} ---`);
        console.log(`Topic: ${q.topic}`);

        const fields = {
            'Text (LaTeX Check)': q.text.includes('$'),
            'Solution Steps': q.solution_steps && q.solution_steps.length > 0,
            'Mastery Core': !!q.mastery_material,
            'AI Reasoning': !!(q.ai_reasoning || q.mastery_material?.aiReasoning),
            'Historical Pattern': !!(q.historicalPattern || q.mastery_material?.historicalPattern),
            'Predictive Insight': !!(q.predictiveInsight || q.mastery_material?.predictiveInsight),
            'Why It Matters': !!(q.whyItMatters || q.mastery_material?.whyItMatters),
            'Common Mistakes (Pitfalls)': q.pitfalls && q.pitfalls.length > 0
        };

        Object.entries(fields).forEach(([name, present]) => {
            console.log(`${present ? '✅' : '❌'} ${name}`);
        });

        // Deep Check into mastery_material structure
        if (q.mastery_material && typeof q.mastery_material === 'object') {
            const m = q.mastery_material;
            console.log(`\n   Deep JSON Check:`);
            console.log(`   - solutionSteps count: ${m.solutionSteps?.length || 0}`);
            console.log(`   - logic present: ${!!m.aiReasoning}`);
            console.log(`   - historicalPattern present: ${!!m.historicalPattern}`);
        }
    });
}

runValidation().catch(console.error);
