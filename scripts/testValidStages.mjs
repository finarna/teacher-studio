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
    const topicId = topics[0].id;

    const validStages = [];
    const stagesToTest = [
        'beginner', 'familiar', 'proficient', 'expert', 'learning', 'revision', 'started'
    ];

    for (const stage of stagesToTest) {
        const statsData = {
            user_id: userId,
            topic_id: topicId,
            subject: 'Math',
            exam_context: 'KCET',
            questions_attempted: 0,
            questions_correct: 0,
            average_accuracy: 0,
            mastery_level: 0,
            study_stage: stage
        };

        const { data, error } = await supabase.from('topic_resources').insert(statsData).select();
        if (!error) {
            validStages.push(stage);
            // try to revert to cleanup
            await supabase.from('topic_resources').delete().eq('id', data[0].id);
        }
    }

    console.log("Valid stages found:", validStages);
}
test();
