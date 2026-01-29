/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MATH FORMATTER - Auto-fix LaTeX rendering
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Safety fallback: If Gemini forgets to wrap math in $ delimiters,
 * this automatically detects and fixes common LaTeX patterns
 */

/**
 * Detect and auto-wrap common LaTeX commands that are missing delimiters
 */
export function autoWrapLaTeX(text: string): string {
  let processed = text;

  // Pattern 1: Detect \frac{}{} without $ delimiters
  processed = processed.replace(
    /(?<!\$)\\frac\{[^}]+\}\{[^}]+\}(?!\$)/g,
    (match) => `$${match}$`
  );

  // Pattern 2: Detect \times, \div, \pm without $ delimiters
  processed = processed.replace(
    /(?<!\$)(\\times|\\div|\\pm|\\cdot)(?!\$)/g,
    (match) => `$${match}$`
  );

  // Pattern 3: Detect superscripts/subscripts like 10^{-6} or H_2 without delimiters
  processed = processed.replace(
    /(?<!\$)\b(\w+)\^?\{?-?\d+\}?(?!\$)/g,
    (match) => {
      // Only wrap if it contains ^ or _
      if (match.includes('^') || match.includes('_')) {
        return `$${match}$`;
      }
      return match;
    }
  );

  // Pattern 4: Detect Greek letters without delimiters
  const greekLetters = [
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'theta', 'lambda',
    'mu', 'pi', 'sigma', 'tau', 'omega', 'phi', 'psi'
  ];

  greekLetters.forEach(letter => {
    const pattern = new RegExp(`(?<!\\$)\\\\${letter}(?!\\$)`, 'g');
    processed = processed.replace(pattern, `$\\${letter}$`);
  });

  // Pattern 5: Detect \sqrt{} without delimiters
  processed = processed.replace(
    /(?<!\$)\\sqrt\{[^}]+\}(?!\$)/g,
    (match) => `$${match}$`
  );

  // Pattern 6: Detect \ce{} (chemistry) without delimiters
  processed = processed.replace(
    /(?<!\$)\\ce\{[^}]+\}(?!\$)/g,
    (match) => `$${match}$`
  );

  return processed;
}

/**
 * Clean up over-escaped LaTeX (sometimes Gemini adds too many backslashes)
 */
export function cleanLaTeX(text: string): string {
  let processed = text;

  // Fix double-escaped commands like \\\\frac → \\frac
  processed = processed.replace(/\\\\\\\\(\w+)/g, '\\\\$1');

  // Fix spacing issues around delimiters
  processed = processed.replace(/\$\s+/g, '$');
  processed = processed.replace(/\s+\$/g, '$');

  return processed;
}

/**
 * Main formatter: Apply all fixes
 */
export function formatMathInResponse(response: string): string {
  let formatted = response;

  // Step 1: Clean up over-escaping
  formatted = cleanLaTeX(formatted);

  // Step 2: Auto-wrap missing delimiters
  formatted = autoWrapLaTeX(formatted);

  return formatted;
}
