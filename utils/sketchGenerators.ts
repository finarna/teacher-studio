import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Exam-specific syllabus references (textbook scope boundaries)
const EXAM_SYLLABUS_CONTEXT: Record<string, Record<string, string>> = {
  KCET: {
    Math: 'PUC II Year Mathematics textbook (Karnataka). Topics: Relations & Functions, Algebra (Matrices, Determinants), Calculus (Limits, Derivatives, Integrals, Differential Eqs), Vectors & 3D, Linear Programming, Probability.',
    Physics: 'PUC II Year Physics (Karnataka). Topics as per NCERT Class 12 Physics Part I & II.',
    Chemistry: 'PUC II Year Chemistry (Karnataka). Topics as per NCERT Class 12 Chemistry Part I & II.',
    Biology: 'PUC II Year Biology (Karnataka). Topics as per NCERT Class 12 Biology.'
  },
  NEET: {
    Physics: 'NCERT Class 11 & 12 Physics. Topics: Mechanics, Thermodynamics, Waves, Electrostatics, Current Electricity, Magnetism, Optics, Modern Physics. Strictly NCERT scope only.',
    Chemistry: 'NCERT Class 11 & 12 Chemistry. Topics: Physical, Organic, Inorganic Chemistry as per NMC syllabus. Strictly NCERT scope only.',
    Biology: 'NCERT Class 11 & 12 Biology. Topics: Diversity, Cell Biology, Plant & Human Physiology, Genetics, Evolution, Ecology, Biotechnology. Strictly NCERT scope only.',
    Math: 'Not applicable for NEET.'
  },
  JEE: {
    Math: 'NCERT Class 11 & 12 Mathematics + JEE Main syllabus. Topics: Algebra, Coordinate Geometry, Calculus, Vectors & 3D, Statistics, Probability. Strictly within NTA-published JEE Main syllabus.',
    Physics: 'NCERT Class 11 & 12 Physics + JEE Main addition for Modern Physics, Semiconductors. Strictly NTA-published scope.',
    Chemistry: 'NCERT Class 11 & 12 Chemistry. Organic, Inorganic, Physical Chemistry as per NTA-published JEE Main syllabus.',
    Biology: 'Not applicable for JEE.'
  },
  CBSE: {
    Math: 'NCERT Class 12 Mathematics (CBSE). Chapters: Relations & Functions, Inverse Trig, Matrices, Determinants, Continuity & Diff., Applications of Derivatives, Integrals, Diff. Equations, Vectors, 3D Geometry, LPP, Probability.',
    Physics: 'NCERT Class 12 Physics Parts I & II (CBSE). All chapters as prescribed by CBSE.',
    Chemistry: 'NCERT Class 12 Chemistry Parts I & II (CBSE). All chapters as prescribed by CBSE.',
    Biology: 'NCERT Class 12 Biology (CBSE). All chapters as prescribed by CBSE.'
  }
};

export type GenerationMethod = 'gemini-3-flash-preview' | 'gemini-2.0-flash-lite' | 'gemini-2.5-flash-latest' | 'gemini-1.5-pro' | 'gemini-2.0-pro-exp' | 'gemini-3-pro' | 'gemini-2.0-flash-exp-image-01' | 'gemini-3-pro-image-preview' | 'gemini-3-pro-image' | 'gemini-2.5-flash-image';

export interface GenerationResult {
  imageData: string; // Base64 encoded PNG image
  blueprint: any;
}

/**
 * Convert LaTeX formulas to image-friendly notation
 * Image models can't parse LaTeX syntax, so we convert to readable plain notation
 */
const latexToImageNotation = (latex: string): string => {
  let clean = latex
    // Remove delimiters
    .replace(/\$\$/g, '')
    .replace(/\$/g, '')
    .replace(/\\\[/g, '')
    .replace(/\\\]/g, '')
    .replace(/\\\(/g, '')
    .replace(/\\\)/g, '')

    // Convert fractions: \frac{a}{b} → a/b
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')

    // Convert sqrt: \sqrt{x} → √x
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')

    // Convert limits: \lim_{x \to a} → lim(x→a)
    .replace(/\\lim_\{([^}]+)\}/g, 'lim($1)')

    // Convert integrals: \int → ∫
    .replace(/\\int/g, '∫')

    // Convert sums: \sum → Σ
    .replace(/\\sum/g, 'Σ')

    // Convert derivatives
    .replace(/\\frac\{d\}\{dx\}/g, 'd/dx')
    .replace(/\\frac\{dy\}\{dx\}/g, 'dy/dx')

    // Trig functions
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\sec/g, 'sec')
    .replace(/\\csc/g, 'csc')
    .replace(/\\cot/g, 'cot')

    // Greek letters to Unicode
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\pi/g, 'π')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\sigma/g, 'σ')

    // Operators
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\infty/g, '∞')
    .replace(/\\to/g, '→')

    // Remove remaining backslashes for commands
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\,/g, ' ')
    .replace(/\\\\/g, ', ')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')

    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();

  return clean;
};

/**
 * Sleep utility for rate limiting
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff for rate limit and server errors
 * Handles both 429 (rate limit) and 503 (server overloaded) errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 2000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a retryable error (429 rate limit or 503 overloaded)
      const isRateLimit = error.message?.includes('429') ||
        error.message?.includes('quota') ||
        error.message?.includes('Too Many Requests');

      const is503 = error.message?.includes('503') ||
        error.message?.includes('overloaded') ||
        error.message?.includes('The model is overloaded');

      const isRetryable = isRateLimit || is503;

      if (isRetryable && i < maxRetries - 1) {
        // Extract retry delay from error message if available (for 429)
        const retryMatch = error.message?.match(/retryDelay[\"']?\s*:\s*[\"']?(\d+)s/);
        const suggestedDelay = retryMatch ? parseInt(retryMatch[1]) * 1000 : null;

        // Use suggested delay or exponential backoff
        const delay = suggestedDelay || initialDelay * Math.pow(2, i);

        const errorType = isRateLimit ? 'Rate limit' : '503 Server overloaded';
        console.log(`⚠️ ${errorType}. Retrying in ${delay / 1000}s... (attempt ${i + 1}/${maxRetries})`);
        await sleep(delay);
      } else if (!isRetryable) {
        // If not a retryable error, throw immediately
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * METHOD 1: Gemini 3 Pro Image (Highest Quality)
 * Uses Gemini 3 Pro Image for realistic hand-drawn sketchnotes
 * Pros: Best quality, advanced text rendering, high resolution, Google Search grounding
 * Cons: Slower, higher cost, larger file size
 */
