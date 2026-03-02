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

const salvageTruncatedJSON = (jsonString: string): any => {
  try {
    let cleaned = jsonString.trim();
    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');

    // Find first possible JSON start (earliest of { or [)
    const brace = cleaned.indexOf('{');
    const bracket = cleaned.indexOf('[');
    let start = -1;
    if (brace === -1) start = bracket;
    else if (bracket === -1) start = brace;
    else start = Math.min(brace, bracket);

    if (start === -1) return null;
    cleaned = cleaned.substring(start);

    // Try parsing the whole thing first
    try { return JSON.parse(cleaned); } catch (e) { }

    // 🩹 REPAIR: Balance braces and brackets if truncated using a stack
    const stack: string[] = [];
    let lastValidPos = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];

      // Handle strings and escapes
      if (char === '"' && !escaped) {
        inString = !inString;
        continue;
      }
      if (inString) {
        escaped = (char === '\\' && !escaped);
        continue;
      }

      // Handle structural characters
      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }

      // Track the last point where JSON was perfectly balanced
      if (stack.length === 0) {
        lastValidPos = i + 1;
      }
    }

    // Attempt 1: Use the last balanced point
    if (lastValidPos > 0) {
      try { return JSON.parse(cleaned.substring(0, lastValidPos)); } catch (e) { }
    }

    // Attempt 2: Aggressively close the current state
    let candidate = cleaned;
    if (inString) candidate += '"';

    // Close in REVERSE order of opening
    for (let i = stack.length - 1; i >= 0; i--) {
      candidate += stack[i];
    }

    try { return JSON.parse(candidate); } catch (e) { }

    // Attempt 3: Brute force walk-back
    let end = cleaned.lastIndexOf('}');
    while (end > 0) {
      try {
        return JSON.parse(cleaned.substring(0, end + 1));
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
        console.error(`❌ [MATH_WORKER] Error on page ${idx + 1}:`, e);
        console.error(`❌ [MATH_PAGE_FAILED] Page ${idx + 1} FAILED in worker - returning empty!`);
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

const responseSchema: any = {
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
 * Helper to convert File to Base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Extract questions from a single page image.
 * Retries if count is suspiciously low (math exams usually have 8-12 questions/page)
 */
async function extractPageQuestions(
  ai: any,
  modelName: string,
  pageImg: HTMLImageElement,
  pageNum: number,
  totalPages: number
): Promise<any[]> {
  const base64 = pageImg.src.split(',')[1];
  const prompt = buildPagePrompt(pageNum, totalPages);

  // Increased to 6 attempts for "Lazy" model behavior
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const result: any = await withRetry(() => ai.models.generateContent({
        model: modelName,
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: "image/png", data: base64 } },
            { text: prompt + (attempt > 0 ? `\n🚨 RIGOROUS SEARCH REQUIRED. Previous attempt only found a few questions. This page has 8-12 questions. SEARCH TOP TO BOTTOM and find EACH one. Current attempt: ${attempt + 1}` : "") }
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.1 + (attempt * 0.1),
          maxOutputTokens: 8192
        }
      }));

      const rawText = result.text;
      const parsed = salvageTruncatedJSON(rawText);
      const questions = parsed?.questions || (Array.isArray(parsed) ? parsed : []);

      // CRITICAL: Force retry if count is low on non-last pages
      const isSuspiciouslyLow = questions.length < 7 && pageNum < totalPages;
      if ((questions.length === 0 || isSuspiciouslyLow) && attempt < 5) {
        console.warn(`[MATH_PAGE_${pageNum}] Attempt ${attempt + 1}: Found only ${questions.length}. Triggering RIGOROUS re-scan...`);
        await sleep(3000 + attempt * 2000);
        continue;
      }

      console.log(`✅ [PAGE ${pageNum}/${totalPages}] Extracted ${questions.length} questions`);
      return questions;
    } catch (e) {
      console.error(`[MATH_PAGE_${pageNum}] Attempt ${attempt + 1} failed:`, e);
      if (attempt === 5) return [];
      await sleep(4000);
    }
  }
  return [];
}

