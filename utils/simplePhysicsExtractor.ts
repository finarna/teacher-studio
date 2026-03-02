/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIMPLIFIED PHYSICS EXTRACTION SYSTEM (Worker-Queue Architecture)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { GoogleGenAI, Type } from "@google/genai";
import { generateTopicInstruction } from "./officialTopics";
// REMOVED: latexFixer causes double backslash issues
// import { fixLatexErrors, fixLatexInObject } from './latexFixer';


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry wrapper with exponential backoff
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorText = error?.message || error?.stack || "";
      const isRateLimit = error?.status === 429 || errorText.includes('429') || errorText.includes('QUOTA_EXCEEDED');

      if (isRateLimit && i < maxRetries - 1) {
        const wait = Math.pow(2, i) * 3000 + Math.random() * 1000;
        console.warn(`[PHYSICS_RETRY] Rate limit (429) at attempt ${i + 1}. Backoff: ${Math.round(wait)}ms...`);
        await sleep(wait);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

/**
 * Robust JSON salvage
 */
const salvageTruncatedJSON = (jsonString: string): any => {
  try {
    let cleaned = jsonString.trim();
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const start = cleaned.indexOf('{');
    if (start === -1) return null;
    let end = cleaned.lastIndexOf('}');
    while (end > start) {
      const candidate = cleaned.substring(start, end + 1);
      try { return JSON.parse(candidate); } catch (e) { end = cleaned.lastIndexOf('}', end - 1); }
    }
    return null;
  } catch (e) { return null; }
};

/**
 * PDF Loader (Scale 1.5 for speed)
 */
const loadImage = async (file: File): Promise<HTMLImageElement[]> => {
  if (file.type === 'application/pdf') {
    const data = await file.arrayBuffer();
    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const images: HTMLImageElement[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
      const img = new Image();
      img.src = canvas.toDataURL('image/jpeg', 0.8);
      await new Promise(r => img.onload = r);
      images.push(img);
    }
    return images;
  }
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise(r => img.onload = r);
  return [img];
};

/**
 * Parallel Processing
 */
export const processInParallel = async <T, R>(
  items: T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 3
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try { results[idx] = await task(items[idx], idx); } catch (e) { results[idx] = [] as any; }
    }
  });
  await Promise.all(workers);
  return results;
};

/**
 * MAIN EXTRACTION (Physics)
 */
export async function extractPhysicsQuestionsSimplified(
  file: File,
  apiKey: string,
  model: string,
  subject: string = 'Physics',
  examContext: string = 'KCET',
  onProgress?: (current: number, total: number, found: number) => void
): Promise<any[]> {


  const ai = new GoogleGenAI({ apiKey });
  const pages = await loadImage(file);
  console.log(`🚀 [${subject.toUpperCase()}] Processing ${pages.length} pages in parallel for ${examContext}...`);

  const resultsArray = await processInParallel(pages, async (pageImg, i) => {
    const base64 = pageImg.src.split(',')[1];
    const pageNum = i + 1;
    const totalPages = pages.length;
    const prompt = `
# ROLE: Expert ${subject} Examination Parser
# EXAM: ${examContext}
# PAGE: ${pageNum} of ${totalPages}

Extract EVERY SINGLE MCQ visible on this page.
⚠️ Count: This page may have 8–12 questions. Do NOT stop early.
⚠️ If a question starts here and continues on the next page, extract what is visible.

🚨🚨🚨 GOLDEN RULES:
1. SYLLABUS: Class 12 NCERT Physics only.
2. MARKING: 1 Mark per MCQ.
3. VERBATIM: Copy text EXACTLY. Preserve ALL word spaces.
4. COMPLETENESS: Include FULL question text and ALL 4 options.

🚨 LATEX FORMATTING:
- Wrap ALL math and units in $...$ (inline) or $$...$$ (display).
- Use SINGLE backslash: \\times \\frac \\sqrt \\alpha \\beta \\theta \\lambda \\mu \\Omega \\Delta \\vec \\hat \\leq \\geq \\pm
- UNITS: Use \\text{} — e.g., $10\\,\\text{m/s}^2$, $5\\,\\text{kg}$
- SCIENTIFIC NOTATION: $3 \\times 10^8$ NOT "3 x 10^8"
- CIRCUIT TABLES: \\begin{array}{|c|c|}...\\end{array}

DOMAIN options: MECHANICS | ELECTRODYNAMICS | MODERN PHYSICS | OPTICS | OSCILLATIONS & WAVES

${generateTopicInstruction(subject)}

OUTPUT: Valid JSON. Include ALL questions. Do NOT truncate.
    `.trim();


    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING },
                    isCorrect: { type: Type.BOOLEAN }
                  },
                  required: ["id", "text", "isCorrect"]
                }
              },
              topic: { type: Type.STRING },
              domain: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              blooms: { type: Type.STRING },
              hasVisualElement: { type: Type.BOOLEAN },
              visualElementType: { type: Type.STRING, nullable: true }
            },
            required: ["id", "text", "options", "topic", "domain", "difficulty", "blooms", "hasVisualElement"]
          }
        }
      }
    };

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model,
        contents: [{
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64 } },
            { text: prompt }
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.05,
          maxOutputTokens: 8192   // Enough for 12 complex Physics questions
        }

      }));

      const parsed = salvageTruncatedJSON(response.text || "{}");
      const questions = parsed?.questions || [];

      const mapped = questions.map((q: any) => ({
        ...q,
        metadata: {
          topic: q.topic,
          domain: q.domain,
          difficulty: q.difficulty?.toLowerCase(),
          bloomLevel: q.blooms,
          isPastYear: true,
          year: "2025",
          sourcePage: i + 1
        }
      }));

      if (mapped.length === 0 && i < pages.length) {
        console.warn(`[PHYSICS_PAGE_${i + 1}] Got 0 questions. Will be handled by per-page retry logic.`);
      }

      if (onProgress) onProgress(i + 1, pages.length, mapped.length);
      return mapped;
    } catch (e) {
      console.error(`[PHYSICS_PAGE_FAIL] Page ${i + 1}:`, e);
      return [];
    }
  }, 2); // Concurrency 2 to reduce rate-limit pressure


  const allQuestions = resultsArray.flat();
  console.log(`✅ [PHYSICS] Raw extracted: ${allQuestions.length} questions across ${pages.length} pages`);

  // Deduplicate by question ID — keep most-complete version (most options wins)
  const seenIds = new Map<string, any>();
  for (const q of allQuestions) {
    const qId = (q.id || '').toString().trim();
    const existing = seenIds.get(qId);
    if (!existing || (q.options?.length || 0) > (existing.options?.length || 0)) {
      seenIds.set(qId, q);
    }
  }
  const deduped = Array.from(seenIds.values());

  // Sort by numeric question ID
  deduped.sort((a, b) => {
    const numA = parseInt((a.id || '').toString().replace(/\D/g, '')) || 0;
    const numB = parseInt((b.id || '').toString().replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  // Final Fidelity Pass: Sequential re-indexing (NO latexFixer - store Gemini output as-is)
  const cleanQuestions = deduped.map((q, idx) => {
    // REMOVED: fixLatexInObject(q) - causes double backslashes
    // Gemini returns correct LaTeX format, store it directly
    return {
      ...q,
      id: idx + 1,
      metadata: {
        ...q.metadata,
        topic: q.metadata?.topic || ""  // REMOVED: fixLatexErrors
      }
    };
  });

  console.log(`✅ [PHYSICS] Final clean questions: ${cleanQuestions.length}`);
  return cleanQuestions;
}