export const generateGemini3ProImage = async (
  topic: string,
  questionText: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void,
  examContext?: string
): Promise<GenerationResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Resolve exam-specific syllabus scope
  const examKey = examContext || 'CBSE';
  const syllabusScope = EXAM_SYLLABUS_CONTEXT[examKey]?.[subject] ||
    `Official Class 12 ${subject} textbook for ${examKey}. Strictly follow the prescribed syllabus only.`;

  // STEP 1: Generate pedagogical content
  onStatusUpdate?.('Professor is drafting the core logic...');
  const textModel = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          visualConcept: { type: SchemaType.STRING },
          detailedNotes: { type: SchemaType.STRING },
          mentalAnchor: { type: SchemaType.STRING },
          proceduralLogic: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          keyFormulas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          examTip: { type: SchemaType.STRING },
          pitfalls: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          imageDescription: { type: SchemaType.STRING }
        },
        required: ["visualConcept", "detailedNotes", "mentalAnchor", "proceduralLogic", "keyFormulas", "examTip", "pitfalls", "imageDescription"]
      }
    }
  });

  const contentPrompt = `Act as an elite Class 12 ${subject} Professor for the ${examKey} exam.

=== CRITICAL SYLLABUS BOUNDARY ===
You MUST strictly follow ONLY the content covered in: ${syllabusScope}
DO NOT include any content beyond this official prescribed scope.
EXCEPTION: Since this question appeared in a previous exam/context, you MUST fully explain the concepts required to solve this specific question, EVEN IF it normally belongs to a different class/grade. NEVER generate an "Out of Syllabus" or "Wrong Class" warning. Construct the full pedagogical learning guide.

TOPIC: "${topic}"
QUESTION CONTEXT: ${questionText}

Generate a complete learning blueprint grounded STRICTLY in ${examKey} syllabus:
1. visualConcept: Engaging title
2. detailedNotes: Step-by-step breakdown using textbook methods
3. mentalAnchor: One memorable analogy
4. proceduralLogic: Algorithmic steps (4-5 steps)
5. keyFormulas: 2-4 essential formulas (LaTeX)
6. examTip: Specific ${examKey} strategy
7. pitfalls: Common student errors in ${examKey}
8. imageDescription: Detailed instructions for the visual layout`;

  const contentResult = await textModel.generateContent(contentPrompt);
  const blueprint = JSON.parse(contentResult.response.text());

  // Fix ampersand and other LaTeX-problematic characters in titles for KaTeX compatibility
  if (blueprint.visualConcept) {
    blueprint.visualConcept = blueprint.visualConcept
      .replace(/&/g, 'and')  // Replace & with "and" for LaTeX safety
      .replace(/#/g, 'No.')  // Replace # with "No."
      .replace(/%/g, 'percent');  // Replace % with "percent"
  }

  // STEP 2: Generate image
  onStatusUpdate?.('AI Artist is crafting the visual blueprint...');
  const imageModel = genAI.getGenerativeModel({
    model: "gemini-3-pro-image-preview"
  });

  // Convert LaTeX formulas to readable notation for image generation
  const displayFormulas = blueprint.keyFormulas.map(f => latexToImageNotation(f));

  const imagePrompt = `Create a CAPTIVATING, VIBRANT hand-drawn educational sketchnote:

SUBJECT: ${subject} (Class 12 ${examKey} Exam)
TOPIC: ${blueprint.visualConcept}

⚠️ STRICT CONTENT RULE: Only include content that is EXPLICITLY part of the ${examKey} ${subject} syllabus for "${topic}".
EXCEPTION: If the question itself contains or requires concepts slightly outside this boundary, EXPLICITLY INCLUDE them to provide a complete answer. DO NOT output error messages about wrong class.

VISUAL CONTENT TO INCLUDE:
${blueprint.imageDescription}

KEY CONCEPTS TO VISUALIZE:
${blueprint.detailedNotes.substring(0, 500)}

FORMULAS TO DISPLAY (Write EXACTLY as shown):
${displayFormulas.join('\n')}

/* Original Blackboard Style (kept for reference):
STYLE REQUIREMENTS:
- Hand-drawn aesthetic with clean, confident white/bright chalk lines
- Blackboard aesthetic with chalk-drawn style
- Rich, dark chalkboard background
- Vibrant, bright chalk colors (white, yellow, neon green, bright pink, cyan) for high contrast
- Clear visual hierarchy with bold chalk headers and readable subheaders
- Labeled diagrams with arrows showing relationships
- Visual icons and metaphors to represent concepts
- Mathematical formulas clearly displayed
*/

STYLE REQUIREMENTS:
- Hand-drawn aesthetic with clean, confident black ink lines
- Professional educational sketchnote style
- Cream or white paper background
- Vibrant accent colors (teal, coral, emerald, violet, amber) for highlights to make it eye-catching
- Clear visual hierarchy with bold headers and readable subheaders
- Labeled diagrams with arrows showing relationships
- Visual icons and metaphors to represent concepts
- Mathematical formulas clearly displayed
${subject === 'Math' ? `
CRITICAL MATHEMATICAL NOTATION REQUIREMENTS:
1. FRACTIONS: Use horizontal fraction bar with numerator above, denominator below (e.g., dy/dx or dy over dx)
2. EXPONENTS: Write superscripts clearly ABOVE base (y' has ONE prime, y'' has TWO primes, x² has small 2 above)
3. DERIVATIVES: dy/dx (NOT dydx), y' (one prime), y'' (two primes), y''' (three primes)
4. SQUARE ROOTS: Use √ symbol with content underneath
5. EQUALS SIGNS: Properly aligned horizontal = sign
6. PARENTHESES: Matching pairs ( ) properly sized
7. GREEK LETTERS: θ α β π λ μ σ γ δ (use proper symbols)
8. OPERATORS: × ÷ ± ≤ ≥ ≠ ≈ ∞ → ∫ Σ (use proper symbols)
9. COPY EXACTLY what is shown - do not invent notation

MATH SKETCH REQUIREMENTS:
- Coordinate grids: Artistic-yet-precise axes with ticks and labels
- Geometric figures: Beautifully hand-drawn accurate angles and shapes
- Vector/Matrix zones: Creative hand-drawn borders and elegant alignment
- Use Vivid Indigo for primary elements, Emerald for solutions, Gray for construction lines` :
      `- Mathematical formulas artistically and elegantly displayed`}
- Artistic process flows with a human, hand-drawn rhythm
- Creative illustrative sketches to support deep understanding
- Whimsical callout boxes with artistic borders for key insights
- Perfect visual balance that feels alive and engaging
- High-end educational Sketchnote aesthetic (Artistic masterpiece)

PURPOSE: Create a CAPTIVATING visual learning sketchnote for Class 12 Board exam students.`;

  const imageResult = await retryWithBackoff(() => imageModel.generateContent(imagePrompt)) as any;
  const imagePart = imageResult.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData) {
    throw new Error("No image was generated by Gemini 3 Pro Image");
  }

  const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageData: imageDataUrl,
    blueprint
  };
};

/**
 * METHOD 2: Gemini 2.5 Flash Image (Balanced)
 * Uses Gemini 2.5 Flash for faster image generation
 * Pros: Faster, cost-effective, good quality
 * Cons: Lower quality than Pro, simpler text rendering
 */
