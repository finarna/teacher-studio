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
  try {
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
    totalPages = pdf.numPages;
    console.log(`📄 [UNIVERSAL_SCAN] PDF detected with ${totalPages} pages.`);
  } catch (err) {
    console.warn('⚠️ [UNIVERSAL_SCAN] Failed to detect page count, falling back to sequential.', err);
  }

  const base64 = await fileToBase64(file);
  const isNeetBio = examContext.toUpperCase().includes('NEET') && subject.toLowerCase() === 'biology';
  const expectedCount = isNeetBio ? 90 : (examContext.toUpperCase().includes('KCET') ? 60 : 50);

  console.log(`🚀 [UNIVERSAL_SCAN] Starting ${subject.toUpperCase()} extraction. Pages: ${totalPages}, Model: ${modelName}`);
  onProgress?.(0, expectedCount, 0);

  const subjectHint = getSubjectInstructions(subject);
  
  // ⚡ Phase 2: Parallel Page-by-Page Processing
  const processPage = async (pageNumber: number) => {
    const pagePrompt = `
You are a high-speed expert ${subject} digitizer.
TASK: Extract ALL questions from PAGE ${pageNumber} of this PDF.

STRICT COMPLETENESS RULE:
- You MUST extract EVERY numbered question on this page (usually ~10 questions).
- DO NOT SKIP ANY. If there are 10 questions, return 10 objects.
- Ignore headers, footers, and general instructions. Start from the first question number you see.
- Format: English text. Wrap ALL math/symbols in $...$.

${columnLayout === 'double' ? 'STRATEGY: Two-column layout. Scan LEFT column first (top-to-bottom), then RIGHT column.' : 'STRATEGY: Single column layout. Scan top-to-bottom.'}

PROPERTIES:
- id: number (The question number as printed on the page)
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
      const response = await withGeminiRetry(() => ai.models.generateContent({
          model: modelName,
          contents: [{
              role: "user",
              parts: [
                  { inlineData: { mimeType: "application/pdf", data: base64 } },
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

    // Deduplicate by ID
    const seenIds = new Map();
    for (const q of allQuestions) {
      const qId = q.id?.toString();
      if (!qId) continue;
      if (!seenIds.has(qId) || (q.text?.length > seenIds.get(qId).text?.length)) {
        seenIds.set(qId, q);
      }
    }
    const dedupedQuestions = Array.from(seenIds.values());
    dedupedQuestions.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));

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
