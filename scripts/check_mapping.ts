
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkMapping() {
    const scanId = 'eba5ed94-dde7-4171-80ff-aecbf0c969f7';
    console.log('Checking questions and mappings for scan:', scanId);

    const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('id, topic')
        .eq('scan_id', scanId);

    if (qErr) {
        console.error('Q Error:', qErr.message);
        return;
    }

    console.log(`Found ${questions?.length || 0} questions.`);

    const qIds = questions?.map(q => q.id) || [];
    if (qIds.length === 0) return;

    const { data: mappings, error: mErr } = await supabase
        .from('topic_question_mapping')
        .select('question_id, topic_id')
        .in('question_id', qIds);

    if (mErr) {
        console.error('M Error:', mErr.message);
        return;
    }

    console.log(`Found ${mappings?.length || 0} mappings.`);

    if (mappings && mappings.length > 0) {
        const topicIds = Array.from(new Set(mappings.map(m => m.topic_id)));
        const { data: topics } = await supabase
            .from('topics')
            .select('id, name')
            .in('id', topicIds);

        console.log('Mapped Topics:', topics);
    } else {
        console.log('No mappings found. Questions will NOT appear in Learning Journey Solve section if mapped by Topic ID.');
    }
}

checkMapping();
