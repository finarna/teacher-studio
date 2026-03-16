/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHYSICS EXTRACTION SYSTEM (Raw PDF — Single-Pass, modelled on combinedPaperExtractor)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { GoogleGenAI } from "@google/genai";
import { generateTopicInstruction } from "./officialTopics";
import { safeAiParse } from "./aiParser";

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

    // Find the earliest opening delimiter — array OR object
    const brace = cleaned.indexOf('{');
    const bracket = cleaned.indexOf('[');
    let start = -1;
    if (brace === -1) start = bracket;
    else if (bracket === -1) start = brace;
    else start = Math.min(brace, bracket);

    if (start === -1) return null;
    cleaned = cleaned.substring(start);

    // Try direct parse first
    try { return JSON.parse(cleaned); } catch (e) { }

    // Scan backwards from last closing delimiter
    const isArray = cleaned[0] === '[';
    const closeChar = isArray ? ']' : '}';
    let end = cleaned.lastIndexOf(closeChar);
    while (end > 0) {
      const candidate = cleaned.substring(0, end + 1);
      try { return JSON.parse(candidate); } catch (e) { end = cleaned.lastIndexOf(closeChar, end - 1); }
    }
    return null;
  } catch (e) { return null; }
};

/**
 * Parallel Processing — kept as export for compatibility
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
 * MAIN EXTRACTION (Physics) — Raw PDF single-pass, modelled on combinedPaperExtractor
 */
