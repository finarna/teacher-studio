import { getGeminiClient, withGeminiRetry } from "./geminiClient";

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

export type GenerationMethod = 'gemini-3-flash-preview' | 'gemini-3-flash-preview-lite' | 'gemini-2.5-flash-latest' | 'gemini-1.5-pro' | 'gemini-2.0-pro-exp' | 'gemini-3-pro' | 'gemini-3-flash-preview-exp-image-01' | 'gemini-3-pro-image-preview' | 'gemini-3-pro-image' | 'gemini-2.5-flash-image';

export interface GenerationResult {
  imageData: string; // Base64 encoded PNG image
  blueprint: any;
}

export interface TopicBasedSketchResult {
  topic: string;
  pages: {
    imageUrl: string;
    caption: string;
    description: string;
  }[];
  generatedAt: string;
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
 * METHOD 1: Gemini 3 Pro Image (Highest Quality)
 */
export const generateGemini3ProImage = async (
  topic: string,
  questionText: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void,
  examContext?: string
): Promise<GenerationResult> => {
  const ai = getGeminiClient(apiKey);

  // Resolve exam-specific syllabus scope
  const examKey = examContext || 'CBSE';
  const syllabusScope = EXAM_SYLLABUS_CONTEXT[examKey]?.[subject] ||
    `Official Class 12 ${subject} textbook for ${examKey}. Strictly follow the prescribed syllabus only.`;

  // STEP 1: Generate pedagogical content
  onStatusUpdate?.('Professor is drafting the core logic...');
  
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

  const contentResponse = await withGeminiRetry(async () => {
    return await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: "user", parts: [{ text: contentPrompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });
  });

  const blueprint = JSON.parse((contentResponse as any).text || "{}");

  // Fix ampersand and other LaTeX-problematic characters in titles for KaTeX compatibility
  if (blueprint.visualConcept) {
    blueprint.visualConcept = blueprint.visualConcept
      .replace(/&/g, 'and')
      .replace(/#/g, 'No.')
      .replace(/%/g, 'percent');
  }

  // STEP 2: Generate image
  onStatusUpdate?.('AI Artist is crafting the visual blueprint...');
  
  // Convert LaTeX formulas to readable notation for image generation
  const displayFormulas = (blueprint.keyFormulas || []).map((f: string) => latexToImageNotation(f));

  const imagePrompt = `Create a CAPTIVATING, VIBRANT hand-drawn educational sketchnote:

SUBJECT: ${subject} (Class 12 ${examKey} Exam)
TOPIC: ${blueprint.visualConcept}

VISUAL CONTENT TO INCLUDE:
${blueprint.imageDescription}

FORMULAS TO DISPLAY:
${displayFormulas.join('\n')}

STYLE REQUIREMENTS:
- Professional educational sketchnote style
- Vibrant accent colors
- Mathematical formulas clearly displayed`;

  const imageResult = await withGeminiRetry(async () => {
    return await ai.models.generateContent({
      model: "gemini-3-flash-preview-exp-image-01",
      contents: [{ role: "user", parts: [{ text: imagePrompt }] }]
    });
  });

  const imagePart = imageResult.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData) {
    throw new Error("No image was generated by Gemini.");
  }

  const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageData: imageDataUrl,
    blueprint
  };
};

/**
 * METHOD 2: Gemini 2.5 Flash Image (Balanced)
 */
export const generateGemini25FlashImage = async (
  topic: string,
  questionText: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void,
  examContext?: string
): Promise<GenerationResult> => {
  const ai = getGeminiClient(apiKey);
  const examKey = examContext || 'CBSE';
  const syllabusScope = EXAM_SYLLABUS_CONTEXT[examKey]?.[subject] ||
    `Official Class 12 ${subject} textbook for ${examKey}. Strictly follow the prescribed syllabus only.`;

  onStatusUpdate?.('Professor is drafting the core logic...');
  
  const contentPrompt = `Act as an elite Class 12 ${subject} Professor for the ${examKey} exam.
TOPIC: "${topic}"
CONTEXT QUESTION: ${questionText}
Generate a complete learning blueprint grounded STRICTLY in ${examKey} syllabus.`;

  const contentResponse = await withGeminiRetry(async () => {
    return await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: "user", parts: [{ text: contentPrompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });
  });

  const blueprint = JSON.parse((contentResponse as any).text || "{}");

  onStatusUpdate?.('AI Artist is creating the sketchnote...');
  
  const imagePrompt = `Create an ARTISTIC, VIBRANT hand-drawn sketchnote for Class 12 ${subject} [${examKey}].
TOPIC: "${blueprint.visualConcept}"`;

  const imageResult = await withGeminiRetry(async () => {
    return await ai.models.generateContent({
      model: "gemini-3-flash-preview-exp-image-01",
      contents: [{ role: "user", parts: [{ text: imagePrompt }] }]
    });
  });

  const imagePart = imageResult.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData) {
    throw new Error("No image was generated.");
  }

  return {
    imageData: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    blueprint
  };
};

/**
 * METHOD 4: Imagen 3 (High Fidelity)
 */
