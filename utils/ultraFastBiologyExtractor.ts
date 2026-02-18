/**
 * ULTRA-FAST Biology Extraction - ChatGPT-style approach
 *
 * Philosophy: Extract ONLY the raw data, classify later
 * Speed: 15-30 seconds for 60 questions
 */

import { GoogleGenAI, Type } from '@google/genai';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export async function extractBiologyQuestionsUltraFast(
  file: File,
  apiKey: string,
  model: string = 'gemini-2.0-flash-exp',
  onProgress?: (message: string) => void
) {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await fileToBase64(file);

  // MINIMAL PROMPT - just extract, don't analyze
  const prompt = `Extract ALL Biology MCQ questions from this exam paper.

RULES:
1. Preserve word spaces between words
2. Use LaTeX for scientific names: $\\textit{Homo sapiens}$
3. For match-the-following tables, use: $$\\begin{array}{ll} A. Item & I. Value \\\\ B. Item2 & II. Value2 \\end{array}$$
4. Map options to A, B, C, D
5. If answer key is visible, mark the correct option
6. Extract ALL questions - no truncation

Return JSON array of questions.`;

  // MINIMAL SCHEMA - just the facts
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER },
        text: { type: Type.STRING },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              isCorrect: { type: Type.BOOLEAN },
            },
            required: ["id", "text", "isCorrect"],
          },
        },
      },
      required: ["id", "text", "options"],
    },
  };

  onProgress?.('🚀 Ultra-fast extraction started...');
  const startTime = Date.now();

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
      responseSchema: responseSchema,
      temperature: 0.1,
      maxOutputTokens: 65536,
    },
  });

  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  console.log(`⚡ [ULTRA-FAST] API completed in ${elapsed}s`);

  if (!response.text) {
    throw new Error('No response from Gemini API');
  }

  let cleanText = response.text.trim();

  console.log(`📊 [ULTRA-FAST] Output: ${cleanText.length} chars (${(cleanText.length / 1024).toFixed(2)} KB)`);

  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const questions = JSON.parse(cleanText);

  console.log(`✅ [ULTRA-FAST] Extracted ${questions.length} questions in ${elapsed}s`);
  onProgress?.(`✅ Extracted ${questions.length} questions in ${elapsed}s`);

  // Add default metadata (will be enriched later if needed)
  return questions.map((q: any, index: number) => ({
    ...q,
    id: index + 1,
    topic: 'Biology', // Generic - classify later
    domain: 'General Biology', // Generic - classify later
    difficulty: 'Medium', // Default - analyze later
    blooms: 'Understanding', // Default - analyze later
    hasVisualElement: false, // Detect later if needed
  }));
}
