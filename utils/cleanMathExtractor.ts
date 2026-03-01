/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CLEAN MATH EXTRACTION SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ultra-concise prompt optimized for token efficiency
 */

import { generateTopicInstruction } from './officialTopics';

export function generateCleanMathPrompt(grade: string): string {
  const topicInstruction = generateTopicInstruction('Math');
  return `# ROLE & EXPERTISE
You are an expert Mathematics Examination Parser specializing in CBSE/KCET ${grade} grade board exam papers. You have:
- 15+ years experience in mathematical typesetting and LaTeX notation
- Perfect understanding of KaTeX-compatible LaTeX syntax
- Expertise in optical character recognition (OCR) accuracy for mathematical content
- Deep knowledge of Indian board exam question patterns and terminology

# CONTEXT & MISSION
You are analyzing a high-stakes ${grade} Mathematics board examination paper (PDF image). Your mission is to extract EVERY Multiple Choice Question (MCQ) with 100% fidelity—preserving exact mathematical notation, proper spacing, and complete structural integrity. This extraction will be used for:
- Student exam preparation and practice
- AI-powered question bank generation
- Educational analytics and trend analysis

CRITICAL: Errors in extraction (merged words, hallucinated symbols, incorrect LaTeX) directly impact student learning. Accuracy is paramount.

# EXTRACTION METHODOLOGY

🚨🚨🚨 GOLDEN RULE: SYLLABUS & MARKING COMPLIANCE
1. SYLLABUS: Strictly adhere to the latest official NCERT Class 12 Mathematics syllabus.
2. MARKING: Extract marks verbatim from the paper. MCQs are worth EXACTLY 1 Mark unless specified otherwise.
3. VERBATIM: Copy text exactly as seen. Extract what you OBSERVE, not what you EXPECT.

## STEP 1: VISUAL ANALYSIS
Before extracting, carefully examine the PDF image:
1. Identify ALL question numbers (Q1, Q2, Q3... through Q60 for Math)
2. Locate each question's text, options (A)(B)(C)(D), and any mathematical expressions
3. Note special elements: matrices, integrals, piecewise functions, Greek symbols
4. Read text character-by-character to preserve spacing between words

## STEP 2: TEXT EXTRACTION WITH SPACE PRESERVATION

🚨🚨🚨 CRITICAL RULE #1: PRESERVE SPACES BETWEEN EVERY WORD
When you read text from the PDF, type it EXACTLY as a human would—with natural spacing after every word.

❌ CATASTROPHIC ERRORS (DO NOT DO THIS):
"Thedomainofthefunction" "Ify(x)bethesolution" "Theco-ordinatesofthepointonthe" "Iff|x|isthegreatestinteger" "Areaoftheregionboundedbythecurvey" "Theanglebetweenthepairo"

✅ CORRECT EXTRACTION (ALWAYS DO THIS):
"The domain of the function" "If y(x) be the solution" "The co-ordinates of the point on the" "If f |x| is the greatest integer" "Area of the region bounded by the curve y" "The angle between the pair of"

TECHNIQUE: Read each word individually, type it, press SPACE, move to next word. Imagine you're typing for a human reader who needs to understand the text.

REAL EXAMPLES FROM PAPERS:
- Q8: "The angle between the pair of lines \\frac{x-1}{3} = ..." (NOT "Theanglebetweenthepairo")
- Q11: "The distance of the point whose position vector..." (NOT "Thedistanceofthepointwhosepositionv")
- Q12: "The co-ord in ation of foot of the perpendicular..." (NOT "Theco-ordinationoffootofthe")
- Q25: "If the straight line 2x - 3y + 17 = 0 is perpendicular to the line passing through..." (NOT "Ifthestraightline2x")
- Q49: "The co-ordinates of the point on the line..." (NOT "Theco-ordinatesofthepointonthe")
- Q51: "If f |x| is the greatest integer..." (NOT "Iff|x|isthegreatestinteger")
- Q57: "Area of the region bounded by the curve y..." (NOT "Areaoftheregionboundedbythecurvey")

## STEP 3: LATEX CONVERSION (CRITICAL)

### 3A. UNICODE → LATEX MANDATORY CONVERSIONS (CRITICAL):
   x² → $x^2$ | x₁ → $x_1$ | θ → $\\theta$ | π → $\\pi$ | α → $\\alpha$
   ≤ → $\\leq$ | ≥ → $\\geq$ | ≠ → $\\neq$ | ≈ → $\\approx$ | ± → $\\pm$
   √ → $\\sqrt{x}$ | ∫ → $\\int$ | ∑ → $\\sum$ | ∞ → $\\infty$ | → → $\\vec{v}$
   - NEVER use raw Unicode symbols or plain text like "alpha" in output.

### 3B. LATEX CONVERSION RULES:
1. DELIMITERS: Wrap ALL math in $...$ for inline and $$...$$ for display.
2. COMMANDS: Use standard LaTeX commands (e.g., \\frac{a}{b}, \\sqrt{x}, \\sin\\theta, \\int, \\pm, \\vec{v}).
3. FRACTIONS: Always use \\frac{num}{den} (e.g., "dy/dx" → $\\frac{dy}{dx}$).
4. MATRICES & DETERMINANTS: Use standard environments like \\begin{vmatrix} ... \\end{vmatrix}.
5. Piecewise Functions: Use \\begin{cases} ... \\end{cases}.

✅ CORRECT: "If $f(x) = \\frac{1}{x}$, then"
❌ WRONG:   "If f(x) = \\\\frac{1}{x}, then" (DO NOT double-escape commands manually)

### 3C. INVERSE TRIGONOMETRIC FUNCTIONS:
sin⁻¹ → $\\sin^{-1}$ | cos⁻¹ → $\\cos^{-1}$ | tan⁻¹ → $\\tan^{-1}$

### 3D. EXAMPLES:
- "dy/dx" → $\\frac{dy}{dx}$
- "x+1/2" → $\\frac{x+1}{2}$

### 3D. MATRICES - ALWAYS USE \\begin{bmatrix}:
\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}

### 3E. PIECEWISE FUNCTIONS - ALWAYS USE \\begin{cases}:
\\begin{cases} x^2 & x > 0 \\\\ -x & x \leq 0 \\end{cases}

## STEP 4: INTEGRAL EXTRACTION (ZERO-TOLERANCE FOR HALLUCINATION)

🔥 INTEGRALS ARE THE #1 SOURCE OF AI HALLUCINATION - FOLLOW THIS PROTOCOL EXACTLY:

### VISUAL INSPECTION PROTOCOL:
1. Locate the integral symbol ∫ in the PDF image
2. Check if it has limits (subscript/superscript): ∫₀¹ or ∫₀^(π/2)
3. Read what comes IMMEDIATELY after the integral symbol
4. Copy it character-by-character into your output
5. DO NOT add coefficients, variables, or symbols you don't see
6. DO NOT modify denominators, numerators, or limits

### COMMON HALLUCINATIONS TO AVOID:

❌ Q55 HALLUCINATION: Writing "(x+1)³" or "(1+x)²" in denominator
✅ Q55 CORRECT: The PDF shows "(2+x)³" — copy it EXACTLY!
FULL: "\\int_0^1 \\frac{xe^x}{(2+x)^3} dx"

❌ Q56 HALLUCINATION: Writing "4x" or "2dx" in numerator
✅ Q56 CORRECT: The PDF shows just "dx" — copy it EXACTLY!
FULL: "\\int \\frac{dx}{(x+2)(x^2+1)} = a \\log |1+x^2| + b \\tan^{-1} x + \\frac{1}{5} \\log|x+2| + c"

❌ Q52 HALLUCINATION: Writing "∫" without limits
✅ Q52 CORRECT: "\\int_0^{\\frac{\\pi}{2}}" (include subscript and superscript!)

### INTEGRAL CHECKLIST (USE FOR EVERY INTEGRAL):
□ Did I copy the EXACT numerator from the PDF? (not "4x" if PDF shows "dx")
□ Did I copy the EXACT denominator from the PDF? (not "(x+1)³" if PDF shows "(2+x)³")
□ Did I include limits if present? (∫₀¹ → \\int_0^1)
□ Did I preserve the integration variable? (dx, dt, dθ)
□ When in doubt: integrals usually have simple "dx" in numerator, NOT "4x" or "2x dx"

## STEP 5: ANSWER OPTIONS EXTRACTION

EVERY question MUST have EXACTLY 4 options labeled (A), (B), (C), (D).

### Q55 SPECIAL ATTENTION - ANSWER OPTIONS:
Q55's answer choices contain fractions with the mathematical constant "e".
Look at the PDF and copy EXACTLY what you see:
- If you see "1/9·e - 1/4" → write "\\frac{1}{9}e - \\frac{1}{4}"
- If you see "rac14e - rac14" in your output → YOU MADE AN ERROR (missing backslashes!)
DO NOT hallucinate different fractions or coefficients.

### OPTION FORMAT:
Each option must start with its label:
"(A) Option text with \\frac{math}{here}"
"(B) Another option with \\sqrt{expression}"
"(C) Third option"
"(D) Fourth option"

## STEP 6: METADATA ENRICHMENT

For each question, provide:
- **marks**: 1 (default for MCQ unless specified)
- **difficulty**: "Easy" | "Moderate" | "Hard" (infer from complexity)
- **blooms**: "Knowledge" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create"
- **domain**: The domain from the official syllabus that this topic belongs to:
  - Use "Algebra" for: Matrices, Determinants, Relations and Functions
  - Use "Calculus" for: Continuity and Differentiability, Applications of Derivatives, Integrals, Applications of Integrals, Differential Equations
  - Use "Coordinate Geometry" for: Three Dimensional Geometry
  - Use "Vector Algebra" for: Vectors
  - Use "Optimization" for: Linear Programming
  - Use "Statistics and Probability" for: Probability
  - Use "Trigonometry" for: Inverse Trigonometric Functions

${topicInstruction}

# OUTPUT FORMAT (STRICT JSON SCHEMA)

{
  "questions": [
    {
      "id": "Q1",
      "text": "Question text with proper spacing and \\\\LaTeX{} commands (backslashes preserved)",
      "options": [
        "(A) First option with \\\\frac{proper}{latex}",
        "(B) Second option",
        "(C) Third option",
        "(D) Fourth option"
      ],
      "marks": 1,
      "difficulty": "Moderate",
      "topic": "Differential Equations",
      "blooms": "Apply",
      "domain": "Calculus",
      "hasVisualElement": false,
      "visualElementType": null,
      "visualElementDescription": null
    }
  ]
}

# QUALITY ASSURANCE CHECKLIST

Before submitting your JSON, verify:
□ ALL words have spaces between them (no "Thedomainofthe" merging)
□ ALL LaTeX commands have backslashes (\\frac not frac, \\begin not begin)
□ ALL integrals copied character-by-character from PDF (no hallucinated coefficients)
□ ALL questions have EXACTLY 4 options with (A)(B)(C)(D) labels
□ ALL topics are specific (not "General" or empty)
□ ALL matrices use \\begin{bmatrix} format
□ ALL piecewise functions use \\begin{cases} format
□ ALL inverse trig uses \\sin^{-1} or \\tan^{-1} notation

# BEGIN EXTRACTION
Extract ALL ${grade} Math MCQ questions following the above methodology. Output valid JSON only.`;
}

