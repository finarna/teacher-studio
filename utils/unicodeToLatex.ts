/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNICODE TO LATEX CONVERTER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Converts common Unicode mathematical symbols to proper LaTeX commands
 *
 * CRITICAL: AI often extracts Unicode characters (θ, √, ∫, ∑, etc.) directly from PDFs
 * These need to be converted to LaTeX for proper rendering
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Map of Unicode math symbols to their LaTeX equivalents
 * Organized by category for maintainability
 */
const UNICODE_TO_LATEX_MAP: Record<string, string> = {
  // GREEK LETTERS (lowercase) - CRITICAL for Physics/Math
  'α': '\\alpha',
  'β': '\\beta',
  'γ': '\\gamma',
  'δ': '\\delta',
  'ε': '\\epsilon',
  'ζ': '\\zeta',
  'η': '\\eta',
  'θ': '\\theta',      // ⭐ CRITICAL: Often rendered as 0
  'ι': '\\iota',
  'κ': '\\kappa',
  'λ': '\\lambda',
  'μ': '\\mu',
  'ν': '\\nu',
  'ξ': '\\xi',
  'π': '\\pi',
  'ρ': '\\rho',
  'σ': '\\sigma',
  'τ': '\\tau',
  'υ': '\\upsilon',
  'φ': '\\phi',
  'χ': '\\chi',
  'ψ': '\\psi',
  'ω': '\\omega',

  // GREEK LETTERS (uppercase)
  'Γ': '\\Gamma',
  'Δ': '\\Delta',
  'Θ': '\\Theta',
  'Λ': '\\Lambda',
  'Ξ': '\\Xi',
  'Π': '\\Pi',
  'Σ': '\\Sigma',
  'Φ': '\\Phi',
  'Ψ': '\\Psi',
  'Ω': '\\Omega',

  // MATHEMATICAL OPERATORS
  '√': '\\sqrt',        // ⭐ CRITICAL: Square root
  '∛': '\\sqrt[3]',     // Cube root
  '∜': '\\sqrt[4]',     // Fourth root
  '∫': '\\int',         // Integral
  '∬': '\\iint',        // Double integral
  '∭': '\\iiint',       // Triple integral
  '∮': '\\oint',        // Contour integral
  '∑': '\\sum',         // Summation
  '∏': '\\prod',        // Product
  '∂': '\\partial',     // Partial derivative
  '∇': '\\nabla',       // Nabla/del operator

  // RELATIONS & COMPARISONS
  '≤': '\\leq',
  '≥': '\\geq',
  '≠': '\\neq',
  '≈': '\\approx',
  '≡': '\\equiv',
  '∝': '\\propto',
  '∞': '\\infty',

  // SET THEORY
  '∈': '\\in',
  '∉': '\\notin',
  '⊂': '\\subset',
  '⊆': '\\subseteq',
  '⊃': '\\supset',
  '⊇': '\\supseteq',
  '∪': '\\cup',
  '∩': '\\cap',
  '∅': '\\emptyset',

  // LOGIC
  '∀': '\\forall',
  '∃': '\\exists',
  '¬': '\\neg',
  '∧': '\\land',
  '∨': '\\lor',
  '⇒': '\\Rightarrow',
  '⇔': '\\Leftrightarrow',

  // GEOMETRY
  '∠': '\\angle',
  '°': '^\\circ',      // Degree symbol
  '⊥': '\\perp',
  '∥': '\\parallel',
  '△': '\\triangle',

  // SPECIAL SYMBOLS
  '±': '\\pm',
  '∓': '\\mp',
  '×': '\\times',
  '÷': '\\div',
  '·': '\\cdot',
  '∘': '\\circ',
  '†': '\\dagger',
  '‡': '\\ddagger',

  // ARROWS (vector notation)
  '⃗': '\\vec',        // Combining arrow (used after letter)
  '→': '\\rightarrow',
  '←': '\\leftarrow',
  '↑': '\\uparrow',
  '↓': '\\downarrow',
  '↔': '\\leftrightarrow',
  '⇀': '\\rightharpoonup',
  '⇁': '\\rightharpoondown',
};

