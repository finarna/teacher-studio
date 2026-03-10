import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkNeetSubjects() {
    const { data: questions, error } = await supabaseAdmin
        .from('questions')
        .select('subject, topic')
        .eq('exam_context', 'NEET');

    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    const counts = {};
    questions.forEach(q => {
        const s = q.subject || 'null';
        counts[s] = (counts[s] || 0) + 1;
    });

    console.log('Final NEET Subject Distribution:', counts);

    const nullSubj = questions.filter(q => !q.subject);
    if (nullSubj.length > 0) {
        console.log(`\n⚠️  Found ${nullSubj.length} NEET questions with subject = null!`);
        const topics = {};
        nullSubj.forEach(q => {
            topics[q.topic || 'No Topic'] = (topics[q.topic || 'No Topic'] || 0) + 1;
        });
        console.log('Null Subject Question Topics:', topics);
    }
}

checkNeetSubjects();