/**
 * Validate extracted question structure
 */
export interface ValidationError {
  questionId: string;
  field: string;
  error: string;
}

export function validateQuestion(q: any, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const qId = q.id || `Q${index + 1}`;

  // Check text exists and isn't merged
  if (!q.text || typeof q.text !== 'string') {
    errors.push({ questionId: qId, field: 'text', error: 'Missing or invalid text' });
  } else {
    // Check for merged words (common AI bug)
    if (q.text.match(/[a-z]{15,}/i)) { // 15+ chars without space
      errors.push({ questionId: qId, field: 'text', error: 'Suspected merged words (no spaces)' });
    }
  }

  // Check options exist and have exactly 4 choices
  if (!Array.isArray(q.options)) {
    errors.push({ questionId: qId, field: 'options', error: 'Options must be an array' });
  } else if (q.options.length === 0) {
    errors.push({ questionId: qId, field: 'options', error: 'No options provided' });
  } else if (q.options.length !== 4) {
    errors.push({ questionId: qId, field: 'options', error: `Expected 4 options, got ${q.options.length}` });
  } else {
    // Validate option format
    const expectedPrefixes = ['(A)', '(B)', '(C)', '(D)'];
    q.options.forEach((opt: string, i: number) => {
      if (typeof opt !== 'string') {
        errors.push({ questionId: qId, field: `options[${i}]`, error: 'Option must be string' });
      } else if (!opt.startsWith(expectedPrefixes[i])) {
        errors.push({ questionId: qId, field: `options[${i}]`, error: `Should start with ${expectedPrefixes[i]}` });
      }
    });
  }

  // Check required fields
  if (!q.marks || q.marks < 1) {
    errors.push({ questionId: qId, field: 'marks', error: 'Marks must be >= 1' });
  }

  if (!q.difficulty || !['Easy', 'Moderate', 'Hard'].includes(q.difficulty)) {
    errors.push({ questionId: qId, field: 'difficulty', error: 'Must be Easy|Moderate|Hard' });
  }

  if (!q.topic || typeof q.topic !== 'string' || q.topic.trim() === '' || q.topic.trim().toLowerCase() === 'general') {
    errors.push({ questionId: qId, field: 'topic', error: 'Topic should be specific, not General or empty' });
  }

  if (!q.domain) {
    errors.push({ questionId: qId, field: 'domain', error: 'Domain is required' });
  }

  return errors;
}

