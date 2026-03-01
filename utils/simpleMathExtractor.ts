/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIMPLIFIED MATH EXTRACTION SYSTEM (Worker-Queue Architecture)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Extracts MCQs page-by-page using parallel workers.
 * Key principles:
 *  - Each page is sent as an image to Gemini with structured JSON output
 *  - Concurrency limited to 3 to avoid rate limits
 *  - Retry with exponential backoff on failures
 *  - Per-page retry if 0 questions extracted (catches transient API issues)
 *  - maxOutputTokens: 8192 per page to prevent truncation
 *  - Final pass de-duplicates by question ID to handle boundary-overlap
 */

import { GoogleGenAI, Type } from "@google/genai";
// REMOVED: latexFixer causes double backslash issues
// import { fixLatexErrors, fixLatexInObject } from './latexFixer';


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry wrapper with exponential backoff (rate limits + generic errors)
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

      if (i < maxRetries - 1) {
        // Always backoff: shorter for generic errors, longer for rate limits
        const wait = isRateLimit
          ? Math.pow(2, i) * 4000 + Math.random() * 2000
          : Math.pow(1.5, i) * 1000 + Math.random() * 500;
        console.warn(`[MATH_RETRY] Attempt ${i + 1} failed${isRateLimit ? ' (rate limit)' : ''}. Backoff: ${Math.round(wait)}ms...`);
        await sleep(wait);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

/**
 * Robust JSON salvage for truncated responses
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
      try {
        return JSON.parse(candidate);
      } catch (e) {
        end = cleaned.lastIndexOf('}', end - 1);
      }
    }
    return null;
  } catch (e) { return null; }
};

/**
 * Load PDF as array of images (Scale 2.5 for better OCR accuracy)
 * Higher scale helps Gemini better extract from complex multi-column layouts
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
      const viewport = page.getViewport({ scale: 2.5 });  // Increased from 1.5 to 2.5
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
      const img = new Image();
      img.src = canvas.toDataURL('image/png');  // PNG instead of JPEG for better text clarity
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
 * Parallel processing with worker queue
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
      try {
        results[idx] = await task(items[idx], idx);
      } catch (e) {
        console.error(`[MATH_WORKER] Error on page ${idx}:`, e);
        results[idx] = [] as any;
      }
    }
  });
  await Promise.all(workers);
  return results;
};

/**
 * Build the extraction prompt for a single page.
 * Includes page number for context and strict LaTeX rules.
 */
function buildPagePrompt(pageNum: number, totalPages: number): string {
  return `
# ROLE: Expert Mathematics Examination Parser
# PAGE: ${pageNum} of ${totalPages}

Extract EVERY SINGLE MCQ visible on this page with 100% fidelity.
⚠️ A question may START on the previous page and CONTINUE here — extract the full question if the start is visible. If only the options are visible (no question stem), skip it.
⚠️ A question may START on this page and END on the next — extract it with its visible options only (mark remaining options if cut off).

🚨🚨🚨 GOLDEN RULES:
1. SYLLABUS: Class 12 NCERT Mathematics only.
2. MARKING: MCQs are 1 Mark unless stated.
3. VERBATIM: Copy text EXACTLY. Preserve ALL word spaces ("If x = 2" NOT "Ifx=2").
4. COUNT: This page may have 8–12 questions. Extract ALL of them — do NOT stop early.
5. COMPLETENESS: Even if the LaTeX is complex, include the FULL question text and all 4 options.

🚨 LATEX FORMATTING (CRITICAL — KaTeX output):
- Wrap ALL math in $...$ (inline) or $$...$$ (display). NEVER use raw Unicode symbols.
- Use SINGLE backslash for ALL commands: \\frac{a}{b} \\sqrt{x} \\sin\\theta \\vec{v} \\hat{i} \\leq \\geq \\pm \\infty \\to \\int \\sum \\lim
- PIECEWISE FUNCTIONS: ALWAYS use \\begin{cases} ... \\end{cases}
- MATRICES/DETERMINANTS: ALWAYS use \\begin{bmatrix} ... \\end{bmatrix} or \\begin{vmatrix} ... \\end{vmatrix}
- INVERSE TRIG: \\sin^{-1} \\cos^{-1} \\tan^{-1}
- Nested roots: $\\sqrt{a + \\sqrt{b}}$
- Vectors: $\\vec{v}$ or $\\hat{i}$

DOMAIN options: ALGEBRA | CALCULUS | VECTORS & 3D GEOMETRY | LINEAR PROGRAMMING | PROBABILITY
DIFFICULTY options: Easy | Moderate | Hard
BLOOM options: Knowledge | Understanding | Apply | Analyze | Evaluate | Create

OUTPUT: Valid JSON matching the schema. Include ALL questions. Do NOT truncate.
`.trim();
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Question number as it appears in the PDF (e.g. '1', '2', '10')" },
          text: { type: Type.STRING, description: "Full question text with LaTeX" },
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
          blooms: { type: Type.STRING }
        },
        required: ["id", "text", "options", "topic", "domain", "difficulty", "blooms"]
      }
    }
  }
};

/**
 * Extract questions from a single page image.
 * Retries up to 2 times if 0 questions returned (transient failure).
 */