export const generateGemini25FlashImage = async (
  topic: string,
  questionText: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void,
  examContext?: string
): Promise<GenerationResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Resolve exam-specific syllabus scope
  const examKey = examContext || 'CBSE';
  const syllabusScope = EXAM_SYLLABUS_CONTEXT[examKey]?.[subject] ||
    `Official Class 12 ${subject} textbook for ${examKey}. Strictly follow the prescribed syllabus only.`;

  // STEP 1: Generate pedagogical content
  onStatusUpdate?.('Professor is drafting the core logic...');
  const textModel = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          visualConcept: { type: SchemaType.STRING },
          coreTheory: { type: SchemaType.STRING },
          keyFormulas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          solvedExample: { type: SchemaType.STRING },
          stepByStep: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          commonVariations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          patternRecognition: { type: SchemaType.STRING },
          relatedConcepts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          memoryTricks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          commonMistakes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          examStrategy: { type: SchemaType.STRING },
          quickReference: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        },
        required: ["visualConcept", "coreTheory", "keyFormulas", "solvedExample", "stepByStep", "commonVariations", "patternRecognition", "relatedConcepts", "memoryTricks", "commonMistakes", "examStrategy", "quickReference"]
      }
    }
  });

  const contentPrompt = `Act as an elite Class 12 ${subject} Professor for the ${examKey} exam.

=== CRITICAL SYLLABUS BOUNDARY ===
You MUST strictly follow ONLY the content covered in: ${syllabusScope}
DO NOT include any content beyond this official prescribed scope.
EXCEPTION: Since this question appeared in a previous exam/context, you MUST fully explain the concepts required to solve this specific question, EVEN IF it normally belongs to a different class/grade. NEVER generate an "Out of Syllabus" or "Wrong Class" warning. Construct the full pedagogical learning guide.

TOPIC: "${topic}"
CONTEXT QUESTION: ${questionText}

Generate a complete learning blueprint grounded STRICTLY in ${examKey} syllabus:
1. visualConcept: Engaging title
2. coreTheory: Core concept explanation (2-3 sentences)
3. keyFormulas: 3-5 essential formulas (LaTeX)
4. solvedExample: Complete solution following textbook methods
5. stepByStep: Universal solving method (4-6 steps)
6. commonVariations: 4-5 common question variations in ${examKey}
7. patternRecognition: How to identify this question type in ${examKey}
8. relatedConcepts: 3-4 connected topics
9. memoryTricks: 2-3 mnemonics/memory aids
10. commonMistakes: 3-4 typical errors to avoid
11. examStrategy: ${examKey} exam tactics
12. quickReference: Cheat-sheet items (3-5)`;

  const contentResult = await textModel.generateContent(contentPrompt);
  const blueprint = JSON.parse(contentResult.response.text());

  // Fix ampersand and other LaTeX-problematic characters in titles for KaTeX compatibility
  if (blueprint.visualConcept) {
    blueprint.visualConcept = blueprint.visualConcept
      .replace(/&/g, 'and')  // Replace & with "and" for LaTeX safety
      .replace(/#/g, 'No.')  // Replace # with "No."
      .replace(/%/g, 'percent');  // Replace % with "percent"
  }

  // STEP 2: Generate image
  onStatusUpdate?.('AI Artist is creating the sketchnote...');
  const imageModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image"
  });

  // Convert LaTeX formulas to readable notation for image generation
  const displayFormulas = blueprint.keyFormulas.map(f => latexToImageNotation(f));
  const displayExample = latexToImageNotation(blueprint.solvedExample.substring(0, 250));
  const displayVariations = blueprint.commonVariations.slice(0, 3).map(v => latexToImageNotation(v));
  const displayReference = blueprint.quickReference.map(r => latexToImageNotation(r));

  const imagePrompt = `Create an ARTISTIC, VIBRANT hand-drawn sketchnote for Class 12 ${subject} [${examKey}].

⚠️ STRICT CONTENT RULE: Only include content that is EXPLICITLY part of the ${examKey} ${subject} syllabus for "${topic}".
EXCEPTION: If the question itself contains or requires concepts slightly outside this boundary, EXPLICITLY INCLUDE them to provide a complete answer. DO NOT output error messages about wrong class.

TOPIC: "${blueprint.visualConcept}"

CONTENT TO DISPLAY (organize in creative hand-drawn sections with artistic icons):

📚 CORE CONCEPT:
${blueprint.coreTheory}

📐 KEY FORMULAS (CRITICAL - Write these EXACTLY as shown):
${displayFormulas.map((f, i) => `${i + 1}. ${f}`).join('\n')}

✓ SOLVED EXAMPLE:
${displayExample}

🎯 HOW TO RECOGNIZE THIS:
${blueprint.patternRecognition}

🔄 SIMILAR QUESTION TYPES:
${displayVariations.map((v, i) => `• ${v}`).join('\n')}

🧠 MEMORY TRICKS:
${blueprint.memoryTricks.map(t => `• ${t}`).join('\n')}

⚠️ COMMON MISTAKES:
${blueprint.commonMistakes.slice(0, 3).map(m => `• ${latexToImageNotation(m)}`).join('\n')}

⚡ QUICK REFERENCE:
${displayReference.map(r => `• ${r}`).join('\n')}

CRITICAL RENDERING INSTRUCTIONS FOR MATHEMATICAL ACCURACY:

1. FRACTIONS: Write as (numerator)/(denominator) or use horizontal line with numerator above, denominator below
   Example: dy/dx or  dy
                      --
                      dx

2. EXPONENTS: Write superscripts clearly ABOVE the base
   Example: y'' means y with TWO prime marks (not y"" or y11)
   Example: x² means x with small 2 raised above

3. SQUARE ROOTS: Use √ symbol with content clearly underneath the radical
   Example: √x or √(x²+1)

4. DERIVATIVES: Common notations to write correctly:
   - dy/dx (NOT dydx or dy dx)
   - y' (y with ONE prime mark above)
   - y'' (y with TWO prime marks above)
   - y''' (y with THREE prime marks above)

5. EQUALS SIGNS: Must be properly aligned horizontally (=)

6. PARENTHESES: Must match ( ) and be properly sized

7. GREEK LETTERS: Use Unicode symbols: θ α β π λ μ σ γ δ

8. OPERATORS: × ÷ ± ≤ ≥ ≠ ≈ ∞ → ∫ Σ

9. DO NOT invent notation - copy EXACTLY what is shown above

VISUAL STYLE:
- CAPTIVATING hand-drawn sketchnote with artistic mastery.
- VIBRANT, HIGH-END COLOR SCHEME (Vivid Navy, Electric Teal, Sunburst Gold).
- Whimsical-yet-organized hand-drawn boxes and borders.
- Artistic handwriting style (neat-yet-organic).
- Creative hand-drawn icons (📚📐✓🎯🔄🧠⚠️⚡).
- Perfect visual flow and rhythmic organization.
- High-end educational sketchnote masterpiece feel.

PURPOSE: Create a CAPTIVATING, artistic visual summary for revision.`;

  const imageResult = await retryWithBackoff(() => imageModel.generateContent(imagePrompt)) as any;
  const imagePart = imageResult.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData) {
    throw new Error("No image was generated by Gemini 2.5 Flash");
  }

  const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageData: imageDataUrl,
    blueprint
  };
};

/**
 * METHOD 4: Imagen 3 (High Fidelity)
 * Uses Imagen 3 for high-quality realistic images
 * Pros: High fidelity, realistic, dedicated image model
 * Cons: Simpler compared to Gemini 3 Pro for text rendering
 */