export const generateImagen3Sketch = async (
  topic: string,
  questionText: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<GenerationResult> => {
  const ai = getGeminiClient(apiKey);

  onStatusUpdate?.('Professor is drafting the core logic...');
  
  const contentPrompt = `Act as an elite Class 12 ${subject} Professor.
TOPIC: "${topic}"
CONTEXT QUESTION: ${questionText}
Generate a learning blueprint for a sketchnote.`;

  const contentResponse = await withGeminiRetry(async () => {
    return await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: "user", parts: [{ text: contentPrompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });
  });

  const blueprint = JSON.parse((contentResponse as any).text || "{}");

  onStatusUpdate?.('Imagen 3 is generating the sketchnote...');

  // Retaining REST call for Imagen 3 as it's specifically for that model
  const response = await withGeminiRetry(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImage?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Educational sketchnote about ${topic}`,
          config: { numberOfImages: 1, aspectRatio: "4:3" }
        })
      }
    );
    if (!res.ok) throw new Error(`Imagen 3 Error: ${res.status}`);
    return res;
  });

  const resultData = await response.json();
  const generatedImage = resultData.generatedImages?.[0];
  const imageBase64 = generatedImage?.imageData || generatedImage?.bytesBase64Encoded;

  if (!imageBase64) throw new Error("No image data in Imagen 3 response.");

  return {
    imageData: `data:image/png;base64,${imageBase64}`,
    blueprint
  };
};

/**
 * MASTER ROUTER: Dispatches the sketch generation to the appropriate method
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
  console.log(`🎨 [SKETCH] Dispatching visual generation using ${method} for ${topic}...`);
  
  switch (method) {
    case 'gemini-3-pro-image':
    case 'gemini-3-pro-image-preview':
      return generateGemini3ProImage(topic, questionText, subject, apiKey, onStatusUpdate, examContext);
      
    case 'gemini-3-flash-preview-exp-image-01':
    case 'gemini-2.5-flash-image':
      return generateGemini25FlashImage(topic, questionText, subject, apiKey, onStatusUpdate, examContext);
      
    case 'gemini-3-flash-preview':
    case 'gemini-3-flash-preview-lite':
    case 'gemini-2.5-flash-latest':
      // Lite versions fallback to standard 2.5 flash logic
      return generateGemini25FlashImage(topic, questionText, subject, apiKey, onStatusUpdate, examContext);
      
    case 'gemini-1.5-pro':
    case 'gemini-2.0-pro-exp':
    case 'gemini-3-pro':
      // Pro generative models use Pro Image logic
      return generateGemini3ProImage(topic, questionText, subject, apiKey, onStatusUpdate, examContext);
      
    default:
      // Default high-fidelity Imagen 3
      return generateImagen3Sketch(topic, questionText, subject, apiKey, onStatusUpdate);
  }
};

/**
 * AI-powered content validation
 */
export const validateGeneratedContent = async (
  imageData: string,
  pageTitle: string,
  topic: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<any> => {
  const ai = getGeminiClient(apiKey);
  onStatusUpdate?.(`🔍 Validating ${pageTitle}...`);

  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

  const validationPrompt = `You are an expert ${subject} reviewer. Review this guide for "${topic}".`;

  const result = await withGeminiRetry(async () => {
    return await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        role: "user",
        parts: [
          { text: validationPrompt },
          { inlineData: { mimeType: "image/png", data: base64Data } }
        ]
      }],
      config: { responseMimeType: "application/json" }
    });
  });

  return JSON.parse((result as any).text || "{}");
};

/**
 * Generate a multi-page topic-based sketch
 */
export const generateTopicBasedSketch = async (
  topic: string,
  questions: { id: string; text: string; difficulty: string; marks: number }[],
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void,
  examContext?: string
): Promise<TopicBasedSketchResult> => {
  const ai = getGeminiClient(apiKey);
  const examKey = examContext || 'CBSE';

  onStatusUpdate?.(`Drafting multi-page curriculum for ${topic}...`);

  // First generate the curriculum structure
  const structurePrompt = `Act as an elite ${subject} Professor.
TOPIC: "${topic}"
QUESTIONS TO COVER: ${JSON.stringify(questions.slice(0, 5))}

Create a 3-page pedagogical sketchnote curriculum:
1. Introduction & Core Concept
2. Technical Depth & Formulas
3. Exam Application & Critical Pitfalls

Return JSON: { "pages": [{ "title": "...", "description": "Instructions for the image generator" }] }`;

  const structureResp = await withGeminiRetry(async () => {
    return await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: "user", parts: [{ text: structurePrompt }] }],
      config: { responseMimeType: "application/json" }
    });
  });

  const structure = JSON.parse((structureResp as any).text || '{"pages":[]}');
  const pages: any[] = [];

  for (let i = 0; i < structure.pages.length; i++) {
    const pageDesc = structure.pages[i];
    onStatusUpdate?.(`Generating Page ${i + 1}: ${pageDesc.title}...`);

    const imagePrompt = `Educational sketchnote [Page ${i+1}/${structure.pages.length}] for ${subject}.
TOPIC: ${topic} - ${pageDesc.title}
LAYOUT: ${pageDesc.description}
STYLE: Vibrant, hand-drawn, high-fidelity educational guide.`;

    const imgResult = await withGeminiRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3-flash-preview-exp-image-01",
        contents: [{ role: "user", parts: [{ text: imagePrompt }] }]
      });
    });

    const part = imgResult.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (part?.inlineData) {
      pages.push({
        imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        caption: pageDesc.title,
        description: pageDesc.description
      });
    }
  }

  return {
    topic,
    pages,
    generatedAt: new Date().toISOString()
  };
};