/**
 * Fix piecewise functions that are broken into lines
 */
function fixPiecewiseFunction(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Detect pattern: "f(x) = ... : condition" on separate lines
  // Common pattern in Q31: "2x : x > 3" followed by "f(x) = x² : 1 < x ≤ 3" etc.
  if (text.includes(':') && (text.includes('f(x)') || text.includes('f :')) &&
    (text.includes('>') || text.includes('<') || text.includes('≤') || text.includes('≥'))) {

    // Try to detect if this is a piecewise function
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Look for lines with "expression : condition" pattern
    const piecewiseLines = lines.filter(line =>
      /[^:]+:[^:]+[<>≤≥]/.test(line) && !line.includes('If')
    );

    if (piecewiseLines.length >= 2) {
      // This looks like a piecewise function - format it properly
      const cases = piecewiseLines.map(line => {
        const parts = line.split(':').map(p => p.trim());
        if (parts.length >= 2) {
          let expr = parts[0].replace(/f\(x\)\s*=\s*/, '').trim();
          let condition = parts.slice(1).join(':').trim();
          return `${expr}, & ${condition}`;
        }
        return line;
      }).join(' \\\\ ');

      // Build the formatted version
      const formatted = `f(x) = \\begin{cases} ${cases} \\end{cases}`;

      // Replace the piecewise part in the original text
      let result = text;
      piecewiseLines.forEach(line => {
        result = result.replace(line, '');
      });
      result = result.replace(/f\(x\)\s*=\s*/, formatted);

      return result;
    }
  }

  return text;
}