export const generateImagen3Sketch = async (
  topic: string,
  questionText: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<GenerationResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  // STEP 1: Generate pedagogical content
  onStatusUpdate?.('Professor is drafting the core logic...');
  const textModel = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          visualConcept: { type: SchemaType.STRING },
          coreTheory: { type: SchemaType.STRING },
          keyFormulas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          solvedExample: { type: SchemaType.STRING },
          stepByStep: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          commonVariations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          patternRecognition: { type: SchemaType.STRING },
          relatedConcepts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          memoryTricks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          commonMistakes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          examStrategy: { type: SchemaType.STRING },
          quickReference: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        },
        required: ["visualConcept", "coreTheory", "keyFormulas", "solvedExample", "stepByStep", "commonVariations", "patternRecognition", "relatedConcepts", "memoryTricks", "commonMistakes", "examStrategy", "quickReference"]
      }
    }
  });

  const contentPrompt = `Act as an elite Class 12 ${subject} Professor creating a COMPREHENSIVE LEARNING SKETCHNOTE.

TOPIC: "${topic}"
CONTEXT QUESTION: ${questionText}

Your goal: Help students MASTER this topic through complete understanding, pattern recognition, and practice variations.

Generate a complete learning blueprint with:
1. visualConcept: Clear, engaging title
2. coreTheory: Core concept explanation (2-3 sentences)
3. keyFormulas: 3-5 essential formulas in LaTeX
4. solvedExample: Complete solution to given question
5. stepByStep: Universal solving method (4-6 steps)
6. commonVariations: 4-5 common question variations
7. patternRecognition: How to identify this question type
8. relatedConcepts: 3-4 connected topics
9. memoryTricks: 2-3 mnemonics/memory aids
10. commonMistakes: 3-4 typical errors to avoid
11. examStrategy: Board exam tactics
12. quickReference: Cheat-sheet items (3-5)`;

  const contentResult = await textModel.generateContent(contentPrompt);
  const blueprint = JSON.parse(contentResult.response.text());

  // Fix ampersand and other LaTeX-problematic characters in titles for KaTeX compatibility
  if (blueprint.visualConcept) {
    blueprint.visualConcept = blueprint.visualConcept
      .replace(/&/g, 'and')  // Replace & with "and" for LaTeX safety
      .replace(/#/g, 'No.')  // Replace # with "No."
      .replace(/%/g, 'percent');  // Replace % with "percent"
  }

  // STEP 2: Generate image with Imagen 3
  onStatusUpdate?.('Imagen 3 is generating the sketchnote...');

  // Convert LaTeX formulas to readable notation for image generation
  const displayFormulas = blueprint.keyFormulas.map(f => latexToImageNotation(f));
  const displayExample = latexToImageNotation(blueprint.solvedExample.substring(0, 250));
  const displayVariations = blueprint.commonVariations.slice(0, 3).map(v => latexToImageNotation(v));
  const displayReference = blueprint.quickReference.map(r => latexToImageNotation(r));

  const imagePrompt = `Create a clear educational visual note for Class 12 ${subject} students preparing for board exams.

TOPIC: "${blueprint.visualConcept}"

CONTENT TO DISPLAY (organize in labeled sections with icons):

📚 CORE CONCEPT:
${blueprint.coreTheory}

📐 KEY FORMULAS (CRITICAL - Write these EXACTLY as shown):
${displayFormulas.map((f, i) => `${i + 1}. ${f}`).join('\n')}

✓ SOLVED EXAMPLE:
${displayExample}

🎯 HOW TO RECOGNIZE THIS:
${blueprint.patternRecognition}

🔄 SIMILAR QUESTION TYPES:
${displayVariations.map((v, i) => `• ${v}`).join('\n')}

🧠 MEMORY TRICKS:
${blueprint.memoryTricks.map(t => `• ${t}`).join('\n')}

⚠️ COMMON MISTAKES:
${blueprint.commonMistakes.slice(0, 3).map(m => `• ${latexToImageNotation(m)}`).join('\n')}

⚡ QUICK REFERENCE:
${displayReference.map(r => `• ${r}`).join('\n')}

CRITICAL RENDERING INSTRUCTIONS FOR MATHEMATICAL ACCURACY:

1. FRACTIONS: Write as (numerator)/(denominator) or use horizontal line with numerator above, denominator below
   Example: dy/dx or  dy
                      --
                      dx

2. EXPONENTS: Write superscripts clearly ABOVE the base
   Example: y'' means y with TWO prime marks (not y"" or y11)
   Example: x² means x with small 2 raised above

3. SQUARE ROOTS: Use √ symbol with content clearly underneath the radical
   Example: √x or √(x²+1)

4. DERIVATIVES: Common notations to write correctly:
   - dy/dx (NOT dydx or dy dx)
   - y' (y with ONE prime mark above)
   - y'' (y with TWO prime marks above)
   - y''' (y with THREE prime marks above)

5. EQUALS SIGNS: Must be properly aligned horizontally (=)

6. PARENTHESES: Must match ( ) and be properly sized

7. GREEK LETTERS: Use Unicode symbols: θ α β π λ μ σ γ δ

8. OPERATORS: × ÷ ± ≤ ≥ ≠ ≈ ∞ → ∫ Σ

9. DO NOT invent notation - copy EXACTLY what is shown above

VISUAL STYLE:
- White background
- Clear handwritten style (neat, not sketchy)
- Section boxes with rounded corners
- Icons: 📚📐✓🎯🔄🧠⚠️⚡ before each section
- Blue ink for main content
- Red ink for warnings/mistakes section
- Yellow highlighting for memory tricks
- Arrows to show relationships
- Clean spacing between sections

PRIORITY: Mathematical accuracy is MORE important than artistic style. If unsure how to draw something, write it clearly and legibly.`;

  // Imagen 3 uses direct REST API call
  const response = await retryWithBackoff(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImage?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: "4:3"
          }
        })
      }
    );

    if (res.status === 429) {
      throw new Error('RATE_LIMIT');
    }

    return res;
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch (e) {
      // Ignore JSON parse errors
    }
    throw new Error(`Imagen 3 API error (${response.status}): ${errorMessage}`);
  }

  const result = await response.json();

  // Imagen 3 response format
  const generatedImage = result.generatedImages?.[0];

  if (!generatedImage) {
    throw new Error("No image was generated by Imagen 3. Response: " + JSON.stringify(result).substring(0, 200));
  }

  // The image data might be in different fields depending on the API version
  const imageBase64 = generatedImage.imageData || generatedImage.bytesBase64Encoded;

  if (!imageBase64) {
    throw new Error("No image data in response. Fields available: " + Object.keys(generatedImage).join(', '));
  }

  const imageDataUrl = `data:image/png;base64,${imageBase64}`;

  return {
    imageData: imageDataUrl,
    blueprint
  };
};

// Validation result interface
export interface ValidationResult {
  approved: boolean;
  issues: string[];
  severity: 'none' | 'minor' | 'major' | 'critical';
  recommendation: string;
}

/**
 * AI-powered content validation - Acts as a teacher/reviewer
 * Validates generated flip book pages for spelling, accuracy, and quality
 */
