import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function performManualUpdate() {
    try {
        // 1. Get the user ID from a recent scan
        const { data: scans } = await supabase.from('scans').select('user_id').limit(1);
        if (!scans || scans.length === 0) throw new Error("No user found in scans table");
        const userId = scans[0].user_id;

        // 2. Get the topic ID for 'Determinants'
        const { data: topics } = await supabase
            .from('topics')
            .select('id, name')
            .eq('name', 'Determinants')
            .single();

        if (!topics) throw new Error("Could not find topic 'Determinants'");
        const topicId = topics.id;

        console.log(`🚀 Starting manual verify for User: ${userId} | Topic: Determinants (${topicId})`);

        // 3. Upsert a record into topic_resources to force 'practicing' state
        const statsData = {
            user_id: userId,
            topic_id: topicId,
            subject: 'Math',
            exam_context: 'KCET',
            questions_attempted: 1,
            questions_correct: 1,
            average_accuracy: 100,
            mastery_level: 15,
            study_stage: 'practicing', // This must match the DB constraint exactly
            last_practiced: new Date().toISOString()
        };

        const { data: current } = await supabase
            .from('topic_resources')
            .select('id')
            .eq('user_id', userId)
            .eq('topic_id', topicId)
            .single();

        let result;
        if (current?.id) {
            console.log("Found existing record, updating...");
            result = await supabase.from('topic_resources').update(statsData).eq('id', current.id).select();
        } else {
            console.log("No record found, inserting fresh...");
            result = await supabase.from('topic_resources').insert(statsData).select();
        }

        if (result.error) {
            console.error("❌ Database Update Failed:", result.error);
        } else {
            console.log("✅ Database Update Successful!");
            console.log("New State:", {
                attempted: result.data[0].questions_attempted,
                mastery: result.data[0].mastery_level,
                stage: result.data[0].study_stage
            });
        }

    } catch (err) {
        console.error("🔥 Error during manual update:", err.message);
    }
}

performManualUpdate();
