/**
 * Fix stray backslashes in solution steps
 * Fixes: Mono\cot → Monocot, Di\cot → Dicot, etc.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const cleanBackslashes = (text) => {
  if (!text) return text;
  return text
    .replace(/\$\\textit\{([^}]+)\}\$/g, '$1')  // Remove $\textit{...}$
    .replace(/\\textit\{([^}]+)\}/g, '$1')  // Remove \textit{...} without $
    .replace(/\\text(bf|it|rm)\{([^}]+)\}/g, '$2')  // Remove other text commands
    .replace(/\\([a-z])/g, '$1')  // Remove remaining stray backslashes before lowercase letters
    .trim();
};

async function fixBackslashes() {
  console.log('🔧 Fixing stray backslashes in solution steps...\n');

  // Get all Biology questions
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, solution_steps')
    .eq('scan_id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c');

  if (error) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`📊 Found ${questions.length} questions to check\n`);

  let fixed = 0;
  let skipped = 0;

  for (const q of questions) {
    if (!q.solution_steps || q.solution_steps.length === 0) {
      skipped++;
      continue;
    }

    // Check if any step has LaTeX markup or backslashes
    const hasLatexMarkup = q.solution_steps.some(s =>
      /\\[a-z]/.test(s) || /\\textit/.test(s) || /\\text(bf|rm)/.test(s)
    );

    if (hasLatexMarkup) {
      const cleanedSteps = q.solution_steps.map(s => cleanBackslashes(s));

      const { error: updateError } = await supabase
        .from('questions')
        .update({ solution_steps: cleanedSteps })
        .eq('id', q.id);

      if (updateError) {
        console.error(`❌ Error updating question ${q.id}:`, updateError.message);
      } else {
        fixed++;
        if (fixed <= 5) {
          const dirtyStep = q.solution_steps.find(s => /\\[a-z]/.test(s) || /\\textit/.test(s));
          const dirtyStepIdx = q.solution_steps.findIndex(s => /\\[a-z]/.test(s) || /\\textit/.test(s));
          console.log(`✅ Fixed question: ${q.text?.substring(0, 60)}...`);
          if (dirtyStep) {
            console.log(`   BEFORE: "${dirtyStep.substring(0, 120)}..."`);
            console.log(`   AFTER:  "${cleanedSteps[dirtyStepIdx]?.substring(0, 120)}..."\n`);
          }
        }
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Fixed: ${fixed} questions`);
  console.log(`   Skipped: ${skipped} questions (no backslashes found)`);
  console.log(`\n🎉 Done! Refresh the browser (hard refresh: Cmd+Shift+R) to see clean solutions.`);
}

fixBackslashes();
