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
 * Attempts to repair malformed JSON by closing unclosed brackets and strings
 */
const repairJSON = (jsonString: string): string => {
  let repaired = jsonString.trim();

  // Count opening and closing brackets
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;

  // Close unclosed strings (look for odd number of quotes before final bracket)
  const lastBracketIndex = repaired.lastIndexOf(']');
  const lastBraceIndex = repaired.lastIndexOf('}');
  const lastIndex = Math.max(lastBracketIndex, lastBraceIndex);

  if (lastIndex !== -1) {
    const beforeLast = repaired.substring(0, lastIndex);
    const quotes = (beforeLast.match(/"/g) || []).length;
    if (quotes % 2 !== 0) {
      // Odd number of quotes - add closing quote before last bracket/brace
      repaired = beforeLast + '"' + repaired.substring(lastIndex);
    }
  }

  // Close unclosed brackets
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    repaired += ']';
  }

  // Close unclosed braces
  for (let i = 0; i < openBraces - closeBraces; i++) {
    repaired += '}';
  }

  return repaired;
};

/**
 * Safely parse JSON with automatic repair attempts
 */
const safeJSONParse = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch (firstError) {
    console.warn('Initial JSON parse failed, attempting repair...', firstError);

    try {
      const repaired = repairJSON(text);
      console.log('Attempting to parse repaired JSON...');
      return JSON.parse(repaired);
    } catch (secondError) {
      console.error('JSON repair failed:', secondError);
      throw new Error(`Failed to parse Gemini response. Original error: ${firstError}. Repair error: ${secondError}`);
    }
  }
};

/**
 * Simplified extraction using Gemini 3 Flash with schema-driven approach
 * Includes automatic retry with JSON repair on failures
 */
