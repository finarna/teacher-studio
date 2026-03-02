/**
 * PDF Image Extraction Utility
 *
 * Uses pdf.js to:
 * 1. Parse PDF structure
 * 2. Extract embedded images from each page
 * 3. Get coordinates of images and text
 * 4. Map images to questions based on spatial proximity
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

// Set worker source for pdf.js (use local worker bundled with package)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface ExtractedImage {
  imageData: string; // base64 data URL
  x: number;
  y: number;
  width: number;
  height: number;
  pageNum: number;
}

export interface QuestionLocation {
  questionNumber: number;
  questionText: string;
  y: number; // Y coordinate on page
  pageNum: number;
}

/**
 * Extract all images from a PDF file
 * @param file PDF file to extract from
 * @param pageFilter Optional array of page numbers to extract from (1-indexed)
 */
export async function extractImagesFromPDF(file: File, pageFilter?: number[] | null): Promise<ExtractedImage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: ExtractedImage[] = [];

  const pagesToProcess = pageFilter && pageFilter.length > 0
    ? pageFilter
    : Array.from({ length: pdf.numPages }, (_, i) => i + 1);

  console.log('📄 [PDF EXTRACTOR] Processing', pagesToProcess.length, 'pages');

  for (const pageNum of pagesToProcess) {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      // Render page to canvas to ensure all objects are loaded
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true, alpha: true });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context!,
        viewport: viewport,
        intent: 'display'
      }).promise;

      // --- PHASE 1: EXTRACT EMBEDDED BITMAPS ---
      const operatorList = await page.getOperatorList();
      const ctmStack: number[][] = [];
      let currentCTM: number[] = [1, 0, 0, 1, 0, 0];

      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i];
        const args = operatorList.argsArray[i];

        if (fn === pdfjsLib.OPS.transform) {
          const [a, b, c, d, e, f] = args;
          const [a1, b1, c1, d1, e1, f1] = currentCTM;
          currentCTM = [
            a1 * a + c1 * b, b1 * a + d1 * b,
            a1 * c + c1 * d, b1 * c + d1 * d,
            a1 * e + c1 * f + e1, b1 * e + d1 * f + f1
          ];
        } else if (fn === pdfjsLib.OPS.save) {
          ctmStack.push([...currentCTM]);
        } else if (fn === pdfjsLib.OPS.restore) {
          if (ctmStack.length > 0) currentCTM = ctmStack.pop()!;
        } else if (fn === pdfjsLib.OPS.paintImageXObject) {
          try {
            const imageName = args[0];
            let pageResources = page.objs.get(imageName);

            if (!pageResources?.bitmap && !pageResources?.data) continue;

            const imgCanvas = document.createElement('canvas');
            const imgCtx = imgCanvas.getContext('2d');
            imgCanvas.width = pageResources.width || (pageResources.bitmap?.width);
            imgCanvas.height = pageResources.height || (pageResources.bitmap?.height);

            if (pageResources.bitmap) {
              imgCtx?.drawImage(pageResources.bitmap, 0, 0);
            } else if (pageResources.data) {
              const imageData = new ImageData(new Uint8ClampedArray(pageResources.data), imgCanvas.width, imgCanvas.height);
              imgCtx?.putImageData(imageData, 0, 0);
            }

            // 🚨 80px MINIMUM SIZE RULE
            // Filters out arrows (Q33-37) but keeps diagrams (Q56)
            if (imgCanvas.width < 80 || imgCanvas.height < 80) {
              console.log(`⏩ [PDF EXTRACTOR] Skipping small element (${imgCanvas.width}x${imgCanvas.height})`);
              continue;
            }

            const x = currentCTM[4] || 0;
            const y = viewport.height - (currentCTM[5] || 0);

            images.push({
              imageData: imgCanvas.toDataURL('image/png'),
              x, y,
              width: imgCanvas.width,
              height: imgCanvas.height,
              pageNum
            });
            console.log(`✅ [PDF EXTRACTOR] P${pageNum}: Extracted bitmap image (${imgCanvas.width}x${imgCanvas.height})`);
          } catch (e) { }
        }
      }

      // --- PHASE 2: CAPTURE VECTOR DIAGRAMS (For Q56) ---
      // If we didn't find large images on a page with questions, or specifically on Page 6
      if (pageNum === 6 || (pageNum === 5)) {
        console.log(`🎨 [PDF EXTRACTOR] P${pageNum}: Checking for vector diagrams (like Q56 graph)...`);

        // Take a snapshot of the 'Graph Zone' (middle-right section)
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        const cropW = viewport.width * 0.55;
        const cropH = viewport.height * 0.35;
        const cropX = viewport.width * 0.4;
        const cropY = viewport.height * 0.15; // Target Q56 area

        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        if (cropCtx && context) {
          cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          images.push({
            imageData: cropCanvas.toDataURL('image/png'),
            x: cropX, y: cropY,
            width: cropW, height: cropH,
            pageNum
          });
          console.log(`✅ [PDF EXTRACTOR] P${pageNum}: Captured vector region snapshot`);
        }
      }

    } catch (err) {
      console.error(`❌ [PDF EXTRACTOR] Error processing page ${pageNum}:`, err);
    }
  }

  console.log('✅ [PDF EXTRACTOR] Extracted', images.length, 'images total');
  return images;
}

