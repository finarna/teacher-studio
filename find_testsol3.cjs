const { createClient } = require('@supabase/supabase-js');
const url = 'https://nsxjwjinxkehsubzesml.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zeGp3amlueGtlaHN1Ynplc21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk3NTIwMCwiZXhwIjoyMDg1NTUxMjAwfQ.-NTIcmqTWA0VV5pEautPs6_q1EW0gaWyZA830aZupew';
const supabase = createClient(url, key);

async function check() {
    const { data: attempts, error } = await supabase
        .from('test_attempts')
        .select('id, test_name, test_config, ai_report, status, created_at')
        .ilike('test_name', '%testsol3%')
        .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }

    console.log(`Found ${attempts?.length || 0} attempts for testsol3`);

    attempts?.forEach((a, aIdx) => {
        console.log(`\n--- ATTEMPT ${aIdx + 1}: ${a.test_name} (${a.id}) ---`);
        console.log(`Created At: ${a.created_at}`);
        if (a.test_config && a.test_config.questions) {
            const q = a.test_config.questions.find(q => q.text && q.text.includes('x + 2y = 8')) || a.test_config.questions[0];
            console.log('Sample Question found:', q.text?.substring(0, 50));
            console.log(JSON.stringify({
                solutionSteps: q.solutionSteps,
                examTip: q.examTip,
                keyFormulas: q.keyFormulas,
                pitfalls: q.pitfalls
            }, null, 2));
        }
    });
}
check();
