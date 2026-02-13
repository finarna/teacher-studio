const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeVisualSketches() {
  console.log('\n=== VISUAL SKETCHES DETAILED ANALYSIS ===\n');

  const { data: scans } = await supabase
    .from('scans')
    .select('id, user_id, analysis_data, exam_context')
    .not('analysis_data', 'is', null);

  const sketchesByTopic = new Map();
  const sketchExamples = [];

  scans.forEach(scan => {
    const questions = scan.analysis_data?.questions || [];
    questions.forEach(q => {
      if (q.sketchSvg) {
        const topic = q.topic || 'Unknown';
        const domain = q.domain || q.chapter || 'Unknown';

        if (!sketchesByTopic.has(topic)) {
          sketchesByTopic.set(topic, {
            count: 0,
            domains: new Set(),
            examples: []
          });
        }

        const data = sketchesByTopic.get(topic);
        data.count++;
        data.domains.add(domain);

        if (data.examples.length < 2) {
          const questionText = q.questionText || q.question || 'No text available';
          data.examples.push({
            scanId: scan.id,
            questionId: q.id,
            questionText: questionText.substring(0, 100) + '...',
            subject: scan.exam_context?.subject || 'Unknown'
          });
        }
      }
    });
  });

  console.log('VISUAL SKETCHES BY TOPIC:\n');
  console.log('='.repeat(80));

  const sortedTopics = [...sketchesByTopic.entries()].sort((a, b) => b[1].count - a[1].count);

  sortedTopics.forEach(([topic, data]) => {
    console.log(`\nTopic: ${topic}`);
    console.log(`  Count: ${data.count} sketches`);
    console.log(`  Domains: ${[...data.domains].join(', ')}`);
    console.log(`  Examples:`);
    data.examples.forEach(ex => {
      console.log(`    - Scan: ${ex.scanId}, Q: ${ex.questionId}, Subject: ${ex.subject}`);
      console.log(`      Text: ${ex.questionText}`);
    });
  });

  console.log(`\n\nTOTAL UNIQUE TOPICS WITH SKETCHES: ${sketchesByTopic.size}`);
  console.log(`TOTAL SKETCHES: ${Array.from(sketchesByTopic.values()).reduce((sum, d) => sum + d.count, 0)}`);
}

analyzeVisualSketches().catch(console.error);
