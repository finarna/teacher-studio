import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkActualTypes() {
  console.log('🔍 CHECKING ACTUAL QUESTION TYPES IN BIOLOGY PAPERS\n');

  const { data: questions } = await supabase
    .from('questions')
    .select('id, text, metadata')
    .eq('subject', 'Biology')
    .eq('exam_context', 'KCET')
    .like('source', 'AI-Generated%')
    .order('created_at', { ascending: false })
    .limit(120);

  if (!questions || questions.length === 0) {
    console.log('❌ No questions found');
    return;
  }

  // Count ALL unique question types
  const typeCounts: Record<string, number> = {};
  const samplesByType: Record<string, any[]> = {};

  questions.forEach(q => {
    const qType = q.metadata?.questionType || 'untagged';
    typeCounts[qType] = (typeCounts[qType] || 0) + 1;

    if (!samplesByType[qType]) samplesByType[qType] = [];
    if (samplesByType[qType].length < 2) {
      samplesByType[qType].push({
        id: q.id,
        text: q.text.substring(0, 100)
      });
    }
  });

  console.log('📊 ACTUAL QUESTION TYPE DISTRIBUTION:\n');
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const pct = ((count / questions.length) * 100).toFixed(1);
      console.log(`   ${type}: ${count} (${pct}%)`);

      // Show samples
      if (samplesByType[type]) {
        samplesByType[type].forEach((sample, idx) => {
          console.log(`      Sample ${idx + 1}: ${sample.text}...`);
        });
      }
      console.log();
    });

  console.log('\n🎯 EXPECTED DISTRIBUTION (from analysis):');
  console.log('   factual_conceptual: 37 (61%)');
  console.log('   diagram_based: 7 (11%)');
  console.log('   match_column: 5 (8%)');
  console.log('   statement_based: 5 (8%)');
  console.log('   reasoning: 4 (6%)');
  console.log('   application: 3 (5%)\n');

  console.log('❌ ISSUE IDENTIFIED:');
  console.log('The AI generator is using different type names than expected!');
  console.log('This suggests the generator directives are not being followed.\n');
}

checkActualTypes().catch(console.error);
