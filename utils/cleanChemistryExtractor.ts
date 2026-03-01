/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CLEAN CHEMISTRY EXTRACTION SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Professional Chemistry PDF extraction with focus on chemical formulas, 
 * IUPAC nomenclature, and reaction equations.
 */

import { generateTopicInstruction } from './officialTopics';

export function generateCleanChemistryPrompt(grade: string): string {
    const topicInstruction = generateTopicInstruction('Chemistry');
    return `# ROLE & EXPERTISE
You are an expert Chemistry educator specializing in ${grade} exam paper digitization. 
Your mission: Extract Chemistry MCQ questions with PERFECT chemical notation accuracy.

# CONTEXT & MISSION
Indian students preparing for ${grade} Chemistry exams need:
- Properly spaced question text (OCR often removes spaces)
- Accurate LaTeX for chemical formulas, reaction arrows, and structural notation
- Correct IUPAC nomenclature and scientific symbols

Your extraction directly impacts their exam preparation. Accuracy is critical.

# EXTRACTION METHODOLOGY

🚨🚨🚨 GOLDEN RULE: SYLLABUS & MARKING COMPLIANCE
1. SYLLABUS: Strictly adhere to the latest official NCERT Class 12 Chemistry syllabus.
2. MARKING: Extract marks verbatim from the paper. MCQs are worth EXACTLY 1 Mark unless specified otherwise.
3. VERBATIM: Copy text exactly as seen. Extract what you OBSERVE, not what you EXPECT.

## STEP 1: VISUAL ANALYSIS
Before extracting, carefully examine the PDF image:
1. Identify ALL question numbers (Q1, Q2, Q3...)
2. Locate each question's text, options (A)(B)(C)(D), and any chemical equations
3. Note special elements: complex formulas, reaction conditions, Greek symbols, equilibrium arrows
4. Read text character-by-character to preserve spacing between words

## STEP 2: TEXT EXTRACTION WITH SPACE PRESERVATION
🚨🚨🚨 CRITICAL RULE #1: PRESERVE SPACES BETWEEN EVERY WORD
When you read text from the PDF, type it EXACTLY as a human would—with natural spacing after every word.

❌ WRONG EXTRACTION (NEVER DO THIS):
"Themolarityofasolutioncontaining" "Whichofthefollowingisanorganiccompound" "Theoxidationstateofmanganesein"

✅ CORRECT EXTRACTION (ALWAYS DO THIS):
"The molarity of a solution containing" "Which of the following is an organic compound" "The oxidation state of manganese in"

## STEP 3: UNICODE → LATEX MANDATORY CONVERSIONS (CRITICAL):
   → → $\\rightarrow$ | ⇌ → $\\rightleftharpoons$ | Δ → $\\Delta$ | α → $\\alpha$ | β → $\\beta$
   x² → $x^2$ | x₁ → $x_1$ | θ → $\\theta$ | π → $\\pi$ | □ → $\\Box$
   - NEVER use raw Unicode symbols or plain text like "alpha-D-glucose".

## STEP 4: CHEMICAL NOTATION CONVERSION (CRITICAL)
Convert ALL chemical formulas and equations to LaTeX:
1. FORMULAS: Use \\text{} and subscripts (e.g., $\\text{H}_2\\text{SO}_4$).
2. IONS: Use superscripts (e.g., $\\text{Na}^+$, $\\text{SO}_4^{2-}$).
3. ARROWS: Use \\rightarrow, \\rightleftharpoons, or \\xrightarrow{}.
4. DELIMITERS: Wrap ALL chemical notation in $...$.

✅ CORRECT: "Reaction of $\\text{NaOH}$ with $\\text{HCl}$"
❌ WRONG:   "Reaction of \\\\text{NaOH} with \\\\text{HCl}" (DO NOT double-escape)

### 4A. EXAMPLES:
- Formulas: $\\text{KMnO}_4$, $[\\text{Co}(\\text{NH}_3)_6]\\text{Cl}_3$
- Ions: $\\text{Fe}^{3+}$, $\\text{Cl}^-$
- Arrows: $\\text{A} \\rightarrow \\text{B}$, $\\text{C} \\xrightarrow{\\Delta} \\text{D}$
- Greek: $\\alpha$, $\\beta$, $\\gamma$, $\\Delta$, $\\pi$


## STEP 5: ANSWER OPTIONS EXTRACTION
EVERY question MUST have EXACTLY 4 options labeled (A), (B), (C), (D).

OPTION FORMAT:
"(A) Option text with $\\text{CO}_2$"
"(B) Another option with $25^\\circ\\text{C}$"

## STEP 5: METADATA ENRICHMENT
- **marks**: 1 (default)
- **difficulty**: "Easy" | "Moderate" | "Hard"
- **blooms**: "Knowledge" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create"
- **domain**: "PHYSICAL CHEMISTRY" | "ORGANIC CHEMISTRY" | "INORGANIC CHEMISTRY"
- **chapter**: Chapter name from ${grade} syllabus

${topicInstruction}

# OUTPUT FORMAT (STRICT JSON SCHEMA)
{
  "questions": [
    {
      "id": "Q1",
      "text": "The molarity of a solution containing $5.85\\\\,\\\\text{g}$ of $\text{NaCl}$ in $500\\\\,\\\\text{mL}$ of solution is:",
      "options": [
        "(A) $0.1\\\\,\\\\text{M}$",
        "(B) $0.2\\\\,\\\\text{M}$",
        "(C) $0.3\\\\,\\\\text{M}$",
        "(D) $0.4\\\\,\\\\text{M}$"
      ],
      "marks": 1,
      "difficulty": "Moderate",
      "topic": "Solutions",
      "blooms": "Apply",
      "domain": "PHYSICAL CHEMISTRY",
      "chapter": "Solutions"
    }
  ]
}

# BEGIN EXTRACTION
Extract ALL ${grade} Chemistry MCQ questions following the above methodology. Output valid JSON only.`;
}

export { validateExtraction, autoFixQuestion } from './cleanMathExtractor';
