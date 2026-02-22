import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: userScans } = await supabase.from('scans').select('user_id, subject, id').limit(1);
    const userId = userScans[0].user_id;

    const { data: topics, error: topicsErr } = await supabase.from('topics').select('*').limit(1);
    if (topicsErr) console.error("Topics error:", topicsErr);
    const topicId = topics[0].id;
    const topicName = topics[0].name;

    console.log(`Using userId=${userId}, topicId=${topicId} (${topicName})`);

    try {
        const statsData = {
            user_id: userId,
            topic_id: topicId,
            subject: 'Math',
            exam_context: 'KCET',
            questions_attempted: 1,
            questions_correct: 1,
            average_accuracy: 100,
            mastery_level: 20,
            study_stage: 'learning'
        };

        const { data, error } = await supabase.from('topic_resources').insert(statsData).select();
        console.log("Insert result:", data);
        if (error) console.error("Insert Error:", error);
    } catch (e) {
        console.error(e);
    }
}
test();
