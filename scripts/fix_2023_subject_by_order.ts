/**
 * Fix NEET 2023 Subject Classification by Question Order
 *
 * NEET Combined Paper has 200 questions sequentially:
 * - Q1-50: Physics (50)
 * - Q51-100: Chemistry (50)
 * - Q101-150: Botany (50)
 * - Q151-200: Zoology (50)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEET_2023_SCAN_ID = 'e3767338-1664-4e03-b0f6-1fab41ff5838';

function getCorrectSubject(questionOrder: number): string {
  if (questionOrder >= 1 && questionOrder <= 50) return 'Physics';
  if (questionOrder >= 51 && questionOrder <= 100) return 'Chemistry';
  if (questionOrder >= 101 && questionOrder <= 150) return 'Botany';
  if (questionOrder >= 151 && questionOrder <= 200) return 'Zoology';
  return 'Unknown';
}

async function fixByOrder() {
  console.log('\n🔧 Fixing NEET 2023 Subject Classification by Question Order');
  console.log('='.repeat(80));

  // 1. Get all questions
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_order, subject, topic')
    .eq('scan_id', NEET_2023_SCAN_ID)
    .order('question_order', { ascending: true });

  if (error || !questions) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n📊 Total questions: ${questions.length}`);

  // 2. Find misclassified questions
  const misclassified = questions.filter(q => {
    const correctSubject = getCorrectSubject(q.question_order);
    return q.subject !== correctSubject;
  });

  console.log(`\n⚠️  Misclassified: ${misclassified.length} questions`);

  if (misclassified.length === 0) {
    console.log('\n✅ All questions correctly classified!\n');
    return;
  }

  // 3. Show summary
  const changes = new Map<string, number>();
  for (const q of misclassified) {
    const key = `${q.subject} → ${getCorrectSubject(q.question_order)}`;
    changes.set(key, (changes.get(key) || 0) + 1);
  }

  console.log('\n📋 Changes to apply:');
  for (const [change, count] of changes.entries()) {
    console.log(`   ${change}: ${count} questions`);
  }

  console.log('\n📝 Sample misclassified questions:');
  for (let i = 0; i < Math.min(10, misclassified.length); i++) {
    const q = misclassified[i];
    const correct = getCorrectSubject(q.question_order);
    console.log(`   Q${q.question_order}: ${q.subject} → ${correct} (${q.topic})`);
  }

  // 4. Apply fixes
  console.log(`\n\n🚀 Applying fixes...\n`);

  let updated = 0;
  let errors = 0;

  for (const q of misclassified) {
    const correctSubject = getCorrectSubject(q.question_order);

    const { error: updateError } = await supabase
      .from('questions')
      .update({ subject: correctSubject })
      .eq('id', q.id);

    if (updateError) {
      console.error(`   ❌ Failed Q${q.question_order}:`, updateError.message);
      errors++;
    } else {
      updated++;
      if (updated % 20 === 0) {
        console.log(`   ✓ Updated ${updated}/${misclassified.length}...`);
      }
    }
  }

  console.log(`\n✅ Update Complete!`);
  console.log(`   - Successfully updated: ${updated}`);
  console.log(`   - Errors: ${errors}`);

  // 5. Verify final distribution
  console.log(`\n\n🔍 Final Distribution:\n`);

  const { data: final } = await supabase
    .from('questions')
    .select('question_order, subject')
    .eq('scan_id', NEET_2023_SCAN_ID)
    .order('question_order', { ascending: true });

  if (final) {
    const counts = {
      Physics: final.filter(q => q.subject === 'Physics').length,
      Chemistry: final.filter(q => q.subject === 'Chemistry').length,
      Botany: final.filter(q => q.subject === 'Botany').length,
      Zoology: final.filter(q => q.subject === 'Zoology').length,
    };

    console.log(`   Physics:   ${counts.Physics} questions (expected: 50)`);
    console.log(`   Chemistry: ${counts.Chemistry} questions (expected: 50)`);
    console.log(`   Botany:    ${counts.Botany} questions (expected: 50)`);
    console.log(`   Zoology:   ${counts.Zoology} questions (expected: 50)`);

    // Verify sequential order
    const physicsQuestions = final.filter(q => q.subject === 'Physics');
    const chemQuestions = final.filter(q => q.subject === 'Chemistry');
    const botanyQuestions = final.filter(q => q.subject === 'Botany');
    const zoologyQuestions = final.filter(q => q.subject === 'Zoology');

    if (physicsQuestions.length > 0) {
      console.log(`\n   Physics range:   Q${Math.min(...physicsQuestions.map(q => q.question_order))} - Q${Math.max(...physicsQuestions.map(q => q.question_order))}`);
    }
    if (chemQuestions.length > 0) {
      console.log(`   Chemistry range: Q${Math.min(...chemQuestions.map(q => q.question_order))} - Q${Math.max(...chemQuestions.map(q => q.question_order))}`);
    }
    if (botanyQuestions.length > 0) {
      console.log(`   Botany range:    Q${Math.min(...botanyQuestions.map(q => q.question_order))} - Q${Math.max(...botanyQuestions.map(q => q.question_order))}`);
    }
    if (zoologyQuestions.length > 0) {
      console.log(`   Zoology range:   Q${Math.min(...zoologyQuestions.map(q => q.question_order))} - Q${Math.max(...zoologyQuestions.map(q => q.question_order))}`);
    }

    if (counts.Physics === 50 && counts.Chemistry === 50 && counts.Botany === 50 && counts.Zoology === 50) {
      console.log(`\n   ✅ Perfect! All subjects have correct counts.`);
    } else {
      console.log(`\n   ⚠️  Warning: Counts don't match expected distribution.`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Fix Complete!\n');
}

fixByOrder().catch(console.error);
