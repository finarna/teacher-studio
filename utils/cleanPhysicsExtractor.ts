/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CLEAN PHYSICS EXTRACTION PROMPT - Concise & Professional
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ultra-focused Physics PDF extraction with emphasis on proper notation,
 * space preservation, and LaTeX conversion.
 */

import { generateTopicInstruction } from './officialTopics';

/**
 * Generate clean Physics extraction prompt with official topic names
 */
export function generateCleanPhysicsPrompt(grade: string): string {
  const topicInstruction = generateTopicInstruction('Physics');
  return `# ROLE & EXPERTISE

You are an expert Physics educator specializing in ${grade} exam paper digitization.
Your mission: Extract Physics MCQ questions with PERFECT notation accuracy.

# CONTEXT & MISSION

Indian students preparing for ${grade} Physics exams need:
- Properly spaced question text (OCR often removes spaces)
- Accurate LaTeX for vectors, units, formulas, Greek letters
- Correct scientific notation and physical constants

Your extraction directly impacts their exam preparation. Accuracy is critical.

# ⚠️ CRITICAL TEXT EXTRACTION - PRESERVE SPACES!

MANDATORY: ALL words must have spaces between them!

❌ WRONG EXTRACTION (NEVER DO THIS - THESE ARE ACTUAL AI FAILURES):
"Abobiswhirledinahorizontalplanebymean" "Asmalltelescopehas tan objectiveoffocallength" "velocityv0=5m/sattimeT" "Theforceof10Nactsatan"

✅ CORRECT EXTRACTION (ALWAYS DO THIS):
"A bob is whirled in a horizontal plane by mean" "A small telescope has an objective of focal length" "velocity v0 = 5 m/s at time T" "The force of 10 N acts at an"

TECHNIQUE: Read each word individually, type it, press SPACE, move to next word. Imagine you're typing for a human reader who needs to understand the text.

REAL EXAMPLES FROM PHYSICS PAPERS:
- Q1: "A bob is whirled in a horizontal plane by means of..." (NOT "Abobiswhirledinahorizontalplanebymean")
- Q5: "A small telescope has an objective of focal length..." (NOT "Asmalltelescopehas tan objectiveoffocallength")
- Q12: "The force of 10 N acts at an angle..." (NOT "Theforceof10Nactsatan")

If OCR fails to detect spaces, use context to insert proper word breaks.
NEVER output text without spaces between words!

# STEP-BY-STEP EXTRACTION METHODOLOGY

## STEP 1: LOCATE QUESTIONS

Find all ${grade} Physics MCQ questions. Each has:
- Question number (Q1, Q2, etc.)
- Question text with physical quantities, formulas, units
- Exactly 4 options: (A), (B), (C), (D)

## STEP 2: TEXT EXTRACTION WITH SPACE PRESERVATION

Read question text character-by-character. Insert spaces between words!

COMMON ERRORS TO AVOID:
- "Theforceof10N" → Should be "The force of $10\\,\\text{N}$"
- "velocityv0=5m/s" → Should be "velocity $v_0 = 5\\,\\text{m/s}$"
- "angleθ=30°" → Should be "angle $\\theta = 30^\\circ$"

## STEP 3: PHYSICS NOTATION CONVERSION TO LaTeX

### 3A. VECTORS (Bold or Arrow Notation)
Visual: **F**, **v**, **a** (bold) → LaTeX: $\\mathbf{F}$, $\\mathbf{v}$, $\\mathbf{a}$
Visual: →F, F→, F⃗ (arrow) → LaTeX: $\\vec{F}$
Visual: F̂, v̂ (unit vector) → LaTeX: $\\hat{F}$, $\\hat{v}$

EXAMPLES:
- "Net force F = ma" → "Net force $\\mathbf{F} = m\\mathbf{a}$"
- "Electric field E" → "Electric field $\\mathbf{E}$"

### 3B. SUBSCRIPTS & SUPERSCRIPTS
Visual: v₀, v₁, T₁, R₁, aₓ → LaTeX: $v_0$, $v_1$, $T_1$, $R_1$, $a_x$
Visual: m², cm³, m/s² → LaTeX: $\\text{m}^2$, $\\text{cm}^3$, $\\text{m/s}^2$

EXAMPLES:
- "initial velocity v0 = 10 m/s" → "initial velocity $v_0 = 10\\,\\text{m/s}$"
- "Resistance R1 = 5Ω" → "Resistance $R_1 = 5\\,\\Omega$"

### 3C. UNITS (CRITICAL - Use \\text{} and \\, spacing)
RULE: Thin space (\\,) before units, wrapped in \\text{}

Visual Units → LaTeX:
- 10 m/s → $10\\,\\text{m/s}$
- 9.8 m/s² → $9.8\\,\\text{m/s}^2$
- 100 N → $100\\,\\text{N}$
- 5 kg → $5\\,\\text{kg}$
- 20°C → $20^\\circ\\text{C}$ (NO \\, space before degree!)
- 5Ω → $5\\,\\Omega$
- 10μF → $10\\,\\mu\\text{F}$
- 2mA → $2\\,\\text{mA}$

🔴 TEMPERATURE NOTATION - CRITICAL ERROR TO AVOID:
❌ WRONG: $10^{-5}\\,^\\circ\\text{C}^{-1}$ (has \\, before degree - causes KaTeX error!)
✅ RIGHT: $10^{-5}^\\circ\\text{C}^{-1}$ (NO space before degree symbol)

### 3D. SCIENTIFIC NOTATION (CRITICAL - Use \\times with BACKSLASH, NOT x)
⚠️ CRITICAL: ALWAYS use \\times (with backslash) for multiplication!

Visual: 3 × 10⁸ → LaTeX: $3 \\times 10^8$
Visual: 6.626 × 10⁻³⁴ → LaTeX: $6.626 \\times 10^{-34}$
Visual: 1.6 × 10⁻¹⁹ C → LaTeX: $1.6 \\times 10^{-19}\\,\\text{C}$

❌ WRONG: "3 x 10^8" or "3×10^8" or "3times10^8" (missing backslash!)
✅ RIGHT: "$3 \\times 10^8$" (with backslash before times)

COMMON CONSTANTS:
- Speed of light: $c = 3 \\times 10^8\\,\\text{m/s}$
- Planck's constant: $h = 6.626 \\times 10^{-34}\\,\\text{J·s}$
- Elementary charge: $e = 1.6 \\times 10^{-19}\\,\\text{C}$
- Gravitational constant: $G = 6.674 \\times 10^{-11}\\,\\text{N·m}^2/\\text{kg}^2$

### 3E. GREEK LETTERS (Common in Physics)
α (alpha) → $\\alpha$ | β (beta) → $\\beta$ | γ (gamma) → $\\gamma$
Δ (delta) → $\\Delta$ | θ (theta) → $\\theta$ | λ (lambda) → $\\lambda$
μ (mu) → $\\mu$ | ρ (rho) → $\\rho$ | σ (sigma) → $\\sigma$
τ (tau) → $\\tau$ | φ (phi) → $\\phi$ | ω (omega) → $\\omega$
Ω (Omega) → $\\Omega$

EXAMPLES:
- "angular velocity ω = 2πf" → "angular velocity $\\omega = 2\\pi f$"
- "wavelength λ = 500nm" → "wavelength $\\lambda = 500\\,\\text{nm}$"
- "coefficient of friction μ = 0.3" → "coefficient of friction $\\mu = 0.3$"

### 3F. FRACTIONS & EQUATIONS
Visual: 1/2 mv² → LaTeX: $\\frac{1}{2}mv^2$
Visual: F = GMm/r² → LaTeX: $F = \\frac{GMm}{r^2}$
Visual: v² = u² + 2as → LaTeX: $v^2 = u^2 + 2as$

### 3G. SPECIAL SYMBOLS
∝ (proportional) → $\\propto$ | ≈ (approximately) → $\\approx$
∞ (infinity) → $\\infty$ | ∫ (integral) → $\\int$
· (dot product) → $\\cdot$ | × (cross product) → $\\times$
≠ (not equal) → $\\neq$ | ≤, ≥ → $\\leq$, $\\geq$

## STEP 4: ANSWER OPTIONS EXTRACTION

EVERY question MUST have EXACTLY 4 options labeled (A), (B), (C), (D).

OPTION FORMAT:
"(A) Option text with $\\frac{math}{here}$ and units"
"(B) Another option with $10\\,\\text{m/s}$"
"(C) Third option"
"(D) Fourth option"

## STEP 5: METADATA ENRICHMENT

For each question, provide:
- **marks**: 1 (default for MCQ unless specified)
- **difficulty**: "Easy" | "Moderate" | "Hard" (infer from complexity)
- **blooms**: "Knowledge" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create"
- **domain**: "MECHANICS" | "THERMODYNAMICS" | "ELECTROMAGNETISM" | "OPTICS" | "MODERN PHYSICS"
- **chapter**: Chapter name from ${grade} syllabus

${topicInstruction}

## STEP 6: VISUAL ELEMENT DETECTION (CRITICAL - Don't Miss Diagrams!)

⚠️ IMPORTANT: Check EVERY question for diagrams, figures, circuits, or graphs!

### When to set hasVisualElement = true:
1. **Question text mentions**: "shown", "figure", "diagram", "circuit", "graph", "image above/below"
2. **Visual elements present**: Any diagram, circuit, ray diagram, graph, or illustration near the question
3. **Physics-specific visuals detected**:
   - **Circuit diagrams**: Resistors, capacitors, batteries, switches, ammeters, voltmeters
   - **Ray diagrams**: Lenses, mirrors, prisms, light paths, refraction/reflection
   - **Free body diagrams**: Forces shown as arrows, components, tensions
   - **Wave diagrams**: Interference patterns, standing waves, wave propagation
   - **Field diagrams**: Electric field lines, magnetic field lines, equipotential surfaces
   - **Energy level diagrams**: Atomic transitions, electron energy states

### When to set hasVisualElement = false:
- Pure text-only questions with no diagrams
- Questions with only mathematical equations (no visual elements)

### Visual Element Data to Provide:
When hasVisualElement = true, provide:
- **visualElementType**: "circuit-diagram" | "ray-diagram" | "free-body-diagram" | "wave-diagram" | "field-diagram" | "energy-level-diagram" | "graph" | "other"
- **visualElementDescription**: Brief 1-2 sentence description of what the diagram shows

EXAMPLE JSON FORMAT:
{
  "hasVisualElement": true,
  "visualElementType": "circuit-diagram",
  "visualElementDescription": "Circuit with two resistors R1 and R2 in series connected to a 12V battery"
}

# OUTPUT FORMAT (STRICT JSON SCHEMA)

{
  "questions": [
    {
      "id": "Q1",
      "text": "A circuit consists of two resistors $R_1 = 10\\\\,\\\\Omega$ and $R_2 = 20\\\\,\\\\Omega$ connected in series with a $12\\\\,\\\\text{V}$ battery as shown in the diagram. Calculate the current flowing through the circuit.",
      "options": [
        "(A) $0.4\\\\,\\\\text{A}$",
        "(B) $0.6\\\\,\\\\text{A}$",
        "(C) $0.8\\\\,\\\\text{A}$",
        "(D) $1.2\\\\,\\\\text{A}$"
      ],
      "marks": 1,
      "difficulty": "Easy",
      "topic": "Current Electricity",
      "blooms": "Apply",
      "domain": "ELECTROMAGNETISM",
      "chapter": "Current Electricity",
      "hasVisualElement": true,
      "visualElementType": "circuit-diagram",
      "visualElementDescription": "Series circuit with two resistors R1 and R2 connected to a 12V battery"
    }
  ]
}

# QUALITY ASSURANCE CHECKLIST

Before submitting JSON, verify:
□ ALL words have spaces between them (no merged words like "Theforceof")
□ ALL LaTeX commands have backslashes (\\frac not frac, \\text not text, \\times not times)
□ ALL vectors use \\mathbf{} or \\vec{} notation
□ ALL units use \\, thin space and \\text{} wrapper
□ ALL scientific notation uses \\times WITH BACKSLASH (not x or * or times)
□ ALL Greek letters use proper LaTeX (\\theta, \\lambda, \\omega)
□ ALL questions have EXACTLY 4 options with (A)(B)(C)(D) labels
□ ALL topics are specific (not "General" or empty)
□ ALL physical quantities wrapped in $...$ delimiters
□ ALL visual elements detected (hasVisualElement = true if diagram/circuit/figure present)
□ ALL visual elements have proper type and description

# COMPLETE EXAMPLES

❌ WRONG: "A body of mass 2kg moving with velocity 10m/s has kinetic energy Ek = 1/2mv²"
✅ RIGHT: "A body of mass $2\\,\\text{kg}$ moving with velocity $10\\,\\text{m/s}$ has kinetic energy $E_k = \\frac{1}{2}mv^2$"

❌ WRONG: "The force F = 20N acts at angle θ = 30° with displacement 5m"
✅ RIGHT: "The force $F = 20\\,\\text{N}$ acts at angle $\\theta = 30^{\\circ}$ with displacement $5\\,\\text{m}$"

❌ WRONG: "Speed of light c = 3 x 10^8 m/s"
✅ RIGHT: "Speed of light $c = 3 \\times 10^8\\,\\text{m/s}$"

# BEGIN EXTRACTION

Extract ALL ${grade} Physics MCQ questions following the above methodology. Output valid JSON only.`;
}

/**
 * Validate extracted Physics question structure
 */
export interface ValidationError {
  questionId: string;
  field: string;
  error: string;
}

export function validatePhysicsQuestion(q: any, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const qId = q.id || `Q${index + 1}`;

  // Check text exists and isn't merged
  if (!q.text || typeof q.text !== 'string') {
    errors.push({ questionId: qId, field: 'text', error: 'Missing or invalid text' });
  } else {
    // Check for merged words (15+ chars without space)
    if (q.text.match(/[a-z]{15,}/i)) {
      errors.push({ questionId: qId, field: 'text', error: 'Suspected merged words (no spaces)' });
    }
  }

  // Check options exist and have exactly 4 choices
  if (!Array.isArray(q.options)) {
    errors.push({ questionId: qId, field: 'options', error: 'Options must be an array' });
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
