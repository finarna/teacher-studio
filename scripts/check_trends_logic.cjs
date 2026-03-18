const { supabaseAdmin } = require('./lib/supabaseServer');

async function checkTrends() {
    try {
        const examContext = 'KCET';
        const subject = 'Math';

        const { data: patterns } = await supabaseAdmin
            .from('exam_historical_patterns')
            .select('*')
            .eq('exam_context', examContext)
            .eq('subject', subject)
            .order('year', { ascending: true });

        const patternIds = patterns.map(p => p.id);
        const { data: distributions } = await supabaseAdmin
            .from('exam_topic_distributions')
            .select('*')
            .in('historical_pattern_id', patternIds);

        const distributionsByPattern = {};
        patterns.forEach(pattern => {
            distributionsByPattern[pattern.year] = distributions.filter(
                d => d.historical_pattern_id === pattern.id
            );
        });

        // Function stolen from trendsEndpoints.js
        function calculateTopicTrends(patterns, distributionsByPattern) {
            const topicTrends = {};
            const topicMeta = {};

            Object.entries(distributionsByPattern).forEach(([year, dists]) => {
                dists.forEach(dist => {
                    const topicId = dist.topic_id;
                    if (!topicTrends[topicId]) {
                        topicTrends[topicId] = {
                            topicId,
                            totalQuestions: 0,
                            avgQuestions: 0,
                            dataPoints: [],
                            trend: 'stable',
                            change: 0,
                            importance: 'low',
                            growthRate: 0
                        };
                    }

                    topicTrends[topicId].dataPoints.push({
                        year: parseInt(year),
                        questionCount: dist.question_count,
                        avgMarks: dist.average_marks
                    });
                    topicTrends[topicId].totalQuestions += dist.question_count;
                });
            });

            Object.entries(topicTrends).forEach(([topicId, trend]) => {
                trend.avgQuestions = Math.round((trend.totalQuestions / patterns.length) * 10) / 10;
                trend.importance = trend.avgQuestions >= 5 ? 'high' : trend.avgQuestions >= 3 ? 'medium' : 'low';

                if (trend.dataPoints.length >= 2) {
                    const sorted = [...trend.dataPoints].sort((a, b) => a.year - b.year);
                    const first = sorted[0];
                    const last = sorted[sorted.length - 1];
                    const diff = last.questionCount - first.questionCount;

                    trend.change = diff;
                    trend.trend = diff > 0.5 ? 'increasing' : diff < -0.5 ? 'decreasing' : 'stable';
                    trend.growthRate = diff / (last.year - first.year);
                }
            });

            return topicTrends;
        }

        const trends = calculateTopicTrends(patterns, distributionsByPattern);
        console.log('Topic Trends Keys:', Object.keys(trends));

        let sum2021 = 0;
        let sum2023 = 0;
        Object.values(trends).forEach(t => {
            const dp21 = t.dataPoints.find(dp => dp.year === 2021);
            const dp23 = t.dataPoints.find(dp => dp.year === 2023);
            sum2021 += dp21 ? dp21.questionCount : 0;
            sum2023 += dp23 ? dp23.questionCount : 0;
        });
        console.log(`Sum 2021: ${sum2021}, Sum 2023: ${sum2023}`);

    } catch (err) {
        console.error(err);
    }
}

checkTrends();
