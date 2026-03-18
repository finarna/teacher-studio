
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const examContext = 'KCET';
    const subject = 'MATH';

    console.log(`Checking data for ${examContext} ${subject}...`);

    const { data: patterns, error: pError } = await supabase
        .from('exam_historical_patterns')
        .select('*')
        .eq('exam_context', examContext)
        .eq('subject', subject)
        .order('year', { ascending: true });

    if (pError) {
        console.error('Patterns error:', pError);
        return;
    }

    console.log('Patterns:');
    patterns.forEach(p => {
        console.log(`Year: ${p.year}, id: ${p.id}, total_marks: ${p.total_marks}, exam_context: ${p.exam_context}`);
    });

    const patternIds = patterns.map(p => p.id);
    const { data: dists, error: dError } = await supabase
        .from('exam_topic_distributions')
        .select('*')
        .in('historical_pattern_id', patternIds);

    if (dError) {
        console.error('Dists error:', dError);
        return;
    }

    patterns.forEach(p => {
        const yearDists = dists.filter(d => d.historical_pattern_id === p.id);
        const sum = yearDists.reduce((s, d) => s + d.question_count, 0);
        console.log(`Year ${p.year} Total Question Count in Dists: ${sum}`);
    });
}

checkData();
