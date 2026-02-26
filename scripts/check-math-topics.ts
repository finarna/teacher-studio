import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkMathTopics() {
    console.log('🔍 Listing Math topics from official list or resources...');
    const { data: resources } = await supabaseAdmin
        .from('topic_resources')
        .select('topic_name')
        .eq('subject', 'Math')
        .limit(20);

    const uniqueTopics = Array.from(new Set(resources?.map(r => r.topic_name)));
    console.log('Topics found:', uniqueTopics);
}

checkMathTopics().catch(console.error);