/**
 * MAIN EXTRACTION FUNCTION 
 * 1. Tries 'Mega-Extraction' (Full PDF) first - fast & high-fidelity for clean PDFs
 * 2. Falls back to 'Micro-Extraction' (Page-by-page) if count is low
 */
export async function extractQuestionsSimplified(
  file: File,
  apiKey: string,
  modelName: string,
  onProgress?: (current: number, total: number, found: number) => void
): Promise<any[]> {
  const ai = new GoogleGenAI({ apiKey });

  console.log(`\n🚀 [SIMPLIFIED_PIPELINE] Mirroring successful script logic...`);

  // PHASE 1: DIRECT PDF 'MEGA-EXTRACTION' 
  // Restored for all PDFs to match script success (74 seconds)
  const pdfjsLib = (window as any).pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
  const pdfDoc = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
  const totalPages = pdfDoc.numPages;

  try {
    console.log(`💎 [PHASE 1] Direct PDF Mega-Scan (Target: ~74s)...`);
    const pdfBase64 = await fileToBase64(file);
    const megaPrompt = `
      Extract ALL 60 MCQs from this PDF.
      Return a JSON array of objects with ONLY these fields:
      - id: (string) question number
      - page: (number) page number (1-7)
      - text: (string) question text with LaTeX
      - options: (array of 4) {id: "a", text: "...", isCorrect: false}
      
      🚨 LATEX: Use single backslashes only.
      🚨 IMPORTANT: Check carefully, there are exactly 60 questions.
    `;

    // Removing responseSchema for Phase 1 because it causes significant latency (3+ mins) 
    // for large outputs like 60 math questions. Prompt-based JSON is much faster.
    const megaScanPromise = ai.models.generateContent({
      model: modelName,
      contents: [{
        role: "user",
        parts: [
          { text: megaPrompt },
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        // REMOVED responseSchema and temperature - matching test_kcet_fix_final.mjs success
      }
    });

    // Timeout after 180 seconds for mega-scan to allow full generation
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 180000));

    const start = Date.now();
    const result: any = await Promise.race([megaScanPromise, timeoutPromise]);
    const end = Date.now();

    console.log(`📥 [PHASE 1] Received response in ${((end - start) / 1000).toFixed(1)}s`);
    const rawText = result.text;

    console.log(`📥 [PHASE 1] Received ${rawText.length} characters from Gemini`);
    console.log(`📥 [PHASE 1] Preview: ${rawText.substring(0, 200)}...`);

    const parsed = salvageTruncatedJSON(rawText);
    if (!parsed) {
      console.warn(`⚠️ [PHASE 1] Failed to parse JSON from response`);
    }

    // Support both { questions: [...] } and flat [...] arrays
    let rawQuestions = [];
    if (Array.isArray(parsed)) {
      rawQuestions = parsed;
    } else if (parsed && Array.isArray(parsed.questions)) {
      rawQuestions = parsed.questions;
    }

    console.log(`📥 [PHASE 1] Extracted ${rawQuestions.length} raw questions`);

    if (rawQuestions.length >= 50) {
      console.log(`🎉 [MEGA_SUCCESS] Extracted ${rawQuestions.length} questions directly!`);
      // We still use Phase 2 for rendering the page indicators if needed, but return result here
      // De-prefix for local sorting then map to final unique format
      return rawQuestions.map((q: any) => {
        const rawId = (q.id || '').toString().trim().replace(/^[pP]\d+_q/, '');
        const pageNum = q.page || 1;
        const uniqueId = `p${pageNum}_q${rawId}`;

        return {
          ...q,
          id: uniqueId,
          originalId: rawId,
          topic: "Mathematics",
          difficulty: "Moderate",
          blooms: "Apply",
          metadata: {
            topic: "Mathematics",
            domain: "Mathematics",
            difficulty: "moderate",
            bloomLevel: "Apply",
            isPastYear: true,
            year: "2021",
            sourcePage: pageNum,
            originalId: rawId
          }
        };
      }).sort((a: any, b: any) => parseInt(a.originalId) - parseInt(b.originalId));
    }
    console.warn(`⚠️ [MEGA_PARTIAL] Only got ${rawQuestions.length} questions. Falling back to page-by-page...`);
  } catch (e: any) {
    console.warn(`❌ [MEGA_SCAN_FAILED] Direct PDF scan failed or timed out:`, e.message);
  }

  // PHASE 2: PAGE-BY-PAGE FALLBACK (The most reliable mode)
  console.log(`📸 [PHASE 2] Starting Persistent Page-by-Page Scanning...`);
  // pdfjsLib and pdfDoc already initialized above
  const pageImages: HTMLImageElement[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const scale = 2.5;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context!, viewport }).promise;
    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    pageImages.push(img);
  }

  // Estimate: Most pages have 8-10 questions, total ~60 for a 7-page exam
  const estimatedQuestions = totalPages * 9; // Average estimate
  console.log(`🚀 [MATH] Processing ${totalPages} pages (concurrency: 3)...`);
  console.log(`📊 [MATH] Estimated questions: ~${estimatedQuestions} (actual count will vary by page)`);
  console.log(`🔧 [MATH] Using: Scale 2.5x, PNG format, 6 retry attempts per page`);
  console.log(`⏱️  [MATH] Expected time: ~${Math.ceil(totalPages * 20 / 60)} minutes\n`);

  // Use concurrency 3 to reduce rate-limit pressure while still being fast
  const resultsArray = await processInParallel(pageImages, async (pageImg, i) => {
    const questions = await extractPageQuestions(ai, modelName, pageImg, i + 1, totalPages);

    const mapped = questions.map((q: any) => {
      // CRITICAL: Ensure the ID is unique across pages by prefixing with page number
      // This prevents Q1 on Page 2 from overwriting Q1 on Page 1 during deduplication.
      const rawId = (q.id || '').toString().trim();
      const uniqueId = `p${i + 1}_q${rawId || Math.random().toString(36).substr(2, 4)}`;

      return {
        ...q,
        id: uniqueId,
        originalId: rawId,
        metadata: {
          topic: q.topic,
          domain: q.domain,
          difficulty: q.difficulty?.toLowerCase(),
          bloomLevel: q.blooms,
          isPastYear: true,
          year: "2025",
          sourcePage: i + 1,
          originalId: rawId
        }
      };
    });

    if (onProgress) onProgress(i + 1, totalPages, mapped.length);
    return mapped;
  }, 3); // ← Concurrency 3 is a good balance for speed/rate-limits

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
  console.log(`📈 Success rate: ${successCount}/${totalPages} pages (${Math.round(successCount / totalPages * 100)}%)`);
  if (failedPages.length > 0) {
    console.warn(`⚠️  Failed pages: ${failedPages.join(', ')} - these pages returned 0 questions`);
  }

  // Deduplicate: Keep the version with more content/options if IDs match
  const seenOriginalIds = new Map<string, any>();
  for (const q of allQuestions) {
    const origId = q.originalId || '';
    if (!origId) continue;

    const existing = seenOriginalIds.get(origId);
    if (!existing) {
      seenOriginalIds.set(origId, q);
    } else {
      const existingWeight = (existing.text?.length || 0) + (existing.options?.length || 0) * 50;
      const newWeight = (q.text?.length || 0) + (q.options?.length || 0) * 50;
      if (newWeight > existingWeight) {
        seenOriginalIds.set(origId, q);
      }
    }
  }

  const deduped = Array.from(seenOriginalIds.values());
  if (deduped.length < allQuestions.length) {
    console.log(`🔄 Deduplication: Merged fragments. Result: ${deduped.length} unique questions (from ${allQuestions.length} raw extractions)`);
  }

  // Sort by numeric ID
  deduped.sort((a, b) => {
    const numA = parseInt(a.originalId?.replace(/\D/g, '') || '0');
    const numB = parseInt(b.originalId?.replace(/\D/g, '') || '0');
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
