/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIMPLIFIED CHEMISTRY EXTRACTION SYSTEM (Worker-Queue Architecture)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Identical architecture to Math/Physics/Biology simplified extractors:
 *  - Page-by-page parallel processing (concurrency 2 — rate-limit safe)
 *  - Per-page retry up to 3 times if 0 questions returned
 *  - maxOutputTokens: 8192 to prevent mid-response truncation
 *  - Deduplication by question ID (keeps most-complete options version)
 *  - Sort by numeric question ID before re-indexing
 *  - LaTeX normalization via shared fixLatexInObject
 */

import { GoogleGenAI, Type } from "@google/genai";
import { fixLatexErrors, fixLatexInObject } from './latexFixer';

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
                const wait = isRateLimit
                    ? Math.pow(2, i) * 4000 + Math.random() * 2000
                    : Math.pow(1.5, i) * 1000 + Math.random() * 500;
                console.warn(`[CHEM_RETRY] Attempt ${i + 1}${isRateLimit ? ' (rate limit)' : ''}. Backoff: ${Math.round(wait)}ms...`);
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
            try { return JSON.parse(candidate); } catch (e) { end = cleaned.lastIndexOf('}', end - 1); }
        }
        return null;
    } catch (e) { return null; }
};

/**
 * Load PDF as array of images (Scale 1.5 for speed/quality balance)
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
 * Parallel processing with worker queue
 */
const processInParallel = async <T, R>(
    items: T[],
    task: (item: T, index: number) => Promise<R>,
    concurrency = 2
): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let currentIndex = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (currentIndex < items.length) {
            const idx = currentIndex++;
            try {
                results[idx] = await task(items[idx], idx);
            } catch (e) {
                console.error(`[CHEM_WORKER] Error on page ${idx}:`, e);
                results[idx] = [] as any;
            }
        }
    });
    await Promise.all(workers);
    return results;
};

/**
 * Build the extraction prompt for a single Chemistry page.
 */
function buildChemPagePrompt(pageNum: number, totalPages: number): string {
    return `
# ROLE: Expert Chemistry Examination Parser
# PAGE: ${pageNum} of ${totalPages}

Extract EVERY SINGLE MCQ visible on this page with 100% fidelity.
⚠️ This page may have 8–12 questions — Do NOT stop early.
⚠️ A question may start on the previous page and continue here — extract if the stem is visible.

🚨🚨🚨 GOLDEN RULES:
1. SYLLABUS: Class 12 NCERT Chemistry only.
2. MARKING: MCQs are 1 Mark unless stated.
3. VERBATIM: Copy text EXACTLY. Preserve ALL word spaces ("The molarity" NOT "Themolarity").
4. COMPLETENESS: Include FULL question text and ALL 4 options (A)(B)(C)(D).

🚨 CHEMICAL NOTATION (CRITICAL):
- Wrap ALL chemical formulas, equations, and symbols in $...$
- Formulas: $\\text{H}_2\\text{SO}_4$, $\\text{KMnO}_4$, $[\\text{Co}(\\text{NH}_3)_6]\\text{Cl}_3$
- Ions: $\\text{Fe}^{3+}$, $\\text{SO}_4^{2-}$, $\\text{Cl}^-$
- Arrows: $\\rightarrow$, $\\rightleftharpoons$, $\\xrightarrow{\\Delta}$
- Equilibrium constant: $K_c$, $K_p$, $K_{sp}$
- Greek: $\\alpha$, $\\beta$, $\\Delta$, $\\lambda$
- Subscript/superscript: $\\text{CO}_2$, $25^\\circ\\text{C}$, $10^{-3}$
- NEVER use raw Unicode (→ ⇌ Δ α β) — always use LaTeX

DOMAIN options: PHYSICAL CHEMISTRY | ORGANIC CHEMISTRY | INORGANIC CHEMISTRY
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
                    id: { type: Type.STRING, description: "Question number from the PDF (e.g. '1', '2', '15')" },
                    text: { type: Type.STRING, description: "Full question text with chemical LaTeX" },
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
                    topic: { type: Type.STRING, description: "NCERT Chapter name" },
                    domain: { type: Type.STRING, description: "PHYSICAL CHEMISTRY | ORGANIC CHEMISTRY | INORGANIC CHEMISTRY" },
                    difficulty: { type: Type.STRING },
                    blooms: { type: Type.STRING }
                },
                required: ["id", "text", "options", "topic", "domain", "difficulty", "blooms"]
            }
        }
    }
};

/**
 * MAIN EXTRACTION FUNCTION (Chemistry, page-by-page)
 */
export async function extractChemistryQuestionsSimplified(
    file: File,
    apiKey: string,
    model: string,  // Always provided by the UI selector — no hardcoded default
    onProgress?: (current: number, total: number, found: number) => void
): Promise<any[]> {
    const ai = new GoogleGenAI({ apiKey });
    const pages = await loadImage(file);
    const totalPages = pages.length;
    console.log(`🚀 [CHEM] Processing ${totalPages} pages (concurrency: 2)...`);

    const resultsArray = await processInParallel(pages, async (pageImg, i) => {
        const base64 = pageImg.src.split(',')[1];
        const pageNum = i + 1;
        const prompt = buildChemPagePrompt(pageNum, totalPages);

        // Per-page retry: if 0 questions returned, retry up to 2 more times
        for (let attempt = 0; attempt < 3; attempt++) {
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
                        maxOutputTokens: 8192  // Enough for 12 complex chemistry questions
                    }
                }));

                const parsed = salvageTruncatedJSON((response as any).text || "{}");
                const questions = parsed?.questions || [];

                if (questions.length === 0 && attempt < 2) {
                    console.warn(`[CHEM_PAGE_${pageNum}] Attempt ${attempt + 1}: Got 0 questions. Retrying...`);
                    await sleep(2000 + attempt * 1000);
                    continue;
                }

                console.log(`[CHEM_PAGE_${pageNum}] Attempt ${attempt + 1}: ${questions.length} questions`);

                const mapped = questions.map((q: any) => ({
                    ...q,
                    id: q.id || `p${pageNum}_q${Math.random().toString(36).substr(2, 4)}`,
                    metadata: {
                        topic: q.topic,
                        domain: q.domain,
                        difficulty: q.difficulty?.toLowerCase(),
                        bloomLevel: q.blooms,
                        isPastYear: true,
                        year: "2025",
                        sourcePage: pageNum
                    }
                }));

                if (onProgress) onProgress(pageNum, totalPages, mapped.length);
                return mapped;

            } catch (e) {
                console.error(`[CHEM_PAGE_${pageNum}] Attempt ${attempt + 1} failed:`, e);
                if (attempt < 2) { await sleep(2000); continue; }
                return [];
            }
        }
        return [];
    }, 2); // Concurrency 2 — rate-limit safe

    const allQuestions = resultsArray.flat();
    console.log(`✅ [CHEM] Raw extracted: ${allQuestions.length} questions across ${totalPages} pages`);

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

    // Final fidelity pass: LaTeX normalization + sequential re-indexing
    const cleanQuestions = deduped.map((q, idx) => {
        const fixedQ = fixLatexInObject(q);
        return {
            ...fixedQ,
            id: idx + 1,
            metadata: {
                ...fixedQ.metadata,
                topic: fixLatexErrors(fixedQ.metadata?.topic || "")
            }
        };
    });

    console.log(`✅ [CHEM] Final clean questions: ${cleanQuestions.length}`);
    return cleanQuestions;
}
