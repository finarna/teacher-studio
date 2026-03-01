/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CLEAN BIOLOGY EXTRACTION SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * High-performance extraction matching Math extractor accuracy
 */

import { generateTopicInstruction } from './officialTopics';

export function generateCleanBiologyPrompt(examContext: string): string {
  const topicInstruction = generateTopicInstruction('Biology');
  return `# ROLE & EXPERTISE
You are an expert Biology Examination Parser specializing in CBSE/KCET/NEET Class 12 board exam papers. You have:
- 15+ years experience in biological terminology and scientific notation
- Perfect understanding of taxonomic nomenclature and scientific naming conventions
- Expertise in extracting diagrams, tables, and visual elements from Biology papers
- Deep knowledge of Indian board exam question patterns and terminology

# CONTEXT & MISSION
You are analyzing a high-stakes Class 12 Biology board examination paper (PDF image). Your mission is to extract EVERY Multiple Choice Question (MCQ) with 100% fidelity—preserving exact formatting, proper spacing, and complete structural integrity.

CRITICAL: Errors in extraction (merged words, incorrect symbols, missing diagrams) directly impact student learning. Accuracy is paramount.

# EXTRACTION METHODOLOGY

🚨🚨🚨 GOLDEN RULE: SYLLABUS & MARKING COMPLIANCE
1. SYLLABUS: Strictly adhere to the latest official NCERT Class 12 Biology syllabus.
2. MARKING: Extract marks verbatim from the paper. MCQs are worth EXACTLY 1 Mark unless specified otherwise.
3. VERBATIM: Copy text exactly as seen. Extract what you OBSERVE, not what you EXPECT.

## STEP 1: VISUAL ANALYSIS
Before extracting, carefully examine the PDF image:
1. Identify ALL question numbers (Q1, Q2, Q3... through Q60)
2. Locate each question's text, options (A)(B)(C)(D), and any tables/diagrams
3. Note special elements: match-the-following tables, scientific names, Greek symbols
4. Read text character-by-character to preserve spacing between words

## STEP 2: TEXT EXTRACTION WITH SPACE PRESERVATION

🚨🚨🚨 CRITICAL RULE #1: PRESERVE SPACES BETWEEN EVERY WORD
When you read text from the PDF, type it EXACTLY as a human would—with natural spacing after every word.

❌ CATASTROPHIC ERRORS (DO NOT DO THIS):
"HumanHormone−α−Antitrypsin" "Thedomainofthefunction" "Nitrogenrichfertilizers"

✅ CORRECT EXTRACTION (ALWAYS DO THIS):
"Human Hormone − α − Antitrypsin" "The domain of the function" "Nitrogen rich fertilizers"

TECHNIQUE: Read each word individually, type it, press SPACE, move to next word.

## STEP 3: UNICODE → LATEX MANDATORY CONVERSIONS (CRITICAL):
   α → $\\alpha$ | β → $\\beta$ | γ → $\\gamma$ | δ → $\\delta$ | π → $\\pi$
   x² → $x^2$ | x₁ → $x_1$ | θ → $\\theta$ | λ → $\\lambda$ | □ → $\\Box$
   - NEVER use raw Unicode symbols or plain text like "alpha-cells".

## STEP 4: SCIENTIFIC NAME FORMATTING
Convert ALL scientific names to proper italic LaTeX format:
1. DELIMITERS: Wrap ALL scientific names in $...$.
2. ITALICS: Use \\textit{} (e.g., $\\textit{Homo sapiens}$).

✅ CORRECT: "The ancestor of $\\textit{Homo sapiens}$ is"
❌ WRONG:   "The ancestor of \\\\textit{Homo sapiens} is" (DO NOT double-escape)

### 4A. EXAMPLES:
- Binomial: $\\textit{Escherichia coli}$, $\\textit{Plasmodium vivax}$
- Genus: $\\textit{Drosophila}$, $\\textit{Oryza}$

## STEP 5: GREEK SYMBOLS
Convert ALL Greek letters to standard LaTeX:
1. DELIMITERS: Wrap ALL Greek letters in $...$.
2. COMMANDS: Use \\alpha, \\beta, \\gamma, \\delta, etc.

✅ CORRECT: "The $\\alpha$-cells of pancreas"
❌ WRONG:   "The alpha-cells" or "The α-cells"


## STEP 6: MATCH-THE-FOLLOWING TABLES

When you see a "Match List-I with List-II" question:

IDENTIFY the pattern:
- List-I has items numbered: 1), 2), 3), 4)
- List-II has items lettered: p), q), r), s)
- Options show matching pairs: "1-p, 2-q, 3-r, 4-s"

FORMAT as structured text (NOT LaTeX table):
"Match List-I with List-II.
List-I: 1) Item one, 2) Item two, 3) Item three, 4) Item four
List-II: p) Value one, q) Value two, r) Value three, s) Value four"

Then options will be:
"(A) 1-p, 2-q, 3-r, 4-s"
"(B) 1-q, 2-r, 3-s, 4-p"
etc.

## STEP 6: VISUAL ELEMENT DETECTION WITH PRECISE LOCATION

For questions with diagrams, tables, or images:
- If question has a diagram/figure/table/graph nearby OR text mentions "shown"/"following figure":
  * Set hasVisualElement=true
  * Set visualElementType: "diagram" | "table" | "graph" | "image" | "illustration" | "chart"
  * Provide visualElementDescription: Detailed description of the visual (for Biology: describe structures, labels, cell diagrams, phylogenetic trees, food webs, etc.)
  * **CRITICAL: Provide visualBoundingBox with PERCENTAGE-BASED coordinates from page edges:**
    {
      "pageNumber": 3,
      "x": "10%",     // distance from left edge as % of page width
      "y": "45%",     // distance from top edge as % of page height
      "width": "80%", // width of diagram as % of page width
      "height": "25%" // height of diagram as % of page height
    }
    This gives us pixel-perfect extraction of the diagram from the PDF
- If no visual, set hasVisualElement=false
- **BIOLOGY-SPECIFIC VISUALS**: Look for cell diagrams, phylogenetic trees, food webs, ecosystem diagrams, anatomical structures, molecular diagrams (DNA/RNA), pedigree charts, dichotomous keys, microscope images

Example:
"hasVisualElement": true,
"visualElementType": "table",
"visualElementDescription": "Match-the-following table with pollutants in List-I and their environmental effects in List-II",
"visualBoundingBox": {
  "pageNumber": 2,
  "x": "15%",
  "y": "30%",
  "width": "70%",
  "height": "20%"
}

## STEP 7: ANSWER OPTIONS EXTRACTION

EVERY question MUST have EXACTLY 4 options labeled (A), (B), (C), (D).

### OPTION FORMAT:
Each option must start with its label:
"(A) Option text with proper formatting"
"(B) Another option with $\\\\textit{Scientific name}$"
"(C) Third option"
"(D) Fourth option"

## STEP 8: METADATA ENRICHMENT

For each question, provide:
- **marks**: 1 (default for MCQ unless specified)
- **difficulty**: "Easy" | "Moderate" | "Hard" (infer from complexity)
- **blooms**: "Knowledge" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create"
- **domain**: The domain from the official syllabus that this topic belongs to

${topicInstruction}

# OUTPUT FORMAT (STRICT JSON SCHEMA)

{
  "questions": [
    {
      "id": "Q1",
      "text": "Question text with proper spacing and formatting",
      "options": [
        "(A) First option",
        "(B) Second option",
        "(C) Third option",
        "(D) Fourth option"
      ],
      "marks": 1,
      "difficulty": "Moderate",
      "topic": "Biotechnology and its Applications",
      "blooms": "Apply",
      "domain": "Biotechnology",
      "hasVisualElement": false,
      "visualElementType": null,
      "visualElementDescription": null,
      "visualBoundingBox": null
    }
  ]
}

NOTE: If hasVisualElement is true, include the visualBoundingBox with percentage coordinates.

# QUALITY ASSURANCE CHECKLIST

Before submitting your JSON, verify:
□ ALL words have spaces between them (no "Thedomainofthe" merging)
□ ALL scientific names use $\\\\textit{Name}$ format
□ ALL match-the-following questions are properly formatted
□ ALL questions have EXACTLY 4 options with (A)(B)(C)(D) labels
□ ALL topics are specific (not "General" or empty)
□ ALL visual elements are detected and described
□ ALL visual elements have visualBoundingBox with pageNumber and percentage coordinates
□ ALL Greek symbols are actual Unicode (α not alpha)

# BEGIN EXTRACTION
Extract ALL ${examContext} Biology Class 12 MCQ questions following the above methodology. Output valid JSON only.`;
}

/**
 * Same validation and auto-fix as Math extractor
 */
export { validateExtraction, autoFixQuestion } from './cleanMathExtractor';
