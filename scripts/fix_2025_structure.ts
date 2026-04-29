/**
 * Fix NEET 2025 - Different Structure (45 questions per subject)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEET_2025_SCAN_ID = '4f682118-d0ce-4f6f-95c7-6141e496579f';

function getCorrectSubject2025(questionOrder: number): string {
  if (questionOrder >= 0 && questionOrder <= 44) return 'Physics';
  if (questionOrder >= 45 && questionOrder <= 89) return 'Chemistry';
  if (questionOrder >= 90 && questionOrder <= 134) return 'Botany';
  if (questionOrder >= 135 && questionOrder <= 179) return 'Zoology';
  return 'Unknown';
}

async function fix2025() {
  console.log('\n🔧 Fixing NEET 2025 Structure (45 questions per subject)');
  console.log('='.repeat(80));

  // Get all questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, question_order, subject')
    .eq('scan_id', NEET_2025_SCAN_ID)
    .order('question_order', { ascending: true });

  if (!questions) {
    console.error('❌ Could not fetch questions');
    return;
  }

  console.log(`\n📊 Total questions: ${questions.length}`);

  // Find misclassified
  const misclassified = questions.filter(q => {
    const correct = getCorrectSubject2025(q.question_order);
    return q.subject !== correct && correct !== 'Unknown';
  });

  if (misclassified.length > 0) {
    console.log(`\n⚠️  Found ${misclassified.length} misclassified questions`);

    console.log('\n📝 Sample misclassifications:');
    for (let i = 0; i < Math.min(10, misclassified.length); i++) {
      const q = misclassified[i];
      console.log(`   Q${q.question_order}: ${q.subject} → ${getCorrectSubject2025(q.question_order)}`);
    }

    console.log(`\n🔧 Fixing classifications...`);
    let fixed = 0;

    for (const q of misclassified) {
      const { error } = await supabase
        .from('questions')
        .update({ subject: getCorrectSubject2025(q.question_order) })
        .eq('id', q.id);

      if (!error) {
        fixed++;
        if (fixed % 10 === 0) {
          console.log(`   ✓ Fixed ${fixed}/${misclassified.length}...`);
        }
      }
    }

    console.log(`\n✅ Fixed ${fixed} questions`);
  } else {
    console.log('\n✅ All questions correctly classified');
  }

  // Verify final counts
  const { data: final } = await supabase
    .from('questions')
    .select('subject')
    .eq('scan_id', NEET_2025_SCAN_ID);

  if (final) {
    const counts = {
      Physics: final.filter(q => q.subject === 'Physics').length,
      Chemistry: final.filter(q => q.subject === 'Chemistry').length,
      Botany: final.filter(q => q.subject === 'Botany').length,
      Zoology: final.filter(q => q.subject === 'Zoology').length,
    };

    console.log('\n📊 Final Subject Distribution:');
    console.log(`   Physics:   ${counts.Physics} ${counts.Physics === 45 ? '✅' : '❌'} (expected: 45)`);
    console.log(`   Chemistry: ${counts.Chemistry} ${counts.Chemistry === 45 ? '✅' : '❌'} (expected: 45)`);
    console.log(`   Botany:    ${counts.Botany} ${counts.Botany === 45 ? '✅' : '❌'} (expected: 45)`);
    console.log(`   Zoology:   ${counts.Zoology} ${counts.Zoology === 45 ? '✅' : '❌'} (expected: 45)`);

    if (counts.Physics === 45 && counts.Chemistry === 45 && counts.Botany === 45 && counts.Zoology === 45) {
      console.log('\n🎉 PERFECT! All 180 questions correctly classified!\n');
    }
  }

  console.log('='.repeat(80));
}

fix2025().catch(console.error);
