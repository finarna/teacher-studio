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
    console.log(`📊 Found ${bioQuestions.length} Total Bio/Botany/Zoology questions.`);

    const status = {};
    bioQuestions.forEach(q => {
        const key = `${q.subject} (${q.exam_context})`;
        status[key] = (status[key] || 0) + 1;
    });
    console.log('\nSubject/Exam Context Breakdown:', status);

    const biologyNeet = bioQuestions.filter(q => q.subject === 'Biology' && q.exam_context === 'NEET');
    if (biologyNeet.length > 0) {
        console.log('\n⚠️  Still found Biology NEET questions:');
        biologyNeet.forEach(q => {
            console.log(`- ID: ${q.id}, Topic: "${q.topic}"`);
        });
    } else {
        console.log('\n✅ NO "Biology" NEET questions found. All are updated to Botany/Zoology.');
    }

    // Check unique subjects for NEET
    const neetQuestions = questions.filter(q => q.exam_context === 'NEET');
    const subjects = {};
    neetQuestions.forEach(q => {
        subjects[q.subject] = (subjects[q.subject] || 0) + 1;
    });
    console.log('\nNEET Subject Distribution:', subjects);
}

checkBioQuestions();
