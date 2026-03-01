import { convertUnicodeToLatex } from './unicodeToLatex';

/**
 * Robustly fix LaTeX errors from Gemini/DB output.
 *
 * Works by:
 * 1. Promoting Unicode characters to LaTeX commands (α → \alpha)
 * 2. Fixing double backslashes (\\frac → \frac) from Gemini's structured-output mode
 * 3. Auto-wrapping bare LaTeX commands in prose text with $...$
 *    e.g. "the \sum of numbers" → "the $\sum$ of numbers"
 * 4. Trimming spaces INSIDE dollar signs so KaTeX receives clean input
 * 5. Adding spaces OUTSIDE dollar signs for prose readability
 *
 * NOTE: We do NOT strip \text{} wrappers — they are valid KaTeX for units etc.
 * NOTE: We do NOT run a "fix missing backslash" step on plain words — that
 *       would corrupt prose text (e.g. "to the right of" → "to the \right of").
 */

/**
 * Detect LaTeX commands that appear outside $...$ and wrap them in $...$
 * This is the core fix for: "the \sum of numbers" → "the $\sum$ of numbers"
 */
function wrapBareLaTeXCommands(text: string): string {
    // Commands we want to auto-wrap (verbs / symbols commonly found bare in prose)
    // We do NOT wrap \begin, \end, \left, \right — they appear inside larger blocks
    const WRAP_CMDS = [
        'sum', 'int', 'prod', 'lim',
        'frac', 'sqrt', 'binom',
        'vec', 'hat', 'bar', 'tilde', 'dot', 'ddot', 'overline',
        'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln',
        'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
        'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma',
        'tau', 'phi', 'chi', 'psi', 'omega',
        'Gamma', 'Delta', 'Theta', 'Lambda', 'Pi', 'Sigma', 'Phi', 'Omega',
        'infty', 'partial', 'nabla',
        'leq', 'geq', 'neq', 'approx', 'pm', 'times', 'cdot',
        'to', 'rightarrow', 'leftarrow',
        'forall', 'exists',
        'angle', 'triangle', 'perp', 'parallel', 'circ',
    ];

    // We process the string by scanning for \cmd occurrences NOT already inside $...$
    let result = '';
    let inMath = false;         // Are we currently inside a $...$ or $$...$$ region?
    let i = 0;
    const len = text.length;

    while (i < len) {
        // Track whether we're inside math mode
        if (text[i] === '$') {
            if (text[i + 1] === '$') {
                inMath = !inMath;
                result += '$$';
                i += 2;
                continue;
            } else {
                inMath = !inMath;
                result += '$';
                i++;
                continue;
            }
        }

        // If we see a backslash outside math mode, check if it's a bare command to wrap
        if (!inMath && text[i] === '\\') {
            // Read the command name
            let j = i + 1;
            while (j < len && /[a-zA-Z]/.test(text[j])) j++;
            const cmd = text.slice(i + 1, j);

            if (WRAP_CMDS.includes(cmd)) {
                // Collect the full LaTeX expression: \cmd and its brace groups
                let expr = '\\' + cmd;
                let k = j;
                // Skip optional spaces
                while (k < len && text[k] === ' ') k++;
                // Collect all consecutive brace groups {…}
                while (k < len && text[k] === '{') {
                    let depth = 0;
                    let m = k;
                    while (m < len) {
                        if (text[m] === '{') depth++;
                        else if (text[m] === '}') { depth--; if (depth === 0) { m++; break; } }
                        m++;
                    }
                    expr += text.slice(k, m);
                    k = m;
                    // Skip spaces between brace groups
                    while (k < len && text[k] === ' ') k++;
                }
                // Also collect subscript/superscript ^ or _ followed by brace group or single char
                while (k < len && (text[k] === '^' || text[k] === '_')) {
                    expr += text[k]; k++;
                    if (k < len && text[k] === '{') {
                        let depth = 0;
                        let m = k;
                        while (m < len) {
                            if (text[m] === '{') depth++;
                            else if (text[m] === '}') { depth--; if (depth === 0) { m++; break; } }
                            m++;
                        }
                        expr += text.slice(k, m);
                        k = m;
                    } else if (k < len) {
                        expr += text[k]; k++;
                    }
                }

                // Wrap in $...$
                result += '$' + expr + '$';
                i = k;
                continue;
            }
        }

        result += text[i];
        i++;
    }

    return result;
}

export function fixLatexErrors(text: string): string {
    if (!text) return "";
    let fixed = text;

    // 1. Promote raw Unicode to LaTeX first for consistency
    fixed = convertUnicodeToLatex(fixed);

    // 2. Collapse double backslashes → single for known LaTeX commands
    // This handles Gemini's structured-output mode which outputs \\frac instead of \frac
    const doubleFixes = [
        'frac', 'int', 'sum', 'prod', 'lim', 'sqrt', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
        'log', 'ln', 'left', 'right', 'begin', 'end',
        'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
        'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma',
        'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
        'Alpha', 'Beta', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Pi', 'Sigma', 'Phi', 'Omega',
        'leq', 'geq', 'neq', 'approx', 'pm', 'times', 'cdot',
        'infty', 'to', 'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
        'vec', 'hat', 'bar', 'tilde', 'dot', 'ddot',
        'textit', 'textbf', 'mathrm', 'mathcal', 'mathbf', 'text',
        'partial', 'nabla', 'forall', 'exists',
        'binom', 'pmatrix', 'bmatrix', 'vmatrix', 'cases', 'aligned',
        'overline', 'underline', 'underbrace', 'overbrace',
        'circ', 'perp', 'parallel', 'angle', 'triangle',
    ];

    for (const cmd of doubleFixes) {
        // Match exactly TWO backslashes followed by the command → collapse to ONE
        const re = new RegExp(`\\\\\\\\(${cmd})(?=[^a-zA-Z]|$)`, 'g');
        fixed = fixed.replace(re, `\\$1`);
    }

    // 3. Fix specific corruption: \ight → \right (from Gemini truncation glitch)
    fixed = fixed.replace(/\\ight\b/g, '\\right');
    fixed = fixed.replace(/\\lef\b(?![t])/g, '\\left');

    // 4. Auto-wrap bare LaTeX commands in $...$ (the \sum fix)
    // "the \sum of numbers" → "the $\sum$ of numbers"
    fixed = wrapBareLaTeXCommands(fixed);

    // 5. TRIM internal spaces in dollar signs so KaTeX receives clean content
    // "$ \frac{a}{b} $" → "$\frac{a}{b}$"
    fixed = fixed.replace(/\$\s+/g, '$');
    fixed = fixed.replace(/\s+\$/g, '$');

    // 6. Ensure external spaces around $...$ blocks for readability
    fixed = fixed.replace(/([^\s$])\$/g, '$1 $');
    fixed = fixed.replace(/\$([^\s$])/g, '$ $1');

    return fixed;
}

/**
 * Recursively apply fixLatexErrors to all string fields in an object.
 * Useful for normalizing entire question objects after extraction.
 */
export function fixLatexInObject(obj: any): any {
    if (typeof obj === 'string') return fixLatexErrors(obj);
    if (Array.isArray(obj)) return obj.map(fixLatexInObject);
    if (obj && typeof obj === 'object') {
        const res: any = {};
        for (const k in obj) {
            if (typeof obj[k] === 'number' || typeof obj[k] === 'boolean') {
                res[k] = obj[k];  // Don't mangle numbers/booleans
            } else {
                res[k] = fixLatexInObject(obj[k]);
            }
        }
        return res;
    }
    return obj;
}