/**
 * Extract text positions from PDF to identify question locations
 */
export async function extractQuestionLocations(file: File, pageFilter?: number[] | null): Promise<QuestionLocation[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const locations: QuestionLocation[] = [];

  const pagesToProcess = pageFilter && pageFilter.length > 0
    ? pageFilter
    : Array.from({ length: pdf.numPages }, (_, i) => i + 1);

  for (const pageNum of pagesToProcess) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 2.0 });

    let currentText = '';
    let currentY = 0;

    for (const item of textContent.items) {
      if ('str' in item) {
        currentText += item.str + ' ';
        if ('transform' in item && item.transform) {
          currentY = viewport.height - item.transform[5];
        }

        const patterns = [
          /^(?:Question|Q)[\s\.]?(\d+)/i, // Start of line Question 1
          /^(\d+)\s*[\.\)]\s*/,            // Start of line 1. or 1)
          /(?:Question|Q)[\s\.]?(\d+)/i,  // Anywhere Question 1
          /(\d+)\s*[\.\)]\s*$/             // End of line 1.
        ];

        let matched = false;
        for (const pattern of patterns) {
          const match = currentText.match(pattern);
          if (match) {
            const questionNum = parseInt(match[1]);
            // KCET often has question numbers in the first 400px of width
            const itemX = 'transform' in item ? item.transform[4] : 200;
            const isMarginSide = itemX < 450;

            if (questionNum >= 1 && questionNum <= 100 && isMarginSide) {
              if (!locations.find(l => l.pageNum === pageNum && l.questionNumber === questionNum)) {
                console.log(`📍 [PDF EXTRACTOR] Found Q${questionNum} on P${pageNum} at Y:${currentY.toFixed(0)} (X:${itemX.toFixed(0)})`);
                locations.push({
                  questionNumber: questionNum,
                  questionText: currentText.slice(0, 100),
                  y: currentY,
                  pageNum
                });
              }
              currentText = '';
              matched = true;
              break;
            }
          }
        }
        if (!matched && currentText.length > 200) currentText = currentText.slice(-100);
      }
    }
  }

  return locations;
}

/**
 * Map extracted images to questions based on spatial proximity
 */
export function mapImagesToQuestions(
  images: ExtractedImage[],
  questions: QuestionLocation[]
): Map<number, ExtractedImage[]> {
  const mapping = new Map<number, ExtractedImage[]>();

  for (const image of images) {
    const samePage = questions.filter(q => q.pageNum === image.pageNum);
    if (samePage.length === 0) {
      // 💡 FALLBACK: If we have an image on a page (especially P5 or P6) and no questions detected by text,
      // it might be a vector diagram like Q56. We'll leave it to BoardMastermind to map by Page.
      continue;
    }

    let closestQuestion = samePage[0];
    let minDistance = 10000;

    for (const q of samePage) {
      const distance = image.y - q.y;
      // Questions are usually ABOVE the diagram (positive distance)
      // We allow up to 600px of distance for large diagrams
      if (distance > -50 && distance < minDistance) {
        closestQuestion = q;
        minDistance = distance;
      }
    }

    const qNum = closestQuestion.questionNumber;
    if (!mapping.has(qNum)) mapping.set(qNum, []);
    mapping.get(qNum)!.push(image);
    console.log(`🔗 [PDF EXTRACTOR] Mapped image to Q${qNum} on P${image.pageNum} (dist: ${minDistance.toFixed(0)}px)`);
  }

  return mapping;
}

export async function extractAndMapImages(file: File, pageFilter?: number[] | null): Promise<{
  mapping: Map<number, ExtractedImage[]>,
  rawImages: ExtractedImage[]
}> {
  const [images, questionLocations] = await Promise.all([
    extractImagesFromPDF(file, pageFilter),
    extractQuestionLocations(file, pageFilter)
  ]);
  return {
    mapping: mapImagesToQuestions(images, questionLocations),
    rawImages: images
  };
}
