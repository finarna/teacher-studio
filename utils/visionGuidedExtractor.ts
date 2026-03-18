/**
 * Vision-Guided Image Extraction
 *
 * Uses Gemini's visual understanding to locate diagrams in PDFs,
 * then renders those specific regions as images.
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

// Set worker source for pdf.js
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface VisualBoundingBox {
  pageNumber: number; // 1-indexed
  x: string; // Percentage from left edge, e.g. "10%"
  y: string; // Percentage from top edge, e.g. "45%"
  width: string; // Width as percentage, e.g. "80%"
  height: string; // Height as percentage, e.g. "25%"
}

// Parse a bounding-box coordinate that Gemini may return as:
//   "21%"  → 0.21   (percentage with % sign — expected)
//   "21"   → 0.21   (percentage 0-100, % sign omitted)
//   "0.21" → 0.21   (already a 0-1 ratio)
//   "210"  → normalized by un-scaled page dimension (PDF point coordinate)
// 🚨 GEMINI-NATIVE COORDINATE PARSING
// Gemini 1.5/2.0 best handles normalized coordinates in 0-1000 range.
// We prioritize:
// 1. Strings with % (e.g. "21%") -> divided by 100
// 2. Numbers in 0-1 range -> use as is
// 3. Numbers in 1-1000 range -> divided by 1000 (Gemini's native vision scale)
// 4. Large numbers (> 1500) -> likely PDF points, divided by pageSize
function parsePercentage(value: string | number, pageSize?: number): number {
  if (value === undefined || value === null) return 0;
  const str = value.toString();
  const hasPercent = str.includes('%');
  const raw = parseFloat(str.replace('%', ''));
  if (isNaN(raw)) return 0;

  if (hasPercent) return raw / 100;
  if (raw <= 1.0) return raw;
  if (raw <= 1000) return raw / 1000; // Gemini Native Scale priority
  if (pageSize && raw > 1000) return raw / pageSize;
  return raw / 1000; 
}

export interface ExtractedVisualImage {
  questionNumber: number;
  imageData: string; // base64 data URL
  pageNumber: number;
  x: string;
  y: string;
  width: string;
  height: string;
}

/**
 * Extract images from PDF based on Gemini's visual bounding boxes.
 */
