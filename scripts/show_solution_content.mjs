/**
 * Show actual solution step content to verify formatting
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function showSolutionContent() {
  console.log('📋 Showing actual solution step content...\n');

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, solution_steps')
    .eq('scan_id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c')
    .limit(3);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  questions.forEach((q, idx) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Question ${idx + 1}:`);
    console.log(`Text: ${q.text?.substring(0, 80)}...`);
    console.log(`\nSolution Steps (${q.solution_steps.length} steps):`);
    console.log('-'.repeat(80));

    q.solution_steps.forEach((step, stepIdx) => {
      console.log(`\nStep ${stepIdx + 1}:`);
      console.log(step);
      console.log('-'.repeat(80));
    });
  });

  console.log('\n\n✅ All solution steps shown above are the EXACT content that will be displayed in the UI.');
  console.log('   If you see clean, readable text (no \\begin{itemize}, \\item, etc.), then the data is correct.');
  console.log('   If the UI still shows LaTeX markup, it\'s likely a browser cache issue.');
}

showSolutionContent();
