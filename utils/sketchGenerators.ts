import { GoogleGenerativeAI } from "@google/generative-ai";

export type GenerationMethod = 'gemini-3-flash-preview' | 'gemini-2.0-flash-lite' | 'gemini-2.5-flash-latest' | 'gemini-1.5-pro' | 'gemini-2.0-pro-exp' | 'gemini-3-pro';

export interface GenerationResult {
  imageData: string; // Base64 encoded PNG image
  blueprint: {
    visualConcept: string;
    detailedNotes: string;
    mentalAnchor: string;
    proceduralLogic: string[];
    keyFormulas: string[];
    examTip: string;
    pitfalls: string[];
  };
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
        console.log(`⚠️ ${errorType}. Retrying in ${delay/1000}s... (attempt ${i + 1}/${maxRetries})`);
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
        type: "object",
        properties: {
          visualConcept: { type: "string" },
          detailedNotes: { type: "string" },
          mentalAnchor: { type: "string" },
          proceduralLogic: { type: "array", items: { type: "string" } },
          keyFormulas: { type: "array", items: { type: "string" } },
          examTip: { type: "string" },
          pitfalls: { type: "array", items: { type: "string" } },
          imageDescription: { type: "string" }
        },
        required: ["visualConcept", "detailedNotes", "mentalAnchor", "proceduralLogic", "keyFormulas", "examTip", "pitfalls", "imageDescription"]
      }
    }
  });

  const contentPrompt = `Act as a world-class Professor and Visual Learning Expert for Class 12 ${subject}.

TOPIC: "${topic}"
QUESTION CONTEXT: ${questionText}

Generate comprehensive pedagogical content with these components:

1. visualConcept: Concise, clear title for the concept
2. detailedNotes: First principles explanation - deep dive into the 'why'
3. mentalAnchor: Powerful metaphor or analogy for memory retention
4. proceduralLogic: Step-by-step problem-solving approach
5. keyFormulas: Essential formulas in LaTeX format (if applicable)
6. examTip: Specific exam strategy for CBSE Board exams
7. pitfalls: Common mistakes students make
8. imageDescription: Detailed description for a perfect hand-drawn sketchnote:
   - Overall layout and composition (landscape orientation)
   - Key visual elements (diagrams, icons, metaphors)
   - Text elements (headers, labels, annotations, formulas)
   - Visual flow (arrows, numbered steps, connectors)
   - Style notes (hand-drawn, clean lines, educational aesthetic)`;

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

  const imagePrompt = `Create a professional hand-drawn educational sketchnote illustration:

SUBJECT: ${subject} (Class 12 CBSE Board Exam)
TOPIC: ${blueprint.visualConcept}

VISUAL CONTENT TO INCLUDE:
${blueprint.imageDescription}

KEY CONCEPTS TO VISUALIZE:
${blueprint.detailedNotes.substring(0, 500)}

FORMULAS TO DISPLAY (Write EXACTLY as shown):
${displayFormulas.join('\n')}

STYLE REQUIREMENTS:
- Hand-drawn aesthetic with clean, confident black ink lines
- Professional educational sketchnote style
- Cream or white paper background
- Clear visual hierarchy with bold headers and readable subheaders
- Labeled diagrams with arrows showing relationships
- Visual icons and metaphors to represent concepts
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

MATH DIAGRAM REQUIREMENTS:
- Coordinate grids: Clean axes with tick marks and labels
- Geometric figures: Precise angles, labeled vertices (A, B, C), dimension lines
- Function graphs: Smooth curves with equation labels, marked critical points
- Vectors: Arrows with component labels and magnitude
- Matrices: Bracket notation with aligned rows and columns
- Number lines: Clearly marked intervals, shaded regions for inequalities
- 3D diagrams: Isometric view with dashed hidden lines
- Tree diagrams: Clean branching structure with probability values
- Venn diagrams: Overlapping circles with labeled regions
- Use blue for primary elements, red for solutions/critical points, gray for construction lines` :
`- Mathematical formulas clearly displayed`}
- Numbered steps or process flows
- Small illustrative sketches to support understanding
- Callout boxes for key insights
- Proper spacing and visual balance
- Scientific accuracy for all diagrams

