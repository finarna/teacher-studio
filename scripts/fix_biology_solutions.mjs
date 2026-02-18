/**
 * Fix Biology Solution Steps Format
 *
 * Converts solutionData.steps to solutionSteps and cleans LaTeX markup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const cleanLatexMarkup = (text) => {
  if (!text) return text;
  return text
    .replace(/\\begin\{itemize\}/g, '')
    .replace(/\\end\{itemize\}/g, '')
    .replace(/\\item\s*/g, '• ')
    .replace(/\$\\textit\{([^}]+)\}\$/g, '$1')  // Remove \textit{}
    .replace(/\s+/g, ' ')  // Clean multiple spaces
    .trim();
};

async function fixBiologySolutions() {
  console.log('🔧 Fixing Biology solution steps format...\n');

  // Get all Biology questions from the scan
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, solution_steps, metadata')
    .eq('scan_id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c');

  if (error) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`📊 Found ${questions.length} questions to fix`);

  let fixed = 0;
  let skipped = 0;

  for (const q of questions) {
    // Check if solution_steps needs fixing
    if (!q.solution_steps || q.solution_steps.length === 0) {
      // Check if data is in metadata.solutionData
      const solutionData = q.metadata?.solutionData;
      if (solutionData?.steps && Array.isArray(solutionData.steps)) {
        // Convert to proper format
        const cleanedSteps = solutionData.steps.map(s => {
          const stepText = s.text || s;
          return cleanLatexMarkup(stepText);
        });

        const { error: updateError } = await supabase
          .from('questions')
          .update({
            solution_steps: cleanedSteps,
            exam_tip: solutionData.finalTip || null
          })
          .eq('id', q.id);

        if (updateError) {
          console.error(`❌ Error updating question ${q.id}:`, updateError.message);
        } else {
          fixed++;
          if (fixed <= 3) {
            console.log(`✅ Fixed question ${q.id}: ${cleanedSteps.length} steps`);
          }
        }
      } else {
        skipped++;
      }
    } else {
      // Clean existing solution_steps if they have LaTeX markup
      const needsCleaning = q.solution_steps.some(s =>
        s.includes('\\begin{itemize}') || s.includes('\\item')
      );

      if (needsCleaning) {
        const cleanedSteps = q.solution_steps.map(s => cleanLatexMarkup(s));

        const { error: updateError } = await supabase
          .from('questions')
          .update({ solution_steps: cleanedSteps })
          .eq('id', q.id);

        if (updateError) {
          console.error(`❌ Error cleaning question ${q.id}:`, updateError.message);
        } else {
          fixed++;
          if (fixed <= 3) {
            console.log(`✅ Cleaned question ${q.id}`);
          }
        }
      } else {
        skipped++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Fixed: ${fixed} questions`);
  console.log(`   Skipped: ${skipped} questions (already correct or no data)`);
  console.log('\n🎉 Done! Refresh the Learning Journey to see clean solutions.');
}

fixBiologySolutions();
