/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPREHENSIVE LATEX REFERENCE FOR MATHEMATICS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for ALL LaTeX notation used across the system
 *
 * Used by:
 * - MathRenderer.tsx: For KaTeX configuration and pattern detection
 * - BoardMastermind.tsx: For AI extraction instruction prompts
 * - ExamAnalysis.tsx: For solution rendering
 * - SketchGenerators.ts: For diagram notation
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * KaTeX Custom Macros
 * These shortcuts are registered with KaTeX for efficient rendering
 */
export const LATEX_MACROS = {
  "\\label": "\\href{###1}",

  // NUMBER SYSTEMS (Blackboard Bold)
  "\\R": "\\mathbb{R}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\Q": "\\mathbb{Q}",
  "\\C": "\\mathbb{C}",

  // VECTOR & MATRIX SHORTCUTS
  "\\vectorbold": "\\mathbf{#1}",
  "\\norm": "\\left\\| #1 \\right\\|",
  "\\abs": "\\left| #1 \\right|",

  // CALCULUS SHORTCUTS
  "\\diff": "\\frac{d#1}{d#2}",              // d/dx notation
  "\\pdiff": "\\frac{\\partial#1}{\\partial#2}", // ∂/∂x notation
  "\\dd": "\\,\\mathrm{d}",                  // Differential d (spacing)
  "\\dv": "\\frac{d#1}{d#2}",                // Derivative (alias)
  "\\pdv": "\\frac{\\partial#1}{\\partial#2}", // Partial derivative (alias)

  // LIMITS & INTEGRALS
  "\\liminf": "\\lim\\inf",
  "\\limsup": "\\lim\\sup",

  // COMMON FUNCTIONS
  "\\arctg": "\\arctan",
  "\\tg": "\\tan",
  "\\ctg": "\\cot",
  "\\cosec": "\\csc",

  // CUSTOM OPERATORS
  "\\rank": "\\operatorname{rank}",
  "\\tr": "\\operatorname{tr}",
  "\\Tr": "\\operatorname{Tr}",
  "\\det": "\\operatorname{det}",
  "\\diag": "\\operatorname{diag}",
  "\\lcm": "\\operatorname{lcm}",
  "\\gcd": "\\operatorname{gcd}",

  // PROBABILITY & STATISTICS
  "\\Var": "\\operatorname{Var}",
  "\\Cov": "\\operatorname{Cov}",
  "\\E": "\\mathbb{E}",                      // Expected value
  "\\Prob": "\\operatorname{P}",

  // COMMON MATH STRUCTURES
  "\\floor": "\\left\\lfloor #1 \\right\\rfloor",
  "\\ceil": "\\left\\lceil #1 \\right\\rceil"
};

/**
 * Comprehensive LaTeX Pattern Triggers
 * Used for auto-detection of LaTeX commands in raw text
 */
