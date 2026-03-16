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
function parsePercentage(value: string, pageSize?: number): number {
  const raw = parseFloat((value || '0').replace('%', ''));
  if (isNaN(raw)) return 0;
  if (raw <= 1.0) return raw;           // already 0-1 ratio
  if (raw <= 100) return raw / 100;     // percentage 0-100
  // PDF point coordinate — normalize by un-scaled page dimension if available
  return pageSize ? Math.min(raw / pageSize, 1.0) : 1.0;
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
 *
 * questionX: the question's actual X position in PDF points (from pdfImageExtractor's
 *   item.transform[4]). Used to determine which column a question is in for 2-column PDFs,
 *   so we can correct Gemini's often-wrong x/width values.
 */
export async function extractImagesByBoundingBoxes(
  file: File,
  questionVisuals: Array<{ questionNumber: number; boundingBox: VisualBoundingBox; questionX?: number }>,
  onProgress?: (index: number, total: number) => void
): Promise<Map<number, ExtractedVisualImage[]>> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const imageMap = new Map<number, ExtractedVisualImage[]>();

  console.log('🎯 [VISION-GUIDED] Extracting images for', questionVisuals.length, 'questions with visuals');

  for (let i = 0; i < questionVisuals.length; i++) {
    const { questionNumber, boundingBox, questionX } = questionVisuals[i];
    onProgress?.(i, questionVisuals.length);

    try {
      const { pageNumber, x, y, width, height } = boundingBox;

      // Get the page
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality

      // Un-scaled page dimensions (viewport is at 2x scale)
      const pageW = viewport.width / 2.0;
      const pageH = viewport.height / 2.0;

      // Calculate initial fractions — robust to %, bare 0-100, or PDF point values
      let xFrac = parsePercentage(x, pageW);
      const yFrac = parsePercentage(y, pageH);
      let wFrac = parsePercentage(width, pageW);
      let hFrac = parsePercentage(height, pageH);

      // --- COLUMN-AWARE HORIZONTAL CORRECTION ---
      // Gemini returns bounding-box x/width in an internal image coordinate space that is
      // wider than the actual PDF (~850pt vs 595pt), causing right-column crops to overflow.
      // When we know which column the question lives in (questionX from pdfImageExtractor),
      // we constrain the horizontal crop to that column's safe bounds.
      if (questionX !== undefined && pageW > 0) {
        // Column divider sits at ~50% of page width (left col ~10%, right col ~57% for KCET A4)
        const colThreshold = pageW * 0.50;
        const isRightCol = questionX >= colThreshold;

        if (isRightCol) {
          // Right column: crop must be in the right half
          const rcStart = 0.52;
          const rcEnd   = 0.98;
          if (xFrac < 0.45 || xFrac + wFrac > 1.05) {
            // Gemini placed crop in wrong area or it overflows — use full right column
            xFrac = rcStart;
            wFrac = rcEnd - rcStart;
          } else {
            // x looks plausible; just clamp width to stay on page
            wFrac = Math.min(wFrac, rcEnd - xFrac);
          }
        } else {
          // Left column: crop must be in the left half
          const lcStart = 0.02;
          const lcEnd   = 0.50;
          if (xFrac > 0.55 || xFrac + wFrac > 0.60) {
            // Gemini placed crop in wrong column or overflows into right — use full left column
            xFrac = lcStart;
            wFrac = lcEnd - lcStart;
          } else {
            // x looks plausible; clamp width to stay within left column
            wFrac = Math.min(wFrac, lcEnd - xFrac);
          }
        }
        console.log(`📐 [VISION-GUIDED] Q${questionNumber}: ${isRightCol ? 'RIGHT' : 'LEFT'} col correction → x=${xFrac.toFixed(3)} w=${wFrac.toFixed(3)}`);
      } else {
        // No column info — just clamp to avoid overflow
        wFrac = Math.min(wFrac, 1.0 - xFrac);
      }

      // Height: add 5% padding (bottom labels) but never exceed page bottom
      hFrac = Math.min(1.0 - yFrac, hFrac + 0.05);
      // Safety clamps
      const xPercent = Math.max(0, Math.min(xFrac, 0.99));
      const yPercent = Math.max(0, Math.min(yFrac, 0.99));
      const widthPercent  = Math.max(0.01, Math.min(wFrac, 1.0 - xPercent));
      const heightPercent = Math.max(0.01, Math.min(hFrac, 1.0 - yPercent));

      const xPixel = Math.floor(viewport.width * xPercent);
      const yPixel = Math.floor(viewport.height * yPercent);
      const widthPixel = Math.floor(viewport.width * widthPercent);
      const heightPixel = Math.floor(viewport.height * heightPercent);

      // Create canvas for the extracted region
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = widthPixel;
      canvas.height = heightPixel;

      if (!context) {
        console.warn(`⚠️ [VISION-GUIDED] Could not get canvas context for Q${questionNumber}`);
        continue;
      }

      // Render full page first
      const renderCanvas = document.createElement('canvas');
      const renderContext = renderCanvas.getContext('2d');
      renderCanvas.width = viewport.width;
      renderCanvas.height = viewport.height;

      if (!renderContext) continue;

      await page.render({
        canvasContext: renderContext,
        viewport: viewport
      }).promise;

      // Copy the specific region to our output canvas
      context.drawImage(
        renderCanvas,
        xPixel, yPixel, // source x, y
        widthPixel, heightPixel, // source width, height
        0, 0, // dest x, y
        widthPixel, heightPixel // dest width, height
      );

      const imageDataUrl = canvas.toDataURL('image/png');

      if (!imageMap.has(questionNumber)) {
        imageMap.set(questionNumber, []);
      }

      imageMap.get(questionNumber)!.push({
        questionNumber,
        imageData: imageDataUrl,
        pageNumber,
        x,
        y,
        width,
        height
      });

      console.log(`✅ [VISION-GUIDED] Extracted Q${questionNumber} visual from page ${pageNumber} at (${x}, ${y}) size ${width}×${height}`);
    } catch (err) {
      console.error(`❌ [VISION-GUIDED] Failed to extract Q${questionNumber}:`, err);
    }
  }

  console.log('✅ [VISION-GUIDED] Complete:', imageMap.size, 'questions have extracted visuals');
  return imageMap;
}
