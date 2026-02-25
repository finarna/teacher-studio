import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const userId = '77462236-1cd7-4544-9131-1914632d29a0';

async function check() {
    const { data, error } = await supabase
        .from('topic_resources')
        .select('subject, topic_id, average_accuracy, questions_attempted, mastery_level')
        .eq('user_id', userId);

    if (error) {
        console.error(error);
        return;
    }

    const subjects = ['Physics', 'Chemistry', 'Math', 'Biology'];

    subjects.forEach(subject => {
        const subTopics = data.filter(d => d.subject === subject);
        console.log(`\n=== ${subject} ===`);
        console.log(`Total topics in DB: ${subTopics.length}`);
        const attempted = subTopics.filter(t => t.questions_attempted > 0);
        console.log(`Attempted topics: ${attempted.length}`);
        attempted.forEach(t => {
            console.log(`  - ${t.topic_id}: Acc=${t.average_accuracy}%, Opts=${t.questions_attempted}`);
        });

        if (subTopics.length > 0) {
            const avgAcc = subTopics.reduce((s, t) => s + t.average_accuracy, 0) / subTopics.length;
            console.log(`Simple Average Accuracy (All): ${avgAcc}%`);
        }
    });
}

check();