export async function extractPhysicsQuestionsSimplified(
  file: File,
  apiKey: string,
  model: string,
  subject: string = 'Physics',
  examContext: string = 'KCET',
  onProgress?: (current: number, total: number, found: number) => void,
  columnLayout: 'single' | 'double' = 'double'
): Promise<any[]> {

  const ai = new GoogleGenAI({ apiKey });

  // Convert entire PDF to base64 — native PDF, no rendering
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  const base64 = btoa(binary);

  const expectedCount = examContext.toUpperCase().includes('KCET') ? 60
    : examContext.toUpperCase().includes('NEET') ? 45
    : examContext.toUpperCase().includes('JEE') ? 30
    : 60;

  console.log(`🚀 [${subject.toUpperCase()}] Raw PDF single-pass for ${examContext}. Expected: ${expectedCount} questions.`);
  onProgress?.(0, expectedCount, 0);

  // Interactive progress messages during the long LLM call
  const messages = [
    `Analyzing ${examContext} ${subject} paper structure...`,
    `Extracting ${expectedCount} questions and options...`,
    `Processing ${columnLayout}-column layout...`,
    `Detecting figures, graphs, and circuits...`,
    `Mapping questions to official topics...`,
    `Normalizing LaTeX mathematical expressions...`,
    `Verifying bounding boxes for visual elements...`,
    `Structuring question metadata for final synthesis...`,
  ];
  let msgIndex = 0;
  const interval = setInterval(() => {
    console.log(`[PHYSICS_SCAN] ${messages[msgIndex % messages.length]}`);
    msgIndex++;
  }, 4000);

  const prompt = `
You are an elite ${examContext} ${subject} exam analyzer.

TASK: Extract EVERY SINGLE question from this ${examContext} ${subject} paper.

PAPER STRUCTURE:
- This paper contains exactly ${expectedCount} questions numbered sequentially.
- Layout: ${columnLayout === 'single'
    ? 'SINGLE-COLUMN — questions run sequentially down the full page width, top to bottom.'
    : 'TWO-COLUMN — questions are split left/right on each page. Process the ENTIRE LEFT column before the RIGHT column on each page.'
  }
- If a question spans a column or page boundary, merge it into one complete object.

SCANNING DIRECTIVES:
1. COLUMN LAYOUT: ${columnLayout === 'single'
    ? 'This paper uses a SINGLE-COLUMN layout. Read questions sequentially top-to-bottom on each page. Do NOT split the page into two halves.'
    : 'TWO-COLUMN LAYOUT: Process left column before right column on each page.'
  }
2. BILINGUAL CONTENT: Questions may appear in English AND a local language. Extract ONLY the English text.
3. FIGURES & GRAPHS: If a question has a diagram, graph, circuit, or if ANY of its options are tables/images, set "hasVisualElement": true.
   - Provide "visualBoundingBox" that is STRICTLY around image pixels — never bleed into surrounding text.
     a) FIGURE only, text options: tight box around the diagram/graph/circuit. Top = top of figure image. Bottom = bottom of figure image. Exclude question text above and option text below.
     b) Image/table options only (no question figure): top = top of first option image. Bottom = bottom of last option image. Exclude option label letters (A/B/C/D) outside the image area.
     c) BOTH a question figure AND image/table options: top = top of the question figure. Bottom = bottom of the last option image. This covers the full visual block as one crop — but still exclude any plain question text above the figure and any text below the last option image.
   - In all cases: include the full visual content — diagrams, axis labels, units, node labels, legends, and any text that is part of the figure or graph. Stop at the boundary where question statement text or option label text (A/B/C/D) begins.
   - If a figure is placed between questions, associate it with the question it describes.
4. OPTIONS MAPPING: Options are usually labeled (1)(2)(3)(4) or (A)(B)(C)(D). Recover all 4 accurately.
5. LATEX EXCELLENCE: Wrap ALL math, units, and physical quantities in $ delimiters.
   - Use SINGLE backslash: \\times \\frac \\sqrt \\alpha \\beta \\theta \\lambda \\mu \\Omega \\Delta \\vec \\hat \\leq \\geq \\pm
   - UNITS: $10\\,\\text{m/s}^2$, $5\\,\\text{kg}$, $3 \\times 10^8\\,\\text{m/s}$
6. DATA INTEGRITY: Extract exactly ${expectedCount} questions. Do NOT stop early.
7. NOISE REDUCTION: Ignore paper codes, page headers, footers, and watermarks.

DOMAIN options: MECHANICS | ELECTRODYNAMICS | MODERN PHYSICS | OPTICS | OSCILLATIONS & WAVES | THERMODYNAMICS

${generateTopicInstruction(subject)}

JSON SCHEMA:
{
  "questions": [
    {
      "id": "1",
      "text": "The English question text with $proper \\\\LaTeX$...",
      "options": [
        { "id": "A", "text": "Option text", "isCorrect": false },
        { "id": "B", "text": "Option text", "isCorrect": true },
        { "id": "C", "text": "Option text", "isCorrect": false },
        { "id": "D", "text": "Option text", "isCorrect": false }
      ],
      "topic": "Official Topic Name",
      "domain": "MECHANICS",
      "difficulty": "Easy|Moderate|Hard",
      "blooms": "Remember|Understand|Apply|Analyze",
      "hasVisualElement": false,
      "visualElementType": "graph|circuit diagram|diagram|table|figure",
      "visualBoundingBox": { "pageNumber": 1, "x": "10%", "y": "20%", "width": "50%", "height": "15%" }
    }
  ]
}

Extract ALL ${expectedCount} questions. Do NOT truncate the output.
CRITICAL: Return a single JSON OBJECT with a "questions" key. Do NOT wrap the response in an outer array.
`.trim();

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model,
      contents: [{
        parts: [
          { inlineData: { mimeType: "application/pdf", data: base64 } },
          { text: prompt }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 65536
      }
    }));

    const rawText = response.text || "{}";
    console.log(`📥 [PHYSICS_SCAN] Received ${rawText.length} chars. Parsing...`);
    console.log(`📥 [PHYSICS_SCAN] Raw snippet (first 300):`, rawText.slice(0, 300));

    // Diagnostic: try direct JSON.parse first to log parse success/failure
    let directParseOk = false;
    try {
      const directParsed = JSON.parse(rawText);
      directParseOk = true;
      console.log(`✅ [PHYSICS_SCAN] JSON.parse succeeded. Top-level keys:`, Object.keys(directParsed).slice(0, 10));
      if (Array.isArray(directParsed)) {
        console.log(`📊 [PHYSICS_SCAN] Root is array with ${directParsed.length} items`);
      } else {
        const qArray = directParsed.questions || directParsed.items || directParsed.paper || directParsed.data;
        console.log(`📊 [PHYSICS_SCAN] questions key array length:`, Array.isArray(qArray) ? qArray.length : 'N/A');
      }
    } catch (e: any) {
      console.warn(`⚠️ [PHYSICS_SCAN] JSON.parse failed: ${e.message}. Will use safeAiParse...`);
    }

    // Gemini sometimes wraps the response in an outer array: [{questions:[...]}] instead of {questions:[...]}
    // Unwrap before passing to safeAiParse to avoid treating the wrapper as a single question.
    let textToParse = rawText;
    try {
      const rootVal = JSON.parse(rawText);
      if (Array.isArray(rootVal) && rootVal.length === 1 && rootVal[0] && typeof rootVal[0] === 'object') {
        // [{questions:[...]}] → {questions:[...]}
        textToParse = JSON.stringify(rootVal[0]);
        console.log(`🔧 [PHYSICS_SCAN] Unwrapped outer array wrapper. New root keys:`, Object.keys(rootVal[0]).slice(0, 5));
      } else if (Array.isArray(rootVal) && rootVal.length > 1 && rootVal[0]?.id !== undefined) {
        // [{id:"1",...},{id:"2",...}] → {questions:[...]}
        textToParse = JSON.stringify({ questions: rootVal });
        console.log(`🔧 [PHYSICS_SCAN] Wrapped flat question array into {questions:[...]}`);
      }
    } catch (_) { /* leave textToParse as rawText, safeAiParse will handle repair */ }

    const parsedData = safeAiParse<any>(textToParse, { questions: [] }, true);
    const questions: any[] = parsedData.questions || [];

    console.log(`✅ [PHYSICS] Raw extracted: ${questions.length} / ${expectedCount} questions (directParse:${directParseOk})`);
    if (questions.length === 0) {
      console.warn(`[PHYSICS] Gemini returned 0 questions. Raw snippet:`, rawText.slice(0, 300));
    }

    onProgress?.(expectedCount, expectedCount, questions.length);

    // Deduplicate by question ID — keep most-complete version
    const seenIds = new Map<string, any>();
    for (const q of questions) {
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

    // Re-index and attach metadata
    const cleanQuestions = deduped.map((q, idx) => ({
      ...q,
      id: idx + 1,
      metadata: {
        topic: q.topic || "",
        domain: q.domain,
        difficulty: q.difficulty?.toLowerCase(),
        bloomLevel: q.blooms,
        isPastYear: true,
        year: "2025",
        sourcePage: q.visualBoundingBox?.pageNumber || null
      }
    }));

    console.log(`✅ [PHYSICS] Final clean questions: ${cleanQuestions.length}`);
    return cleanQuestions;

  } catch (error) {
    console.error("❌ [PHYSICS_SCAN] Critical Error:", error);
    onProgress?.(expectedCount, expectedCount, 0);
    return [];
  } finally {
    clearInterval(interval);
  }
}
