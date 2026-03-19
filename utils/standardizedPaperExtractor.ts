import { getGeminiClient, withGeminiRetry } from "./geminiClient";
import { safeAiParse } from "./aiParser";
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STANDARDIZED PAPER EXTRACTOR (2026 Edition)
 * ═══════════════════════════════════════════════════════════════════════════════
 * A universal engine for Physics, Chemistry, Biology, and Math extraction.
 * Unifies spatial tracking, multi-page visual extraction, and metadata mapping.
 */

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Advanced Subject-Specific Digitisation Instructions
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { generateStreamlinedMathInstructions } from "./mathLatexReference";
import { generatePhysicsExtractionInstructions } from "./physicsNotationReference";

const getSubjectInstructions = (subject: string): string => {
  switch (subject.toLowerCase()) {
    case "math":
      return `
      ${generateStreamlinedMathInstructions()}
      - Look for coordinate planes, matrices, geometric figures, and advanced calculus notation.
      - Diagram Recognition: coordinate-plane, geometric-figure, vector-diagram, graph.
      `;
    case "physics":
      return `
      ${generatePhysicsExtractionInstructions()}
      - Precise diagram detection for: circuit-diagram, ray-diagram, free-body-diagram, wave-pattern, field-lines.
      - Ensure units (m/s, kg, V, Ω) are properly LaTeX-wrapped.
      `;
    case "chemistry":
      return `
      CHEMISTRY NOTATION RULES:
      - Use LaTeX ($...$) for ALL chemical formulas ($H_2SO_4$, $KMnO_4$).
      - Use stable arrows for reactions ($\\rightarrow$, $\\rightleftharpoons$).
      - Detect structural formulas, benzene rings, and metabolic pathways as 'organic-structure' or 'reaction-mechanism'.
      `;
    case "biology":
      return `
      BIOLOGY NOTATION RULES:
      - Scientific names must be in italics ($\\textit{Homo sapiens}$).
      - Detect histological slides, anatomical diagrams, phylogenetic trees, and genetic cross charts.
      - Maintain high verbatim fidelity for classification and taxonomy.
      `;
    default:
      return "Use LaTeX ($ ... $) for all notation.";
  }
};

/**
 * Renders a specific PDF page as a high-resolution base64 image string 
 * for isolated AI processing (prevents "multi-page noise").
 */
async function renderPdfPageAsBase64(pdf: any, pageNumber: number): Promise<string> {
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({ scale: 4.0 }); // High-res for accuracy
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  return dataUrl.split(',')[1];
}

/**
 * Main Universal Extraction Logic
 */
