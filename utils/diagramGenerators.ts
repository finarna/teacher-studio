/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DIAGRAM-ONLY GENERATION SYSTEM (HYBRID APPROACH)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Generates VISUAL DIAGRAMS only - no text rendering.
 * Use alongside StudyNoteRenderer for hybrid approach:
 * - Text: HTML/CSS (100% accurate)
 * - Visuals: AI diagrams (concept maps, illustrations, flowcharts)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export type DiagramType =
  | 'concept-map'        // Mind map showing connections between concepts
  | 'flowchart'          // Step-by-step process flow
  | 'illustration'       // Visual representation (geometric, physical)
  | 'comparison'         // Side-by-side comparison diagram
  | 'timeline'           // Sequential progression
  | 'hierarchy';         // Tree structure

export interface DiagramResult {
  imageData: string;     // Base64 encoded image
  diagramType: DiagramType;
  description: string;   // What the diagram shows
}

/**
 * Sleep utility for rate limiting
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i);
      console.warn(`Retry ${i + 1}/${maxRetries} after ${delay}ms:`, error.message);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
};

/**
 * Generate a concept map diagram
 * Shows relationships between concepts, no text rendering needed
 */
export const generateConceptMap = async (
  topic: string,
  relatedConcepts: string[],
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<DiagramResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  onStatusUpdate?.('Creating concept map diagram...');

  const imageModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image"
  });

  const prompt = `Create a VISUAL CONCEPT MAP diagram (no text blocks, minimal labels only).

TOPIC: "${topic}"
RELATED CONCEPTS: ${relatedConcepts.join(', ')}

DIAGRAM REQUIREMENTS:
✓ Central node: "${topic}"
✓ Branch nodes: ${relatedConcepts.slice(0, 6).map(c => `"${c}"`).join(', ')}
✓ Draw connecting lines showing relationships
✓ Use different colors for different concept types
✓ Add small icons/symbols for visual appeal
✓ Keep labels SHORT (1-3 words max)

VISUAL STYLE:
- Clean, modern design
- White or light background
- Colorful nodes (blue, green, orange, purple)
- Curved connecting lines with arrows
- Central concept larger than others
- Circular or rounded rectangular nodes

CRITICAL: This is a DIAGRAM only - minimal text, maximum visual organization.
Focus on VISUAL STRUCTURE and RELATIONSHIPS, not detailed text.`;

  const imageResult = await retryWithBackoff(() =>
    imageModel.generateContent(prompt)
  );

  const imagePart = imageResult.response.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error("No image was generated for concept map");
  }

  const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageData: imageDataUrl,
    diagramType: 'concept-map',
    description: `Concept map showing relationships between ${topic} and related concepts`
  };
};

/**
 * Generate a flowchart diagram
 * Shows step-by-step process flow
 */
export const generateFlowchart = async (
  topic: string,
  steps: string[],
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<DiagramResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  onStatusUpdate?.('Creating flowchart diagram...');

  const imageModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image"
  });

  // Simplify step labels for visual display
  const simpleSteps = steps.map((step, i) => {
    const words = step.split(' ').slice(0, 4);
    return `Step ${i + 1}: ${words.join(' ')}${words.length < step.split(' ').length ? '...' : ''}`;
  });

  const prompt = `Create a FLOWCHART DIAGRAM for process: "${topic}"

STEPS (top to bottom):
${simpleSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

DIAGRAM REQUIREMENTS:
✓ Vertical flowchart with ${steps.length} boxes
✓ Each box contains step number and SHORT label (3-5 words max)
✓ Arrows connecting boxes showing flow direction
✓ Decision diamonds if applicable
✓ Start/End ovals at top/bottom
✓ Color-coded boxes (different color per stage)

VISUAL STYLE:
- Clean, professional flowchart
- White background
- Blue boxes with rounded corners
- Black arrows with clear direction
- Each box same width, evenly spaced
- Large enough to be readable

CRITICAL: This is a FLOWCHART - focus on VISUAL FLOW, not detailed text.
Labels should be SHORT and CLEAR.`;

  const imageResult = await retryWithBackoff(() =>
    imageModel.generateContent(prompt)
  );

  const imagePart = imageResult.response.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error("No image was generated for flowchart");
  }

  const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageData: imageDataUrl,
    diagramType: 'flowchart',
    description: `Flowchart showing step-by-step process for ${topic}`
  };
};