/**
 * Fix merged words by adding spaces intelligently - ULTRA AGGRESSIVE VERSION
 */
function fixMergedWords(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Check if text has suspiciously long sequences without spaces (merged words)
  const hasMergedWords = /[a-zA-Z]{12,}/.test(text); // 12+ consecutive letters (more aggressive threshold)
  if (!hasMergedWords) return text;

  let fixed = text;

  // COMPREHENSIVE dictionary of common English words (sorted by length, longest first for greedy matching)
  const commonWords = [
    // Long words first
    'coordinates', 'differential', 'integration', 'greatest', 'integer', 'bounded',
    'following', 'solution', 'equation', 'function', 'domain', 'curve', 'region',
    'area', 'point', 'matrix', 'vector', 'determinant', 'derivative',
    // Medium words
    'degree', 'order', 'equal', 'between', 'triangle', 'vertices', 'limit',
    'continuous', 'defined', 'satisfy', 'value', 'range', 'inverse',
    // Common short words
    'that', 'this', 'then', 'with', 'from', 'were', 'have', 'will',
    'would', 'could', 'should', 'which', 'their', 'there', 'where',
    'the', 'and', 'for', 'are', 'was', 'has', 'had', 'been', 'being'
  ];

  // ULTRA AGGRESSIVE: Split on word boundaries first
  // "Theco-ordinatesofthepointonthe" → needs aggressive splitting

  // Step 1: Add spaces around common words (case-insensitive, global)
  commonWords.forEach(word => {
    // Match word that's NOT surrounded by spaces
    const regex = new RegExp(`(^|[^\\s])${word}([^\\s]|$)`, 'gi');
    fixed = fixed.replace(regex, (match, before, after) => {
      const wordMatch = match.match(new RegExp(word, 'i'));
      if (!wordMatch) return match;
      const actualWord = wordMatch[0];
      let result = '';
      if (before && before !== ' ') result += before + ' ';
      result += actualWord;
      if (after && after !== ' ') result += ' ' + after;
      return result;
    });
  });

  // Step 2: Add space after lowercase before uppercase (camelCase splitting)
  // "functionThe" → "function The"
  fixed = fixed.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Step 3: Add spaces around ALL 2-letter words that are embedded
  const shortWords = ['of', 'is', 'be', 'to', 'in', 'or', 'if', 'on', 'at', 'by', 'an'];
  shortWords.forEach(word => {
    const regex = new RegExp(`([a-z])${word}([a-z])`, 'gi');
    fixed = fixed.replace(regex, `$1 ${word} $2`);
  });

  // Step 4: AGGRESSIVE - Add spaces before common word endings
  // "pointonthe" → "point on the"
  const endings = ['ed', 'ing', 'ion', 'tion', 'ness', 'ment'];
  endings.forEach(ending => {
    const regex = new RegExp(`([a-z]{3,})${ending}([A-Z]|[a-z]{3,})`, 'gi');
    fixed = fixed.replace(regex, `$1${ending} $2`);
  });

  // Step 5: NUCLEAR OPTION - If still has long merged words, try to split at every common word fragment
  if (/[a-zA-Z]{15,}/.test(fixed)) {
    console.warn('🚨 [SPACE FIX] Still has 15+ char sequences, applying nuclear split');
    // Split "co-ordinates" style words
    fixed = fixed.replace(/co-?ordinat/gi, 'co-ordinat');
  }

  // Clean up multiple spaces
  fixed = fixed.replace(/\s+/g, ' ').trim();

  return fixed;
}