export const LATEX_PATTERNS = [
  // BASIC OPERATIONS & ARITHMETIC
  '\\frac', '\\sqrt', '\\pm', '\\mp', '\\times', '\\div', '\\cdot', '\\ast',

  // CALCULUS - Integrals, Limits, Derivatives, Summations
  '\\int', '\\iint', '\\iiint', '\\oint', '\\sum', '\\prod', '\\lim', '\\sup', '\\inf',
  '\\partial', '\\nabla', '\\diff', '\\pdiff', '\\frac{d', '\\frac{\\partial',

  // ALGEBRA - Sets, Logic, Relations
  '\\in', '\\notin', '\\subset', '\\subseteq', '\\supset', '\\supseteq',
  '\\cup', '\\cap', '\\setminus', '\\emptyset', '\\varnothing',
  '\\forall', '\\exists', '\\nexists', '\\implies', '\\iff', '\\neg', '\\land', '\\lor',
  '\\mathbb{', '\\R', '\\N', '\\Z', '\\Q', '\\C', '\\Bbb',

  // MATRICES & DETERMINANTS
  '\\begin{matrix}', '\\begin{pmatrix}', '\\begin{bmatrix}', '\\begin{vmatrix}', '\\begin{Vmatrix}',
  '\\begin{array}', '\\begin{cases}',

  // MULTI-LINE EQUATIONS & ALIGNMENT
  '\\begin{aligned}', '\\begin{align}', '\\begin{align*}',
  '\\begin{gather}', '\\begin{gather*}',
  '\\begin{equation}', '\\begin{equation*}',
  '\\begin{split}',
  '\\\\', '&', // Alignment markers (double backslash for new line, & for alignment)

  // EQUATION NUMBERING & TAGS
  '\\tag{', '\\notag', '\\eqref{',

  // VECTORS & 3D GEOMETRY
  '\\vec{', '\\overrightarrow{', '\\overleftarrow{', '\\mathbf{',
  '\\hat{', '\\bar{', '\\tilde{', '\\dot{', '\\ddot{',
  '\\norm', '\\abs', '\\langle', '\\rangle',

  // LINEAR PROGRAMMING - Inequalities & Optimization
  '\\leq', '\\geq', '\\ll', '\\gg', '\\neq', '\\equiv', '\\approx', '\\sim', '\\simeq',
  '\\max', '\\min', '\\arg\\max', '\\arg\\min',

  // PROBABILITY & STATISTICS
  '\\binom', '\\choose', '^n', '_n', 'C_', 'P_',
  '\\overline{', '\\bar{', '\\hat{', '\\sigma', '\\mu', '\\Sigma',
  '\\cap', '\\cup', '\\mid', '\\perp',

  // GREEK LETTERS (lowercase)
  '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\varepsilon',
  '\\zeta', '\\eta', '\\theta', '\\vartheta', '\\iota', '\\kappa',
  '\\lambda', '\\mu', '\\nu', '\\xi', '\\pi', '\\varpi',
  '\\rho', '\\varrho', '\\sigma', '\\varsigma', '\\tau', '\\upsilon',
  '\\phi', '\\varphi', '\\chi', '\\psi', '\\omega',

  // GREEK LETTERS (uppercase)
  '\\Gamma', '\\Delta', '\\Theta', '\\Lambda', '\\Xi', '\\Pi',
  '\\Sigma', '\\Upsilon', '\\Phi', '\\Psi', '\\Omega',

  // ARROWS & MAPPINGS
  '\\to', '\\mapsto', '\\rightarrow', '\\leftarrow', '\\leftrightarrow',
  '\\Rightarrow', '\\Leftarrow', '\\Leftrightarrow', '\\longrightarrow',

  // ADVANCED BRACKETS & DELIMITERS
  '\\left(', '\\right)', '\\left[', '\\right]', '\\left\\{', '\\right\\}',
  '\\left|', '\\right|', '\\left\\langle', '\\right\\rangle',
  '\\left\\lfloor', '\\right\\rfloor', '\\left\\lceil', '\\right\\rceil',
  '\\big(', '\\Big(', '\\bigg(', '\\Bigg(',

  // OVER/UNDER BRACES & ARROWS
  '\\overbrace{', '\\underbrace{', '\\overline{', '\\underline{',
  '\\overset{', '\\underset{', '\\stackrel{',
  '\\xrightarrow{', '\\xleftarrow{',

  // SPACING COMMANDS
  '\\quad', '\\qquad', '\\,', '\\:', '\\;', '\\!',
  '\\hspace{', '\\vspace{',

  // SPECIAL SYMBOLS
  '\\infty', '\\angle', '\\degree', '\\triangle', '\\square', '\\circ',
  '\\parallel', '\\perp', '\\cong', '\\ncong', '\\propto',
  '\\therefore', '\\because', '\\dots', '\\cdots', '\\ldots', '\\vdots', '\\ddots',

  // OPERATORS & FUNCTIONS
  '\\sin', '\\cos', '\\tan', '\\cot', '\\sec', '\\csc',
  '\\arcsin', '\\arccos', '\\arctan',
  '\\sinh', '\\cosh', '\\tanh',
  '\\log', '\\ln', '\\lg', '\\exp',
  '\\det', '\\dim', '\\ker', '\\rank', '\\deg',
  '\\gcd', '\\lcm', '\\mod', '\\pmod{',

  // LIMITS & BOUNDS
  '\\lim_{', '\\sup_{', '\\inf_{', '\\max_{', '\\min_{',
  '\\limsup', '\\liminf',

  // CHEMISTRY (for cross-subject support)
  '\\ce{',

  // TEXT & FORMATTING
  '\\text{', '\\mathrm{', '\\mathit{', '\\mathcal{', '\\mathfrak{',
  '\\textbf{', '\\textit{', '\\underline{', '\\overline{'
];

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AI EXTRACTION INSTRUCTIONS FOR MATH PAPERS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete conversion guide from visual symbols to proper LaTeX
 * Used in BoardMastermind prompts to ensure AI extracts formulas correctly
 */
