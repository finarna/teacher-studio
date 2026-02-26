import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkTopics() {
    console.log('🔍 Checking topics table...');
    const { data, error } = await supabaseAdmin
        .from('topics')
        .select('*')
        .ilike('name', '%Determinants%');

    if (error) console.error(error);
    console.log(`Found ${data?.length || 0} official topics.`);
    data?.forEach(t => {
        console.log(`- ID: ${t.id} | Name: ${t.name} | Weightage:`, t.exam_weightage);
    });
}

checkTopics().catch(console.error);
