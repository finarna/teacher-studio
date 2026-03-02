import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const subjects = ['Math', 'Physics', 'Chemistry', 'Biology'];

async function addGeneralTopics() {
    console.log('🚀 Adding catch-all "General" topics for all subjects...');

    for (const s of subjects) {
        const generalName = `General ${s}`;

        const { data: existing } = await supabase
            .from('topics')
            .select('id')
            .eq('name', generalName)
            .eq('subject', s)
            .maybeSingle();

        if (!existing) {
            const { error } = await supabase
                .from('topics')
                .insert({
                    name: generalName,
                    subject: s,
                    domain: 'General', // Fallback domain
                    exam_weightage: { KCET: 1, JEE: 1, Boards: 1 }
                });

            if (error) console.error(`❌ Error adding ${generalName}:`, error);
            else console.log(`✅ Added ${generalName}`);
        } else {
            console.log(`ℹ️  ${generalName} already exists`);
        }
    }
}

addGeneralTopics().catch(console.error);
