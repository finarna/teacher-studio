
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question, SubjectType, SolutionData } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.status === 429 || error?.message?.includes('429');
      if (isRateLimit && i < maxRetries - 1) {
        await sleep(2000 * (i + 1));
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
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
    
    // Attempt to find the object start/end
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    
    if (start !== -1 && end !== -1) {
      return JSON.parse(cleaned.substring(start, end + 1));
    }
    return JSON.parse(cleaned);
  } catch (e) {
    return { questions: [] };
  }
};

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
  } catch (e) { return ""; }
};

export const parseExamFile = async (
  file: File, 
  subject: SubjectType,
  onProgress?: (current: number, total: number, found: number) => void
): Promise<Question[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const loadImage = async (f: File): Promise<HTMLImageElement[]> => {
    if (f.type === 'application/pdf') {
      const data = await f.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      
      const renderPage = async (pageNum: number): Promise<HTMLImageElement> => {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 }); // Reduced scale for faster rendering/upload
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        const img = new Image();
        img.src = canvas.toDataURL('image/jpeg', 0.8); // Slightly lower quality for faster upload
        await new Promise(r => img.onload = r);
        return img;
      };

      const pageIndices = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
      return await Promise.all(pageIndices.map(idx => renderPage(idx)));
    }
    const img = new Image();
    img.src = URL.createObjectURL(f);
    await new Promise(r => img.onload = r);
    return [img];
  };

  const pages = await loadImage(file);
  
  const processPage = async (pageImg: HTMLImageElement, i: number): Promise<Question[]> => {
    const base64 = pageImg.src.split(',')[1];
    const prompt = `
      # ROLE & EXPERTISE
      You are an expert ${subject} Examination Parser specializing in CBSE/KCET/NEET Class 12 board exam papers.
      
      # MISSION
      Extract EVERY MCQ with 100% fidelity.
      
      # EXTRACTION METHODOLOGY
      1. SPACE PRESERVATION: PRESERVE SPACES BETWEEN EVERY WORD. Never merge words like "HumanHormone".
      2. SCIENTIFIC NAMES: Convert to LaTeX italic like $\\textit{Homo sapiens}$.
      3. GREEK SYMBOLS: Use Unicode (α, β, γ, δ) not words.
      4. MATCH-THE-FOLLOWING: Format as:
         List-I: 1) Item A, 2) Item B...
         List-II: p) Value X, q) Value Y...
      5. VISUAL ELEMENTS: If a diagram, table, or graph is present, identify its bounding box (0-1000).
      
      # OUTPUT
      Return valid JSON with the following structure:
      {
        "questions": [
          {
            "id": "Q1",
            "text": "string with spacing preserved",
            "options": ["(A) Text", "(B) Text", "(C) Text", "(D) Text"],
            "correctOptionIndex": number (0-3),
            "marks": 1,
            "difficulty": "Easy" | "Moderate" | "Hard",
            "topic": "Specific NCERT Chapter Name",
            "blooms": "Knowledge" | "Understand" | "Apply" | "Analyze" | "Evaluate",
            "domain": "Broad Domain Name",
            "hasVisualElement": boolean,
            "visualElementType": "diagram" | "table" | "graph" | "image" | null,
            "diagramBox": {"ymin": n, "xmin": n, "ymax": n, "xmax": n} | null
          }
        ]
      }
    `;

    try {
      const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64 } },
          { text: prompt }
        ]}],
        config: { 
          responseMimeType: "application/json",
          temperature: 0.1
        }
      }));

      const parsedData = salvageTruncatedJSON(response.text || "{}");
      const questions = parsedData.questions || [];
      
      const mapped = questions.map((q: any, idx: number) => ({
        id: Date.now() + i * 1000 + idx,
        text: q.text,
        subject,
        options: q.options.map((optStr: string, optIdx: number) => {
          const id = optStr.match(/\((.*?)\)/)?.[1] || String.fromCharCode(65 + optIdx);
          const text = optStr.replace(/^\(.\)\s*/, '');
          return {
            id,
            text,
            isCorrect: optIdx === q.correctOptionIndex
          };
        }),
        imageUrl: q.diagramBox ? cropDiagram(pageImg, q.diagramBox) : undefined,
        metadata: { 
          topic: q.topic,
          difficulty: q.difficulty?.toLowerCase(),
          bloomLevel: q.blooms,
          domain: q.domain,
          isPastYear: true, 
          source: "Expert Digitizer",
          year: "2024"
        }
      }));
      
      if (onProgress) onProgress(i + 1, pages.length, mapped.length);
      return mapped;
    } catch (e) {
      console.error(`Page ${i+1} parse fail:`, e);
      return [];
    }
  };

  const results = await processInParallel(pages, (page, i) => processPage(page, i), 5); // Increased concurrency
  return results.flat();
};

export const generateFullAssetPackage = async (question: Question): Promise<Question> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Analyze this board exam question: "${question.text}"
    Subject: ${question.subject}
    
    Provide:
    1. Step-by-step solution logic (steps) with LaTeX.
       - Each step MUST be an object with: "text", "pitfall" (common student mistake at this step), and "reminder" (key formula or concept to remember).
    2. A final strategic tip (finalTip) for speed or accuracy.
    3. SmartNotes for visual anchoring and quick revision.
    
    Return JSON format matching the types.
  `;

  try {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", temperature: 0.1 }
    }));
    const result = JSON.parse(response.text || "{}");
    return { ...question, ...result };
  } catch (e) {
    return question;
  }
};

export const processInParallel = async <T, R>(
  items: T[], 
  task: (item: T, index: number) => Promise<R>, 
  concurrency = 4
): Promise<R[]> => {
  const results: R[] = [];
  const batches = [];
  for (let i = 0; i < items.length; i += concurrency) {
    batches.push(items.slice(i, i + concurrency));
  }
  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map((item, idx) => task(item, results.length + idx)));
    results.push(...batchResults);
  }
  return results;
};

export const getSolutionBreakdown = async (question: Question): Promise<any> => {
  const updated = await generateFullAssetPackage(question);
  return updated.solutionData;
};
