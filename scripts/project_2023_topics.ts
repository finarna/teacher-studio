
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

async function analyzeTopicShifts() {
    console.log('📊 Analyzing Topic Shifts: KCET Math 2021 -> 2022');

    const { data: patterns } = await supabase
        .from('exam_historical_patterns')
        .select(`
            id, year, 
            exam_topic_distributions(
                topic_id, question_count, average_marks,
                topics(name)
            )
        `)
        .eq('subject', 'Math')
        .eq('exam_context', 'KCET')
        .order('year', { ascending: true });

    if (!patterns || patterns.length < 2) {
        console.log('Need more data.');
        return;
    }

    const dist21 = patterns[0].exam_topic_distributions;
    const dist22 = patterns[1].exam_topic_distributions;

    const topicsMap = new Map();

    dist21.forEach(d => {
        topicsMap.set(d.topic_id, {
            name: d.topics?.name || d.topic_id,
            count21: d.question_count,
            count22: 0
        });
    });

    dist22.forEach(d => {
        if (topicsMap.has(d.topic_id)) {
            topicsMap.get(d.topic_id).count22 = d.question_count;
        } else {
            topicsMap.set(d.topic_id, {
                name: d.topics?.name || d.topic_id,
                count21: 0,
                count22: d.question_count
            });
        }
    });

    const results = Array.from(topicsMap.values()).map(t => ({
        Topic: t.name,
        '2021 Qs': t.count21,
        '2022 Qs': t.count22,
        Shift: t.count22 - t.count21,
        '2023 Forecast': Math.max(0, t.count22 + (t.count22 - t.count21))
    }));

    console.table(results.sort((a, b) => Math.abs(b.Shift) - Math.abs(a.Shift)));

    // Total forecast questions
    const totalForecast = results.reduce((sum, r) => sum + r['2023 Forecast'], 0);
    console.log(`\nRaw 2023 Forecast Total: ${totalForecast} questions`);
}

analyzeTopicShifts();