/**
 * Generate an illustration diagram
 * For geometric figures, physical systems, etc.
 */
export const generateIllustration = async (
  topic: string,
  description: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<DiagramResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  onStatusUpdate?.('Creating illustration diagram...');

  const imageModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image"
  });

  let visualInstructions = '';

  // Subject-specific illustration guidelines
  if (subject === 'Mathematics' || subject === 'Math') {
    visualInstructions = `
MATHEMATICAL ILLUSTRATION:
- Draw geometric shapes, graphs, or figures
- Use grid or coordinate system if applicable
- Label key points, angles, or measurements VERY BRIEFLY
- Use different colors for different elements
- Show dimensions or values with arrows and short labels
- NO detailed text, only minimal labels (like "A", "B", "θ", "r")
`;
  } else if (subject === 'Physics') {
    visualInstructions = `
PHYSICS ILLUSTRATION:
- Draw the physical system or apparatus
- Use arrows for forces, velocities, fields
- Label components BRIEFLY (single words or symbols)
- Use standard symbols (F for force, v for velocity, etc.)
- Show direction with clear arrows
- NO detailed explanations, only minimal labels
`;
  } else if (subject === 'Chemistry') {
    visualInstructions = `
CHEMISTRY ILLUSTRATION:
- Draw molecular structures, apparatus, or reaction diagrams
- Use standard chemical symbols
- Show bonds, electrons, or reaction arrows
- Label molecules BRIEFLY (formulas only)
- Use colors for different atoms/molecules
- NO detailed text, only chemical notation
`;
  } else {
    visualInstructions = `
GENERAL ILLUSTRATION:
- Draw a clear visual representation
- Use minimal text labels (single words or short phrases)
- Focus on VISUAL clarity
- Use colors and shapes effectively
- Show key elements and their relationships
`;
  }

  const prompt = `Create a VISUAL ILLUSTRATION diagram for: "${topic}"

WHAT TO DRAW:
${description}

${visualInstructions}

VISUAL STYLE:
- Clean, educational diagram
- White or light background
- Clear, bold lines
- Colorful where appropriate
- Properly proportioned
- Minimal text, maximum visual clarity

CRITICAL: This is an ILLUSTRATION - focus on VISUAL REPRESENTATION.
Use SYMBOLS and SHAPES, not detailed text explanations.`;

  const imageResult = await retryWithBackoff(() =>
    imageModel.generateContent(prompt)
  );

  const imagePart = imageResult.response.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error("No image was generated for illustration");
  }

  const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageData: imageDataUrl,
    diagramType: 'illustration',
    description: `Visual illustration of ${topic}`
  };
};

/**
 * Generate a comparison diagram
 * Side-by-side comparison of concepts/methods
 */
export const generateComparisonDiagram = async (
  concept1: string,
  concept2: string,
  comparisonPoints: string[],
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<DiagramResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  onStatusUpdate?.('Creating comparison diagram...');

  const imageModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image"
  });

  const prompt = `Create a SIDE-BY-SIDE COMPARISON DIAGRAM.

LEFT SIDE: "${concept1}"
RIGHT SIDE: "${concept2}"

COMPARISON POINTS (use icons/symbols, not detailed text):
${comparisonPoints.slice(0, 5).map((p, i) => `${i + 1}. ${p.split(' ').slice(0, 5).join(' ')}`).join('\n')}

DIAGRAM REQUIREMENTS:
✓ Two columns clearly separated
✓ Header labels: "${concept1}" vs "${concept2}"
✓ Matching rows for each comparison point
✓ Use icons, symbols, or simple graphics
✓ Color-coding (blue for left, green for right)
✓ Short labels only (1-3 words per point)

VISUAL STYLE:
- Clean, symmetric layout
- White background with dividing line
- Colorful sections
- Icons/symbols for quick understanding
- Minimal text, maximum visual comparison

CRITICAL: This is a COMPARISON - focus on VISUAL CONTRAST.
Use SYMBOLS and COLORS to show differences, not paragraphs of text.`;

  const imageResult = await retryWithBackoff(() =>
    imageModel.generateContent(prompt)
  );

  const imagePart = imageResult.response.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error("No image was generated for comparison");
  }

  const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageData: imageDataUrl,
    diagramType: 'comparison',
    description: `Comparison diagram: ${concept1} vs ${concept2}`
  };
};

