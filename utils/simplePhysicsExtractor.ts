/**
 * Simplified Physics Question Extraction using Schema-Driven Approach
 *
 * Similar to simpleMathExtractor.ts but for Physics
 */

import { GoogleGenAI, Type } from '@google/genai';

// Helper function to convert File to base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export async function extractPhysicsQuestionsSimplified(
  file: File,
  apiKey: string,
  model: string = 'gemini-2.0-flash-exp'
) {
  const ai = new GoogleGenAI({ apiKey });

  // Convert file to base64
  const base64Data = await fileToBase64(file);

  const prompt = `Extract all Physics MCQs. Preserve word spaces. Use double backslash LaTeX: \\\\frac, \\\\theta. Units: $10\\\\,\\\\text{m/s}$. Brackets: $\\\\left[x\\\\right]$.

CRITICAL - TRUTH TABLES & MATRICES:
- ⚠️ NEVER USE \\\\begin{tabular} - KaTeX DOES NOT SUPPORT IT!
- ALWAYS use \\\\begin{array}{ccc}...\\\\end{array} for all tables
- Example truth table: $$\\\\begin{array}{|c|c|c|} \\\\hline A & B & Y \\\\\\\\ \\\\hline 0 & 0 & 1 \\\\\\\\ 1 & 0 & 1 \\\\\\\\ \\\\hline \\\\end{array}$$
- Example match table: $$\\\\begin{array}{|l|l|} \\\\hline \\\\text{List-I} & \\\\text{List-II} \\\\\\\\ \\\\hline \\\\text{A. Item} & \\\\text{I. Value} \\\\\\\\ \\\\hline \\\\end{array}$$
- NEVER output standalone rows like "$A & B & Y \\\\\\\\$" - always wrap in array!
- For matrices use \\\\begin{pmatrix}...\\\\end{pmatrix}
- For determinants use \\\\begin{vmatrix}...\\\\end{vmatrix}

CLASSIFY each question:
- domain: MECHANICS | ELECTRODYNAMICS | MODERN PHYSICS | OPTICS | OSCILLATIONS & WAVES
- topic: Short chapter name (e.g., "Electrostatics", "Ray Optics")
- difficulty: Easy | Medium | Hard
- blooms: Remembering | Understanding | Applying | Analyzing

VISUALS:
- hasVisualElement: true if diagram present
- visualElementType: circuit-diagram | ray-diagram | free-body-diagram | wave-diagram | field-diagram | energy-level-diagram | truth-table
- visualElementDescription: 5 words max or null
- visualBoundingBox: {"pageNumber": N, "x": "10%", "y": "20%", "width": "80%", "height": "30%"} OR null

Map options to A,B,C,D. Set isCorrect if answer shown. Generate ALL questions (no truncation).`;

  // Define the schema using the Type enum from @google/genai
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER, description: "The question number" },
        text: { type: Type.STRING, description: "The question text with LaTeX" },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Option label (A, B, C, D)" },
              text: { type: Type.STRING, description: "Option text with LaTeX" },
              isCorrect: { type: Type.BOOLEAN, description: "Whether this is the correct answer" },
            },
            required: ["id", "text", "isCorrect"],
          },
        },
        topic: { type: Type.STRING, description: "Specific chapter/topic name (e.g., 'Current Electricity', 'Ray Optics and Optical Instruments')" },
        domain: { type: Type.STRING, description: "Major domain: MECHANICS | ELECTRODYNAMICS | MODERN PHYSICS | OPTICS | OSCILLATIONS & WAVES" },
        difficulty: { type: Type.STRING, description: "Difficulty level: Easy | Medium | Hard" },
        blooms: { type: Type.STRING, description: "Bloom's taxonomy: Remembering | Understanding | Applying | Analyzing | Evaluating | Creating" },
        hasVisualElement: { type: Type.BOOLEAN, description: "Whether question has diagram/figure" },
        visualElementType: { type: Type.STRING, description: "Type of visual element (circuit-diagram, ray-diagram, etc.)", nullable: true },
        visualElementDescription: { type: Type.STRING, description: "Brief description (max 15 words, can omit to save tokens)", nullable: true },
        visualBoundingBox: {
          type: Type.OBJECT,
          description: "Bounding box coordinates for the diagram (percentage-based)",
          nullable: true,
          properties: {
            pageNumber: { type: Type.INTEGER, description: "Page number where diagram appears" },
            x: { type: Type.STRING, description: "Distance from left edge as percentage (e.g., '10%')" },
            y: { type: Type.STRING, description: "Distance from top edge as percentage (e.g., '30%')" },
            width: { type: Type.STRING, description: "Diagram width as percentage (e.g., '80%')" },
            height: { type: Type.STRING, description: "Diagram height as percentage (e.g., '25%')" }
          },
          required: ["pageNumber", "x", "y", "width", "height"]
        },
      },
      required: ["id", "text", "options", "hasVisualElement", "topic", "domain", "difficulty", "blooms"],
    },
  };

  console.log(`🔄 Extracting Physics questions with schema validation...`);

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema, // Re-enable schema to enforce array format
      temperature: 0.1,
      maxOutputTokens: 65536,
    },
  });

  if (!response.text) {
    throw new Error('No response from Gemini API');
  }

  let cleanText = response.text.trim();

  // Debug: Log response length and preview
  console.log(`📥 [SIMPLIFIED PHYSICS] Response length: ${cleanText.length} chars`);
  console.log(`📥 [SIMPLIFIED PHYSICS] First 500 chars:`, cleanText.substring(0, 500));
  console.log(`📥 [SIMPLIFIED PHYSICS] Last 500 chars:`, cleanText.substring(Math.max(0, cleanText.length - 500)));

  // Remove markdown code blocks if present
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // Check if JSON is truncated
  const openBraces = (cleanText.match(/\{/g) || []).length;
  const closeBraces = (cleanText.match(/\}/g) || []).length;
  const openBrackets = (cleanText.match(/\[/g) || []).length;
  const closeBrackets = (cleanText.match(/\]/g) || []).length;

  if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
    console.error(`❌ [SIMPLIFIED PHYSICS] JSON appears truncated!`);
    console.error(`   { : ${openBraces}, } : ${closeBraces}`);
    console.error(`   [ : ${openBrackets}, ] : ${closeBrackets}`);
    throw new Error(`JSON response truncated: { ${openBraces}/${closeBraces}, [ ${openBrackets}/${closeBrackets}`);
  }

  try {
    const questions = JSON.parse(cleanText);
    console.log(`✅ [SIMPLIFIED PHYSICS] Extracted ${questions.length} questions with schema validation`);
    return questions;
  } catch (parseError: any) {
    console.error(`❌ [SIMPLIFIED PHYSICS] JSON parse error:`, parseError.message);
    console.error(`   Error at position: ${parseError.message.match(/position (\d+)/)?.[1] || 'unknown'}`);
    console.error(`   Context around error:`, cleanText.substring(8500, 8600));
    throw new Error(`Failed to parse Physics questions: ${parseError.message}`);
  }
}
