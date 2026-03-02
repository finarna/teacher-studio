import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUnmapped() {
    const scanId = 'eff84ad8-67d8-4b3b-b6da-79b643b64cba';
    const { data: qs } = await supabase.from('questions').select('id, topic, text').eq('scan_id', scanId);
    const { data: maps } = await supabase.from('topic_question_mapping').select('question_id').in('question_id', qs.map(q => q.id));

    const mappedIds = new Set(maps.map(m => m.question_id));
    const unmapped = qs.filter(q => !mappedIds.has(q.id));

    console.log(`\n--- UNMAPPED QUESTIONS FOR ${scanId} ---\n`);
    unmapped.forEach((q, i) => {
        console.log(`${i + 1}. [${q.topic}] ${q.text.substring(0, 100)}...`);
    });
    console.log(`\nTotal: ${unmapped.length} unmapped questions\n`);

    // Suggesting mappings
    const { data: topics } = await supabase.from('topics').select('id, name').eq('subject', 'Math');
    console.log('--- AVAILABLE TOPICS ---');
    topics.forEach(t => console.log(`- ${t.name}`));
}

checkUnmapped().catch(console.error);