const validateGeneratedContent = async (
  imageData: string,
  pageTitle: string,
  topic: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<ValidationResult> => {
  try {
    onStatusUpdate?.(`🔍 Validating ${pageTitle}...`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const visionModel = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview' // Using vision-capable model
    });

    // Convert base64 to format Gemini expects
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    const validationPrompt = `You are an experienced ${subject} teacher reviewing educational content for Class 12 students.

TASK: Critically review this study guide page titled "${pageTitle}" on the topic "${topic}".

As a STRICT REVIEWER, check for:

1. SPELLING & GRAMMAR:
   - Any spelling mistakes in text?
   - Grammatical errors?
   - Typos in formulas or variables?

2. MATHEMATICAL ACCURACY (CRITICAL):
   - Are all formulas CORRECT and complete?
   - Are mathematical notations used properly?
   - Are there any calculation errors in examples?
   - Are fractions, exponents, and symbols formatted correctly?
   - Do the solution steps logically follow each other?

3. FACTUAL CORRECTNESS:
   - Is the core theory explanation accurate?
   - Are the concepts explained correctly?
   - Are there any misleading or incorrect statements?
   - Do the examples match the difficulty level claimed?

4. CLARITY & PEDAGOGY:
   - Is the content clear and understandable for Class 12 students?
   - Are the visual elements helpful or confusing?
   - Is there any misleading information?
   - Are the tips and strategies sound advice?

5. COMPLETENESS:
   - Are formulas cut off or incomplete?
   - Is any critical information missing?
   - Are all sections properly labeled?

Provide your review in JSON format:
{
  "approved": true/false,
  "issues": ["List each issue found with specific details"],
  "severity": "none" | "minor" | "major" | "critical",
  "recommendation": "Brief recommendation (approve/needs revision/regenerate)"
}

APPROVAL CRITERIA:
- "approved": true ONLY if content is accurate, clear, and has no major errors
- "severity": "critical" for wrong formulas, false information, or major math errors
- "severity": "major" for multiple spelling errors or unclear explanations
- "severity": "minor" for small formatting issues or minor typos
- "severity": "none" if perfect

Be STRICT but FAIR. This content will be used by students preparing for board exams.`;

    const result = await visionModel.generateContent([
      validationPrompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/png'
        }
      }
    ]);

    const responseText = result.response.text();
    // Extract JSON from response (handle both raw JSON and markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('⚠️ Validation response not in expected format, approving by default');
      return {
        approved: true,
        issues: [],
        severity: 'none',
        recommendation: 'Validation response unclear, proceeding with content'
      };
    }

    const sanitizedJson = jsonMatch[0].replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
    const validation: ValidationResult = JSON.parse(sanitizedJson);

    if (validation.approved) {
      onStatusUpdate?.(`✅ ${pageTitle} validated - Quality approved`);
    } else {
      onStatusUpdate?.(`⚠️ ${pageTitle} needs review - ${validation.severity} issues found`);
      console.warn(`Validation issues for ${pageTitle}:`, validation.issues);
    }

    return validation;
  } catch (error) {
    console.error('Error during validation:', error);
    // On validation error, approve by default but log the issue
    onStatusUpdate?.(`⚠️ Validation check failed, proceeding with content`);
    return {
      approved: true,
      issues: [`Validation check failed: ${error}`],
      severity: 'minor',
      recommendation: 'Could not validate, proceeding with generated content'
    };
  }
};

/**
 * Helper to generate and validate a specific page with retry logic for high quality
 * Internal helper for generateTopicBasedSketch
 */
const generateAndValidatePage = async (
  pageNumber: number,
  pageTitle: string,
  prompt: string,
  topic: string,
  subject: string,
  apiKey: string,
  imageModel: any,
  onStatusUpdate?: (status: string) => void,
  maxAttempts = 2
): Promise<{ pageNumber: number, title: string, imageData: string, validation: ValidationResult } | null> => {
  let attempts = 0;
  let lastImage = "";
  let lastValidation: ValidationResult | undefined;

  while (attempts < maxAttempts) {
    const statusPrefix = attempts > 0 ? `(Attempt ${attempts + 1}) ` : "";
    onStatusUpdate?.(`${statusPrefix}Generating Page ${pageNumber}: ${pageTitle}...`);

    // If it's a retry, we append the specific issues found to force the model to fix them
    const currentPrompt = (attempts > 0 && lastValidation)
      ? `${prompt}\n\nCRITICAL FIXES NEEDED FROM PREVIOUS ATTEMPT (DO NOT MAKE THESE MISTAKES AGAIN):\n- ${lastValidation.issues.join('\n- ')}\n\nPlease ensure ALL these issues are resolved in this new version.`
      : prompt;

    try {
      const result = await retryWithBackoff(() => imageModel.generateContent(currentPrompt)) as any;
      const imagePart = result.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

      if (!imagePart?.inlineData?.data) {
        attempts++;
        continue;
      }

      const imageData = `data:image/png;base64,${imagePart.inlineData.data}`;

      // Step 2: Validate the generated image
      const validation = await validateGeneratedContent(
        imageData,
        pageTitle,
        topic,
        subject,
        apiKey,
        onStatusUpdate
      );

      // If approved OR only minor issues remain, we accept it to save time/cost
      if (validation.approved || (validation.severity !== 'critical' && validation.severity !== 'major')) {
        return { pageNumber, title: pageTitle, imageData, validation };
      }

      // If we have MAJOR/CRITICAL issues, we store it and try again if we have attempts left
      lastImage = imageData;
      lastValidation = validation;
      attempts++;

      if (attempts < maxAttempts) {
        onStatusUpdate?.(`⚠️ Page ${pageNumber} has ${validation.severity} issues. Re-generating...`);
      }
    } catch (error) {
      console.error(`Error generating page ${pageNumber}:`, error);
      attempts++;
    }
  }

  // If we run out of retries, return the best we got (or null if it totally failed)
  if (lastImage) {
    return { pageNumber, title: pageTitle, imageData: lastImage, validation: lastValidation! };
  }
  return null;
};

// Topic-based multi-page result interface
export interface TopicBasedSketchResult {
  topic: string;
  questionCount: number;
  pages: Array<{
    pageNumber: number;
    title: string;
    imageData: string;
    validation?: ValidationResult; // Add validation info to each page
  }>;
  blueprint: {
    coreTheory: string;
    keyFormulas: string[];
    patterns: string[];
    variations: string[];
    commonMistakes: string[];
    examStrategies: string[];
    quickReference: string[];
  };
}



/**
 * Generate topic-based multi-page visual study guide
 * Groups questions by topic and creates comprehensive 3-4 page study material
 * Content is STRICTLY grounded to the exam-specific official textbook syllabus.
 */
