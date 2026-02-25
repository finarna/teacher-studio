import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStreak(userId: string) {
    console.log(`Checking activity for user: ${userId}`);

    const [activitiesRes, testsRes, answersRes] = await Promise.all([
        supabase.from('topic_activities').select('*').eq('user_id', userId),
        supabase.from('test_attempts').select('*').eq('user_id', userId).eq('status', 'completed'),
        supabase.from('practice_answers').select('*').eq('user_id', userId)
    ]);

    console.log(`Activities found: ${activitiesRes.data?.length || 0}`);
    console.log(`Tests found: ${testsRes.data?.length || 0}`);
    console.log(`Practice answers found: ${answersRes.data?.length || 0}`);

    if (activitiesRes.error) console.error('Activity Error:', activitiesRes.error);
    if (testsRes.error) console.error('Test Error:', testsRes.error);
    if (answersRes.error) console.error('Answers Error:', answersRes.error);

    const allDates: string[] = [];

    if (activitiesRes.data) {
        activitiesRes.data.forEach(a => allDates.push(new Date(a.activity_timestamp).toDateString()));
    }
    if (testsRes.data) {
        testsRes.data.forEach(t => allDates.push(new Date(t.created_at).toDateString()));
    }
    if (answersRes.data) {
        // practice_answers might not have a timestamp? Let's assume it does via created_at
        answersRes.data.forEach(a => {
            if (a.created_at) allDates.push(new Date(a.created_at).toDateString());
        });
    }

    const uniqueDates = Array.from(new Set(allDates)).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    console.log('Unique Dates:', uniqueDates);

    let streak = 0;
    if (uniqueDates.length > 0) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const firstDate = new Date(uniqueDates[0]);
        const firstDateNormalized = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());

        if (firstDateNormalized.getTime() === today.getTime() || firstDateNormalized.getTime() === yesterday.getTime()) {
            streak = 1;
            for (let i = 0; i < uniqueDates.length - 1; i++) {
                const current = new Date(uniqueDates[i]);
                const next = new Date(uniqueDates[i + 1]);
                const diffDays = (new Date(current).getTime() - new Date(next).getTime()) / (1000 * 60 * 60 * 24);
                if (Math.round(diffDays) === 1) streak++;
                else if (Math.round(diffDays) === 0) continue;
                else break;
            }
        }
    }

    console.log(`Calculated Streak: ${streak}`);
}

const USER_ID = 'dca5477c-619f-4315-9988-8314470fc933';
checkStreak(USER_ID);