export async function extractPaperStandardized(
  file: File,
  apiKey: string,
  modelName: string,
  subject: string,
  examContext: string = 'KCET',
  onProgress?: (current: number, total: number, found: number) => void,
  columnLayout: 'single' | 'double' = 'double'
): Promise<any[]> {

  const ai = getGeminiClient(apiKey);
  const fileBuffer = await file.arrayBuffer();

  // 📄 Phase 1: Detect Page Count for Parallel Chunking
  let totalPages = 1;
  let pdfInstance: any;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
    pdfInstance = await loadingTask.promise;
    totalPages = pdfInstance.numPages;
    console.log(`📄 [UNIVERSAL_SCAN] PDF detected with ${totalPages} pages.`);
  } catch (err) {
    console.warn('⚠️ [UNIVERSAL_SCAN] Failed to detect page count, falling back to sequential.', err);
  }

  const isNeetBio = examContext.toUpperCase().includes('NEET') && subject.toLowerCase() === 'biology';
  const expectedCount = isNeetBio ? 90 : (examContext.toUpperCase().includes('KCET') ? 60 : 50);

  console.log(`🚀 [UNIVERSAL_SCAN] Starting ${subject.toUpperCase()} extraction. Pages: ${totalPages}, Model: ${modelName}`);
  onProgress?.(0, expectedCount, 0);

  const subjectHint = getSubjectInstructions(subject);

  // ⚡ Phase 2: Parallel Page-by-Page Processing
  const processPage = async (pageNumber: number) => {
    const pagePrompt = `
You are a high-speed expert ${subject} digitizer.
TASK: Extract ALL questions from this IMAGE of PAGE ${pageNumber}.

STRICT COMPLETENESS RULE:
- You MUST extract EVERY numbered question visible in this image.
- DO NOT SKIP ANY. There are usually ~10 questions per page.
- Format: English text. Wrap ALL math/symbols in $...$.

${columnLayout === 'double' ? 'STRATEGY: Two-column layout. Scan LEFT column first (top-to-bottom), then RIGHT column.' : 'STRATEGY: Single column layout. Scan top-to-bottom.'}

PROPERTIES:
- id: number (The question number)
- text: English text. Wrap notation in $...$.
- pageNumber: ${pageNumber}
- options: 4 strings.
- correct_answer: \"1\", \"2\", \"3\", or \"4\".
- topic: Chapter name.
- difficulty: \"Easy\", \"Medium\", or \"Hard\".
- hasVisualElement: boolean.
- visuals: Array of { type: \"diagram\"|\"table\", pageNumber: number, box: [ymin, xmin, ymax, xmax] }
- labelBox: [ymin, xmin, ymax, xmax] around the question number.

SCHEMA: { \"questions\": [...] }

${subjectHint}
`.trim();

    try {
      // Isolating the page as an image to ensure the AI focus is 100% on this specific page
      // We pass the already loaded pdfInstance to avoid re-reading and detaching the buffer
      const pageImageBase64 = await renderPdfPageAsBase64(pdfInstance, pageNumber);

      const response = await withGeminiRetry(() => ai.models.generateContent({
        model: modelName,
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: pageImageBase64 } },
            { text: pagePrompt }
          ]
        }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 20480
        }
      }));

      const rawText = response.text || "{}";
      const data = safeAiParse<any>(rawText, { questions: [] }, true);
      console.log(`⚡ [PAGE ${pageNumber}] Processed: Extracted ${data.questions?.length || 0} questions.`);
      return data.questions || [];
    } catch (err) {
      console.error(`❌ [PAGE ${pageNumber}] Error:`, err);
      return [];
    }
  };

  try {
    const pagePromises = Array.from({ length: totalPages }, (_, i) => processPage(i + 1));
    const results = await Promise.all(pagePromises);
    const allQuestions = results.flat();

    // ABSOLUTE MODE: Keep every question extracted (Zero Deduplication)
    // This ensures we never lose data due to filtering logic.
    const dedupedQuestions = allQuestions.filter(q => q && q.text && q.text.length > 5);
    // Sort by extracted page number then by original ID if possible
    dedupedQuestions.sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) return (a.pageNumber || 0) - (b.pageNumber || 0);
      return (parseInt(a.id) || 0) - (parseInt(b.id) || 0);
    });

    onProgress?.(expectedCount, expectedCount, dedupedQuestions.length);

    const cleanQuestions = dedupedQuestions.map((q, idx) => {
      const visuals = q.visuals || [];
      if (q.hasVisualElement && visuals.length === 0 && q.box) {
        visuals.push({ pageNumber: q.pageNumber, box: q.box, type: 'diagram' });
      }

      const primaryBox = (visuals.length > 0) ? visuals[0].box : null;
      const primaryPage = (visuals.length > 0) ? (visuals[0].pageNumber || q.pageNumber) : q.pageNumber;

      const visualBoundingBox = (primaryBox && Array.isArray(primaryBox)) ? {
        pageNumber: primaryPage || 1,
        x: (primaryBox[1] / 10).toString() + "%",
        y: (primaryBox[0] / 10).toString() + "%",
        width: ((primaryBox[3] - primaryBox[1]) / 10).toString() + "%",
        height: ((primaryBox[2] - primaryBox[0]) / 10).toString() + "%"
      } : null;

      const questionBoundingBox = (q.labelBox && Array.isArray(q.labelBox)) ? {
        pageNumber: q.pageNumber || 1,
        x: (q.labelBox[1] / 10).toString() + "%",
        y: (q.labelBox[0] / 10).toString() + "%",
        width: ((q.labelBox[3] - q.labelBox[1]) / 10).toString() + "%",
        height: ((q.labelBox[2] - q.labelBox[0]) / 10).toString() + "%"
      } : null;

      return {
        ...q,
        id: idx + 1,
        visualBoundingBox,
        questionBoundingBox,
        visuals,
        metadata: {
          topic: q.topic || subject,
          domain: q.domain,
          difficulty: q.difficulty?.toLowerCase() || 'medium',
          bloomLevel: q.blooms || (subject.toLowerCase() === 'math' || subject.toLowerCase() === 'physics' ? 'Apply' : 'Understand'),
          isPastYear: true,
          year: "2024",
          sourcePage: q.pageNumber || 1
        }
      };
    });

    console.log(`✅ [${subject.toUpperCase()}] Parallel processing complete: ${cleanQuestions.length} questions.`);
    return cleanQuestions;

  } catch (error) {
    console.error(`❌ [${subject.toUpperCase()}_SCAN] Critical Universal Error:`, error);
    return [];
  }
}