/**
 * Convert Unicode math symbols to LaTeX in a text string
 * Does NOT wrap in $ delimiters - MathRenderer will handle that
 *
 * @param text - Raw text with Unicode math symbols
 * @returns Text with Unicode symbols converted to LaTeX (no $ wrapping)
 */
export function convertUnicodeToLatex(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let converted = text;

  // ⭐ DEBUG: Log every call to verify function is being invoked
  if (text.includes('frac') || text.includes('begin')) {
    console.log('🔍 [CONVERT CALLED] Processing text with LaTeX (first 150 chars):', text.substring(0, 150));
  }

  // DEBUG: Log if we see \f\frac pattern
  const hasFFrac = text.includes('\\f\\frac') || text.includes('\\f\\f');
  if (hasFFrac) {
    console.log('🚨 [CONVERT START] Input contains \\f pattern:', text.substring(0, 100));
  }

  // CRITICAL FIX: Repair corrupted LaTeX commands where \t became TAB character
  // Pattern: \t in LaTeX command gets interpreted as tab, leaving spaces
  // Examples: "\text{" → "    ext{", "\times" → "   imes", "\theta" → "   heta"

  // Fix \text{ variants (most common)
  converted = converted.replace(/\\,?\s+ext\{/g, (match) =>
    match.includes('\\,') ? '\\,\\text{' : '\\text{'
  );
  converted = converted.replace(/\s{2,}ext\{/g, '\\text{'); // Multiple spaces before ext{

  // Fix \times
  converted = converted.replace(/\s+imes(?=\s|$|[0-9])/g, '\\times');

  // Fix \theta
  converted = converted.replace(/\s+heta(?=\s|$|[^a-z])/g, '\\theta');

  // Fix \cdot
  converted = converted.replace(/\s+cdot(?=\s|$|[^a-z])/g, '\\cdot');

  // Fix other common \t commands
  converted = converted.replace(/\s+au(?=\s|$|[^a-z])/g, '\\tau');
  converted = converted.replace(/\s+an(?=\s|$|[^a-z])/g, '\\tan');
  converted = converted.replace(/\s+anh(?=\s|$|[^a-z])/g, '\\tanh');

  // Fix \textbf{, \textit{, \textrm{
  converted = converted.replace(/\s+extbf\{/g, '\\textbf{');
  converted = converted.replace(/\s+extit\{/g, '\\textit{');
  converted = converted.replace(/\s+extrm\{/g, '\\textrm{');
  converted = converted.replace(/\s+extbf\{/g, '\\textbf{');
  converted = converted.replace(/\s+exttt\{/g, '\\texttt{');

  // ⭐ FIX: Repair common LaTeX commands with missing backslashes
  // Pattern: \frac → rac or frac, \left → eft, \right → ight, \begin → egin or begin
  // CRITICAL: Use simple, safe patterns that don't create escape character artifacts

  // 🔥 CRITICAL FIX #1: Remove escape character prefixes before LaTeX commands (AI extraction bug)
  // Gemini outputs malformed LaTeX like "\f\frac" instead of "\frac"
  const beforeFix = converted;

  // Debug: Check if we have these patterns - ALWAYS LOG for debugging
  const hasEscapeIssues = converted.includes('\\f\\') || converted.includes('\\b\\') || converted.includes('\\r\\') || converted.includes('\\l\\') || converted.includes('\\e\\');
  if (hasEscapeIssues) {
    const preview = converted.length > 200 ? converted.substring(0, 200) + '...' : converted;
    console.log('🐛 [ESCAPE DEBUG BEFORE] Found escape patterns:', preview);
    console.log('🐛 [ESCAPE DEBUG RAW]', JSON.stringify(converted.substring(0, 100)));
  }

  // Fix \f\ prefix (most common: \f\frac → \frac)
  converted = converted.replace(/\\f\\/g, '\\');

  // Fix \b\ prefix (\b\begin → \begin)
  converted = converted.replace(/\\b\\/g, '\\');

  // Fix \r\ prefix (\r\right → \right)
  converted = converted.replace(/\\r\\/g, '\\');

  // Fix \l\ prefix (\l\left → \left)
  converted = converted.replace(/\\l\\/g, '\\');

  // Fix \e\ prefix (\e\end → \end)
  converted = converted.replace(/\\e\\/g, '\\');

  // Fix \n\ prefix (\n\... → \...)
  converted = converted.replace(/\\n\\/g, '\\');

  // Fix \t\ prefix (\t\tan → \tan)
  converted = converted.replace(/\\t\\/g, '\\');

  const cleanedCount = (beforeFix.length - converted.length);
  if (hasEscapeIssues) {
    const afterPreview = converted.length > 200 ? converted.substring(0, 200) + '...' : converted;
    console.log('🔧 [ESCAPE DEBUG AFTER] Cleaned', cleanedCount, 'chars:', afterPreview);
  }

  // CRITICAL FIX: Restore row separators in matrices/arrays
  // Pattern: Inside {bmatrix}, {pmatrix}, {array}, etc., single \ should be \\
  // Match: \begin{...} ... content with single \ ... \end{...}
  // Fix row separators: "&" followed by any content then single "\" then whitespace/content
  converted = converted.replace(/\\begin\{(bmatrix|pmatrix|vmatrix|Bmatrix|matrix|array)\}([\s\S]*?)\\end\{\1\}/g, (match, env, content) => {
    // Inside the matrix environment, replace single \ with \\ for row separators
    // ONLY match backslash followed by whitespace or &, NOT letters (which are LaTeX commands)
    const fixedContent = content.replace(/([^\\]|^)\\(\s|&)/g, '$1\\\\$2');
    return `\\begin{${env}}${fixedContent}\\end{${env}}`;
  });

  // Fix \frac{ - match both "rac{" and "frac{" when not preceded by backslash
  // TEMPORARILY DISABLED - causing \f\frac bug
  // converted = converted.replace(/(?<!\\)f?rac\{/g, '\\frac{');

  // DISABLED: These negative lookbehind patterns were causing \f\frac, \b\begin bugs
  // Gemini now outputs CORRECT LaTeX, so we don't need to fix missing backslashes
  // converted = converted.replace(/(?<!\\)eft([(\[|{])/g, '\\left$1');
  // converted = converted.replace(/(?<!\\)l?eft([(\[|{])/g, '\\left$1');
  // converted = converted.replace(/(?<!\\)ight([)\]|}|])/g, '\\right$1');
  // converted = converted.replace(/(?<!\\)r?ight([)\]|}|])/g, '\\right$1');
  // converted = converted.replace(/(?<!\\)b?egin\{/g, '\\begin{');
  // converted = converted.replace(/(?<!\\)e?nd\{/g, '\\end{');
  // converted = converted.replace(/(?<!\\)s?sqrt\{/g, '\\sqrt{');
  // converted = converted.replace(/(?<!\\)sin(?=\s|$|[^a-z])/g, '\\sin');
  // converted = converted.replace(/(?<!\\)cos(?=\s|$|[^a-z])/g, '\\cos');
  // converted = converted.replace(/(?<!\\)tan(?=\s|$|[^a-z])/g, '\\tan');
  // converted = converted.replace(/(?<!\\)sec(?=\s|$|[^a-z])/g, '\\sec');
  // converted = converted.replace(/(?<!\\)csc(?=\s|$|[^a-z])/g, '\\csc');
  // converted = converted.replace(/(?<!\\)cot(?=\s|$|[^a-z])/g, '\\cot');
  // converted = converted.replace(/(?<!\\)ln(?=\s|$|[^a-z])/g, '\\ln');
  // converted = converted.replace(/(?<!\\)log(?=\s|$|[^a-z])/g, '\\log');
  // converted = converted.replace(/(?<!\\)exp(?=\s|$|[^a-z])/g, '\\exp');
  // converted = converted.replace(/(?<!\\)lim(?=\s|$|[^a-z])/g, '\\lim');
  // converted = converted.replace(/(?<!\\)max(?=\s|$|[^a-z])/g, '\\max');
  // converted = converted.replace(/(?<!\\)min(?=\s|$|[^a-z])/g, '\\min');
  // converted = converted.replace(/(?<!\\)inf(?=\s|$|[^a-z])/g, '\\inf');
  // converted = converted.replace(/(?<!\\)sup(?=\s|$|[^a-z])/g, '\\sup');

  // Fix \vec (vector notation) - DISABLED
  // converted = converted.replace(/(?<!\\)vec\{/g, '\\vec{');
  // converted = converted.replace(/(?<!\\)hat\{/g, '\\hat{');
  // DISABLED - causing escape character bugs
  // converted = converted.replace(/(?<!\\)bar\{/g, '\\bar{');
  // converted = converted.replace(/(?<!\\)tilde\{/g, '\\tilde{');
  // converted = converted.replace(/(?<!\\)mathbf\{/g, '\\mathbf{');
  // converted = converted.replace(/(?<!\\)mathrm\{/g, '\\mathrm{');
  // converted = converted.replace(/(?<!\\)mathit\{/g, '\\mathit{');
  // converted = converted.replace(/(?<!\\)mathcal\{/g, '\\mathcal{');
  // converted = converted.replace(/(?<!\\)sum(?=\s|$|[^a-z])/g, '\\sum');
  // converted = converted.replace(/(?<!\\)prod(?=\s|$|[^a-z])/g, '\\prod');
  // converted = converted.replace(/(?<!\\)int(?=\s|$|[^a-z])/g, '\\int');

  // Special handling for √ (square root) - needs to wrap next token
  // CRITICAL: Handle nested square roots by processing innermost first
  // Examples: "√2" → "\sqrt{2}", "√(a+b)" → "\sqrt{a+b}", "√(2+√3)" → "\sqrt{2+\sqrt{3}}"

  // Use iterative processing to handle nested square roots
  let hasSquareRoot = converted.includes('√');
  let maxIterations = 10; // Prevent infinite loops
  let iteration = 0;

  while (hasSquareRoot && iteration < maxIterations) {
    const beforeConversion = converted;

    // Pass 1: Convert √ with already-braced content (from previous passes)
    converted = converted.replace(/√\{([^}]+)\}/g, '\\sqrt{$1}');

    // Pass 2: Convert √ followed by numbers (simplest case, no nesting)
    converted = converted.replace(/√(\d+)/g, '\\sqrt{$1}');

    // Pass 3: Convert √ followed by single letters (no nesting)
    converted = converted.replace(/√([a-zA-Z])/g, '\\sqrt{$1}');

    // Pass 4: Convert √ followed by balanced parentheses
    // Match parentheses that don't contain √ (innermost first)
    converted = converted.replace(/√\(([^()√]+)\)/g, '\\sqrt{$1}');

    // Pass 5: For more complex nesting, match parentheses that may contain \sqrt but not √
    // This handles cases where inner √ was converted in previous iteration
    converted = converted.replace(/√\(([^()]*\\sqrt[^()]*)\)/g, '\\sqrt{$1}');

    // Pass 6: Handle √ followed by \sqrt (nested, inner already converted)
    // "√\sqrt{3}" → "\sqrt{\sqrt{3}}"
    converted = converted.replace(/√(\\sqrt\{[^}]+\})/g, '\\sqrt{$1}');

    // Pass 7: Dangling √ (last resort, wraps next token loosely)
    converted = converted.replace(/√([^\s√])/g, '\\sqrt{$1}');

    // Pass 8: Any remaining standalone √
    converted = converted.replace(/√/g, '\\sqrt{}');

    // Check if we made progress
    if (converted === beforeConversion) {
      break; // No more conversions possible
    }

    hasSquareRoot = converted.includes('√');
    iteration++;
  }

  if (iteration >= maxIterations) {
    console.warn('⚠️ [UNICODE CONVERSION] Max iterations reached for square root conversion, may have unclosed nesting');
  }

  // Convert all other Unicode symbols to LaTeX commands
  for (const [unicode, latex] of Object.entries(UNICODE_TO_LATEX_MAP)) {
    if (unicode === '√') continue; // Already handled above

    // Escape special regex characters in the unicode symbol
    const escapedUnicode = unicode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedUnicode, 'g');

    converted = converted.replace(regex, latex);
  }

  // DEBUG: Log output if we started with \f pattern
  if (hasFFrac) {
    console.log('🚨 [CONVERT END] Output after cleanup:', converted.substring(0, 100));
    console.log('   Still has \\f\\frac?', converted.includes('\\f\\frac'));
  }

  return converted;
}

/**
 * Fix integral equation hallucinations where AI adds variables to numerator
 *
 * PROBLEM: AI sees "∫ dx/(x+2)(x²+1) = a log|x²+1| + b tan⁻¹x + c" and hallucinates
 *          the result as "∫ (x²+b)/(x+2)(x²+1) dx" by pattern-matching
 *
 * SOLUTION: Detect when integral numerator contains single-letter variables (a,b,c,etc.)
 *           that appear on the RIGHT side of equation but NOT in denominator
 *
 * @param text - Question text potentially containing integral equations
 * @returns Text with corrected integral equations
 */
export function fixIntegralHallucinations(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Only process if text contains both integral and equals sign (equation format)
  if (!text.includes('\\int') || !text.includes('=')) return text;

  // Debug logging
  if (text.includes('Q56') || text.includes('x^2+b') || text.includes('x^2 + b')) {
    console.log('🔍 [INTEGRAL VALIDATOR] Processing potential Q56:', text.substring(0, 150));
  }

  try {
    // Pattern: Match integral equations of form "∫ ... dx = ..." or "∫ ... = ..."
    // We need to extract:
    // 1. The integral expression (left side)
    // 2. The result (right side)

    // Common pattern: ∫ \frac{<numerator>}{<denominator>} dx = <result>
    // If numerator contains single letters (a,b,c) that appear in result but not in denominator,
    // it's likely hallucinated - replace with "dx" or "1"

    const integralPattern = /\\int(_[^$]+\^[^$]+\s+)?\\frac\{([^}]+)\}\{([^}]+)\}\s*dx\s*=\s*([^$]+)/g;

    let fixed = text;
    let match;

    while ((match = integralPattern.exec(text)) !== null) {
      const [fullMatch, limits, numerator, denominator, result] = match;

      // Extract single-letter variables from result (a, b, c, k, m, n, etc.)
      // These are typically constants in the answer
      const resultVars = new Set<string>();
      const varPattern = /\b([a-z])\b/g;
      let varMatch;
      while ((varMatch = varPattern.exec(result)) !== null) {
        resultVars.add(varMatch[1]);
      }

      // Check if numerator contains any of these single-letter variables
      // BUT also contains actual expressions (x², x, etc.)
      // Pattern: "x^2+b" where b is in resultVars - SUSPICIOUS!

      let isSuspicious = false;
      let suspiciousVars: string[] = [];

      for (const varName of resultVars) {
        // Check if this variable appears in numerator
        const varInNumerator = new RegExp(`\\b${varName}\\b`).test(numerator);
        // Check if this variable appears in denominator (if yes, it's legitimate)
        const varInDenominator = new RegExp(`\\b${varName}\\b`).test(denominator);

        if (varInNumerator && !varInDenominator) {
          // Variable in numerator but not in denominator - likely hallucination
          isSuspicious = true;
          suspiciousVars.push(varName);
        }
      }

      if (isSuspicious) {
        console.warn(`🔍 [INTEGRAL VALIDATOR] Detected suspicious integral numerator: "${numerator}"`);
        console.warn(`   Variables ${suspiciousVars.join(', ')} appear in result but not in denominator`);
        console.warn(`   Likely hallucination - fixing to "dx" or "1"`);

        // Fix: Replace numerator with "dx" if it looks like a differential, otherwise "1"
        // Common patterns to replace:
        // - "x^2+b" → "dx" (or "1" if already has dx outside)
        // - "a+b" → "1"

        // Check if the numerator has "dx" in it or if dx is already outside
        const hasDxOutside = fullMatch.includes('} dx');

        let fixedNumerator = 'dx';

        // If dx is already outside the fraction, use "1" as numerator
        if (hasDxOutside) {
          fixedNumerator = '1';
        }

        // Replace in the original match
        const fixedMatch = fullMatch.replace(
          `\\frac{${numerator}}`,
          `\\frac{${fixedNumerator}}`
        );

        fixed = fixed.replace(fullMatch, fixedMatch);

        console.log(`   ✅ Fixed: "${fullMatch}"`);
        console.log(`   →  "${fixedMatch}"`);
      }
    }

    return fixed;

  } catch (err) {
    console.warn('⚠️ [INTEGRAL VALIDATOR] Error during validation:', err);
    return text; // Return original on error
  }
}

/**
 * Process extracted question data to convert Unicode to LaTeX
 * Applies conversion to question text, options, and solutions
 *
 * @param question - Question object from AI extraction
 * @returns Question with Unicode converted to LaTeX
 */
export function processQuestionUnicode(question: any): any {
  if (!question || typeof question !== 'object') return question;

  const processed = { ...question };

  // Convert question text
  if (processed.text) {
    processed.text = convertUnicodeToLatex(processed.text);
    // 🔥 CRITICAL: Fix integral equation hallucinations (e.g., x²+b → dx)
    processed.text = fixIntegralHallucinations(processed.text);
  }

  // Convert options
  if (Array.isArray(processed.options)) {
    processed.options = processed.options.map((opt: any) => {
      if (typeof opt === 'string') {
        let converted = convertUnicodeToLatex(opt);
        converted = fixIntegralHallucinations(converted);
        return converted;
      }
      return opt;
    });
  }

  // Convert solution if present
  if (processed.solution) {
    processed.solution = convertUnicodeToLatex(processed.solution);
    processed.solution = fixIntegralHallucinations(processed.solution);
  }

  // Convert visual element description
  if (processed.visualElementDescription) {
    processed.visualElementDescription = convertUnicodeToLatex(processed.visualElementDescription);
  }

  return processed;
}

/**
 * Process array of questions
 */
export function processQuestionsUnicode(questions: any[]): any[] {
  if (!Array.isArray(questions)) return questions;
  return questions.map(q => processQuestionUnicode(q));
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TEST CASES FOR NESTED SQUARE ROOTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The iterative algorithm handles nested square roots by processing innermost first:
 *
 * EXAMPLE 1: Simple nesting
 * Input:  "√(2+√3)"
 * Pass 1: "√(2+\sqrt{3})"  (inner √3 converted)
 * Pass 2: "\sqrt{2+\sqrt{3}}"  (outer √ converted)
 * Output: "\sqrt{2+\sqrt{3}}" ✅
 *
 * EXAMPLE 2: Double nesting
 * Input:  "√(1+√(2+√3))"
 * Iter 1: "√(1+√(2+\sqrt{3}))"  (innermost √3)
 * Iter 1: "√(1+\sqrt{2+\sqrt{3}})"  (middle √)
 * Iter 1: "\sqrt{1+\sqrt{2+\sqrt{3}}}"  (outer √)
 * Output: "\sqrt{1+\sqrt{2+\sqrt{3}}}" ✅
 *
 * EXAMPLE 3: Triple nesting
 * Input:  "√(√(√2))"
 * Iter 1: "√(√(\sqrt{2}))"  (innermost)
 * Iter 2: "√(\sqrt{\sqrt{2}})"  (middle)
 * Iter 3: "\sqrt{\sqrt{\sqrt{2}}}"  (outer)
 * Output: "\sqrt{\sqrt{\sqrt{2}}}" ✅
 *
 * EXAMPLE 4: Complex expression
 * Input:  "√2+√2+√2+2cos8θ"
 * Pass 1: "\sqrt{2}+\sqrt{2}+\sqrt{2}+2cos8\theta"
 * Output: "\sqrt{2}+\sqrt{2}+\sqrt{2}+2cos8\theta" ✅
 *
 * EXAMPLE 5: Fraction under root
 * Input:  "√(a/b)"
 * Pass 1: "\sqrt{a/b}"
 * Output: "\sqrt{a/b}" ✅
 *
 * EXAMPLE 6: Nested with operations
 * Input:  "√(x²+√(y²+z²))"
 * Iter 1: "√(x²+\sqrt{y²+z²})"  (inner)
 * Iter 2: "\sqrt{x²+\sqrt{y²+z²}}"  (outer)
 * Output: "\sqrt{x²+\sqrt{y²+z²}}" ✅
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */
