import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function record() {
    const userId = 'dca5477c-619f-4315-9988-8314470fc933';
    const topicResourceId = '5aa3da8b-e620-4d1a-a685-a9ab88e7a667'; // From Math

    const { error } = await supabase.from('topic_activities').insert({
        user_id: userId,
        topic_resource_id: topicResourceId,
        activity_type: 'practiced_question',
        activity_timestamp: new Date().toISOString()
    });

    if (error) console.error(error);
    else console.log('✅ Activity recorded for today');
}

record();
