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
 * Auto-fix common LaTeX errors in extracted text
 * This is a safety net in case Gemini fails to follow the double-backslash rules
 * EXPORTED for use in solution generation (ExamAnalysis.tsx)
 */
export const fixLatexErrors = (text: string): string => {
  if (!text) return text;

  let fixed = text;

  // Common missing backslash patterns (case-sensitive)
  const fixes: [RegExp, string][] = [
    // Missing backslash before common commands
    [/([^\\])frac\{/g, '$1\\frac{'],           // "rac{" → "\frac{"
    [/([^\\])int\s/g, '$1\\int '],             // "int " → "\int "
    [/([^\\])sum\s/g, '$1\\sum '],             // "sum " → "\sum "
    [/([^\\])prod\s/g, '$1\\prod '],           // "prod " → "\prod "
    [/([^\\])lim\s/g, '$1\\lim '],             // "lim " → "\lim "
    [/([^\\])sqrt\{/g, '$1\\sqrt{'],           // "sqrt{" → "\sqrt{"

    // Trigonometric functions
    [/([^\\])sin\s/g, '$1\\sin '],             // "sin " → "\sin "
    [/([^\\])cos\s/g, '$1\\cos '],             // "cos " → "\cos "
    [/([^\\])tan\s/g, '$1\\tan '],             // "tan " → "\tan "
    [/([^\\])tan\^/g, '$1\\tan^'],             // "tan^" → "\tan^"
    [/([^\\])cot\s/g, '$1\\cot '],             // "cot " → "\cot "
    [/([^\\])sec\s/g, '$1\\sec '],             // "sec " → "\sec "
    [/([^\\])csc\s/g, '$1\\csc '],             // "csc " → "\csc "

    // Logarithms
    [/([^\\])log\s/g, '$1\\log '],             // "log " → "\log "
    [/([^\\])ln\s/g, '$1\\ln '],               // "ln " → "\ln "

    // Left/Right delimiters
    [/([^\\])left\(/g, '$1\\left('],           // "left(" → "\left("
    [/([^\\])right\)/g, '$1\\right)'],         // "ight)" → "\right)"
    [/([^\\])left\[/g, '$1\\left['],           // "left[" → "\left["
    [/([^\\])right\]/g, '$1\\right]'],         // "ight]" → "\right]"

    // Accents
    [/([^\\])bar\{/g, '$1\\bar{'],             // "bar{" → "\bar{"
    [/([^\\])vec\{/g, '$1\\vec{'],             // "vec{" → "\vec{"
    [/([^\\])hat\{/g, '$1\\hat{'],             // "hat{" → "\hat{"
    [/([^\\])tilde\{/g, '$1\\tilde{'],         // "tilde{" → "\tilde{"

    // Greek letters
    [/([^\\])alpha\b/g, '$1\\alpha'],          // "alpha" → "\alpha"
    [/([^\\])beta\b/g, '$1\\beta'],            // "beta" → "\beta"
    [/([^\\])gamma\b/g, '$1\\gamma'],          // "gamma" → "\gamma"
    [/([^\\])theta\b/g, '$1\\theta'],          // "theta" → "\theta"
    [/([^\\])pi\b/g, '$1\\pi'],                // "pi" → "\pi"

    // Relations
    [/([^\\])leq\b/g, '$1\\leq'],              // "leq" → "\leq"
    [/([^\\])geq\b/g, '$1\\geq'],              // "geq" → "\geq"
    [/([^\\])neq\b/g, '$1\\neq'],              // "neq" → "\neq"

    // Remove trailing backslashes before closing delimiters
    [/\\+(\s*[\)\]\}$])/g, '$1'],              // "...\" → "..."
  ];

  let fixCount = 0;
  for (const [pattern, replacement] of fixes) {
    const before = fixed;
    fixed = fixed.replace(pattern, replacement);
    if (fixed !== before) {
      fixCount++;
    }
  }

  if (fixCount > 0) {
    console.log(`🔧 Auto-fixed ${fixCount} LaTeX pattern(s) in text`);
  }

  return fixed;
};

/**
 * Clean unwrapped LaTeX commands and ensure proper spacing around $ delimiters
 * This fixes rendering issues where LaTeX outside $...$ is displayed as raw text
 */
const cleanUnwrappedLatex = (text: string): string => {
  if (!text) return text;

  // First, ensure proper spacing around $ delimiters
  let cleaned = text.replace(/([^\s])(\$)/g, '$1 $2');  // Add space before $ if missing
  cleaned = cleaned.replace(/(\$)([^\s])/g, '$1 $2');    // Add space after $ if missing

  // Split by $ to find LaTeX-wrapped and non-wrapped sections
  const parts = cleaned.split('$');

  // Process odd-indexed parts (outside $...$), keep even-indexed parts (inside $...$)
  const result = parts.map((part, idx) => {
    if (idx % 2 === 1) {
      // Inside $...$ - preserve as is (for MathJax)
      return part;
    } else {
      // Outside $...$ - clean up any raw LaTeX commands
      return part
        .replace(/\\{/g, '{')
        .replace(/\\}/g, '}')
        .replace(/\\dots/g, '...')
        .replace(/\\([a-z])(?![a-zA-Z])/g, '$1');  // Remove stray backslashes
    }
  });

  return result.join('$');
};

/**
 * Recursively fix LaTeX in all string fields of an object
 * EXPORTED for use in solution generation (ExamAnalysis.tsx)
 */
export const fixLatexInObject = (obj: any): any => {
  if (typeof obj === 'string') {
    // First fix missing backslashes, then clean unwrapped LaTeX and spacing
    return cleanUnwrappedLatex(fixLatexErrors(obj));
  } else if (Array.isArray(obj)) {
    return obj.map(fixLatexInObject);
  } else if (obj && typeof obj === 'object') {
    const fixed: any = {};
    for (const key in obj) {
      fixed[key] = fixLatexInObject(obj[key]);
    }
    return fixed;
  }
  return obj;
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

    🚨🚨🚨 CRITICAL LATEX FORMATTING RULES (MUST FOLLOW EXACTLY) 🚨🚨🚨

    ═══════════════════════════════════════════════════════════════════════
    RULE #1: ALWAYS USE DOUBLE BACKSLASHES IN JSON STRINGS
    ═══════════════════════════════════════════════════════════════════════
    Because you are outputting JSON, you MUST escape backslashes by doubling them.

    ❌ CATASTROPHIC ERRORS (NEVER DO THIS):
    - "\\frac{a}{b}" → Will become "rac{a}{b}" after JSON parsing (BROKEN!)
    - "\\int dx" → Will become "int dx" (BROKEN!)
    - "\\tan^{-1}" → Will become "an^{-1}" (BROKEN!)
    - "\\right)" → Will become "ight)" (BROKEN!)
    - "\\sqrt{x}" → Will become "sqrt{x}" (BROKEN!)
    - "\\bar{A}\\" → Trailing backslash (INVALID!)

    ✅ CORRECT FORMAT (ALWAYS DO THIS):
    - "\\\\frac{a}{b}" → Becomes "\\frac{a}{b}" after JSON parsing ✓
    - "\\\\int dx" → Becomes "\\int dx" ✓
    - "\\\\tan^{-1}" → Becomes "\\tan^{-1}" ✓
    - "\\\\right)" → Becomes "\\right)" ✓
    - "\\\\sqrt{x}" → Becomes "\\sqrt{x}" ✓
    - "\\\\bar{A}" → NO trailing backslash ✓

    ═══════════════════════════════════════════════════════════════════════
    RULE #2: NEVER HAVE TRAILING BACKSLASHES
    ═══════════════════════════════════════════════════════════════════════
    ❌ WRONG: "\\\\bar{A}\\\\" or "P(A) = 1 - \\\\frac{1}{1024}\\\\"
    ✅ RIGHT: "\\\\bar{A}" or "P(A) = 1 - \\\\frac{1}{1024}"

    ═══════════════════════════════════════════════════════════════════════
    RULE #3: CHECK EVERY LATEX COMMAND HAS DOUBLE BACKSLASH
    ═══════════════════════════════════════════════════════════════════════
    Common commands that MUST have \\\\ prefix:
    - \\\\frac, \\\\int, \\\\sum, \\\\prod, \\\\lim
    - \\\\sin, \\\\cos, \\\\tan, \\\\cot, \\\\sec, \\\\csc
    - \\\\log, \\\\ln, \\\\exp
    - \\\\sqrt, \\\\cdot, \\\\times, \\\\div
    - \\\\left, \\\\right (MUST be paired!)
    - \\\\vec, \\\\bar, \\\\hat, \\\\tilde
    - \\\\alpha, \\\\beta, \\\\gamma, \\\\theta, \\\\pi
    - \\\\infty, \\\\partial, \\\\nabla
    - \\\\leq, \\\\geq, \\\\neq, \\\\approx
    - \\\\in, \\\\subset, \\\\cup, \\\\cap
    - \\\\Rightarrow, \\\\Leftrightarrow

    ═══════════════════════════════════════════════════════════════════════
    RULE #4: ENCLOSE MATH IN DELIMITERS
    ═══════════════════════════════════════════════════════════════════════
    - Inline math: $...$
    - Display math: $$...$$

    ═══════════════════════════════════════════════════════════════════════
    RULE #5: BRACKETS AND PARENTHESES
    ═══════════════════════════════════════════════════════════════════════
    - Square brackets: Use \\\\left[ and \\\\right] like $\\\\left[x\\\\right]$
    - NEVER use $[x]$ - causes KaTeX error!
    - Parentheses: Use \\\\left( and \\\\right) for large expressions

    ═══════════════════════════════════════════════════════════════════════
    RULE #6: MATRICES & TABLES
    ═══════════════════════════════════════════════════════════════════════
    - ⚠️ NEVER USE \\\\begin{tabular} - KaTeX DOES NOT SUPPORT IT!
    - Matrices: $$\\\\begin{pmatrix} a & b \\\\\\\\ c & d \\\\end{pmatrix}$$
    - Determinants: $$\\\\begin{vmatrix} a & b \\\\\\\\ c & d \\\\end{vmatrix}$$
    - Tables: $$\\\\begin{array}{|c|c|} \\\\hline x & y \\\\\\\\ \\\\hline 1 & 2 \\\\\\\\ \\\\hline \\\\end{array}$$
    - NEVER output standalone rows like "$a & b \\\\\\\\$" without array wrapper!

    ⚠️ BEFORE OUTPUTTING JSON: Double-check EVERY LaTeX command has \\\\ prefix!

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
    2. DETERMINING CORRECT ANSWER:
       - First, check if the correct answer is explicitly marked or indicated in the document (answer key visible)
       - If answer key is visible: Mark that option as isCorrect = true
       - If NO answer key visible: You MUST solve the problem and determine the correct answer yourself

    🚨 STRICT CORRECTNESS POLICY (WHEN DETERMINING ANSWER):
       - The correct answer MUST be EXACTLY correct according to CBSE/NCERT Class 12 Mathematics syllabus
       - DO NOT accept "technically close" or "approximately correct" answers
       - DO NOT mark answers that are "correct in general" but wrong per NCERT standards
       - Follow NCERT textbook formulas, notation, and conventions EXACTLY
       - Only ONE option can be marked as isCorrect = true
       - If multiple options seem close, choose the one using NCERT-standard notation
       - The correct answer must give FULL MARKS in CBSE Class 12 examination
       - When in doubt, solve the problem step-by-step using NCERT methods before marking

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

        // Auto-fix LaTeX errors in all questions
        const fixedResult = fixLatexInObject(result);

        console.log(`✅ Successfully extracted ${fixedResult.length} questions`);
        return fixedResult;
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
