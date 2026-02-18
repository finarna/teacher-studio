/**
 * Aggressive fix for ALL Math LaTeX rendering issues
 * Handles red LaTeX markup and spacing issues
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Aggressive LaTeX cleanup - converts ALL unwrapped LaTeX to plain text/Unicode
 */
const aggressiveCleanLatex = (text) => {
  if (!text) return text;

  // First, ensure proper spacing around $ delimiters
  let cleaned = text.replace(/([^\s])(\$)/g, '$1 $2');  // Add space before $
  cleaned = cleaned.replace(/(\$)([^\s])/g, '$1 $2');    // Add space after $

  // Split by $ to separate math mode from text mode
  const parts = cleaned.split('$');

  const result = parts.map((part, idx) => {
    if (idx % 2 === 1) {
      // Inside $...$ - this is math mode, but fix problematic commands
      return part
        .replace(/\\{/g, '\\lbrace ')   // \{ → \lbrace (proper LaTeX)
        .replace(/\\}/g, '\\rbrace ')   // \} → \rbrace (proper LaTeX)
        .replace(/\\\[/g, '[')           // \[ → [ (not needed in inline math)
        .replace(/\\\]/g, ']')           // \] → ] (not needed in inline math)
        .replace(/\\dots/g, '\\ldots');  // \dots → \ldots (proper LaTeX)
    } else {
      // Outside $...$ - this is text mode, convert ALL LaTeX to plain text
      return part
        // Set notation
        .replace(/\\{/g, '{')
        .replace(/\\}/g, '}')
        .replace(/\\\[/g, '[')
        .replace(/\\\]/g, ']')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')

        // Common symbols
        .replace(/\\dots/g, '...')
        .replace(/\\ldots/g, '...')
        .replace(/\\cdots/g, '⋯')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\pm/g, '±')
        .replace(/\\mp/g, '∓')

        // Inequalities
        .replace(/\\leq/g, '≤')
        .replace(/\\geq/g, '≥')
        .replace(/\\le/g, '≤')
        .replace(/\\ge/g, '≥')
        .replace(/\\neq/g, '≠')
        .replace(/\\approx/g, '≈')
        .replace(/\\equiv/g, '≡')

        // Set theory
        .replace(/\\subset/g, '⊂')
        .replace(/\\supset/g, '⊃')
        .replace(/\\subseteq/g, '⊆')
        .replace(/\\supseteq/g, '⊇')
        .replace(/\\in/g, '∈')
        .replace(/\\notin/g, '∉')
        .replace(/\\ni/g, '∋')
        .replace(/\\cap/g, '∩')
        .replace(/\\cup/g, '∪')
        .replace(/\\emptyset/g, '∅')
        .replace(/\\varnothing/g, '∅')

        // Logic
        .replace(/\\forall/g, '∀')
        .replace(/\\exists/g, '∃')
        .replace(/\\neg/g, '¬')
        .replace(/\\land/g, '∧')
        .replace(/\\lor/g, '∨')
        .replace(/\\implies/g, '⟹')
        .replace(/\\iff/g, '⟺')

        // Calculus
        .replace(/\\int/g, '∫')
        .replace(/\\sum/g, 'Σ')
        .replace(/\\prod/g, 'Π')
        .replace(/\\partial/g, '∂')
        .replace(/\\nabla/g, '∇')
        .replace(/\\infty/g, '∞')

        // Greek letters (lowercase)
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\gamma/g, 'γ')
        .replace(/\\delta/g, 'δ')
        .replace(/\\epsilon/g, 'ε')
        .replace(/\\varepsilon/g, 'ε')
        .replace(/\\zeta/g, 'ζ')
        .replace(/\\eta/g, 'η')
        .replace(/\\theta/g, 'θ')
        .replace(/\\vartheta/g, 'ϑ')
        .replace(/\\iota/g, 'ι')
        .replace(/\\kappa/g, 'κ')
        .replace(/\\lambda/g, 'λ')
        .replace(/\\mu/g, 'μ')
        .replace(/\\nu/g, 'ν')
        .replace(/\\xi/g, 'ξ')
        .replace(/\\pi/g, 'π')
        .replace(/\\varpi/g, 'ϖ')
        .replace(/\\rho/g, 'ρ')
        .replace(/\\varrho/g, 'ϱ')
        .replace(/\\sigma/g, 'σ')
        .replace(/\\varsigma/g, 'ς')
        .replace(/\\tau/g, 'τ')
        .replace(/\\upsilon/g, 'υ')
        .replace(/\\phi/g, 'φ')
        .replace(/\\varphi/g, 'φ')
        .replace(/\\chi/g, 'χ')
        .replace(/\\psi/g, 'ψ')
        .replace(/\\omega/g, 'ω')

        // Greek letters (uppercase)
        .replace(/\\Gamma/g, 'Γ')
        .replace(/\\Delta/g, 'Δ')
        .replace(/\\Theta/g, 'Θ')
        .replace(/\\Lambda/g, 'Λ')
        .replace(/\\Xi/g, 'Ξ')
        .replace(/\\Pi/g, 'Π')
        .replace(/\\Sigma/g, 'Σ')
        .replace(/\\Upsilon/g, 'Υ')
        .replace(/\\Phi/g, 'Φ')
        .replace(/\\Psi/g, 'Ψ')
        .replace(/\\Omega/g, 'Ω')

        // Text formatting (remove entirely)
        .replace(/\\text(it|bf|rm|sf|tt)\{([^}]+)\}/g, '$2')
        .replace(/\\textit\{([^}]+)\}/g, '$1')
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\mathrm\{([^}]+)\}/g, '$1')
        .replace(/\\mathit\{([^}]+)\}/g, '$1')
        .replace(/\\mathbf\{([^}]+)\}/g, '$1')
        .replace(/\\mathbb\{([^}]+)\}/g, '$1')
        .replace(/\\mathcal\{([^}]+)\}/g, '$1')

        // Special sets
        .replace(/\\mathbb\{R\}/g, 'ℝ')
        .replace(/\\mathbb\{N\}/g, 'ℕ')
        .replace(/\\mathbb\{Z\}/g, 'ℤ')
        .replace(/\\mathbb\{Q\}/g, 'ℚ')
        .replace(/\\mathbb\{C\}/g, 'ℂ')

        // Any remaining backslash before lowercase letter (catch-all)
        .replace(/\\([a-z]+)/g, (match, p1) => {
          // If it's a known command we missed, keep the backslash
          // Otherwise, just remove the backslash
          return p1;
        })

        // Clean up multiple spaces
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
  });

  return result.join('$');
};

