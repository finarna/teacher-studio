import { GoogleGenAI, Type } from "@google/genai";
import { generateTopicInstruction } from "./officialTopics";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (i < maxRetries - 1) {
        const wait = Math.pow(2, i) * 1000 + Math.random() * 500;
        console.warn(`[RETRY] Attempt ${i + 1} failed. Backoff: ${Math.round(wait)}ms...`);
        await sleep(wait);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const salvageTruncatedJSON = (jsonString: string): any => {
  try {
    let cleaned = jsonString.trim();
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const brace = cleaned.indexOf('{');
    const bracket = cleaned.indexOf('[');
    let start = -1;
    if (brace === -1) start = bracket;
    else if (bracket === -1) start = brace;
    else start = Math.min(brace, bracket);

    if (start === -1) return null;
    cleaned = cleaned.substring(start);
    try { return JSON.parse(cleaned); } catch (e) { }

    const stack: string[] = [];
    let lastValidPos = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '"' && !escaped) { inString = !inString; continue; }
      if (inString) { escaped = (char === '\\' && !escaped); continue; }
      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
      }
      if (stack.length === 0) lastValidPos = i + 1;
    }

    if (lastValidPos > 0) {
      try { return JSON.parse(cleaned.substring(0, lastValidPos)); } catch (e) { }
    }

    let candidate = cleaned;
    if (inString) candidate += '"';
    for (let i = stack.length - 1; i >= 0; i--) candidate += stack[i];
    try { return JSON.parse(candidate); } catch (e) { }

    return null;
  } catch (e) { return null; }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
};

export async function extractQuestionsSimplified(
  file: File,
  apiKey: string,
  modelName: string,
  subject: string,
  examContext: string,
  onProgress?: (current: number, total: number, found: number) => void
): Promise<any[]> {
  const ai = new GoogleGenAI({ apiKey });

  // PHASE 1: DIRECT PDF MEGA-SCAN (87s Success Pattern)
  try {
    console.log(`🚀 [MEGA-SCAN] Sending full PDF to ${modelName}...`);
    const pdfBase64 = await fileToBase64(file);

    // Determine expected question count from syllabus
    let expectedCount = 50;
    const ctx = examContext.toUpperCase();
    const subj = subject.toLowerCase();

    if (ctx.includes('KCET') || ctx.includes('PUC')) expectedCount = 60;
    else if (ctx.includes('JEE')) expectedCount = 30; // Usually 30 per subject
    else if (ctx.includes('NEET')) expectedCount = 45; // 45-50 per subject

    // DYNAMIC PROMPT BASED ON SUBJECT AND EXAM
    const megaPrompt = `
      Extract ALL MCQs from this ${subject} (${examContext}) PDF.
      Return a JSON array of objects with ONLY these fields:
      - id: (string) question number
      - page: (number) page number
      - text: (string) question text with LaTeX
      - options: (array of 4) {id: "a", text: "...", isCorrect: false}
      - hasVisualElement: (boolean) true IF question has a diagram/graph (not arrows)
      - visualBoundingBox: (optional object) {pageNumber, x, y, width, height} as % strings (e.g., "10%", "45%", etc.)
      - topic: (string) Topic name
      - subTopic: (string) Specific concept
      - difficulty: (string) Easy/Medium/Hard
      - blooms: (string) Knowledge/Understanding/Apply/Analyze

      ${generateTopicInstruction(subject)}
      
      🚨 LATEX: Use $...$ for inline and $$...$$ for block math. Follow standard LaTeX (e.g., \\frac{1}{2}).
      🚨 IMPORTANT: There are exactly ${expectedCount} questions. Be extremely thorough. 100% fidelity required.
    `;

    const startTime = Date.now();
    const result: any = await ai.models.generateContent({
      model: modelName,
      contents: [{
        role: "user",
        parts: [
          { text: megaPrompt },
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }
        ]
      }],
      config: { responseMimeType: "application/json" }
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const rawText = result.text || "";
    console.log(`📥 [MEGA-SCAN] Received response in ${elapsed}s (${rawText.length} chars)`);

    let parsed = salvageTruncatedJSON(rawText);
    let questions = [];
    if (Array.isArray(parsed)) questions = parsed;
    else if (parsed && Array.isArray(parsed.questions)) questions = parsed.questions;

    if (questions.length >= expectedCount - 2) {
      console.log(`✅ [MEGA-SCAN] SUCCESS: Found ${questions.length}/${expectedCount} questions (High Fidelity).`);
      return questions;
    }
    console.warn(`⚠️ [MEGA-SCAN] Incomplete extraction (${questions.length}/${expectedCount}). Returning found questions.`);
    return questions;
  } catch (e) {
    console.error(`❌ [MEGA-SCAN] Fatal Error:`, e);
  }

  return [];
}
