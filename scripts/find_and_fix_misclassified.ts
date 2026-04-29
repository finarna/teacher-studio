import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findMisclassified() {
  console.log('\n🔍 Finding Misclassified Questions');
  console.log('='.repeat(60));

  // Check Q100-Q149 for non-Botany
  const { data: botanyRange } = await supabase
    .from('questions')
    .select('id, question_order, subject, topic')
    .eq('scan_id', 'e3767338-1664-4e03-b0f6-1fab41ff5838')
    .gte('question_order', 100)
    .lte('question_order', 149)
    .order('question_order', { ascending: true });

  if (botanyRange) {
    const notBotany = botanyRange.filter(q => q.subject !== 'Botany');
    if (notBotany.length > 0) {
      console.log('\n⚠️  Non-Botany in Q100-Q149:');
      for (const q of notBotany) {
        console.log(`   Q${q.question_order}: ${q.subject} → should be Botany (${q.topic})`);
        await supabase
          .from('questions')
          .update({ subject: 'Botany' })
          .eq('id', q.id);
      }
      console.log(`✅ Fixed ${notBotany.length} questions`);
    } else {
      console.log('\n✅ Q100-Q149: All correctly marked as Botany');
    }
  }

  // Verify all ranges
  console.log('\n📋 Verifying All Ranges:');

  const ranges = [
    { start: 0, end: 49, expected: 'Physics' },
    { start: 50, end: 99, expected: 'Chemistry' },
    { start: 100, end: 149, expected: 'Botany' },
    { start: 150, end: 199, expected: 'Zoology' },
  ];

  for (const range of ranges) {
    const { data } = await supabase
      .from('questions')
      .select('question_order, subject')
      .eq('scan_id', 'e3767338-1664-4e03-b0f6-1fab41ff5838')
      .gte('question_order', range.start)
      .lte('question_order', range.end);

    if (data) {
      const wrong = data.filter(q => q.subject !== range.expected);
      if (wrong.length > 0) {
        console.log(`\n   ❌ Q${range.start}-Q${range.end} (${range.expected}):`);
        for (const q of wrong) {
          console.log(`      Q${q.question_order}: ${q.subject}`);
        }
      } else {
        console.log(`   ✅ Q${range.start}-Q${range.end} (${range.expected}): ${data.length} questions`);
      }
    }
  }

  // Final counts
  const { data: all } = await supabase
    .from('questions')
    .select('subject')
    .eq('scan_id', 'e3767338-1664-4e03-b0f6-1fab41ff5838');

  if (all) {
    const counts = {
      Physics: all.filter(q => q.subject === 'Physics').length,
      Chemistry: all.filter(q => q.subject === 'Chemistry').length,
      Botany: all.filter(q => q.subject === 'Botany').length,
      Zoology: all.filter(q => q.subject === 'Zoology').length,
    };

    console.log('\n📊 Final Counts:');
    console.log(`   Physics:   ${counts.Physics} ${counts.Physics === 50 ? '✅' : '❌'}`);
    console.log(`   Chemistry: ${counts.Chemistry} ${counts.Chemistry === 50 ? '✅' : '❌'}`);
    console.log(`   Botany:    ${counts.Botany} ${counts.Botany === 50 ? '✅' : '❌'}`);
    console.log(`   Zoology:   ${counts.Zoology} ${counts.Zoology === 50 ? '✅' : '❌'}`);

    if (counts.Physics === 50 && counts.Chemistry === 50 && counts.Botany === 50 && counts.Zoology === 50) {
      console.log('\n🎉 PERFECT! All 200 questions correctly classified!\n');
    }
  }

  console.log('='.repeat(60));
}

findMisclassified().catch(console.error);
