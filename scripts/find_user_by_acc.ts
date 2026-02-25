import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data, error } = await supabase
        .from('topic_resources')
        .select('user_id, subject, average_accuracy, questions_attempted')
        .eq('subject', 'Math')
        .gt('questions_attempted', 0);

    if (error) {
        console.error(error);
        return;
    }

    const userAccuracies = new Map();

    data.forEach(row => {
        if (!userAccuracies.has(row.user_id)) {
            userAccuracies.set(row.user_id, { sum: 0, count: 0 });
        }
        const stats = userAccuracies.get(row.user_id);
        stats.sum += row.average_accuracy;
        stats.count += 1;
    });

    console.log("Users with Math Accuracy:");
    userAccuracies.forEach((stats, userId) => {
        const avg = stats.sum / stats.count;
        console.log(`User: ${userId}, Avg Acc: ${avg.toFixed(2)}% (Topics: ${stats.count})`);
    });
}

check();