async function extractPageQuestions(
  ai: any,
  model: string,
  pageImg: HTMLImageElement,
  pageNum: number,
  totalPages: number
): Promise<any[]> {
  const base64 = pageImg.src.split(',')[1];
  const prompt = buildPagePrompt(pageNum, totalPages);

  // Increased to 4 attempts for complex multi-column pages
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await withRetry(() => ai.models.generateContent({
        model,
        contents: [{
          parts: [
            { inlineData: { mimeType: "image/png", data: base64 } },  // FIXED: Changed from jpeg to png
            { text: prompt }
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.05,   // Lower = more deterministic
          maxOutputTokens: 8192 // Enough for 12 complex questions with LaTeX
        }
      }));

      const rawText = (response as any).text || "{}";
      const parsed = salvageTruncatedJSON(rawText);
      const questions = parsed?.questions || [];

      if (questions.length === 0 && attempt < 3) {
        console.warn(`[MATH_PAGE_${pageNum}] Attempt ${attempt + 1}: Got 0 questions. Retrying...`);
        console.warn(`[MATH_PAGE_${pageNum}] Raw response preview: ${rawText.substring(0, 200)}...`);
        // Increased delay: 3s, 4.5s, 6s for attempts 1, 2, 3
        await sleep(3000 + attempt * 1500);
        continue;
      }

      console.log(`✅ [PAGE ${pageNum}/${totalPages}] Extracted ${questions.length} questions`);
      return questions;
    } catch (e) {
      console.error(`[MATH_PAGE_${pageNum}] Attempt ${attempt + 1} failed:`, e);
      if (attempt === 3) return [];
      await sleep(3000);  // Increased from 2000ms
    }
  }
  return [];
}

/**
 * MAIN EXTRACTION FUNCTION (Page-by-page with deduplication)
 */
export async function extractQuestionsSimplified(
  file: File,
  apiKey: string,
  model: string,  // Always provided by the UI selector — no hardcoded default
  onProgress?: (current: number, total: number, found: number) => void
): Promise<any[]> {

  const ai = new GoogleGenAI({ apiKey });
  const pages = await loadImage(file);
  const totalPages = pages.length;

  // Estimate: Most pages have 8-10 questions, total ~60 for a 7-page exam
  const estimatedQuestions = totalPages * 9; // Average estimate
  console.log(`🚀 [MATH] Processing ${totalPages} pages (concurrency: 2)...`);
  console.log(`📊 [MATH] Estimated questions: ~${estimatedQuestions} (actual count will vary by page)`);
  console.log(`🔧 [MATH] Using: Scale 2.5x, PNG format, 4 retry attempts per page`);
  console.log(`⏱️  [MATH] Expected time: ~${Math.ceil(totalPages * 30 / 60)} minutes\n`);

  // Use concurrency 2 to reduce rate-limit pressure while still being fast
  const resultsArray = await processInParallel(pages, async (pageImg, i) => {
    const questions = await extractPageQuestions(ai, model, pageImg, i + 1, totalPages);

    const mapped = questions.map((q: any) => ({
      ...q,
      id: q.id || `p${i + 1}_q${Math.random().toString(36).substr(2, 4)}`,
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

    if (onProgress) onProgress(i + 1, totalPages, mapped.length);
    return mapped;
  }, 2); // ← Concurrency 2 is safer for rate limits

  const allQuestions = resultsArray.flat();

  // Log per-page breakdown with success/failure indicators
  console.log('\n📊 EXTRACTION SUMMARY:');
  let successCount = 0;
  let failedPages: number[] = [];
  resultsArray.forEach((pageQuestions, i) => {
    const count = pageQuestions.length;
    const status = count > 0 ? '✅' : '❌';
    console.log(`   ${status} Page ${i + 1}: ${count} questions`);
    if (count > 0) successCount++;
    else failedPages.push(i + 1);
  });
  console.log(`\n✅ Total extracted: ${allQuestions.length} questions from ${totalPages} pages`);
  console.log(`📈 Success rate: ${successCount}/${totalPages} pages (${Math.round(successCount/totalPages*100)}%)`);
  if (failedPages.length > 0) {
    console.warn(`⚠️  Failed pages: ${failedPages.join(', ')} - these pages returned 0 questions`);
  }

  // Deduplicate by question ID (same question may appear on adjacent page boundaries)
  // Keep the one with the most complete options (4 options > fewer)
  const seenIds = new Map<string, any>();
  for (const q of allQuestions) {
    const qId = (q.id || '').toString().trim();
    const existing = seenIds.get(qId);
    if (!existing) {
      seenIds.set(qId, q);
    } else {
      // Keep the one with more options (more complete)
      const existingOptions = existing.options?.length || 0;
      const newOptions = q.options?.length || 0;
      if (newOptions > existingOptions) {
        console.log(`[MATH_DEDUP] Q${qId}: Replacing ${existingOptions}-option version with ${newOptions}-option version`);
        seenIds.set(qId, q);
      }
    }
  }

  const deduped = Array.from(seenIds.values());
  if (deduped.length < allQuestions.length) {
    console.log(`🔄 Deduplication: Removed ${allQuestions.length - deduped.length} duplicates. Final: ${deduped.length} unique questions`);
  }

  // Sort by numeric question ID if possible
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

  // Check for missing questions (gaps in sequence)
  const extractedIds = cleanQuestions.map(q => parseInt(q.id?.toString() || '0')).filter(id => id > 0).sort((a, b) => a - b);
  const maxId = Math.max(...extractedIds, 0);
  const missing: number[] = [];
  for (let i = 1; i <= maxId; i++) {
    if (!extractedIds.includes(i)) missing.push(i);
  }

  console.log(`\n✅ FINAL: ${cleanQuestions.length} questions ready`);
  if (missing.length > 0) {
    console.warn(`⚠️  Missing questions: ${missing.join(', ')} (Total missing: ${missing.length})`);
  }
  console.log('\n' + '='.repeat(60) + '\n');

  return cleanQuestions;
}
