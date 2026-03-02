import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const missingTopics = [
    { name: 'Permutations and Combinations', domain: 'Algebra' },
    { name: 'Arithmetic Progressions', domain: 'Algebra' },
    { name: 'Straight Lines', domain: 'Coordinate Geometry' },
    { name: 'Statistics', domain: 'Statistics and Probability' }
];

async function addMissingTopics() {
    console.log('🚀 Adding missing Grade 11 topics for KCET/JEE mapping...');

    for (const t of missingTopics) {
        const { data: existing } = await supabase
            .from('topics')
            .select('id')
            .eq('name', t.name)
            .eq('subject', 'Math')
            .maybeSingle();

        if (!existing) {
            const { error } = await supabase
                .from('topics')
                .insert({
                    name: t.name,
                    domain: t.domain,
                    subject: 'Math',
                    exam_weightage: { KCET: 2, JEE: 1, Boards: 1 }
                });

            if (error) console.error(`❌ Error adding ${t.name}:`, error);
            else console.log(`✅ Added ${t.name}`);
        } else {
            console.log(`ℹ️  ${t.name} already exists`);
        }
    }
}

addMissingTopics().catch(console.error);
