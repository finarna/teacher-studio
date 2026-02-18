/**
 * Check the specific vascular bundles question from the screenshot
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkVascularQuestion() {
  console.log('🔍 Checking vascular bundles question...\n');

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, solution_steps, topic')
    .eq('scan_id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c')
    .ilike('text', '%vascular bundles%');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (questions.length === 0) {
    console.log('⚠️  No questions found matching "vascular bundles"');

    // Try broader search
    const { data: allQ } = await supabase
      .from('questions')
      .select('id, text, topic')
      .eq('scan_id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c')
      .eq('topic', 'Sexual Reproduction in Flowering Plants');

    console.log(`\nFound ${allQ?.length || 0} questions with topic "Sexual Reproduction in Flowering Plants"`);
    if (allQ && allQ.length > 0) {
      console.log('\nFirst few:');
      allQ.slice(0, 3).forEach((q, i) => {
        console.log(`${i+1}. ${q.text?.substring(0, 80)}...`);
      });
    }
    return;
  }

  console.log(`📊 Found ${questions.length} matching question(s):\n`);

  questions.forEach((q, idx) => {
    console.log(`${'='.repeat(100)}`);
    console.log(`Question ${idx + 1}:`);
    console.log(`ID: ${q.id}`);
    console.log(`Topic: ${q.topic}`);
    console.log(`Text: ${q.text}`);
    console.log(`\nSolution Steps (${q.solution_steps?.length || 0} steps):`);
    console.log('-'.repeat(100));

    q.solution_steps?.forEach((step, stepIdx) => {
      console.log(`\n--- Step ${stepIdx + 1} ---`);
      console.log(`RAW CONTENT (showing all characters including spaces):`);
      console.log(`LENGTH: ${step.length} chars`);
      console.log(`CONTENT:\n${step}`);
      console.log(`\nCHAR BREAKDOWN (first 200 chars):`);
      console.log(step.substring(0, 200).split('').map((c, i) => `[${i}]='${c}'`).join(' '));
      console.log('-'.repeat(100));
    });
  });
}

checkVascularQuestion();
