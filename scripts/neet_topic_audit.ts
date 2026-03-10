import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkNeetTopics() {
    const { data: questions, error } = await supabaseAdmin
        .from('questions')
        .select('topic, subject')
        .eq('exam_context', 'NEET');

    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    const topicsBySubject = {};
    questions.forEach(q => {
        const subj = q.subject || 'Unknown';
        if (!topicsBySubject[subj]) topicsBySubject[subj] = {};
        const topic = q.topic || 'No Topic';
        topicsBySubject[subj][topic] = (topicsBySubject[subj][topic] || 0) + 1;
    });

    console.log('\nNEET Topic Breakdown by Subject:');
    for (const [subj, topics] of Object.entries(topicsBySubject)) {
        console.log(`\n📚 ${subj}:`);
        const sorted = Object.entries(topics).sort((a, b) => (b[1] as number) - (a[1] as number));
        sorted.forEach(([name, count]) => {
            console.log(`  - ${name}: ${count}`);
        });
    }
}

checkNeetTopics();