/**
 * Master function: Intelligently choose and generate appropriate diagram type
 */
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

    // Convert fractions: \frac{a}{b} → (a)/(b)
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')

    // Convert sqrt: \sqrt{x} → √x
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')

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

    // Greek letters to Unicode
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\pi/g, 'π')
    .replace(/\\lambda/g, 'λ')

    // Operators
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\to/g, '→')
    .replace(/\\infty/g, '∞')

    // Remove remaining backslashes
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')

    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();

  return clean;
};

/**
 * Generate NotebookLM-style visual study note with ACCURACY PRIORITY
 * Uses higher quality model (Gemini 2.0 Pro) for accurate text/formula rendering
 */
export const generateNotebookLMStyleVisual = async (
  blueprint: {
    visualConcept: string;
    coreTheory: string;
    keyFormulas: string[];
    solvedExample?: string;
    stepByStep: string[];
    relatedConcepts: string[];
    memoryTricks: string[];
    commonMistakes: string[];
    quickReference?: string[];
  },
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<DiagramResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  onStatusUpdate?.('Creating accurate visual study note with strict quality controls...');

  // Use Gemini 2.5 Flash Image - the only model that supports image generation
  // Quality is ensured through comprehensive LaTeX conversion and strict prompt instructions
  const imageModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image"
  });

  // Convert ALL LaTeX to readable notation using proper conversion
  const displayFormulas = blueprint.keyFormulas.slice(0, 4).map(f => latexToImageNotation(f));
  const displayExample = blueprint.solvedExample ? latexToImageNotation(blueprint.solvedExample.substring(0, 200)) : '';
  const displaySteps = blueprint.stepByStep.slice(0, 5).map(s => latexToImageNotation(s.substring(0, 80)));
  const displayMistakes = blueprint.commonMistakes.slice(0, 3).map(m => latexToImageNotation(m.substring(0, 80)));
  const displayReference = blueprint.quickReference ? blueprint.quickReference.slice(0, 4).map(r => latexToImageNotation(r)) : [];

  const prompt = `Create an EDUCATIONAL VISUAL STUDY NOTE in NotebookLM style for Class 12 ${subject}.

TOPIC: "${blueprint.visualConcept}"

VISUAL CONTENT TO INCLUDE (write EXACTLY as shown - NO ERRORS ALLOWED):

📚 CONCEPT ESSENCE:
"${blueprint.coreTheory.substring(0, 150)}"

📐 KEY FORMULAS (write these EXACTLY as shown with correct notation):
${displayFormulas.map((f, i) => `${i + 1}. ${f}`).join('\n')}
${displayExample ? `\nEXAMPLE: ${displayExample}` : ''}

🎯 METHOD STEPS (show as visual flow with numbers):
${displaySteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

🔗 CONNECTIONS:
${blueprint.relatedConcepts.slice(0, 4).join(', ')}

💡 REMEMBER:
${blueprint.memoryTricks.slice(0, 2).map(t => t.substring(0, 60)).join(' | ')}

⚠️ AVOID (common mistakes):
${displayMistakes.map((m, i) => `${i + 1}. ${m}`).join(' | ')}
${displayReference.length > 0 ? `\n\n⚡ QUICK REFERENCE:\n${displayReference.join(' • ')}` : ''}

CRITICAL RENDERING INSTRUCTIONS FOR MATHEMATICAL ACCURACY:
⚠️ PRIORITY: Mathematical accuracy and correct spelling are MORE IMPORTANT than artistic style.

FORMULA RENDERING RULES (FOLLOW EXACTLY):
1. FRACTIONS: Write as (numerator)/(denominator) OR use horizontal line format ─
   Example: (dy)/(dx) or dy over horizontal line with dx below
2. EXPONENTS: Write superscripts clearly ABOVE the base
   Example: x² x³ (superscript position matters!)
3. SQUARE ROOTS: Use √ symbol with content clearly underneath
   Example: √(x² + y²) - the content must be inside the radical
4. DERIVATIVES: dy/dx, y', y'', y''' - write prime marks correctly
5. GREEK LETTERS: Use Unicode symbols - θ α β π λ μ σ γ δ ε ω Φ Ψ
6. OPERATORS: × ÷ ± ≤ ≥ ≠ ≈ ∞ → ← ∫ Σ Π ∂
7. GROUPING: Use parentheses () brackets [] and braces {} correctly
8. NO LATEX SYNTAX: Do not write \\frac, \\sqrt, etc. - use readable notation above

TEXT ACCURACY RULES (ZERO TOLERANCE FOR ERRORS):
1. NO SPELLING ERRORS in any text - double check every word
2. NO GIBBERISH TEXT - all words must be real English/mathematical terms
3. NO INCOMPLETE FORMULAS - every formula must be complete and correct
4. NO ERRONEOUS REPRESENTATIONS - if unsure, write it clearly and legibly
5. COPY EXACTLY what is shown in the content above - do not invent notation
6. Mathematical terms: "separable" not "nonsepar", "differential" not "difreaus"
7. Common words: "typically" not "tipoably", "forgetting" not "forggting"

VISUAL STYLE (secondary to accuracy):
✓ NotebookLM/Sketchnote aesthetic - clean, professional, hand-drawn feel
✓ Colorful sections with icons (📚, 📐, 🎯, 💡, ⚠️)
✓ Visual hierarchy - main concept prominent, supporting details organized
✓ Color coding: blue=concepts, orange=formulas, green=steps, yellow=tips, red=warnings
✓ Minimal text - focus on VISUAL REPRESENTATION and STRUCTURE
✓ Add dividing lines, boxes, circles around key elements
✓ Use arrows to show flow and connections
✓ Include small illustrations where relevant (geometric shapes, graphs)
✓ Light background (white or subtle color gradient)
✓ Professional yet engaging - like a high-quality teaching poster

QUALITY CONTROL CHECKLIST:
✓ All mathematical notation is correct and readable
✓ All text is spelled correctly with no gibberish
✓ All formulas are complete and accurate
✓ Visual organization is clear and logical
✓ Content matches what was provided (no hallucinations)

Remember: Students trust this content for exam preparation. Accuracy is CRITICAL.`;

  const imageResult = await retryWithBackoff(() =>
    imageModel.generateContent(prompt)
  );

  const imagePart = imageResult.response.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error("No image was generated for visual study note");
  }

  const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageData: imageDataUrl,
    diagramType: 'illustration',
    description: `NotebookLM-style visual study note for ${blueprint.visualConcept}`
  };
};

/**
 * Smart diagram generation - now always uses NotebookLM style
 */
export const generateSmartDiagram = async (
  blueprint: {
    visualConcept: string;
    coreTheory?: string;
    keyFormulas?: string[];
    stepByStep: string[];
    relatedConcepts: string[];
    commonVariations?: string[];
    memoryTricks?: string[];
    commonMistakes?: string[];
  },
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<DiagramResult> => {
  // UPDATED: Always use NotebookLM-style visual study note (no flowcharts)
  return generateNotebookLMStyleVisual(
    {
      visualConcept: blueprint.visualConcept,
      coreTheory: blueprint.coreTheory || '',
      keyFormulas: blueprint.keyFormulas || [],
      stepByStep: blueprint.stepByStep || [],
      relatedConcepts: blueprint.relatedConcepts || [],
      memoryTricks: blueprint.memoryTricks || [],
      commonMistakes: blueprint.commonMistakes || []
    },
    subject,
    apiKey,
    onStatusUpdate
  );
};