PURPOSE: Create a complete visual learning aid for Class 12 Board exam students.`;

  const imageResult = await retryWithBackoff(() => imageModel.generateContent(imagePrompt));
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
        type: "object",
        properties: {
          visualConcept: { type: "string" },
          coreTheory: { type: "string" },
          keyFormulas: { type: "array", items: { type: "string" } },
          solvedExample: { type: "string" },
          stepByStep: { type: "array", items: { type: "string" } },
          commonVariations: { type: "array", items: { type: "string" } },
          patternRecognition: { type: "string" },
          relatedConcepts: { type: "array", items: { type: "string" } },
          memoryTricks: { type: "array", items: { type: "string" } },
          commonMistakes: { type: "array", items: { type: "string" } },
          examStrategy: { type: "string" },
          quickReference: { type: "array", items: { type: "string" } }
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

1. visualConcept: Clear, engaging title (e.g., "Differential Equations - Variable Separable Method")

2. coreTheory: Core concept explanation in 2-3 sentences using first principles. What IS this topic fundamentally?

3. keyFormulas: 3-5 essential formulas in LaTeX notation (e.g., "\\frac{dy}{dx} = f(x)g(y)")

4. solvedExample: Work through the given question completely, showing every calculation step

5. stepByStep: Universal method to solve ANY question of this type (4-6 algorithmic steps)

6. commonVariations: List 4-5 common variations of this question type students will encounter
   Examples: "When equation has trigonometric terms", "When variables appear on both sides", etc.

7. patternRecognition: How to instantly identify this question type in exams (key indicators/keywords)

8. relatedConcepts: 3-4 related topics students should connect this with

9. memoryTricks: 2-3 powerful mnemonics, acronyms, or memory aids

10. commonMistakes: 3-4 typical errors students make and how to avoid them

11. examStrategy: Specific board exam tactics (time management, common pitfalls, scoring tips)

12. quickReference: Cheat-sheet items - formulas, conditions, special cases (3-5 items)

Make it comprehensive yet concise - perfect for revision and mastery.`;

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

  const imageResult = await retryWithBackoff(() => imageModel.generateContent(imagePrompt));
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
        type: "object",
        properties: {
          visualConcept: { type: "string" },
          coreTheory: { type: "string" },
          keyFormulas: { type: "array", items: { type: "string" } },
          solvedExample: { type: "string" },
          stepByStep: { type: "array", items: { type: "string" } },
          commonVariations: { type: "array", items: { type: "string" } },
          patternRecognition: { type: "string" },
          relatedConcepts: { type: "array", items: { type: "string" } },
          memoryTricks: { type: "array", items: { type: "string" } },
          commonMistakes: { type: "array", items: { type: "string" } },
          examStrategy: { type: "string" },
          quickReference: { type: "array", items: { type: "string" } }
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

    const validation: ValidationResult = JSON.parse(jsonMatch[0]);

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
 */
export const generateTopicBasedSketch = async (
  topic: string,
  questions: Array<{id: string, text: string, difficulty?: string, marks?: number}>,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<TopicBasedSketchResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  // STEP 1: Analyze all questions and create comprehensive content
  onStatusUpdate?.(`Analyzing ${questions.length} questions in ${topic}...`);

  const textModel = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          coreTheory: { type: "string" },
          keyFormulas: { type: "array", items: { type: "string" } },
          patterns: { type: "array", items: { type: "string" } },
          solvedExamples: {
            type: "array",
            items: {
              type: "object",
              properties: {
                difficulty: { type: "string" },
                question: { type: "string" },
                solution: { type: "string" }
              }
            }
          },
          variations: { type: "array", items: { type: "string" } },
          commonMistakes: { type: "array", items: { type: "string" } },
          examStrategies: { type: "array", items: { type: "string" } },
          quickReference: { type: "array", items: { type: "string" } }
        },
        required: ["coreTheory", "keyFormulas", "patterns", "solvedExamples", "variations", "commonMistakes", "examStrategies", "quickReference"]
      }
    }
  });

  const allQuestions = questions.map((q, i) => `${i + 1}. [${q.difficulty || 'Moderate'}, ${q.marks || 1}M] ${q.text}`).join('\n\n');

  const analysisPrompt = `Analyze these ${questions.length} Class 12 ${subject} questions on topic "${topic}" and create a comprehensive study guide.

QUESTIONS:
${allQuestions}

Create a complete learning resource with:
1. coreTheory: Fundamental concept explanation (3-4 sentences covering the essence of this topic)
2. keyFormulas: ALL essential formulas students need (5-8 formulas in LaTeX)
3. patterns: How to recognize this question type (3-4 identification patterns)
4. solvedExamples: Select 3-4 representative questions covering easy→medium→hard difficulty with complete solutions
5. variations: Common question variations students will encounter (5-6 variations)
6. commonMistakes: Critical errors students make (4-5 mistakes with explanations)
7. examStrategies: Board exam tactics for this topic (3-4 specific strategies)
8. quickReference: Cheat sheet items (5-7 must-remember points)

Focus on CBSE Class 12 board exam preparation. Be comprehensive but concise.`;

  const analysisResult = await textModel.generateContent(analysisPrompt);
  const blueprint = JSON.parse(analysisResult.response.text());

  // Fix ampersand and special characters
  Object.keys(blueprint).forEach(key => {
    if (typeof blueprint[key] === 'string') {
      blueprint[key] = blueprint[key].replace(/&/g, 'and').replace(/#/g, 'No.').replace(/%/g, 'percent');
    }
  });

  // STEP 2: Generate multi-page visual study guide
  const imageModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image"
  });

  const pages: TopicBasedSketchResult['pages'] = [];

  // PAGE 1: Theory + Formulas + Pattern Recognition
  onStatusUpdate?.('Generating Page 1: Core Theory & Formulas...');
  const displayFormulas = blueprint.keyFormulas.map(f => latexToImageNotation(f));

  const page1Prompt = `Create an ENGAGING, MEMORABLE study guide page for Class 12 ${subject} that students will REMEMBER FOREVER!

TITLE: 🎯 ${topic} - MASTER CONCEPTS 🎯

VISUAL LAYOUT - Make it POP with colors and visual anchors:

┌─────────────────────────────────────────┐
│ 💡 BIG IDEA (Top banner - gradient blue background with white text):
│ ${blueprint.coreTheory}
│ [Add a simple visual icon or diagram representing the core concept]
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📐 FORMULAS YOU MUST MEMORIZE (Bright yellow/orange boxes with shadows):
${displayFormulas.map((f, i) => `│ ${i + 1}. ${f} ✨ [Add memory trick icon]`).join('\n')}
│
│ 💭 MEMORY TRICK: Create a visual mnemonic or story connecting formulas
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🔍 SPOT THE QUESTION (Green highlight boxes):
${blueprint.patterns.map((p, i) => `│ ✓ ${p}`).join('\n')}
│
│ 🎯 QUICK TIP: If you see [keyword], think [concept]
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ⚡ DID YOU KNOW? (Cyan info box with lightbulb icon):
│ [Add 1 fascinating real-world application or historical fact]
└─────────────────────────────────────────┘

VISUAL DESIGN REQUIREMENTS:
✨ Use BRIGHT, CONTRASTING COLORS: Blue headers, Yellow formula boxes, Green tip boxes, Red warning boxes
📦 Put formulas in PROMINENT COLORED BOXES with drop shadows
🎨 Add simple icons/emojis next to each section (brain 🧠, lightning ⚡, target 🎯, star ✨)
📊 Include small visual diagrams or graphs where relevant
🔢 Use large, bold fonts for important formulas
💡 Add visual memory anchors (associating concepts with images)

MATHEMATICAL ACCURACY:
1. FRACTIONS: Use horizontal bar ─── or dy/dx format
2. EXPONENTS: Clear superscripts (x², x³, y', y'')
3. SQUARE ROOTS: √ symbol with vinculum (line over content)
4. DERIVATIVES: dy/dx with proper spacing
5. GREEK LETTERS: θ α β π λ μ σ γ δ (large and clear)
6. OPERATORS: × ÷ ± ≤ ≥ ≠ ≈ ∞ → ∫ Σ
7. MATRICES: Proper brackets [ ] or ( )

MAKE IT MEMORABLE: Use colors, boxes, icons, visual anchors, and spatial organization!`;

  const page1Result = await retryWithBackoff(() => imageModel.generateContent(page1Prompt));
  const page1Image = page1Result.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (page1Image?.inlineData?.data) {
    const page1ImageData = `data:image/png;base64,${page1Image.inlineData.data}`;

    // Validate content quality before saving
    const validation = await validateGeneratedContent(
      page1ImageData,
      "Core Theory & Formulas",
      topic,
      subject,
      apiKey,
      onStatusUpdate
    );

    pages.push({
      pageNumber: 1,
      title: "Core Theory & Formulas",
      imageData: page1ImageData,
      validation
    });
  }

  // PAGE 2: Solved Examples
  onStatusUpdate?.('Generating Page 2: Solved Examples...');

  const examples = blueprint.solvedExamples.slice(0, 3).map((ex: any, i: number) =>
    `EXAMPLE ${i + 1} [${ex.difficulty}]:\nQ: ${latexToImageNotation(ex.question)}\nSolution: ${latexToImageNotation(ex.solution.substring(0, 200))}`
  ).join('\n\n');

  const page2Prompt = `Create a VISUALLY STUNNING solved examples page for Class 12 ${subject} that makes learning FUN!

TITLE: 📝 ${topic} - SOLVED EXAMPLES (WITH SHORTCUTS!) 📝

${examples}

VISUAL LAYOUT FOR EACH EXAMPLE:

┌─────────────────────────────────────────┐
│ EXAMPLE 1 [🟢 EASY]  (Green badge with difficulty level)
│
│ ❓ QUESTION (Blue box with slight shadow):
│ [Question text here - use large, readable font]
│
│ 💡 SMART APPROACH (Yellow highlight):
│ "Think: [One-line strategy before solving]"
│
│ 📊 SOLUTION (White background with step boxes):
│ Step 1 → [Work shown clearly]
│      ↓ (Use arrows between steps)
│ Step 2 → [Continue work]
│      ↓
│ Step 3 → [Final calculation]
│
│ ✅ ANSWER (Green box with checkmark):
│ [Final answer in LARGE BOLD text]
│
│ ⚡ SHORTCUT TIP (Orange star box):
│ [Quick method or memory trick for this type]
└─────────────────────────────────────────┘

EXAMPLE 2 [🟡 MODERATE] (Yellow badge)
[Same structure with more complex steps]

EXAMPLE 3 [🔴 HARD] (Red badge)
[Same structure with advanced techniques]

VISUAL REQUIREMENTS:
🎨 Use COLOR CODING: Green=Easy, Yellow=Moderate, Red=Hard
📦 Put each example in a distinct colored border
➡️ Use ARROWS (→, ↓) to show flow between steps
✨ Highlight KEY STEPS with yellow background
🔢 Make FINAL ANSWERS stand out (large, bold, colored box)
💡 Add SHORTCUT/TRICK boxes in orange with star icons
📐 Draw small diagrams/graphs where helpful
🎯 Number steps clearly (1→2→3)

MAKE SOLUTIONS VISUAL: Use boxes, arrows, color highlights, and spatial flow to make each step crystal clear!`;

  const page2Result = await retryWithBackoff(() => imageModel.generateContent(page2Prompt));
  const page2Image = page2Result.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (page2Image?.inlineData?.data) {
    const page2ImageData = `data:image/png;base64,${page2Image.inlineData.data}`;

    // Validate content quality before saving
    const validation = await validateGeneratedContent(
      page2ImageData,
      "Solved Examples",
      topic,
      subject,
      apiKey,
      onStatusUpdate
    );

    pages.push({
      pageNumber: 2,
      title: "Solved Examples",
      imageData: page2ImageData,
      validation
    });
  }

  // PAGE 3: Variations, Mistakes, Strategies
  onStatusUpdate?.('Generating Page 3: Mistakes & Strategies...');

  const page3Prompt = `Create a POWER-PACKED exam tactics page for Class 12 ${subject} that PREVENTS MISTAKES and BOOSTS SCORES!

TITLE: ⚡ ${topic} - DON'T MAKE THESE MISTAKES! ⚡

VISUAL LAYOUT:

┌─────────────────────────────────────────┐
│ 🔄 QUESTION VARIATIONS (Yellow gradient boxes):
${blueprint.variations.slice(0, 5).map((v: string, i: number) => `│ Variation ${i+1}: ${latexToImageNotation(v)}
│ [Add small icon showing how this differs from standard]`).join('\n')}
│
│ 💡 TIP: Examiners LOVE these twists! Know them all!
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ❌ COMMON MISTAKES (RED WARNING BOXES with X icons):
${blueprint.commonMistakes.slice(0, 4).map((m: string, i: number) => `│
│ MISTAKE #${i+1}: ${latexToImageNotation(m)}
│ [Show incorrect work with red X]
│ ✅ CORRECT WAY: [Show right method with green checkmark]`).join('\n')}
│
│ ⚠️ REMEMBER: These mistakes cost you 10-15 marks!
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🎯 EXAM WINNING STRATEGIES (Green boxes with star icons):
${blueprint.examStrategies.map((s: string, i: number) => `│ ${i+1}. ${s} ✨`).join('\n')}
│
│ 🏆 PRO TIP: Follow these to score 95%+
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ⏱️ TIME MANAGEMENT (Blue clock icon box):
│ • This topic takes [X] minutes typically
│ • Allocate [Y] mins for calculation, [Z] for checking
│ • Skip if stuck > 5 mins, come back later
└─────────────────────────────────────────┘

VISUAL REQUIREMENTS:
🔴 Use BRIGHT RED for mistakes with X marks and warning symbols
✅ Show CORRECT vs INCORRECT side-by-side comparisons
🟡 Yellow highlighting for variations
🟢 Green checkmarks and boxes for strategies
⚡ Add lightning bolts, stars, and warning symbols
📊 Use before/after visual comparisons
🎨 Make mistakes VISUALLY OBVIOUS so students remember NOT to do them

MAKE IT IMPACTFUL: Students should feel "I'll NEVER make that mistake!" after seeing this page!`;

  const page3Result = await retryWithBackoff(() => imageModel.generateContent(page3Prompt));
  const page3Image = page3Result.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (page3Image?.inlineData?.data) {
    const page3ImageData = `data:image/png;base64,${page3Image.inlineData.data}`;

    // Validate content quality before saving
    const validation = await validateGeneratedContent(
      page3ImageData,
      "Variations & Exam Tactics",
      topic,
      subject,
      apiKey,
      onStatusUpdate
    );

    pages.push({
      pageNumber: 3,
      title: "Variations & Exam Tactics",
      imageData: page3ImageData,
      validation
    });
  }

  // PAGE 4: Quick Reference Cheat Sheet
  onStatusUpdate?.('Generating Page 4: Quick Reference...');

  const page4Prompt = `Create an ULTIMATE CHEAT SHEET for Class 12 ${subject} - Everything students need ON ONE PAGE!

TITLE: 📋 ${topic} - ULTIMATE CHEAT SHEET (Memorize This!) 📋

LAYOUT - DENSELY PACKED BUT ORGANIZED:

┌─────────────────────────────────────────┐
│ 🔥 TOP 5 MUST-KNOW FORMULAS (Large yellow boxes):
${blueprint.quickReference.slice(0, 5).map((ref: string, i: number) => `│ ${i + 1}. ${latexToImageNotation(ref)} ★`).join('\n')}
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 💡 MEMORY TRICKS (Light blue boxes):
│ • [Mnemonic for remembering formulas]
│ • [Visual anchor for key concept]
│ • [Story/association for difficult topic]
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ⚡ QUICK SOLVING STEPS (Green numbered boxes):
│ 1→ [First thing to check/identify]
│ 2→ [Which formula to apply]
│ 3→ [Common calculation approach]
│ 4→ [How to verify answer]
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🎯 EXAM PATTERN (Orange highlight):
│ • Typical marks: [X] marks
│ • Time needed: [Y] minutes
│ • Difficulty: [Easy/Medium/Hard]
│ • Frequency: Appears [every year/often/sometimes]
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ❌ DON'T FORGET! (Red warning boxes):
│ • [Most common mistake - 1 line]
│ • [Special case to remember]
│ • [Unit/sign to check]
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🏆 PRO SHORTCUTS (Gold star boxes):
│ • [Quick calculation method]
│ • [Pattern recognition trick]
│ • [Elimination strategy]
└─────────────────────────────────────────┘

VISUAL REQUIREMENTS:
⭐ Use MAXIMUM COLOR: Yellow, Blue, Green, Orange, Red, Gold
📦 Put EVERY formula in a colored box with borders
🔢 Use LARGE, BOLD fonts for important formulas
📊 Add small quick-reference diagrams/graphs
✨ Use stars, checkmarks, and icons throughout
🎨 Make it VISUALLY DENSE but ORGANIZED with clear sections
📐 Include visual symbols and arrows to show relationships

GOAL: Student should be able to scan this page in 30 seconds before exam and remember everything!`;

  const page4Result = await retryWithBackoff(() => imageModel.generateContent(page4Prompt));
  const page4Image = page4Result.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (page4Image?.inlineData?.data) {
    const page4ImageData = `data:image/png;base64,${page4Image.inlineData.data}`;

    // Validate content quality before saving
    const validation = await validateGeneratedContent(
      page4ImageData,
      "Quick Reference",
      topic,
      subject,
      apiKey,
      onStatusUpdate
    );

    pages.push({
      pageNumber: 4,
      title: "Quick Reference",
      imageData: page4ImageData,
      validation
    });
  }

  // Check if any pages have critical issues
  const criticalIssues = pages.filter(p => p.validation?.severity === 'critical');
  if (criticalIssues.length > 0) {
    onStatusUpdate?.(`⚠️ Generated ${pages.length} pages with ${criticalIssues.length} critical issues - Review recommended`);
  } else {
    onStatusUpdate?.(`✓ Generated and validated ${pages.length}-page study guide for ${topic}`);
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
  onStatusUpdate?: (status: string) => void
): Promise<GenerationResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

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
        type: "object",
        properties: {
          visualConcept: { type: "string" },
          detailedNotes: { type: "string" },
          mentalAnchor: { type: "string" },
          keyPoints: {
            type: "array",
            items: { type: "string" }
          },
          examStrategies: {
            type: "array",
            items: { type: "string" }
          },
          quickReference: { type: "string" }
        },
        required: ["visualConcept", "detailedNotes", "mentalAnchor", "keyPoints", "examStrategies", "quickReference"]
      }
    }
  });

  const textPrompt = `You are an expert educator creating a comprehensive visual learning note for: "${topic}"

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

  const imagePrompt = `Create a professional hand-drawn educational sketchnote on white background for:

**Topic**: ${topic}
**Subject**: ${subject}

**Visual Concept**: ${blueprint.visualConcept}

**Content Structure**:
${blueprint.detailedNotes}

**Key Points**:
${blueprint.keyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

**Mental Anchor**: ${blueprint.mentalAnchor}

**Quick Reference**: ${blueprint.quickReference}

**Style Requirements**:
- Hand-drawn sketchnote aesthetic with clean lines
- Use bullet points, arrows, boxes, and visual hierarchy
- Include formulas and equations prominently
- Add small icons and visual anchors
- Use different text sizes for hierarchy
- Black ink on white background
- Educational poster style
- Clear, readable handwriting style
- Organized layout with good spacing`;

  const imageModel = genAI.getGenerativeModel({
    model: actualImageModel
  });

  const imageResult = await imageModel.generateContent(imagePrompt);

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
  onStatusUpdate?: (status: string) => void
): Promise<GenerationResult> => {
  // Use the selected model for both text and image generation
  return generateUnifiedSketch(method, topic, questionText, subject, apiKey, onStatusUpdate);
};