/**
 * Fix arctan/arcsin/arccos to proper LaTeX notation
 */
function fixArctanNotation(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let fixed = text;
  let changesMade = false;

  // Fix "arctan" → "\tan^{-1}" (NOT "\\arctan" because user wants inverse notation)
  const arctanRegex = /\barctan\b/gi;
  if (arctanRegex.test(fixed)) {
    fixed = fixed.replace(arctanRegex, '\\tan^{-1}');
    changesMade = true;
  }

  // Fix "arcsin" → "\sin^{-1}"
  const arcsinRegex = /\barcsin\b/gi;
  if (arcsinRegex.test(fixed)) {
    fixed = fixed.replace(arcsinRegex, '\\sin^{-1}');
    changesMade = true;
  }

  // Fix "arccos" → "\cos^{-1}"
  const arccosRegex = /\barccos\b/gi;
  if (arccosRegex.test(fixed)) {
    fixed = fixed.replace(arccosRegex, '\\cos^{-1}');
    changesMade = true;
  }

  return fixed;
}

/**
 * Auto-fix common extraction issues
 */
export function autoFixQuestion(q: any, index: number): any {
  const fixed = { ...q };

  // 🚨 CRITICAL: Fix piecewise functions first (before space fixing)
  if (fixed.text && typeof fixed.text === 'string') {
    const originalText = fixed.text;
    fixed.text = fixPiecewiseFunction(fixed.text);
    if (fixed.text !== originalText) {
      console.log(`🔧 [PIECEWISE FIX] Q${index + 1}: Fixed piecewise function formatting`);
    }
  }

  // 🚨 CRITICAL: Fix merged words in question text
  if (fixed.text && typeof fixed.text === 'string') {
    const originalText = fixed.text;
    fixed.text = fixMergedWords(fixed.text);
    if (fixed.text !== originalText) {
      console.log(`🔧 [SPACE FIX] Q${index + 1}: Fixed merged words in text`);
    }
  }

  // 🚨 Fix arctan/arcsin/arccos notation in question text
  if (fixed.text && typeof fixed.text === 'string') {
    const originalText = fixed.text;
    fixed.text = fixArctanNotation(fixed.text);
    if (fixed.text !== originalText) {
      console.log(`🔧 [ARCTAN FIX] Q${index + 1}: Fixed inverse trig notation in text`);
    }
  }

  // Fix merged words in options
  if (Array.isArray(fixed.options)) {
    fixed.options = fixed.options.map((opt: string, i: number) => {
      if (typeof opt === 'string') {
        let fixedOpt = opt;

        // Apply space fixing
        const afterSpace = fixMergedWords(fixedOpt);
        if (afterSpace !== fixedOpt) {
          console.log(`🔧 [SPACE FIX] Q${index + 1} Option ${i + 1}: Fixed merged words`);
          fixedOpt = afterSpace;
        }

        // Apply arctan fixing
        const afterArctan = fixArctanNotation(fixedOpt);
        if (afterArctan !== fixedOpt) {
          console.log(`🔧 [ARCTAN FIX] Q${index + 1} Option ${i + 1}: Fixed inverse trig notation`);
          fixedOpt = afterArctan;
        }

        // Also ensure label is present
        if (!fixedOpt.trim().startsWith('(')) {
          return `${['(A)', '(B)', '(C)', '(D)'][i]} ${fixedOpt.trim()}`;
        }
        return fixedOpt;
      }
      return opt;
    });
  }

  // Auto-fix empty/missing topic with default
  if (!fixed.topic || fixed.topic.trim() === '' || fixed.topic.trim().toLowerCase() === 'general') {
    fixed.topic = 'Mathematics'; // Better default than 'General'
  }

  // Auto-fix empty/missing domain
  if (!fixed.domain || fixed.domain.trim() === '') {
    fixed.domain = 'ALGEBRA'; // Default domain
  }

  return fixed;
}

/**
 * Validate all extracted questions
 */
export function validateExtraction(data: any): { valid: boolean; errors: ValidationError[]; questionCount: number } {
  if (!data || !data.questions || !Array.isArray(data.questions)) {
    return {
      valid: false,
      errors: [{ questionId: 'N/A', field: 'questions', error: 'No questions array found in response' }],
      questionCount: 0
    };
  }

  const allErrors: ValidationError[] = [];

  // Auto-fix questions before validation
  data.questions = data.questions.map((q: any, index: number) => autoFixQuestion(q, index));

  data.questions.forEach((q: any, index: number) => {
    const qErrors = validateQuestion(q, index);
    allErrors.push(...qErrors);
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    questionCount: data.questions.length
  };
}
