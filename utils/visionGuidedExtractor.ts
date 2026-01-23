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

// Helper to parse percentage string to decimal
function parsePercentage(percent: string): number {
  return parseFloat(percent.replace('%', '')) / 100;
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
 * Extract images from PDF based on Gemini's visual bounding boxes
 */
export async function extractImagesByBoundingBoxes(
  file: File,
  questionVisuals: Array<{ questionNumber: number; boundingBox: VisualBoundingBox }>
): Promise<Map<number, ExtractedVisualImage[]>> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const imageMap = new Map<number, ExtractedVisualImage[]>();

  console.log('🎯 [VISION-GUIDED] Extracting images for', questionVisuals.length, 'questions with visuals');

  for (const { questionNumber, boundingBox } of questionVisuals) {
    try {
      const { pageNumber, x, y, width, height } = boundingBox;

      // Get the page
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality

      // Calculate exact pixel coordinates from percentages
      const xPercent = parsePercentage(x);
      const yPercent = parsePercentage(y);
      const widthPercent = parsePercentage(width);
      const heightPercent = parsePercentage(height);

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