export const extractQuestionsSimplified = async (
  file: File,
  apiKey: string,
  model: string = "gemini-3-flash-preview",
  maxRetries: number = 2
): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await fileToBase64(file);

  const prompt = `
    Analyze the provided image or document which contains a Mathematics exam paper.
    Extract all multiple-choice questions, the question text, and their specific options.

    ⚠️ CRITICAL TEXT EXTRACTION: PRESERVE ALL SPACES BETWEEN WORDS!
    - WRONG: "Ifthematricesareequal"
    - RIGHT: "If the matrices are equal"
    - If OCR fails to detect spaces, use context to insert proper word breaks.
    - NEVER output text without spaces between words!

    CRITICAL INSTRUCTIONS FOR MATH RENDERING:
    1. Extract all mathematical expressions into standard LaTeX format.
    2. You MUST use double backslashes for all LaTeX commands. For example, use '\\\\frac' instead of '\\frac', '\\\\int' instead of '\\int', '\\\\vec' instead of '\\vec'.
    3. Enclose display math in '$$...$$' and inline math in '$...$'.
    4. Square brackets: Use \\\\left[ and \\\\right] for brackets, like $\\\\left[x\\\\right]$ (NEVER $[x]$ - causes KaTeX error!).
    5. MATRICES & TABLES: Always wrap in proper environments:
       - ⚠️ NEVER USE \\\\begin{tabular} - KaTeX DOES NOT SUPPORT IT!
       - Matrices: $$\\\\begin{pmatrix} a & b \\\\\\\\ c & d \\\\end{pmatrix}$$
       - Determinants: $$\\\\begin{vmatrix} a & b \\\\\\\\ c & d \\\\end{vmatrix}$$
       - Tables: $$\\\\begin{array}{|c|c|} \\\\hline x & y \\\\\\\\ \\\\hline 1 & 2 \\\\\\\\ \\\\hline \\\\end{array}$$
       - NEVER output standalone rows like "$a & b \\\\\\\\$" without array wrapper!

    TOPIC CLASSIFICATION (Class 12 Mathematics):
    DOMAINS & CHAPTERS:
    - ALGEBRA: Relations and Functions, Inverse Trigonometric Functions, Matrices, Determinants, Continuity and Differentiability, Application of Derivatives, Maxima and Minima, Rate of Change, Monotonicity
    - CALCULUS: Integrals, Indefinite Integration, Definite Integration, Applications of Integrals, Area under Curves, Differential Equations, Variable Separable, Linear Differential Equations, Homogeneous Equations
    - VECTORS & 3D GEOMETRY: Vectors, Scalar and Vector Products, Dot Product, Cross Product, Scalar Triple Product, Three Dimensional Geometry, Direction Cosines, Direction Ratios, Equation of Line, Equation of Plane, Angle Between Lines, Angle Between Planes, Distance Formulae
    - LINEAR PROGRAMMING: Linear Programming Problems, Optimization, Feasible Region, Objective Function, Constraints, Graphical Method, Corner Point Method
    - PROBABILITY: Probability, Conditional Probability, Bayes Theorem, Multiplication Theorem, Independent Events, Random Variables, Probability Distributions, Binomial Distribution, Mean and Variance

    CLASSIFY each question:
    - domain: ALGEBRA | CALCULUS | VECTORS & 3D GEOMETRY | LINEAR PROGRAMMING | PROBABILITY
    - topic: Short chapter name (e.g., "Matrices", "Differential Equations")
    - difficulty: Easy | Medium | Hard
    - blooms: Remembering | Understanding | Applying | Analyzing

    CRITICAL INSTRUCTIONS FOR STRUCTURE:
    1. Map the options to 'A', 'B', 'C', 'D'.
    2. If the correct answer is marked or indicated in the document, set 'isCorrect' to true. Otherwise, set it to false for all options.
    3. Ensure the text is clean and readable.
    4. IMPORTANT: Generate complete, valid JSON. Do not truncate the response.
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
        topic: { type: Type.STRING, description: "Specific chapter/topic name (e.g., 'Matrices', 'Differential Equations', 'Vectors')" },
        domain: { type: Type.STRING, description: "Major domain: ALGEBRA | CALCULUS | VECTORS & 3D GEOMETRY | LINEAR PROGRAMMING | PROBABILITY" },
        difficulty: { type: Type.STRING, description: "Difficulty level: Easy | Medium | Hard" },
        blooms: { type: Type.STRING, description: "Bloom's taxonomy: Remembering | Understanding | Applying | Analyzing | Evaluating | Creating" },
      },
      required: ["id", "text", "options", "topic", "domain", "difficulty", "blooms"],
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Extraction attempt ${attempt + 1}/${maxRetries + 1}...`);

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
          maxOutputTokens: 65536, // Maximum tokens to prevent truncation
        },
      });

      if (response.text) {
        let cleanText = response.text.trim();
        // Remove markdown code blocks if present (e.g. ```json ... ```)
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        // Pre-flight check: Ensure response looks complete (basic heuristic)
        const openBrackets = (cleanText.match(/\[/g) || []).length;
        const closeBrackets = (cleanText.match(/\]/g) || []).length;
        const openBraces = (cleanText.match(/\{/g) || []).length;
        const closeBraces = (cleanText.match(/\}/g) || []).length;

        if (openBrackets > closeBrackets + 5 || openBraces > closeBraces + 5) {
          console.warn(`⚠️ Response appears truncated (brackets: ${openBrackets}/${closeBrackets}, braces: ${openBraces}/${closeBraces}). Will attempt repair...`);
        }

        // Use safe JSON parser with automatic repair
        const parsedData = safeJSONParse(cleanText);

        // Validate that we got an array
        if (!Array.isArray(parsedData)) {
          throw new Error('Parsed data is not an array');
        }

        // Ensure IDs are unique numbers just in case the AI hallucinates duplicates or weird strings
        const result = parsedData.map((q: any, index: number) => ({
          ...q,
          id: index + 1
        }));

        console.log(`✅ Successfully extracted ${result.length} questions`);
        return result;
      } else {
        throw new Error("No response text received from Gemini.");
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff with jitter to prevent thundering herd
        // Formula: baseDelay * (2 ^ attempt) + random jitter
        const baseDelay = 1000; // 1 second base
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000; // 0-1000ms random jitter
        const totalDelay = Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds

        console.log(`⏳ Retrying in ${(totalDelay / 1000).toFixed(1)} seconds... (attempt ${attempt + 2}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }
  }

  // All retries exhausted
  console.error("Error parsing exam file after all retries:", lastError);
  throw new Error(`Failed to extract questions after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
};
