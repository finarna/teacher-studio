/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIMPLIFIED MATH EXTRACTION SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Based on Google AI Studio experiments - WORKS PERFECTLY with double backslashes
 * Uses @google/genai with schema-driven extraction
 */

import { GoogleGenAI, Type } from "@google/genai";

/**
 * Converts a File object to a Base64 string.
 */
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

/**
 * Simplified extraction using Gemini 3 Flash with schema-driven approach
 */
export const extractQuestionsSimplified = async (
  file: File,
  apiKey: string,
  model: string = "gemini-3-flash-preview"
): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await fileToBase64(file);

  const prompt = `
    Analyze the provided image or document which contains a Mathematics exam paper.
    Extract all multiple-choice questions, the question text, and their specific options.

    CRITICAL INSTRUCTIONS FOR MATH RENDERING:
    1. Extract all mathematical expressions into standard LaTeX format.
    2. You MUST use double backslashes for all LaTeX commands. For example, use '\\\\frac' instead of '\\frac', '\\\\int' instead of '\\int', '\\\\vec' instead of '\\vec'.
    3. Enclose display math in '$$...$$' and inline math in '$...$'.

    CRITICAL INSTRUCTIONS FOR STRUCTURE:
    1. Map the options to 'A', 'B', 'C', 'D'.
    2. If the correct answer is marked or indicated in the document, set 'isCorrect' to true. Otherwise, set it to false for all options.
    3. Ensure the text is clean and readable.
  `;

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
      },
      required: ["id", "text", "options"],
    },
  };

  try {
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
        temperature: 0.1, // Low temperature for factual extraction
      },
    });

    if (response.text) {
      let cleanText = response.text.trim();
      // Remove markdown code blocks if present (e.g. ```json ... ```)
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsedData = JSON.parse(cleanText);
      // Ensure IDs are unique numbers just in case the AI hallucinates duplicates or weird strings
      return parsedData.map((q: any, index: number) => ({
        ...q,
        id: index + 1
      }));
    } else {
      throw new Error("No response text received from Gemini.");
    }
  } catch (error) {
    console.error("Error parsing exam file:", error);
    throw error;
  }
};
