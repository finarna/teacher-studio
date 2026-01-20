import { GoogleGenerativeAI } from "@google/generative-ai";

export type GenerationMethod = 'svg' | 'gemini-3-pro-image' | 'gemini-2.5-flash-image';

export interface GenerationResult {
  imageData: string;
  isSvg: boolean;
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
 * Sleep utility for rate limiting
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff for rate limit errors
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

      // Check if it's a rate limit error (429)
      const isRateLimit = error.message?.includes('429') ||
                         error.message?.includes('quota') ||
                         error.message?.includes('Too Many Requests');

      if (isRateLimit && i < maxRetries - 1) {
        // Extract retry delay from error message if available
        const retryMatch = error.message?.match(/retryDelay[\"']?\s*:\s*[\"']?(\d+)s/);
        const suggestedDelay = retryMatch ? parseInt(retryMatch[1]) * 1000 : null;

        // Use suggested delay or exponential backoff
        const delay = suggestedDelay || initialDelay * Math.pow(2, i);
        console.log(`Rate limit hit. Retrying in ${delay/1000}s... (attempt ${i + 1}/${maxRetries})`);
        await sleep(delay);
      } else if (!isRateLimit) {
        // If not a rate limit error, throw immediately
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * METHOD 1: SVG Generation (Original)
 * Generates programmatic SVG diagrams
 * Pros: Scalable, crisp, small file size, editable
 * Cons: Looks programmatic, not hand-drawn
 */
export const generateSVGSketch = async (
  topic: string,
  questionText: string,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<GenerationResult> => {
  const genAI = new GoogleGenerativeAI(apiKey);

  onStatusUpdate?.('Professor is drafting the SVG blueprint...');

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          svgCode: { type: "string" },
          visualConcept: { type: "string" },
          detailedNotes: { type: "string" },
          mentalAnchor: { type: "string" },
          proceduralLogic: {
            type: "array",
            items: { type: "string" }
          },
          keyFormulas: {
            type: "array",
            items: { type: "string" }
          },
          examTip: { type: "string" },
          pitfalls: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["svgCode", "visualConcept", "detailedNotes", "mentalAnchor", "proceduralLogic", "keyFormulas", "examTip", "pitfalls"]
      }
    }
  });

  const prompt = `Elite Academic Illustrator & Lead Curriculum Designer: Synthesize a MULTIMODAL PEDAGOGICAL BLUEPRINT.
CONCEPT: ${topic}
CONTEXT: ${questionText}
SUBJECT: ${subject}

TASK 1: CREATE A WORLD-CLASS SCIENTIFIC ILLUSTRATION (SVG)
Requirements:
- Master-Level Aesthetics: Use <defs> with <linearGradient> for realistic shading, <radialGradient> for spherical bodies, and <filter> for realistic drop-shadows and glows.
- Textbook Accuracy: No simple lines; use 3D-effect cylinders, glass textures, and metallic brushed gradients.
- Professional Layout: 1000x800 viewBox. ALL content MUST fit within x="50" to x="950" and y="50" to y="750" boundaries. Leave 50px margins on all sides.
- Advanced Labeling: Labels in white capsules with shadows. Circular anchors. Keep all text within the safe zone.
- Scientific Notation: Forces(Red), Velocity(Blue), Fields(Indigo) color-coded with arrowheads.
- Concept Breakdown: Zoom-In insets if needed.
- CRITICAL SVG SYNTAX: All path commands must be complete. Bezier curves (C) need 3 coordinate pairs: C x1,y1 x2,y2 x,y. Quadratic curves (Q) need 2 pairs: Q x1,y1 x,y. NO INCOMPLETE PATHS.
- CRITICAL: Ensure all text, shapes, and elements are completely within the viewBox boundaries.

TASK 2: GENERATE DIMENSIONAL PEDAGOGICAL NOTES
- First Principles: Deep-dive into 'Why'.
- Mental Anchor: Power metaphor.
- Procedural Logic: Problem-solving steps.
- Key Formulas: LaTeX essential derivations.
- The Trap: Common pitfall.

You MUST return a valid JSON object with these exact fields:
{
  "svgCode": "complete SVG code as a single string",
  "visualConcept": "concise title",
  "detailedNotes": "first principles explanation",
  "mentalAnchor": "memorable metaphor",
  "proceduralLogic": ["step 1", "step 2", "step 3"],
  "keyFormulas": ["$$formula1$$", "$$formula2$$"],
  "examTip": "exam strategy tip",
  "pitfalls": ["mistake 1", "mistake 2", "mistake 3"]
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text() || "{}";
  let blueprint = JSON.parse(responseText);

  // Handle case where AI returns an array
  if (Array.isArray(blueprint)) {
    blueprint = blueprint[0];
  }

  if (!blueprint.svgCode) {
    throw new Error(`Invalid blueprint: missing svgCode field`);
  }

  // Validate SVG syntax
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(blueprint.svgCode, 'image/svg+xml');
  const parseErrors = svgDoc.getElementsByTagName('parsererror');
  if (parseErrors.length > 0) {
    const errorText = parseErrors[0].textContent || 'Unknown SVG parse error';
    throw new Error(`Invalid SVG syntax: ${errorText.substring(0, 100)}`);
  }

  return {
    imageData: blueprint.svgCode,
    isSvg: true,
    blueprint: {
      visualConcept: blueprint.visualConcept,
      detailedNotes: blueprint.detailedNotes,
      mentalAnchor: blueprint.mentalAnchor,
      proceduralLogic: blueprint.proceduralLogic,
      keyFormulas: blueprint.keyFormulas,
      examTip: blueprint.examTip,
      pitfalls: blueprint.pitfalls
    }
  };
};

/**
 * METHOD 2: Gemini 3 Pro Image (Highest Quality)
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
    model: 'gemini-2.0-flash-exp',
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

  // STEP 2: Generate image
  onStatusUpdate?.('AI Artist is crafting the visual blueprint...');
  const imageModel = genAI.getGenerativeModel({
    model: "gemini-3-pro-image-preview"
  });

  const imagePrompt = `Create a professional hand-drawn educational sketchnote illustration:

SUBJECT: ${subject} (Class 12 CBSE Board Exam)
TOPIC: ${blueprint.visualConcept}

VISUAL CONTENT TO INCLUDE:
${blueprint.imageDescription}

KEY CONCEPTS TO VISUALIZE:
${blueprint.detailedNotes.substring(0, 500)}

FORMULAS TO DISPLAY:
${blueprint.keyFormulas.join(', ')}

STYLE REQUIREMENTS:
- Hand-drawn aesthetic with clean, confident black ink lines
- Professional educational sketchnote style
- Cream or white paper background
- Clear visual hierarchy with bold headers and readable subheaders
- Labeled diagrams with arrows showing relationships
- Visual icons and metaphors to represent concepts
- Mathematical formulas clearly displayed
- Numbered steps or process flows
- Small illustrative sketches to support understanding
- Callout boxes for key insights
- Proper spacing and visual balance
- Scientific accuracy for all diagrams

PURPOSE: Create a complete visual learning aid for Class 12 Board exam students.`;

  const imageResult = await imageModel.generateContent(imagePrompt);
  const imagePart = imageResult.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData) {
    throw new Error("No image was generated by Gemini 3 Pro Image");
  }

  const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageData: imageDataUrl,
    isSvg: false,
    blueprint
  };
};

/**
 * METHOD 3: Gemini 2.5 Flash Image (Balanced)
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
    model: 'gemini-2.0-flash-exp',
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
          pitfalls: { type: "array", items: { type: "string" } }
        },
        required: ["visualConcept", "detailedNotes", "mentalAnchor", "proceduralLogic", "keyFormulas", "examTip", "pitfalls"]
      }
    }
  });

  const contentPrompt = `Act as a world-class Professor for Class 12 ${subject}.

TOPIC: "${topic}"
CONTEXT: ${questionText}

Generate comprehensive pedagogical content with:
- visualConcept: Clear title
- detailedNotes: First principles explanation
- mentalAnchor: Memory metaphor
- proceduralLogic: Step-by-step approach
- keyFormulas: LaTeX formulas
- examTip: Board exam strategy
- pitfalls: Common mistakes`;

  const contentResult = await textModel.generateContent(contentPrompt);
  const blueprint = JSON.parse(contentResult.response.text());

  // STEP 2: Generate image
  onStatusUpdate?.('AI Artist is creating the sketchnote...');
  const imageModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image"
  });

  const imagePrompt = `Professional hand-drawn educational sketchnote:

Topic: ${blueprint.visualConcept}
Subject: ${subject}
Content: ${blueprint.detailedNotes.substring(0, 400)}
Formulas: ${blueprint.keyFormulas.join(', ')}

Style: Clean hand-drawn illustration, black ink on white paper, educational sketchnote aesthetic, clear labels, visual hierarchy, icons, diagrams, arrows, and annotations. Professional style suitable for Class 12 students.`;

  const imageResult = await imageModel.generateContent(imagePrompt);
  const imagePart = imageResult.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData) {
    throw new Error("No image was generated by Gemini 2.5 Flash");
  }

  const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageData: imageDataUrl,
    isSvg: false,
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
    model: 'gemini-2.0-flash-exp',
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
          pitfalls: { type: "array", items: { type: "string" } }
        },
        required: ["visualConcept", "detailedNotes", "mentalAnchor", "proceduralLogic", "keyFormulas", "examTip", "pitfalls"]
      }
    }
  });

  const contentPrompt = `Act as a world-class Professor for Class 12 ${subject}.

TOPIC: "${topic}"
CONTEXT: ${questionText}

Generate pedagogical content with visualConcept, detailedNotes, mentalAnchor, proceduralLogic, keyFormulas, examTip, and pitfalls.`;

  const contentResult = await textModel.generateContent(contentPrompt);
  const blueprint = JSON.parse(contentResult.response.text());

  // STEP 2: Generate image with Imagen 3
  onStatusUpdate?.('Imagen 3 is generating the sketchnote...');

  const imagePrompt = `Professional hand-drawn educational sketchnote for ${subject}:

Topic: ${blueprint.visualConcept}
Content: ${questionText}
Key concepts: ${blueprint.detailedNotes.substring(0, 300)}

Style: Clean hand-drawn illustration, black ink on white paper, educational visual notes, clear labels, visual hierarchy, icons, diagrams, arrows, and annotations. Professional sketchnote aesthetic suitable for Class 12 Board exam students. Include formulas: ${blueprint.keyFormulas.join(', ')}`;

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
    isSvg: false,
    blueprint
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
  switch (method) {
    case 'svg':
      return generateSVGSketch(topic, questionText, subject, apiKey, onStatusUpdate);
    case 'gemini-3-pro-image':
      return generateGemini3ProImage(topic, questionText, subject, apiKey, onStatusUpdate);
    case 'gemini-2.5-flash-image':
      return generateGemini25FlashImage(topic, questionText, subject, apiKey, onStatusUpdate);
    // Imagen 3 is currently not available via Gemini API - disabled until Google enables it
    // case 'imagen-3':
    //   return generateImagen3Sketch(topic, questionText, subject, apiKey, onStatusUpdate);
    default:
      throw new Error(`Unknown generation method: ${method}`);
  }
};