export const generateTopicBasedSketch = async (
  topic: string,
  questions: Array<{ id: string, text: string, difficulty?: string, marks?: number }>,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void,
  examContext?: string
): Promise<TopicBasedSketchResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Resolve exam-specific syllabus scope
  const examKey = examContext || 'CBSE';
  const syllabusScope = EXAM_SYLLABUS_CONTEXT[examKey]?.[subject] ||
    `Official Class 12 ${subject} textbook for ${examKey}. Strictly follow the prescribed syllabus only.`;

  // STEP 1: Analyze all questions and create comprehensive content
  onStatusUpdate?.(`Analyzing ${questions.length} questions in ${topic} [${examKey}]...`);

  const textModel = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          coreTheory: { type: SchemaType.STRING },
          keyFormulas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          patterns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          solvedExamples: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                difficulty: { type: SchemaType.STRING },
                question: { type: SchemaType.STRING },
                solution: { type: SchemaType.STRING }
              }
            }
          },
          variations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          commonMistakes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          examStrategies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          quickReference: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        },
        required: ["coreTheory", "keyFormulas", "patterns", "solvedExamples", "variations", "commonMistakes", "examStrategies", "quickReference"]
      }
    }
  });

  const allQuestions = questions.map((q, i) => `${i + 1}. [${q.difficulty || 'Moderate'}, ${q.marks || 1}M] ${q.text}`).join('\n\n');

  const analysisPrompt = `You are a highly precise academic content specialist for the ${examKey} exam.

You are generating study content for the topic "${topic}" in Class 12 ${subject}.

=== CRITICAL SYLLABUS BOUNDARY ===
You MUST strictly follow ONLY the content covered in: ${syllabusScope}

DO NOT include:
- Any content outside the official prescribed syllabus for ${examKey}
- Concepts from other exam boards or syllabi unless explicitly shared
- Advanced or university-level material
- Topics listed as "deleted" or "not in syllabus" by the exam board

The following actual exam questions from this topic were scanned from real papers:
${allQuestions}

Using ONLY the content that falls within the official ${examKey} ${subject} syllabus for "${topic}", generate:

1. coreTheory: The exact definition/concept as it appears in the prescribed textbook (2-3 precise sentences). No paraphrasing beyond what the standard textbook says.

2. keyFormulas: ALL formulas from the textbook that apply to this topic (in LaTeX). Only include formulas explicitly listed in the official ${examKey} syllabus for ${subject}.

3. patterns: How to identify this question type in the ${examKey} exam (3-4 specific recognition patterns based on real paper trends).

4. solvedExamples: Pick 2-3 from the scanned questions above (covering different difficulty levels). Solve them with complete step-by-step working as the textbook method prescribes.

5. variations: Common question variations seen in ${examKey} papers for this topic (4-5 variations, grounded in actual exam patterns).

6. commonMistakes: Errors students make specifically on ${examKey} exam for this type of question (3-4 precise mistakes with correct approach).

7. examStrategies: Specific tactics for scoring on this topic in ${examKey} (time management, marking scheme awareness, answer format).

8. quickReference: The minimum set of facts/formulas a student MUST memorize for ${examKey} — nothing beyond prescribed scope.`;

  const analysisResult = await textModel.generateContent(analysisPrompt);
  const blueprint = JSON.parse(analysisResult.response.text());

  // Fix ampersand and special characters
  Object.keys(blueprint).forEach(key => {
    if (typeof blueprint[key] === 'string') {
      blueprint[key] = blueprint[key].replace(/&/g, 'and').replace(/#/g, 'No.').replace(/%/g, 'percent');
    }
  });

  // STEP 2: Generate multi-page visual study guide IN PARALLEL for speed
  const imageModel = genAI.getGenerativeModel({
    model: "gemini-3-pro-image-preview"
  });

  const displayFormulas = blueprint.keyFormulas.map(f => latexToImageNotation(f));

  // PAGE 1 PROMPT: Theory + Formulas + Pattern Recognition
  /* Original Blackboard Style Reference for Page 1:
  VISUAL DESIGN REQUIREMENTS:
  ✨ Use a BLACKBOARD aesthetic with vivid high-contrast CHALK COLORS: 
     - Bright white for primary text/headers
     - Neon Cyan or Bright Pink for formula highlight zones
     - Vibrant Neon Green for patterns and tips
     - Bright Yellow for key anchors
  📦 Use elegant hand-drawn chalk boxes with artistic borders and whimsical connectors.
  🎨 Add beautiful, chalk-drawn doodles and minimalist-yet-creative icons.
  📊 Include artistic-yet-precise chalk diagrams or graphs with a human, hand-drawn touch.
  🔢 Use expressive, clear, hand-lettered chalk style for important formulas.
  💡 Add captivating visual memory anchors that make the page feel like an artistic blackboard study guide.
  */
  const page1Prompt = `Create a VIBRANT, CAPTIVATING hand-drawn sketchnote masterpiece for Class 12 ${subject} [${examKey}].

⚠️ STRICT CONTENT RULE: Only include content that is EXPLICITLY part of the ${examKey} ${subject} textbook for "${topic}". Do NOT add content from other chapters, higher education, or other exam boards.

TITLE: ${topic} — Core Concepts [${examKey}]

VISUAL LAYOUT:

💡 CORE CONCEPT (Top section — sourced directly from ${examKey} textbook):
${blueprint.coreTheory}
[Draw a creative, artistic diagram or visual metaphor directly relevant to this concept — make it visually striking]

📐 TEXTBOOK FORMULAS (Only formulas explicitly in the ${examKey} ${subject} syllabus):
${displayFormulas.map((f, i) => `${i + 1}. ${f}`).join('\n')}

🔍 HOW TO SPOT THIS QUESTION TYPE (Based on real ${examKey} paper patterns):
${blueprint.patterns.map((p, i) => `✓ ${p}`).join('\n')}

🎯 EXAM TACTIC [${examKey} specific]: Focus on identifying the exact sub-type before applying formula.

⚡ TEXTBOOK ANCHOR: One key insight from the ${examKey} prescribed textbook for ${topic}.

VISUAL DESIGN REQUIREMENTS:
✨ Use an EYE-CATCHING hand-drawn aesthetic on a CREAM/WHITE paper background: 
   - Clean, confident black ink lines for primary text/headers
   - Electric Teal or Bright Violet for formula highlight zones
   - Vibrant Emerald for patterns and tips
   - Sun-Kissed Amber for key anchors
📦 Use elegant hand-drawn boxes with artistic borders and whimsical connectors.
🎨 Add beautiful, hand-drawn doodles and minimalist-yet-creative icons.
📊 Include artistic-yet-precise diagrams or graphs with a human, hand-drawn touch.
🔢 Use expressive, clear, hand-lettered style with black ink and vibrant accents for important formulas.
💡 Add captivating visual memory anchors that make the page feel like an artistic study guide.

CRITICAL MATHEMATICAL ACCURACY:
1. FRACTIONS: Use horizontal bar ─── or dy/dx format.
2. EXPONENTS: Clear superscripts (x², x³, y', y'').
3. SQUARE ROOTS: √ symbol with vinculum (line over content).
4. MATRICES/DETERMINANTS: Use proper brackets [ ] or ( ). 
5. GREEK LETTERS: θ α β π λ μ σ γ δ (large and clear).
6. OPERATORS: × ÷ ± ≤ ≥ ≠ ≈ ∞ → ∫ Σ

MAKE IT CAPTIVATING: Create an artistic sketchnote that is a visual feast, perfectly organized, and makes learning feel like an adventure!`;

  // PAGE 2 PROMPT: Solved Examples
  /* Original Blackboard Style Reference for Page 2:
  VISUAL REQUIREMENTS:
  🎨 Vibrant-yet-premium hand-drawn blackboard chalk aesthetics.
  📦 Creative, hand-sketched boxes with artistic borders on a dark background.
  ➡️ Whimsical-yet-clear chalk-drawn arrows for logical flow.
  ✨ Artistic highlighting for key steps using neon chalk tones.
  📐 Diagrams drawn with a rich, hand-illustrated chalk look.
  */
  const examEx = blueprint.solvedExamples.slice(0, 2).map((ex: any, i: number) =>
    `EXAMPLE ${i + 1} [${ex.difficulty}]:\nQ: ${latexToImageNotation(ex.question)}\nSolution: ${latexToImageNotation(ex.solution.substring(0, 250))}`
  ).join('\n\n');

  const page2Prompt = `Create a CAPTIVATING hand-drawn solved examples sketchnote for Class 12 ${subject} [${examKey}].

⚠️ STRICT CONTENT RULE: All solutions MUST strictly follow the method prescribed in the ${examKey} ${subject} textbook for "${topic}". No methods from other boards or higher education.

TITLE: ${topic} — Solved from Real ${examKey} Papers

${examEx}

VISUAL LAYOUT FOR EACH EXAMPLE:
Difficulty badge using vibrant-yet-readable tones (Emerald for Easy, Gold for Moderate, Vibrant Coral for Hard).
❓ QUESTION: In an artistic hand-drawn slate box.
💡 TEXTBOOK METHOD: One-line approach exactly as ${examKey} textbook prescribes.
📊 SOLUTION: Artistic flow-charts, perfectly aligned hand-drawn steps, creative connectors (→, ↓).
✅ FINAL ANSWER: In a vibrant Emerald green hand-drawn bubble.
⚡ ${examKey} APPROVED SHORTCUT: Only using ${examKey} syllabus knowledge.

VISUAL REQUIREMENTS:
🎨 Vibrant-yet-premium hand-drawn aesthetics on a cream/white paper background.
📦 Creative, hand-sketched boxes with artistic borders using black ink and colorful accents.
➡️ Whimsical-yet-clear hand-drawn arrows for logical flow.
✨ Artistic highlighting for key steps using vibrant pastel tones.
📐 Diagrams drawn with a rich, hand-illustrated look.

STRICT RULE: Content must be 100% within ${examKey} syllabus scope.`;

  // PAGE 3 PROMPT: Variations, Mistakes, Strategies
  /* Original Blackboard Style Reference for Page 3:
  VISUAL REQUIREMENTS:
  🔴 Vibrant-yet-professional neon pink/red chalk for mistakes.
  ✅ CORRECT vs INCORRECT side-by-side in creative, chalk-drawn panels.
  🟡 Bright Yellow chalk for variations.
  🟢 Vivid Neon Green chalk for winning strategies.
  📐 Energetic, organized, chalk-drawn layout on a blackboard — exciting and crystal clear.
  */
  const page3Prompt = `Create an EXCITING, SYLLABUS-STRICT exam tactics sketchnote for Class 12 ${subject} [${examKey}] on "${topic}".

⚠️ STRICT CONTENT RULE: All content MUST be within the ${examKey} prescribed syllabus for ${subject}. No deleted topics or out-of-scope material.

TITLE: ${topic} — ${examKey} Exam Traps and Winning Tactics

🔄 QUESTION VARIATIONS IN ${examKey} (Based on actual paper trends):
${blueprint.variations.slice(0, 4).map((v: string, i: number) => `Variation ${i + 1}: ${latexToImageNotation(v)}`).join('\n')}

❌ COMMON MISTAKES IN ${examKey} PAPERS:
${blueprint.commonMistakes.slice(0, 3).map((m: string, i: number) => `MISTAKE: ${latexToImageNotation(m)}\n✅ CORRECT (per ${examKey} marking scheme): [Provide exact correct approach]`).join('\n')}

🎯 ${examKey}-SPECIFIC WINNING STRATEGIES:
${blueprint.examStrategies.map((s: string, i: number) => `• ${s}`).join('\n')}

⏱️ ${examKey} PAPER PATTERN for ${topic}:
How many questions, marks weightage, and time to allocate in the actual exam.

VISUAL REQUIREMENTS:
🔴 Vibrant-yet-professional coral/red ink for mistakes.
✅ CORRECT vs INCORRECT side-by-side in creative, hand-drawn panels.
🟡 Bright Amber ink/highlighter for variations.
🟢 Vivid Emerald ink for winning strategies.
📐 Energetic, organized, hand-drawn layout on a cream/white background — exciting and crystal clear.`;

  // PAGE 4 PROMPT: Quick Reference Cheat Sheet  
  /* Original Blackboard Style Reference for Page 4:
  VISUAL REQUIREMENTS:
  ⭐ High information density, ARTISTIC MASTERPIECE CHALKBOARD ORGANIZATION.
  📦 Each item in its own chalk-drawn vivid box (Cyan, Yellow, or Neon Green).
  🎨 Creative chalk-drawn line icons for every section.
  💡 CAPTIVATING, rich blackboard palette — exciting to look at.
  ✨ Premium, artistic revision feel — strictly \${examKey} syllabus scope only.
  */
  const page4Prompt = `Create a VIBRANT, SYLLABUS-LOCKED hand-drawn cheat sheet for Class 12 ${subject} [${examKey}] on "${topic}".

⚠️ STRICT CONTENT RULE: Include ONLY facts and formulas from the official ${examKey} ${subject} prescribed textbook for "${topic}". Nothing beyond that scope.

TITLE: ${topic} — Official ${examKey} Sketchnote Revision Sheet

🔥 TEXTBOOK MUST-KNOWS (Only what the ${examKey} syllabus prescribes):
${blueprint.quickReference.slice(0, 4).map((ref: string, i: number) => `★ ${latexToImageNotation(ref)}`).join('\n')}

💡 MEMORY AIDS (Using only concepts within ${examKey} ${subject} scope):
Provide 2-3 creative memory aids grounded in prescribed textbook concepts only.

⚡ ${examKey} OFFICIAL SOLVING SEQUENCE:
1→ Identify question sub-type within ${topic}
2→ Apply the correct textbook formula/method
3→ Execute carefully (sign rules, units per textbook notation)
4→ Verify against ${examKey} marking scheme expectation

🎯 ${examKey} PAPER PATTERN for ${topic}:
Marks weightage and typical question frequency in ${examKey}.

VISUAL REQUIREMENTS:
⭐ High information density, ARTISTIC MASTERPIECE ORGANIZATION on a cream/white paper background.
📦 Each item in its own hand-drawn vibrant box (Slate, Vivid Indigo, or Emerald highlights).
🎨 Creative hand-drawn black ink line icons for every section.
💡 CAPTIVATING, rich blackboard palette — exciting to look at.
✨ Premium, artistic revision feel — strictly ${examKey} syllabus scope only.`;

  // DEFINE PARALLEL TASKS
  onStatusUpdate?.(`🚀 Starting parallel generation of 4 pages for ${topic}...`);

  const pageTasks = [
    generateAndValidatePage(1, "Core Theory & Formulas", page1Prompt, topic, subject, apiKey, imageModel, onStatusUpdate),
    generateAndValidatePage(2, "Solved Examples", page2Prompt, topic, subject, apiKey, imageModel, onStatusUpdate),
    generateAndValidatePage(3, "Variations & Exam Tactics", page3Prompt, topic, subject, apiKey, imageModel, onStatusUpdate),
    generateAndValidatePage(4, "Quick Reference", page4Prompt, topic, subject, apiKey, imageModel, onStatusUpdate)
  ];

  const results = await Promise.all(pageTasks);

  // Filter out any null results and sort by page number
  const pages = results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  // Check if any pages have critical issues
  const criticalIssues = pages.filter(p => p.validation?.severity === 'critical');
  if (criticalIssues.length > 0) {
    onStatusUpdate?.(`⚠️ Completed ${pages.length} pages with ${criticalIssues.length} critical issues - Review recommended`);
  } else {
    onStatusUpdate?.(`✓ Successfully generated and validated ${pages.length}-page study guide for ${topic}`);
  }

  return {
    topic,
    questionCount: questions.length,
    pages,
    blueprint: {
      coreTheory: blueprint.coreTheory,
      keyFormulas: blueprint.keyFormulas,
      patterns: blueprint.patterns,
      variations: blueprint.variations,
      commonMistakes: blueprint.commonMistakes,
      examStrategies: blueprint.examStrategies,
      quickReference: blueprint.quickReference
    }
  };
};

