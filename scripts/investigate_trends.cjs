const { supabaseAdmin } = require('./lib/supabaseServer');

async function checkData() {
    try {
        const { data: patterns } = await supabaseAdmin
            .from('exam_historical_patterns')
            .select('*')
            .eq('exam_context', 'KCET')
            .eq('subject', 'Math')
            .order('year', { ascending: true });

        if (!patterns || patterns.length === 0) {
            console.log('No patterns found for KCET Math');
            return;
        }

        const patternIds = patterns.map(p => p.id);
        const { data: dists } = await supabaseAdmin
            .from('exam_topic_distributions')
            .select('*')
            .in('historical_pattern_id', patternIds);

        const byYear = {};
        patterns.forEach(p => {
            const yearDists = dists.filter(d => d.historical_pattern_id === p.id);
            const sum = yearDists.reduce((s, d) => s + d.question_count, 0);
            byYear[p.year] = { count: yearDists.length, sum, total_marks: p.total_marks };
        });
        console.log('Distributions Summary:', byYear);
    } catch (err) {
        console.error(err);
    }
}

checkData();
