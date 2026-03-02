/**
 * BIOLOGY QUESTION EXTRACTOR (Production-Grade)
 *
 * Based on proven Math extraction logic with:
 * - Multi-page parallel processing (3 concurrent workers)
 * - PDF.js rendering (PDF → page images)
 * - Retry logic with exponential backoff
 * - Robust JSON salvage for truncated responses
 * - Diagram cropping from source images
 * - Progress callbacks for UI
 */

import { GoogleGenAI } from "@google/genai";
import { generateTopicInstruction } from './officialTopics';
// REMOVED: latexFixer causes double backslash issues
// import { fixLatexErrors, fixLatexInObject } from './latexFixer';



const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry wrapper with exponential backoff for rate limits
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
        console.warn(`[RETRY_HANDLER] Rate limit (429) hit at attempt ${i + 1}. Backoff: ${Math.round(wait)}ms...`);
        await sleep(wait);
        continue;
      }
      console.error(`[RETRY_HANDLER] Fatal error at attempt ${i + 1}:`, errorText);
      throw error;
    }
  }
  throw lastError;
};

/**
 * Robust JSON parser with salvage logic for truncated responses
 */
const salvageTruncatedJSON = (jsonString: string): any => {
  try {
    let cleaned = jsonString.trim();
    // Remove markdown wrappers
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');

    // Attempt to find the outermost JSON structure
    const start = cleaned.indexOf('{');
    if (start === -1) return null;

    // Scan backwards from the last '}' trying to find a valid JSON object
    let end = cleaned.lastIndexOf('}');
    while (end > start) {
      const candidate = cleaned.substring(start, end + 1);
      try {
        const parsed = JSON.parse(candidate);
        console.log(`[JSON_PARSER] Success: Extracted valid block via balanced scan.`);
        return parsed;
      } catch (e) {
        // Drop the last '}' and look for the previous one
        end = cleaned.lastIndexOf('}', end - 1);
      }
    }

    // Fallback: If standard parsing fails, try aggressive LaTeX escaping
    console.warn(`[JSON_PARSER] Standard parse failed. Attempting aggressive LaTeX escaping...`);
    const fixed = cleaned.replace(/\\/g, '\\\\')
      .replace(/\\\\"/g, '\\"')
      .replace(/\\\\n/g, '\\n')
      .replace(/\\\\r/g, '\\r')
      .replace(/\\\\t/g, '\\t');

    let startFix = fixed.indexOf('{');
    let endFix = fixed.lastIndexOf('}');
    while (endFix > startFix) {
      const candidate = fixed.substring(startFix, endFix + 1);
      try {
        const parsed = JSON.parse(candidate);
        console.log(`[JSON_PARSER] Success: Salvaged with escaping logic.`);
        return parsed;
      } catch (e) {
        endFix = fixed.lastIndexOf('}', endFix - 1);
      }
    }

    console.error(`[JSON_PARSER] Fatal: Salvage failed entirely.`);
    return null;
  } catch (e) {
    console.error("[JSON_PARSER] Critical error during cleanup:", e);
    return null;
  }
};

/**
 * Crop diagram from source image using bounding box coordinates
 */
const cropDiagram = (sourceImg: HTMLImageElement, box: { ymin: number, xmin: number, ymax: number, xmax: number }): string => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return "";

    const x = (box.xmin / 1000) * sourceImg.width;
    const y = (box.ymin / 1000) * sourceImg.height;
    const w = ((box.xmax - box.xmin) / 1000) * sourceImg.width;
    const h = ((box.ymax - box.ymin) / 1000) * sourceImg.height;

    const margin = Math.min(w, h) * 0.1;
    const sx = Math.max(0, x - margin);
    const sy = Math.max(0, y - margin);
    const sw = Math.min(sourceImg.width - sx, w + (margin * 2));
    const sh = Math.min(sourceImg.height - sy, h + (margin * 2));

    canvas.width = sw;
    canvas.height = sh;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, sw, sh);
    ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, sw, sh);

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (e) {
    console.error('[DIAGRAM_CROP] Error cropping diagram:', e);
    return "";
  }
};

/**
 * Load PDF as array of images (one per page)
 */
