/**
 * Verify Question 60 (the red LaTeX one) was fixed
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyQ60() {
  // Find question with "A = {1, 2, 3"
  const { data } = await supabase
    .from('questions')
    .select('id, text, solution_steps')
    .eq('scan_id', '36c297e4-ba97-4903-9726-4814eb9ea158')
    .ilike('text', '%subsets of A containing only odd%')
    .limit(1);

  if (!data || data.length === 0) {
    console.log('❌ Question not found');
    return;
  }

  const q = data[0];
  console.log('📋 Question 60 (Sets question)\n');
  console.log('Text:', q.text);
  console.log('\n');
  console.log('✅ Checks:');
  console.log(`  Contains \\{ (escaped brace)? ${q.text.includes('\\{') ? 'YES ❌ STILL HAS RED LATEX' : 'NO ✓'}`);
  console.log(`  Contains \\dots (escaped dots)? ${q.text.includes('\\dots') ? 'YES ❌ STILL HAS RED LATEX' : 'NO ✓'}`);
  console.log(`  Contains plain { (brace)? ${q.text.includes('{') ? 'YES ✓' : 'NO'}`);
  console.log(`  Contains ... (dots)? ${q.text.includes('...') ? 'YES ✓' : 'NO'}`);

  if (q.solution_steps && q.solution_steps.length > 0) {
    console.log(`\n📝 Solution steps: ${q.solution_steps.length} steps`);
    const hasLatexInSteps = q.solution_steps.some(s => s.includes('\\{') || s.includes('\\dots'));
    console.log(`  Contains red LaTeX? ${hasLatexInSteps ? 'YES ❌' : 'NO ✓'}`);

    if (hasLatexInSteps) {
      const badStep = q.solution_steps.find(s => s.includes('\\{') || s.includes('\\dots'));
      console.log(`  Example: "${badStep.substring(0, 100)}..."`);
    }
  }
}

verifyQ60();
