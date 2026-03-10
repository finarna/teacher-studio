import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkBioQuestions() {
    const { data: questions, error } = await supabaseAdmin
        .from('questions')
        .select('id, subject, topic, exam_context, scan_id');

    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    const bioQuestions = questions.filter(q => q.subject === 'Biology' || q.subject === 'Botany' || q.subject === 'Zoology');
    console.log(`📊 Found ${bioQuestions.length} Total Bio-descendant questions in DB.`);

    const status = {};
    bioQuestions.forEach(q => {
        const key = `${q.subject} (${q.exam_context || 'No Context'})`;
        status[key] = (status[key] || 0) + 1;
    });
    console.log('\nSubject/Exam Context Breakdown:', status);

    const stillBiology = bioQuestions.filter(q => q.subject === 'Biology');
    if (stillBiology.length > 0) {
        console.log(`\n⚠️  Still found ${stillBiology.length} "Biology" questions!`);
        stillBiology.forEach(q => {
            console.log(`- ID: ${q.id}, Exam: ${q.exam_context}, Topic: "${q.topic}"`);
        });
    } else {
        console.log('\n✅ NO "Biology" questions left in DB.');
    }
}

checkBioQuestions();