export function generateMathExtractionInstructions(): string {
  return `
══════════════════════════════════════════════════════════════════════════
CRITICAL MATH NOTATION - Convert Visual Symbols to Proper LaTeX
══════════════════════════════════════════════════════════════════════════

YOU ARE EXTRACTING FROM A PRINTED/PDF MATH PAPER. The visual symbols you see
MUST be converted to proper LaTeX. DO NOT just copy what you see visually.

═══════════════════════════════════════════════════════════════════════════

1. VECTORS (CRITICAL - Arrow/Hat notation ALWAYS present in Math papers!)
   ────────────────────────────────────────────────────────────────────────
   Visual: →a, a→, ā (arrow over letter)     → LaTeX: $\\vec{a}$
   Visual: â, b̂, î, ĵ, k̂ (hat/cap notation)  → LaTeX: $\\hat{a}$, $\\hat{i}$, $\\hat{j}$, $\\hat{k}$
   Visual: **a**, **b** (bold letters)       → LaTeX: $\\mathbf{a}$, $\\mathbf{b}$

   EXAMPLE CONVERSIONS:
   - "If |a| = 2" → "If $|\\vec{a}| = 2$"
   - "a = î - 3ĵ" → "$\\vec{a} = \\hat{i} - 3\\hat{j}$"
   - "α = î + 2ĵ - k̂" → "$\\vec{\\alpha} = \\hat{i} + 2\\hat{j} - \\hat{k}$"

═══════════════════════════════════════════════════════════════════════════

2. NESTED SQUARE ROOTS (CRITICAL - Look for VERTICAL stacking of radical signs!)
   ────────────────────────────────────────────────────────────────────────
   ⚠️ CRITICAL: When you see multiple √ symbols with VERTICAL BARS extending over expressions,
   this indicates NESTED radicals, NOT separate additions!

   Visual Pattern Recognition:
   - If radical bars overlap or stack vertically → NESTED structure
   - If √ symbols are side-by-side at same height → Separate roots

   NESTED STRUCTURE (bars extend vertically):
   Visual: Large √ with bar over "2 + √(2 + √(2+...))"
   → LaTeX: $\\sqrt{2 + \\sqrt{2 + \\sqrt{2 + ...}}}$

   WRONG: "$\\sqrt{2} + \\sqrt{2} + \\sqrt{2}$" (separate additions)
   RIGHT: "$\\sqrt{2 + \\sqrt{2 + \\sqrt{2 + 2\\cos 8\\theta}}}$" (nested)

   EXAMPLE FROM ACTUAL PAPER:
   Visual: √ ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
          2 + √ ‾‾‾‾‾‾‾‾‾‾‾
             2 + √ ‾‾‾‾‾‾
                2+2cos8θ

   WRONG: "√2 + √2 + √2 + 2cos8θ"
   RIGHT: "$\\sqrt{2 + \\sqrt{2 + \\sqrt{2 + 2\\cos 8\\theta}}}$"

   Recognition Tips:
   - Count the nested levels by following the radical bars
   - Innermost expression has NO √ below it
   - Each outer √ encompasses everything to its right
   - Look for "+" between the number and the next √

═══════════════════════════════════════════════════════════════════════════

3. FRACTIONS & DERIVATIVES (CRITICAL - NEVER write a/b, ALWAYS use \\frac{a}{b})
   ────────────────────────────────────────────────────────────────────────
   Visual: dy/dx                → LaTeX: $\\frac{dy}{dx}$
   Visual: ∂f/∂x or df/dx       → LaTeX: $\\frac{\\partial f}{\\partial x}$
   Visual: a/b                  → LaTeX: $\\frac{a}{b}$
   Visual: (a+b)/(c+d)          → LaTeX: $\\frac{a+b}{c+d}$

   DERIVATIVE NOTATION (Prime marks):
   Visual: y', f'(x)            → LaTeX: $y'$, $f'(x)$  (first derivative)
   Visual: y'', f''(x)          → LaTeX: $y''$, $f''(x}$ (second derivative)
   Visual: y''', f'''(x)        → LaTeX: $y'''$, $f'''(x)$ (third derivative)

   EXAMPLE CONVERSIONS:
   - "dy/dx + y/x = x²" → "$\\frac{dy}{dx} + \\frac{y}{x} = x^2$"
   - "If dy+2 = x²" → "If $\\frac{dy}{dx} + \\frac{y}{x} = x^2$" (FIX missing fraction bar!)
   - "(1 + y²)" in differential equation → "$(1 + y'^2)$" (y' = first derivative)

═══════════════════════════════════════════════════════════════════════════

4. SUBSCRIPTS & SUPERSCRIPTS
   ────────────────────────────────────────────────────────────────────────
   Visual: x₁, y₂, z₃                    → LaTeX: $x_1$, $y_2$, $z_3$
   Visual: x², y³, z⁴                    → LaTeX: $x^2$, $y^3$, $z^4$
   Visual: aⁿ, xᵐ                        → LaTeX: $a^n$, $x^m$
   Visual: (1+y₁²)^(2/3)                 → LaTeX: $(1 + y_1^2)^{2/3}$
   Visual: y₁, y₂ (subscript numbers)    → LaTeX: $y_1$, $y_2$ (NOT just y1, y2!)

   EXAMPLE CONVERSIONS:
   - "(1+y²)2/3 = V2is" → "$(1 + y_1^2)^{2/3} = y_2$ is" (FIX subscripts!)
   - "x2 + y2 = 1" → "$x^2 + y^2 = 1$" (FIX superscripts!)

═══════════════════════════════════════════════════════════════════════════

5. ABSOLUTE VALUES & NORMS
   ────────────────────────────────────────────────────────────────────────
   Visual: |a|, |b|, |x|         → LaTeX: $|a|$, $|b|$, $|x|$
   Visual: ||v|| (double bars)   → LaTeX: $\\|v\\|$ or $\\left\\| v \\right\\|$

   EXAMPLE CONVERSIONS:
   - "If [a] = 2 and [6] = 3" → "If $|\\vec{a}| = 2$ and $|\\vec{b}| = 3$"
   - "[a] and [b]" with context showing vectors → "$|\\vec{a}|$ and $|\\vec{b}|$"

═══════════════════════════════════════════════════════════════════════════

6. GREEK LETTERS (Common in Math)
   ────────────────────────────────────────────────────────────────────────
   Lowercase:
   α → $\\alpha$      θ → $\\theta$      σ → $\\sigma$
   β → $\\beta$       λ → $\\lambda$     φ → $\\phi$
   γ → $\\gamma$      μ → $\\mu$         ω → $\\omega$
   δ → $\\delta$      ν → $\\nu$         ψ → $\\psi$
   ε → $\\epsilon$    ξ → $\\xi$         ρ → $\\rho$
   ζ → $\\zeta$       π → $\\pi$         τ → $\\tau$
   η → $\\eta$

   Uppercase:
   Γ → $\\Gamma$      Λ → $\\Lambda$     Σ → $\\Sigma$      Ω → $\\Omega$
   Δ → $\\Delta$      Ξ → $\\Xi$         Φ → $\\Phi$
   Θ → $\\Theta$      Π → $\\Pi$         Ψ → $\\Psi$

═══════════════════════════════════════════════════════════════════════════

7. INTEGRALS
   ────────────────────────────────────────────────────────────────────────
   Visual: ∫                    → LaTeX: $\\int$
   Visual: ∫₀¹ or ∫[0,1]        → LaTeX: $\\int_0^1$
   Visual: ∫∫, ∫∫∫              → LaTeX: $\\iint$, $\\iiint$
   Visual: ∮ (closed contour)   → LaTeX: $\\oint$
   Visual: ∫ f(x) dx            → LaTeX: $\\int f(x) \\, dx$ (note spacing before dx)

   EXAMPLE CONVERSIONS:
   - "∫₀¹ x² dx" → "$\\int_0^1 x^2 \\, dx$"
   - "∫ (sin x)/(1+x) dx" → "$\\int \\frac{\\sin x}{1+x} \\, dx$"

═══════════════════════════════════════════════════════════════════════════

8. SUMMATIONS & PRODUCTS
   ────────────────────────────────────────────────────────────────────────
   Visual: Σ                           → LaTeX: $\\sum$
   Visual: Σⁿᵢ₌₁ or Σ(i=1 to n)        → LaTeX: $\\sum_{i=1}^{n}$
   Visual: Π or Πⁿᵢ₌₁                   → LaTeX: $\\prod$ or $\\prod_{i=1}^{n}$

═══════════════════════════════════════════════════════════════════════════

9. LIMITS
   ────────────────────────────────────────────────────────────────────────
   Visual: lim x→0 or lim(x→0)   → LaTeX: $\\lim_{x \\to 0}$
   Visual: lim x→∞               → LaTeX: $\\lim_{x \\to \\infty}$

═══════════════════════════════════════════════════════════════════════════

10. MATRICES & DETERMINANTS
   ────────────────────────────────────────────────────────────────────────
   Visual: [a b]  or (a b)       → LaTeX: $\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$
          [c d]     (c d)                  or $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$

   Visual: |a b|                 → LaTeX: $\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$
          |c d|

   Visual: |1 a|² or determinant squared:
          |2 3|
   → LaTeX: $\\left| \\begin{matrix} 1 & a \\\\ 2 & 3 \\end{matrix} \\right|^2$

═══════════════════════════════════════════════════════════════════════════

11. INEQUALITIES & SPECIAL SYMBOLS
    ───────────────────────────────────────────────────────────────────────
    Visual: ≤, ≥                  → LaTeX: $\\leq$, $\\geq$
    Visual: ≠                     → LaTeX: $\\neq$
    Visual: ≈                     → LaTeX: $\\approx$
    Visual: ∞                     → LaTeX: $\\infty$
    Visual: ∈, ∉                  → LaTeX: $\\in$, $\\notin$
    Visual: ⊂, ⊆                  → LaTeX: $\\subset$, $\\subseteq$
    Visual: ∪, ∩                  → LaTeX: $\\cup$, $\\cap$
    Visual: ∅                     → LaTeX: $\\emptyset$ or $\\varnothing$
    Visual: ∴                     → LaTeX: $\\therefore$
    Visual: ∵                     → LaTeX: $\\because$

═══════════════════════════════════════════════════════════════════════════

12. TRIGONOMETRIC & OTHER FUNCTIONS
    ───────────────────────────────────────────────────────────────────────
    Visual: sin, cos, tan         → LaTeX: $\\sin$, $\\cos$, $\\tan$
    Visual: sec, csc, cot         → LaTeX: $\\sec$, $\\csc$, $\\cot$
    Visual: sin⁻¹, cos⁻¹          → LaTeX: $\\sin^{-1}$, $\\cos^{-1}$ or $\\arcsin$, $\\arccos$
    Visual: log, ln               → LaTeX: $\\log$, $\\ln$

═══════════════════════════════════════════════════════════════════════════

13. COMBINATIONS & PERMUTATIONS (Probability)
    ───────────────────────────────────────────────────────────────────────
    Visual: nCr, ⁿCᵣ, C(n,r)      → LaTeX: $\\binom{n}{r}$ or $^nC_r$
    Visual: nPr, ⁿPᵣ, P(n,r)      → LaTeX: $^nP_r$ or $\\frac{n!}{(n-r)!}$
    Visual: (n choose r)          → LaTeX: $\\binom{n}{r}$

    EXAMPLE CONVERSIONS:
    - "10C3 = 120" → "$\\binom{10}{3} = 120$"
    - "Calculate 5P2" → "Calculate $^5P_2$"

═══════════════════════════════════════════════════════════════════════════

WRAPPING RULES - MANDATORY!
────────────────────────────────────────────────────────────────────────────
✓ Inline math (within sentence):     Use $...$
✓ Display math (standalone equation): Use $$...$$
✗ NEVER leave math notation unwrapped!

═══════════════════════════════════════════════════════════════════════════

COMPLETE REAL-WORLD EXAMPLES FROM ACTUAL PAPERS:
────────────────────────────────────────────────────────────────────────────

EXAMPLE 1: Nested Square Roots (MOST CRITICAL ERROR)
WRONG: "√2 + √2 + 2cosθis"
RIGHT: "$\\sqrt{2 + \\sqrt{2 + \\sqrt{2 + 2\\cos 8\\theta}}}$"
⚠️ The visual shows NESTED radicals (bars extending vertically), NOT separate additions!

EXAMPLE 2: Vectors with absolute values
WRONG: "If [a] = 2 and [6] = 3 and the angle between a and b is 120°, then the length of the vector 1 a - 1 b is"
RIGHT: "If $|\\vec{a}| = 2$ and $|\\vec{b}| = 3$ and the angle between $\\vec{a}$ and $\\vec{b}$ is $120°$, then the length of the vector $\\left|\\frac{\\vec{a}}{2} - \\frac{\\vec{b}}{3}\\right|^2$ is"

EXAMPLE 3: Hat notation with Greek letters
WRONG: "If a = i -3j, ß = i+2j- k then express ß in the form B = B + B₂ where Biis parallel to a and 2 is perpendicular to a then ß is given by"
RIGHT: "If $\\vec{a} = \\hat{i} - 3\\hat{j}$, $\\vec{\\beta} = \\hat{i} + 2\\hat{j} - \\hat{k}$ then express $\\vec{\\beta}$ in the form $\\vec{\\beta} = \\vec{\\beta}_1 + \\vec{\\beta}_2$ where $\\vec{\\beta}_1$ is parallel to $\\vec{a}$ and $\\vec{\\beta}_2$ is perpendicular to $\\vec{a}$ then $\\vec{\\beta}_1$ is given by"

EXAMPLE 4: Derivatives with subscripts
WRONG: "Thesumofthedegreeandorderofthedifferentialequation(1 + y²)2/3 = V2is"
RIGHT: "The sum of the degree and order of the differential equation $(1 + y'^2)^{2/3} = y''$ is"

EXAMPLE 5: Fractions
WRONG: "If dy+2 = x², then 2y(2)-y(1) ="
RIGHT: "If $\\frac{dy}{dx} + \\frac{y}{x} = x^2$, then $2y(2) - y(1) =$"

══════════════════════════════════════════════════════════════════════════
END OF CONVERSION GUIDE
══════════════════════════════════════════════════════════════════════════
`;
}