/**
 * Unified generation function that works with all Gemini models
 * Maps text models to their corresponding image generation models
 */
const generateUnifiedSketch = async (
  modelName: string,
  topic: string,
  questionText: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void,
  examContext?: string
): Promise<GenerationResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Resolve exam-specific syllabus scope
  const examKey = examContext || 'CBSE';
  const syllabusScope = EXAM_SYLLABUS_CONTEXT[examKey]?.[subject] ||
    `Official Class 12 ${subject} textbook for ${examKey}. Strictly follow the prescribed syllabus only.`;

  // Map text models to image models (image models support both text and image generation)
  const imageModelMap: Record<string, string> = {
    'gemini-3-flash-preview': 'gemini-3-pro-image-preview',
    'gemini-2.0-flash-lite': 'gemini-2.5-flash-image',
    'gemini-2.5-flash-latest': 'gemini-2.5-flash-image',
    'gemini-1.5-pro': 'gemini-3-pro-image-preview',
    'gemini-2.0-pro-exp': 'gemini-3-pro-image-preview',
    'gemini-3-pro': 'gemini-3-pro-image-preview'
  };

  // Use image model for both steps (image models can do text generation too)
  const actualImageModel = imageModelMap[modelName] || 'gemini-3-pro-image-preview';

  // STEP 1: Generate pedagogical content using image model (it can also do text)
  onStatusUpdate?.('Generating pedagogical content...');
  const textModel = genAI.getGenerativeModel({
    model: actualImageModel,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          visualConcept: { type: SchemaType.STRING },
          detailedNotes: { type: SchemaType.STRING },
          mentalAnchor: { type: SchemaType.STRING },
          keyPoints: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          },
          examStrategies: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          },
          quickReference: { type: SchemaType.STRING }
        },
        required: ["visualConcept", "detailedNotes", "mentalAnchor", "keyPoints", "examStrategies", "quickReference"]
      }
    }
  });

  const textPrompt = `You are an expert educator creating a visual learning note for the ${examKey} exam.

=== CRITICAL SYLLABUS BOUNDARY ===
You MUST strictly follow ONLY the content covered in: ${syllabusScope}
DO NOT include any content beyond this official prescribed scope.
EXCEPTION: Since this question appeared in a previous exam/context, you MUST fully explain the concepts required to solve this specific question, EVEN IF it normally belongs to a different class/grade. NEVER generate an "Out of Syllabus" or "Wrong Class" warning. Construct the full pedagogical learning guide.

Topic: "${topic}"
Question Context: ${questionText}
Subject: ${subject}

Generate a structured pedagogical blueprint with:

1. **Visual Concept** (2-3 sentences): Core concept that translates well to a hand-drawn sketchnote
2. **Detailed Notes** (4-6 points): Step-by-step breakdown with formulas, key equations, and explanations
3. **Mental Anchor** (1 sentence): Memorable phrase or analogy
4. **Key Points** (3-5 items): Critical facts, formulas, or concepts
5. **Exam Strategies** (2-3 items): Problem-solving tips and common pitfalls
6. **Quick Reference** (1 sentence): One-line summary for quick revision

Focus on clarity, visual hierarchy, and educational value.`;

  const textResult = await textModel.generateContent(textPrompt);
  const blueprint = JSON.parse(textResult.response.text());

  // STEP 2: Generate image using the same image model
  onStatusUpdate?.('Generating visual sketchnote...');

  /* Original Vibrant Premium Style Reference for Unified Sketch:
  **Style Requirements**:
  - CAPTIVATING hand-drawn sketchnote masterpiece with artistic flair
  - VIBRANT and PREMIUM COLOR PALETTE: 
    - Deep Navy (#0f172a) for primary structures
    - Vivid Teal (#0d9488) or Electric Indigo (#4f46e5) for highlights
    - Vibrant Emerald for success, Bright Coral for warnings
  - Creative hand-drawn boxes with whimsical-yet-organized borders
  - Artistic, clear hand-lettering for all text
  - Artistic visual metaphors and illustrated icons
  - Rhythmic hand-drawn connectors and arrows
  - Perfect visual balance that feels artistic-yet-educational
  - High-end educational Sketchnote aesthetic (Human, Hand-drawn, Captivating).
  */

  /* Original Blackboard Style Reference for Unified Sketch:
  **Style Requirements**:
  - Must look like it was drawn on a blackboard with chalk
  - Use high contrast colors (bright yellow, neon green, cyan, bright pink, white) against a dark rich chalk-board background
  - Professional hand-drawn educational sketchnote aesthetic with clean lines
  - Clear and mind-blowing eye-catching images
  - Use bullet points, arrows, boxes, and visual hierarchy
  - Include formulas and equations prominently
  - Add small icons and visual anchors
  - Use different text sizes for hierarchy
  */
  const imagePrompt = `Create an ARTISTIC, CAPTIVATING hand-drawn sketchnote for Class 12 ${subject} [${examKey}]:

⚠️ STRICT CONTENT RULE: Only include content that is EXPLICITLY part of the ${examKey} ${subject} syllabus for "${topic}".

**Topic**: ${topic}

**Visual Concept**: ${blueprint.visualConcept}

**Content Structure**:
${blueprint.detailedNotes}

**Key Points**:
${blueprint.keyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

**Mental Anchor**: ${blueprint.mentalAnchor}

**Quick Reference**: ${blueprint.quickReference}

**Style Requirements**:
- Must look like a premium hand-drawn educational sketchnote on a cream or white paper background
- Use confident, clean black ink lines for core structure, text, and outlines
- Use vibrant, eye-catching accent colors (teal, coral, emerald, violet, amber) for highlights and emphasis
- Professional, clear visual hierarchy with bold headers and readable subheaders
- Labeled diagrams with arrows showing relationships
- Visual icons and metaphors to represent concepts
- Mathematical formulas clearly displayed
- Use bullet points, boxes, and varying text sizes for organization`;

  const imageModel = genAI.getGenerativeModel({
    model: actualImageModel
  });

  const imageResult = await imageModel.generateContent(imagePrompt) as any;

  // Extract image data from response (correct format for image models)
  const imagePart = imageResult.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData) {
    throw new Error(`No image was generated by ${actualImageModel}`);
  }

  const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageData: imageDataUrl,
    blueprint: {
      visualConcept: blueprint.visualConcept,
      detailedNotes: blueprint.detailedNotes,
      mentalAnchor: blueprint.mentalAnchor,
      keyPoints: blueprint.keyPoints,
      examStrategies: blueprint.examStrategies,
      quickReference: blueprint.quickReference
    }
  };
};

/**
 * Master generation function that routes to the selected method
 */
export const generateSketch = async (
  method: GenerationMethod,
  topic: string,
  questionText: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void,
  examContext?: string
): Promise<GenerationResult> => {
  // Use the selected model for both text and image generation
  return generateUnifiedSketch(method, topic, questionText, subject, apiKey, onStatusUpdate, examContext);
};
