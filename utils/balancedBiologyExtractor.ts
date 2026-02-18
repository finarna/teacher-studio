/**
 * BALANCED Biology Extraction
 *
 * Sweet spot between ultra-fast (75s, no metadata) and over-engineered (17min, too detailed)
 * Target: 2-3 minutes with proper topic mapping and LaTeX
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

export async function extractBiologyQuestionsBalanced(
  file: File,
  apiKey: string,
  model: string = 'gemini-3-flash-preview',
  examContext: string = 'NEET',
  onProgress?: (message: string) => void
) {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await fileToBase64(file);

  // BALANCED PROMPT - extract + basic classification (no problem-solving)
  const prompt = `Extract all Biology MCQs. Include LaTeX formatting for scientific content.

LATEX RULES:
- Scientific names: $\\textit{Homo sapiens}$
- Math/Chemical formulas: $CO_2$, $H_2O$
- Match-the-following tables: Use compact array format:
  $$\\begin{array}{ll}
  \\text{A. Item 1} & \\text{I. Match 1} \\\\
  \\text{B. Item 2} & \\text{II. Match 2} \\\\
  \\text{C. Item 3} & \\text{III. Match 3}
  \\end{array}$$
- NO \\hline, NO borders, NO pipes - just content in array format

CLASSIFICATION (${examContext}):
- domain: Choose ONE: Cell Biology | Plant Physiology | Human Physiology | Genetics & Evolution | Ecology & Environment | Biotechnology
- topic: Short topic name (e.g., "Photosynthesis", "DNA Replication", "Immune System")
- difficulty: Easy | Medium | Hard (guess based on complexity)

CORRECT ANSWERS:
- If answer key visible (e.g., "Ans. C"), mark that option as correct
- If NO answer key visible, leave all isCorrect = false

Extract ALL ${examContext === 'KCET' ? '60' : '45'} questions.`;

  // BALANCED SCHEMA - essential fields only
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER },
        text: { type: Type.STRING, description: "Question text with LaTeX for tables/formulas" },
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
        topic: { type: Type.STRING, description: "Short topic name" },
        domain: { type: Type.STRING, description: "Major domain" },
        difficulty: { type: Type.STRING, description: "Easy | Medium | Hard" },
      },
      required: ["id", "text", "options", "topic", "domain", "difficulty"],
    },
  };

  onProgress?.('🚀 Balanced extraction (with topics & LaTeX)...');
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
  console.log(`⚡ [BALANCED] API completed in ${elapsed}s`);

  if (!response.text) {
    throw new Error('No response from Gemini API');
  }

  let cleanText = response.text.trim();

  console.log(`📊 [BALANCED] Output: ${cleanText.length} chars (${(cleanText.length / 1024).toFixed(2)} KB)`);
  console.log(`📊 [BALANCED] Estimated tokens: ~${Math.ceil(cleanText.length / 4)}`);

  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const questions = JSON.parse(cleanText);

  console.log(`✅ [BALANCED] Extracted ${questions.length} questions in ${elapsed}s`);
  onProgress?.(`✅ Extracted ${questions.length} questions in ${elapsed}s`);

  // Add default fields for compatibility
  return questions.map((q: any, index: number) => ({
    ...q,
    id: index + 1,
    blooms: 'Understanding', // Default - can enrich later if needed
    hasVisualElement: q.text.includes('\\begin{array}') || q.text.includes('diagram'), // Simple heuristic
  }));
}
