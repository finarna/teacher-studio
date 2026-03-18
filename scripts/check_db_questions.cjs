const { createClient } = require('@supabase/supabase-js');
const url = 'https://nsxjwjinxkehsubzesml.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zeGp3amlueGtlaHN1Ynplc21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk3NTIwMCwiZXhwIjoyMDg1NTUxMjAwfQ.-NTIcmqTWA0VV5pEautPs6_q1EW0gaWyZA830aZupew';
const supabase = createClient(url, key);

async function check() {
    const { data: responses, error } = await supabase
        .from('test_responses')
        .select('question_id, questions(*)')
        .eq('attempt_id', '652c09e5-1d3f-45b3-a563-f3ae5b2eb45e');

    if (error) { console.error(error); return; }
    if (!responses || !responses.length) {
        console.log('No responses found for attempt 652c09e5-1d3f-45b3-a563-f3ae5b2eb45e');
        return;
    }

    console.log('--- DB QUESTIONS METADATA ---');
    responses.slice(0, 2).forEach((r, idx) => {
        console.log(`Q${idx + 1} (${r.question_id}):`);
        console.log(JSON.stringify({
            text: r.questions?.text,
            solution_steps: r.questions?.solution_steps,
            exam_tip: r.questions?.exam_tip,
            key_formulas: r.questions?.key_formulas,
            pitfalls: r.questions?.pitfalls
        }, null, 2));
        console.log('---');
    });
}
check();
