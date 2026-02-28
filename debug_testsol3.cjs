const { createClient } = require('@supabase/supabase-js');
const url = 'https://nsxjwjinxkehsubzesml.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zeGp3amlueGtlaHN1Ynplc21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk3NTIwMCwiZXhwIjoyMDg1NTUxMjAwfQ.-NTIcmqTWA0VV5pEautPs6_q1EW0gaWyZA830aZupew';
const supabase = createClient(url, key);

async function check() {
    const { data: attempts, error } = await supabase
        .from('test_attempts')
        .select('id, test_name, test_config, ai_report, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error || !attempts || !attempts.length) {
        console.log('No attempts found');
        return;
    }

    const testSol3 = attempts.find(a => (a.test_name || '').toLowerCase().includes('testsol3')) || attempts[0];
    console.log('--- ATTEMPT INFO ---');
    console.log('ID:', testSol3.id);
    console.log('Name:', testSol3.test_name);
    console.log('Status:', testSol3.status);
    console.log('AI Report Exists:', !!testSol3.ai_report);

    if (testSol3.test_config && testSol3.test_config.questions) {
        console.log('--- SAMPLE QUESTION METADATA (Q1) ---');
        const q1 = testSol3.test_config.questions[0];
        console.log(JSON.stringify({
            text: q1.text,
            solutionSteps: q1.solutionSteps,
            examTip: q1.examTip,
            keyFormulas: q1.keyFormulas,
            pitfalls: q1.pitfalls
        }, null, 2));
    } else {
        console.log('No questions found in test_config');
        console.log('Test Config keys:', Object.keys(testSol3.test_config || {}));
    }
}
check();