export async function extractImagesByBoundingBoxes(
  file: File,
  questionVisuals: Array<{ questionNumber: number; boundingBox: VisualBoundingBox; questionX?: number }>,
  onProgress?: (index: number, total: number) => void,
  layout: 'single' | 'double' = 'double'
): Promise<Map<number, ExtractedVisualImage[]>> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const imageMap = new Map<number, ExtractedVisualImage[]>();
  
  const pageCache = new Map<number, { canvas: HTMLCanvasElement; viewport: any }>();

  for (let i = 0; i < questionVisuals.length; i++) {
    const { questionNumber, boundingBox, questionX } = questionVisuals[i];
    onProgress?.(i, questionVisuals.length);

    try {
      const { pageNumber, x, y, width, height } = boundingBox;
      const pNum = typeof pageNumber === 'string' ? parseInt(pageNumber) : pageNumber;

      if (!pageCache.has(pNum)) {
        const page = await pdf.getPage(pNum);
        const viewport = page.getViewport({ scale: 4.0 }); // Increased to 4x for extreme clarity
        
        const renderCanvas = document.createElement('canvas');
        const renderContext = renderCanvas.getContext('2d', { alpha: false });
        renderCanvas.width = viewport.width;
        renderCanvas.height = viewport.height;
        
        if (renderContext) {
          renderContext.fillStyle = 'white';
          renderContext.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
          await page.render({ canvasContext: renderContext, viewport, intent: 'display' }).promise;
          pageCache.set(pNum, { canvas: renderCanvas, viewport });
        }
      }

      const cachedMap = pageCache.get(pNum);
      if (!cachedMap) continue;

      const { canvas: renderCanvas, viewport } = cachedMap;
      const pageW = viewport.width / 4.0;
      const pageH = viewport.height / 4.0;

      let xFrac = parsePercentage(x, pageW);
      let yFrac = parsePercentage(y, pageH);
      let wFrac = parsePercentage(width, pageW);
      let hFrac = parsePercentage(height, pageH);

      // --- COLUMN-AWARE REFINEMENT (LIGHT-TOUCH ONLY) ---
      if (layout === 'double' && questionX !== undefined && pageW > 0) {
        let normalizedQX = questionX;
        if (questionX <= 1.0) normalizedQX = questionX * pageW;
        else if (questionX <= 100.0) normalizedQX = (questionX / 100) * pageW;
        
        const isRightCol = normalizedQX >= (pageW * 0.50);

        // We only "snap" if Gemini is completely in the wrong side or the box is massive
        if (isRightCol && xFrac + wFrac < 0.40) {
            xFrac = 0.52; // Fallback to right side
            wFrac = 0.45;
        } else if (!isRightCol && xFrac > 0.60) {
            xFrac = 0.02; // Fallback to left side
            wFrac = 0.45;
        }
      } else {
        wFrac = Math.min(wFrac, 1.0 - xFrac);
      }

      // Broader padding for bilingual/handwritten-style scans
      const padW = 0.04; // 4%
      const padH = 0.05; // 5%
      
      xFrac = Math.max(0, xFrac - padW / 2);
      wFrac = Math.min(1.0 - xFrac, wFrac + padW);
      yFrac = Math.max(0, yFrac - padH / 2);
      hFrac = Math.min(1.0 - yFrac, hFrac + padH);

      const xPercent = Math.max(0, Math.min(xFrac, 0.99));
      const yPercent = Math.max(0, Math.min(yFrac, 0.99));
      const widthPercent  = Math.max(0.01, Math.min(wFrac, 1.0 - xPercent));
      const heightPercent = Math.max(0.01, Math.min(hFrac, 1.0 - yPercent));

      // SANITY: Enforce minimum pixels (prevent noise crops)
      const minPixelDim = 80;
      let widthPixel = Math.floor(viewport.width * widthPercent);
      let heightPixel = Math.floor(viewport.height * heightPercent);
      
      if (widthPixel < minPixelDim || heightPixel < minPixelDim) {
         widthPixel = Math.max(widthPixel, minPixelDim);
         heightPixel = Math.max(heightPixel, minPixelDim);
      }

      const xPixel = Math.floor(viewport.width * xPercent);
      const yPixel = Math.floor(viewport.height * yPercent);

      // Create output canvas for the region
      const outputCanvas = document.createElement('canvas');
      const outputContext = outputCanvas.getContext('2d');
      outputCanvas.width = widthPixel;
      outputCanvas.height = heightPixel;

      if (outputContext) {
        outputContext.drawImage(
          renderCanvas,
          xPixel, yPixel, widthPixel, heightPixel,
          0, 0, widthPixel, heightPixel
        );
      }

      // Use JPEG with 0.95 quality — significantly better for scanned PDF textures
      const imageDataUrl = outputCanvas.toDataURL('image/jpeg', 0.95);

      if (!imageMap.has(questionNumber)) {
        imageMap.set(questionNumber, []);
      }

      imageMap.get(questionNumber)!.push({
        questionNumber,
        imageData: imageDataUrl,
        pageNumber: pNum,
        x: (xPercent * 100).toFixed(1) + '%',
        y: (yPercent * 100).toFixed(1) + '%',
        width: (widthPercent * 100).toFixed(1) + '%',
        height: (heightPercent * 100).toFixed(1) + '%'
      });

      console.log(`✅ [VISION-GUIDED] Extracted Q${questionNumber} visual from page ${pNum} | scale:4.0 | quality:0.95`);
    } catch (err) {
      console.error(`❌ [VISION-GUIDED] Failed to extract Q${questionNumber}:`, err);
    }
  }

  // Cleanup cache to free memory
  pageCache.clear();

  console.log('✅ [VISION-GUIDED] Complete:', imageMap.size, 'questions have extracted visuals');
  return imageMap;
}