const loadImage = async (file: File): Promise<HTMLImageElement[]> => {
  console.log(`[IMAGE_LOADER] Rendering ${file.name} (${file.type})...`);

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

    console.log(`[IMAGE_LOADER] Rendered ${images.length} pages`);
    return images;
  }

  // Single image file
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise(r => img.onload = r);
  return [img];
};

/**
 * Process items in parallel with limited concurrency
 */
export const processInParallel = async <T, R>(
  items: T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await task(items[idx], idx);
      } catch (e) {
        console.error(`[WORKER] Error on item ${idx}:`, e);
        results[idx] = [] as any; // Continue with empty result
      }
    }
  });

  await Promise.all(workers);
  return results;
};

/**
 * Extract Biology questions using multi-page parallel processing
 * (Proven approach from Math extractor)
 */
export async function extractBiologyQuestionsSimplified(
  file: File,
  apiKey: string,
  model: string,  // Always provided by the UI selector — no hardcoded default
  examContext: string = 'KCET',
  onProgress?: (current: number, total: number, found: number) => void
): Promise<any[]> {

  const ai = new GoogleGenAI({ apiKey });

  console.log(`🚀 [BIOLOGY] Starting extraction with ${model} for ${examContext}...`);
  console.log(`📄 [BIOLOGY] File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

  // Step 1: Load PDF as images (one per page)
  const pages = await loadImage(file);
  const totalPages = pages.length;
  console.log(`[BIOLOGY_INIT] Pages: ${totalPages}. Concurrency: 2 (rate-limit safe).`);


  if (pages.length === 0) {
    console.error("[BIOLOGY_INIT] Aborted: No pages rendered.");
    return [];
  }

  // Step 2: Process pages in parallel (2 concurrent workers — rate-limit safe)
  const allQuestionsArray = await processInParallel(pages, async (pageImg, i) => {
    console.log(`[BIOLOGY_PAGE] Deep Extraction Phase: Page ${i + 1}/${totalPages}...`);
    const base64 = pageImg.src.split(',')[1];

    // Per-page retry: if 0 questions returned, retry up to 2 more times
    for (let attempt = 0; attempt < 3; attempt++) {

      const prompt = `
# CONTEXT:
Exam: ${examContext}
Subject: Biology (Class 12)
Page: ${i + 1} of ${totalPages}

# ROLE: Elite Biology STEM Analyst & Learning Coach
Extract ALL MCQs visible on this page. This page may have 8–12 questions — do NOT stop early.
⚠️ If a question starts here and ends on the next page, extract what is visible.

🚨🚨🚨 GOLDEN RULE: SYLLABUS & MARKING COMPLIANCE
1. SYLLABUS: Strictly adhere to the latest official NCERT Class 12 Biology syllabus.
2. MARKING: Extract marks verbatim from the paper. MCQs are worth EXACTLY 1 Mark unless specified otherwise.
3. VERBATIM: Copy text exactly as seen. Extract what you OBSERVE, not what you EXPECT.

CRITICAL: If a question has a DIAGRAM, FIGURE, GRAPH, or TABLE, you MUST:
1. Set diagramBox with coordinates { "ymin": 0-1000, "xmin": 0-1000, "ymax": 0-1000, "xmax": 0-1000 }
2. The coordinates should tightly bound the visual element on the page

${generateTopicInstruction('Biology')}

# JSON STRUCTURE
{
  "questions": [
    {
      "id": "ACTUAL_QUESTION_NUMBER_FROM_PDF",
      "text": "Full question text with proper spacing",
      "options": ["(A) option text", "(B) option text", "(C) option text", "(D) option text"],
      "correctOptionIndex": 0,
      "topic": "Official Chapter Name",
      "diagramBox": { "ymin": 100, "xmin": 50, "ymax": 400, "xmax": 950 } or null,
      "strategicHook": "High-level exam insight (e.g., 'Hardy-Weinberg: p² + 2pq + q² = 1')",
      "metadata": {
        "subTopic": "Specific concept",
        "difficulty": "easy",
        "bloomLevel": "Understanding",
        "trapPotential": 5,
        "marksWeight": 1
      },
      "solutionData": {
        "steps": [
          { "text": "Step 1: Biological reasoning", "pitfall": "Common mistake" }
        ],
        "finalTip": "Memory technique or key insight"
      },
      "smartNotes": {
        "topicTitle": "Concept name",
        "visualConcept": "Visual explanation",
        "keyPoints": ["Key fact 1", "Key fact 2"],
        "mentalAnchor": "Memory aid",
        "quickRef": "Quick reference"
      }
    }
  ]
}

IMPORTANT RULES:
1. Extract the ACTUAL question number from the PDF as "id" (e.g., "1", "2", "3", NOT auto-generated IDs)
2. For diagrams/figures: Estimate bounding box coordinates (0-1000 scale for page dimensions)
3. Scientific names: $\textit{Homo sapiens}$ format
4. Match-the-following: "List-I: a) Item1, b) Item2..." and "List-II: p) Value1, q) Value2..."
5. Extract complete solution steps with biological reasoning
6. NO PREAMBLE. Return ONLY the JSON object.

Extract ALL questions visible on this page.
    `.trim();

      try {
        console.log(`[BIOLOGY_AI] Page ${i + 1} Attempt ${attempt + 1}: Sending to ${model}...`);
        const startTime = Date.now();

        const result: any = await withRetry(() => ai.models.generateContent({

          model,
          contents: [{
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: base64 } },
              { text: prompt }
            ]
          }],
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 100000
          }
        }));

        const elapsed = Date.now() - startTime;
        const responseText = result.text;
        console.log(`[BIOLOGY_AI] Page ${i + 1} A${attempt + 1}: ${responseText?.length || 0} chars in ${elapsed}ms.`);

        const parsedData = salvageTruncatedJSON(responseText || "{}");
        const questions = parsedData?.questions || [];
        console.log(`[BIOLOGY_MAP] Page ${i + 1} A${attempt + 1}: ${questions.length} questions extracted.`);

        if (questions.length === 0 && attempt < 2) {
          console.warn(`[BIOLOGY_PAGE_${i + 1}] Got 0 questions on attempt ${attempt + 1}. Retrying...`);
          await sleep(2000 + attempt * 1000);
          continue;
        }

        // Map to internal format with diagram cropping
        const mapped = questions.map((q: any, idx: number) => {
          console.log(`[BIOLOGY_MAP] Mapping Question ${idx + 1} on Page ${i + 1}: ${q.text?.substring(0, 30)}...`);

          return {
            id: q.id || `bio_${Date.now()}_${i * 100 + idx}`,
            text: q.text,
            subject: 'Biology',
            options: q.options?.map((optStr: string, optIdx: number) => {
              const id = optStr.match(/\((.*?)\)/)?.[1] || String.fromCharCode(65 + optIdx);
              const text = optStr.replace(/^\(.\)\s*/, '');
              return {
                id,
                text,
                isCorrect: optIdx === q.correctOptionIndex
              };
            }) || [],
            correctOptionIndex: q.correctOptionIndex,
            // Top-level fields expected by BoardMastermind & database
            topic: q.topic || 'Evolution',
            domain: determineDomain(q.topic),
            difficulty: q.metadata?.difficulty || 'medium',
            blooms: q.metadata?.bloomLevel || 'Understanding',
            marks: q.metadata?.marksWeight || 1,
            // Crop diagram from page image if coordinates provided
            imageUrl: q.diagramBox ? cropDiagram(pageImg, q.diagramBox) : undefined,
            hasVisualElement: !!q.diagramBox,
            visualElementType: q.diagramBox ? 'diagram' : null,
            visualElementDescription: q.diagramBox ? 'Question contains diagram' : null,
            visualBoundingBox: q.diagramBox,
            // Rich pedagogical data
            strategicHook: q.strategicHook || q.solutionData?.finalTip,
            // Convert solutionData.steps to solutionSteps (array of strings) for database
            solutionSteps: q.solutionData?.steps?.map((s: any) => {
              const stepText = s.text || s;
              // Clean up LaTeX itemize markup and stray backslashes
              return stepText
                .replace(/\\begin\{itemize\}/g, '')
                .replace(/\\end\{itemize\}/g, '')
                .replace(/\\item\s*/g, '• ')
                .replace(/\$\\textit\{([^}]+)\}\$/g, '$1')  // Remove $\textit{...}$
                .replace(/\\textit\{([^}]+)\}/g, '$1')  // Remove \textit{...} without $
                .replace(/\\text(bf|it|rm)\{([^}]+)\}/g, '$2')  // Remove other text commands
                .replace(/\\([a-z])/g, '$1')  // Remove remaining stray backslashes before lowercase letters
                .replace(/\s+/g, ' ')  // Clean multiple spaces
                .trim();
            }) || [],
            examTip: q.solutionData?.finalTip || q.strategicHook,
            smartNotes: q.smartNotes,
            // Keep metadata for additional info
            metadata: {
              subTopic: q.metadata?.subTopic || '',
              trapPotential: q.metadata?.trapPotential || 5,
              isPastYear: true,
              year: "2025",
              source: examContext
            }
          };
        });

        if (onProgress) {
          onProgress(i + 1, totalPages, mapped.length);
        }

        return mapped;
      } catch (e) {
        console.error(`[BIOLOGY_FATAL] Page ${i + 1} Attempt ${attempt + 1} Error:`, e);
        if (attempt < 2) {
          await sleep(2000);
          continue;
        }
        console.error(`❌ [BIOLOGY_PAGE_FAILED] Page ${i + 1} FAILED after all retries - returning empty!`);
        return []; // All retries exhausted
      }
    } // end attempt loop
    console.error(`❌ [BIOLOGY_PAGE_FAILED] Page ${i + 1} exhausted all attempts - no questions extracted!`);
    return [];
  }, 2); // 2 concurrent workers (rate-limit safe)


  // Step 3: Flatten + deduplicate + sort + fidelity pass
  const allQuestions = allQuestionsArray.flat();

  // Log which pages succeeded and which failed
  const pagesWithQuestions = new Set<number>();
  allQuestionsArray.forEach((pageQuestions, idx) => {
    if (pageQuestions && pageQuestions.length > 0) {
      pagesWithQuestions.add(idx + 1);
    }
  });
  const failedPages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(pageNum => !pagesWithQuestions.has(pageNum));

  console.log(`✅ [BIOLOGY] Raw extracted: ${allQuestions.length} questions across ${totalPages} pages`);
  if (failedPages.length > 0) {
    console.error(`⚠️  [BIOLOGY_WARNING] Failed to extract from pages: ${failedPages.join(', ')}`);
  }
  console.log(`📊 [BIOLOGY] Successful pages: ${Array.from(pagesWithQuestions).sort((a, b) => a - b).join(', ')}`);

  // Deduplicate by question ID — keep version with more options (most complete)
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

  console.log(`📊 [BIOLOGY] After dedup: ${deduped.length} questions`);
  console.log(`🗄️ [BIOLOGY] From ${totalPages} pages`);
  console.log(`🖼️  [BIOLOGY] With diagrams: ${deduped.filter((q: any) => q.imageUrl).length}`);
  console.log(`📚 [BIOLOGY] Topics covered: ${[...new Set(deduped.map((q: any) => q.topic))].length}`);

  // Final fidelity pass: Sequential re-indexing (NO latexFixer - store Gemini output as-is)
  const finalQuestions = deduped.map((q, idx) => {
    // REMOVED: fixLatexInObject(q) - causes double backslashes
    // Gemini returns correct LaTeX format, store it directly
    return {
      ...q,
      id: idx + 1,  // Re-index sequentially
      metadata: {
        ...q.metadata,
        topic: q.metadata?.topic || ""  // REMOVED: fixLatexErrors
      }
    };
  });

  console.log(`✅ [BIOLOGY] Final clean questions: ${finalQuestions.length}`);
  return finalQuestions;
}




/**
 * Helper: Determine Biology domain from topic name
 */
function determineDomain(topic: string): string {
  if (!topic) return 'General Biology';

  const topicLower = topic.toLowerCase();

  if (topicLower.includes('biotechnology')) return 'Biotechnology';
  if (topicLower.includes('inheritance') || topicLower.includes('molecular basis') || topicLower.includes('evolution')) return 'Genetics & Evolution';
  if (topicLower.includes('reproduction') || topicLower.includes('reproductive')) return 'Reproduction';
  if (topicLower.includes('health') || topicLower.includes('disease') || topicLower.includes('microbe')) return 'Biology and Human Welfare';
  if (topicLower.includes('organism') || topicLower.includes('population') || topicLower.includes('ecosystem') || topicLower.includes('biodiversity')) return 'Ecology & Environment';

  return 'General Biology';
}
