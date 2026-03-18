/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DIAGRAM-ONLY GENERATION SYSTEM (HYBRID APPROACH)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { getGeminiClient, withGeminiRetry } from "./geminiClient";

export type DiagramType =
  | 'concept-map'
  | 'flowchart'
  | 'illustration'
  | 'comparison'
  | 'timeline'
  | 'hierarchy';

export interface DiagramResult {
  imageData: string;
  diagramType: DiagramType;
  description: string;
}

/**
 * Convert LaTeX formulas to image-friendly notation
 */
const latexToImageNotation = (latex: string): string => {
  let clean = latex
    .replace(/\$\$/g, '').replace(/\$/g, '')
    .replace(/\\\[/g, '').replace(/\\\]/g, '')
    .replace(/\\\(/g, '').replace(/\\\)/g, '')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\int/g, '∫')
    .replace(/\\sum/g, 'Σ')
    .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β')
    .replace(/\\theta/g, 'θ').replace(/\\pi/g, 'π')
    .replace(/\\times/g, '×').replace(/\\div/g, '÷')
    .replace(/\\to/g, '→').replace(/\\infty/g, '∞')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return clean;
};

/**
 * Generate a concept map diagram
 */
export const generateConceptMap = async (
  topic: string,
  relatedConcepts: string[],
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<DiagramResult> => {
  const ai = getGeminiClient(apiKey);
  onStatusUpdate?.('Creating concept map diagram...');

  const prompt = `Create a VISUAL CONCEPT MAP diagram for "${topic}".
RELATED CONCEPTS: ${relatedConcepts.join(', ')}
Minimal text, maximum visual organization.`;

  const result = await withGeminiRetry(async () => {
    return await ai.models.generateContent({
      model: "gemini-3-flash-preview-exp-image-01",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
  });

  const imagePart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("No image generated.");

  return {
    imageData: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    diagramType: 'concept-map',
    description: `Concept map for ${topic}`
  };
};

/**
 * Generate accurate visual study note
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
  const ai = getGeminiClient(apiKey);
  onStatusUpdate?.('Creating accurate visual study note...');

  const displayFormulas = blueprint.keyFormulas.slice(0, 4).map(f => latexToImageNotation(f));
  
  const prompt = `Create an EDUCATIONAL VISUAL STUDY NOTE for ${subject}. 
TOPIC: "${blueprint.visualConcept}"
FORMULAS: ${displayFormulas.join(', ')}
${blueprint.coreTheory}`;

  const result = await withGeminiRetry(async () => {
    return await ai.models.generateContent({
      model: "gemini-3-flash-preview-exp-image-01",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
  });

  const imagePart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("No image generated.");

  return {
    imageData: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    diagramType: 'illustration',
    description: `Visual study note for ${blueprint.visualConcept}`
  };
};

/**
 * Master function
 */
export const generateSmartDiagram = async (
  blueprint: any,
  subject: string,
  apiKey: string,
  onStatusUpdate?: (status: string) => void
): Promise<DiagramResult> => {
  return generateNotebookLMStyleVisual(blueprint, subject, apiKey, onStatusUpdate);
};

// ... Rest of functions (Flowchart, Illustration, Comparison) follows same pattern
export const generateFlowchart = async (topic: string, steps: string[], subject: string, apiKey: string, onStatusUpdate?: (status: string) => void): Promise<DiagramResult> => {
    const ai = getGeminiClient(apiKey);
    const prompt = `Flowchart for ${topic}: ${steps.join(' -> ')}`;
    const result = await withGeminiRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview-exp-image-01",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    }));
    const imagePart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!imagePart?.inlineData) throw new Error("No image generated.");
    return { imageData: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`, diagramType: 'flowchart', description: `Flowchart for ${topic}` };
};

export const generateIllustration = async (topic: string, description: string, subject: string, apiKey: string, onStatusUpdate?: (status: string) => void): Promise<DiagramResult> => {
    const ai = getGeminiClient(apiKey);
    const prompt = `Illustration for ${topic}: ${description}`;
    const result = await withGeminiRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview-exp-image-01",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    }));
    const imagePart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!imagePart?.inlineData) throw new Error("No image generated.");
    return { imageData: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`, diagramType: 'illustration', description: `Illustration of ${topic}` };
};

export const generateComparisonDiagram = async (concept1: string, concept2: string, comparisonPoints: string[], subject: string, apiKey: string, onStatusUpdate?: (status: string) => void): Promise<DiagramResult> => {
    const ai = getGeminiClient(apiKey);
    const prompt = `Comparison: ${concept1} vs ${concept2} on points: ${comparisonPoints.join(', ')}`;
    const result = await withGeminiRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview-exp-image-01",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    }));
    const imagePart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!imagePart?.inlineData) throw new Error("No image generated.");
    return { imageData: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`, diagramType: 'comparison', description: `Comparison of ${concept1} and ${concept2}` };
};