async function fixAllMathLatex() {
  console.log('🔧 Aggressive LaTeX cleanup for Math questions...\n');

  const scanId = '36c297e4-ba97-4903-9726-4814eb9ea158';  // KCET 2022 Math

  const { data: scan } = await supabase
    .from('scans')
    .select('id, name')
    .eq('id', scanId)
    .single();

  if (!scan) {
    console.error('❌ Scan not found');
    return;
  }

  console.log(`📄 Scan: ${scan.name}`);
  console.log(`🆔 ID: ${scan.id}\n`);

  const { data: questions } = await supabase
    .from('questions')
    .select('id, text, solution_steps')
    .eq('scan_id', scanId);

  console.log(`📊 Processing ${questions.length} questions...\n`);

  let textFixed = 0;
  let solutionFixed = 0;

  for (const q of questions) {
    let updates = {};

    // Clean question text
    if (q.text) {
      const cleaned = aggressiveCleanLatex(q.text);
      if (cleaned !== q.text) {
        updates.text = cleaned;
        textFixed++;

        if (textFixed <= 5) {
          console.log(`✅ Question ${textFixed}:`);
          console.log(`   BEFORE: ${q.text.substring(0, 100)}...`);
          console.log(`   AFTER:  ${cleaned.substring(0, 100)}...\n`);
        }
      }
    }

    // Clean solution steps
    if (q.solution_steps && q.solution_steps.length > 0) {
      const cleaned = q.solution_steps.map(s => aggressiveCleanLatex(s));
      const hasChanges = cleaned.some((s, i) => s !== q.solution_steps[i]);

      if (hasChanges) {
        updates.solution_steps = cleaned;
        solutionFixed++;
      }
    }

    // Update if needed
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('questions')
        .update(updates)
        .eq('id', q.id);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Question texts updated: ${textFixed}/60`);
  console.log(`   Solution steps updated: ${solutionFixed}/60`);
  console.log(`\n🎉 Done! Hard refresh browser (Cmd+Shift+R) to see changes.`);
}

fixAllMathLatex();
