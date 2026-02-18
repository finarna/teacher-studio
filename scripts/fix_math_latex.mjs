/**
 * Fix LaTeX rendering issues in Math questions
 * - Clean LaTeX outside $...$ delimiters
 * - Fix stray backslashes
 * - Convert unwrapped LaTeX to Unicode/plain text
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Clean LaTeX commands that are outside $...$ delimiters
 * Preserves LaTeX inside $...$ for MathJax rendering
 */
const cleanUnwrappedLatex = (text) => {
  if (!text) return text;

  // First, ensure proper spacing around $ delimiters
  // Replace $...$ with space-padded version if missing spaces
  text = text.replace(/([^\s])(\$)/g, '$1 $2');  // Add space before $ if missing
  text = text.replace(/(\$)([^\s])/g, '$1 $2');  // Add space after $ if missing

  // Split by $ to find LaTeX-wrapped and non-wrapped sections
  const parts = text.split('$');

  // Process odd-indexed parts (outside $...$), keep even-indexed parts (inside $...$)
  const cleaned = parts.map((part, idx) => {
    if (idx % 2 === 1) {
      // Inside $...$ - preserve as is
      return part;
    } else {
      // Outside $...$ - clean up LaTeX commands
      return part
        // Common set notation
        .replace(/\\{/g, '{')
        .replace(/\\}/g, '}')
        // Common math symbols
        .replace(/\\dots/g, '...')
        .replace(/\\ldots/g, '...')
        .replace(/\\cdots/g, '⋯')
        .replace(/\\sum/g, 'Σ')
        .replace(/\\prod/g, 'Π')
        .replace(/\\int(?!e)/g, '∫')  // \int but not \inte (like in "point")
        .replace(/\\infty/g, '∞')
        .replace(/\\pm/g, '±')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\leq/g, '≤')
        .replace(/\\geq/g, '≥')
        .replace(/\\neq/g, '≠')
        .replace(/\\approx/g, '≈')
        .replace(/\\equiv/g, '≡')
        .replace(/\\subset/g, '⊂')
        .replace(/\\supset/g, '⊃')
        .replace(/\\in/g, '∈')
        .replace(/\\notin/g, '∉')
        .replace(/\\cap/g, '∩')
        .replace(/\\cup/g, '∪')
        .replace(/\\emptyset/g, '∅')
        .replace(/\\forall/g, '∀')
        .replace(/\\exists/g, '∃')
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\gamma/g, 'γ')
        .replace(/\\delta/g, 'δ')
        .replace(/\\theta/g, 'θ')
        .replace(/\\lambda/g, 'λ')
        .replace(/\\pi/g, 'π')
        .replace(/\\sigma/g, 'σ')
        .replace(/\\omega/g, 'ω')
        .replace(/\\Delta/g, 'Δ')
        .replace(/\\Theta/g, 'Θ')
        .replace(/\\Lambda/g, 'Λ')
        .replace(/\\Pi/g, 'Π')
        .replace(/\\Sigma/g, 'Σ')
        .replace(/\\Omega/g, 'Ω')
        // Text formatting commands (remove entirely)
        .replace(/\$\\textit\{([^}]+)\}\$/g, '$1')  // $\textit{...}$
        .replace(/\\textit\{([^}]+)\}/g, '$1')  // \textit{...}
        .replace(/\\text(bf|it|rm)\{([^}]+)\}/g, '$2')  // \textbf, \textrm
        .replace(/\\mathrm\{([^}]+)\}/g, '$1')  // \mathrm{...}
        .replace(/\\mathit\{([^}]+)\}/g, '$1')  // \mathit{...}
        .replace(/\\mathbf\{([^}]+)\}/g, '$1')  // \mathbf{...}
        // Remaining stray backslashes before lowercase letters
        .replace(/\\([a-z])/g, '$1')
        // Clean up multiple spaces (but preserve single spaces)
        .replace(/[ \t]+/g, ' ');
    }
  });

  return cleaned.join('$');
};

async function fixMathLatex() {
  console.log('🔧 Fixing LaTeX in Math questions...\n');

  // Get latest Math scan - use specific scan ID from earlier check
  const scanId = '36c297e4-ba97-4903-9726-4814eb9ea158';  // KCET 2022 Math scan

  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('id, name')
    .eq('id', scanId)
    .single();

  if (scanError || !scan) {
    console.error('❌ Scan not found. ID:', scanId);
    console.error('   Error:', scanError);
    return;
  }

  console.log(`📄 Scan: ${scan.name}`);
  console.log(`🆔 ID: ${scan.id}\n`);

  // Get all questions from this scan
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, solution_steps')
    .eq('scan_id', scan.id);

  if (error) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`📊 Found ${questions.length} questions to process\n`);

  let textFixed = 0;
  let solutionFixed = 0;
  let skipped = 0;

  for (const q of questions) {
    let needsUpdate = false;
    let updates = {};

    // Check and fix question text
    if (q.text) {
      const hasLatex = q.text.includes('\\{') || q.text.includes('\\dots') || /\\[a-z]/.test(q.text);
      if (hasLatex) {
        updates.text = cleanUnwrappedLatex(q.text);
        needsUpdate = true;
        textFixed++;

        if (textFixed <= 3) {
          console.log(`✅ Cleaned question text:`);
          console.log(`   BEFORE: ${q.text.substring(0, 100)}...`);
          console.log(`   AFTER:  ${updates.text.substring(0, 100)}...\n`);
        }
      }
    }

    // Check and fix solution steps
    if (q.solution_steps && q.solution_steps.length > 0) {
      const hasLatex = q.solution_steps.some(s =>
        s.includes('\\{') || s.includes('\\dots') || /\\[a-z]/.test(s)
      );

      if (hasLatex) {
        updates.solution_steps = q.solution_steps.map(s => cleanUnwrappedLatex(s));
        needsUpdate = true;
        solutionFixed++;

        if (solutionFixed <= 3) {
          const dirtyIdx = q.solution_steps.findIndex(s =>
            s.includes('\\{') || s.includes('\\dots') || /\\[a-z]/.test(s)
          );
          console.log(`✅ Cleaned solution step:`);
          console.log(`   BEFORE: ${q.solution_steps[dirtyIdx]?.substring(0, 100)}...`);
          console.log(`   AFTER:  ${updates.solution_steps[dirtyIdx]?.substring(0, 100)}...\n`);
        }
      }
    }

    // Update database
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', q.id);

      if (updateError) {
        console.error(`❌ Error updating question ${q.id}:`, updateError.message);
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Questions with text cleaned: ${textFixed}`);
  console.log(`   Questions with solutions cleaned: ${solutionFixed}`);
  console.log(`   Questions skipped (already clean): ${skipped}`);
  console.log(`\n🎉 Done! Refresh browser (Cmd+Shift+R) to see clean Math questions.`);
}

fixMathLatex();