/**
 * STREAMLINED Math extraction instructions (REPLACES verbose generateMathExtractionInstructions)
 * Focused on essential patterns only to reduce cognitive load
 */
export function generateStreamlinedMathInstructions(): string {
  return `
══════════════════════════════════════════════════════════════════════════
ESSENTIAL MATH NOTATION (Focused Extraction Rules)
══════════════════════════════════════════════════════════════════════════

GOLDEN RULE: Extract what you OBSERVE, not what you EXPECT.
- Look at printed symbols character-by-character
- Don't add variables that appear elsewhere in the equation
- Convert visual notation to LaTeX, but keep structure identical

CRITICAL PATTERNS:

1. VECTORS & MATRICES
   →a, a→ (arrow) → $\\vec{a}$ | â, î, ĵ, k̂ (hat) → $\\hat{a}$, $\\hat{i}$, $\\hat{j}$, $\\hat{k}$
   [a b; c d] (matrix) → $\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$

2. FRACTIONS & DERIVATIVES (ALWAYS use \\frac{}{})
   dy/dx → $\\frac{dy}{dx}$ | ∂f/∂x → $\\frac{\\partial f}{\\partial x}$ | a/b → $\\frac{a}{b}$

3. INTEGRALS (Read numerator carefully - extract visible symbols)
   ∫₀¹ f(x) dx → $\\int_0^1 f(x)\\, dx$
   ∫ dx/(x+2) → $\\int \\frac{dx}{x+2}$
   ∫ dx/[(x+2)(x²+1)] → $\\int \\frac{dx}{(x+2)(x^2+1)}$
   ∫ x²/(x+1) dx → $\\int \\frac{x^2}{x+1}\\, dx$

4. SUBSCRIPTS & SUPERSCRIPTS
   x₁, y₂ → $x_1$, $y_2$ | x², y³ → $x^2$, $y^3$ | (1+y²)^(2/3) → $(1+y^2)^{2/3}$

5. GREEK & SYMBOLS
   α,β,γ,θ,λ,μ,π,σ,ω → $\\alpha$, $\\beta$, $\\gamma$, $\\theta$, $\\lambda$, $\\mu$, $\\pi$, $\\sigma$, $\\omega$
   √x → $\\sqrt{x}$ | ∞ → $\\infty$ | ≤,≥,≠ → $\\leq$, $\\geq$, $\\neq$

6. NESTED RADICALS (Look for vertical bar stacking)
   √(2+√(2+√2)) → $\\sqrt{2+\\sqrt{2+\\sqrt{2}}}$ (NOT separate √2 + √2 + √2)

══════════════════════════════════════════════════════════════════════════
`;
}

/**
 * Get compact notation examples for prompt injection
 */
export function getMathNotationExamples(): string {
  return `
KEY NOTATION CONVERSIONS (Quick Reference):
→a, a→ → $\\vec{a}$ | â, î → $\\hat{a}$, $\\hat{i}$ | dy/dx → $\\frac{dy}{dx}$ | x₁ → $x_1$ | x² → $x^2$ | α → $\\alpha$ | ∫₀¹ → $\\int_0^1$ | ≤ → $\\leq$ | ∞ → $\\infty$
`;
}
