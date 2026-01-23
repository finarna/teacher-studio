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

  console.log('📄 [PDF EXTRACTOR] Processing', pagesToProcess.length, 'pages',
    pageFilter ? `(filtered: ${pageFilter.join(', ')})` : '(all pages)');

  for (const pageNum of pagesToProcess) {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });

      // Render page to canvas to ensure all objects are loaded
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context!,
        viewport: viewport
      }).promise;

      // Now get operator list after rendering
      const operatorList = await page.getOperatorList();

      // Track current transformation matrix (CTM) as we iterate
      // CTM stack for save/restore operations
      const ctmStack: number[][] = [];
      let currentCTM: number[] = [1, 0, 0, 1, 0, 0]; // Identity matrix [a, b, c, d, e, f]

      // Find image operations in the page
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i];
        const args = operatorList.argsArray[i];

        // Track transformation operations
        if (fn === pdfjsLib.OPS.transform) {
          // Multiply current CTM with new transform
          const [a, b, c, d, e, f] = args;
          const [a1, b1, c1, d1, e1, f1] = currentCTM;
          currentCTM = [
            a1 * a + c1 * b,
            b1 * a + d1 * b,
            a1 * c + c1 * d,
            b1 * c + d1 * d,
            a1 * e + c1 * f + e1,
            b1 * e + d1 * f + f1
          ];
        } else if (fn === pdfjsLib.OPS.save) {
          // Save current CTM to stack
          ctmStack.push([...currentCTM]);
        } else if (fn === pdfjsLib.OPS.restore) {
          // Restore CTM from stack
          if (ctmStack.length > 0) {
            currentCTM = ctmStack.pop()!;
          }
        } else if (fn === pdfjsLib.OPS.paintImageXObject) {
          // OPS.paintImageXObject = image drawing operation
          try {
            const imageName = args[0];

            // Try to get the image, but skip if not available
            let pageResources;
            try {
              pageResources = page.objs.get(imageName);
            } catch (err) {
              // Object not resolved yet - skip this image
              // This happens with some PDF encodings where images load async
              continue;
            }

            if (!pageResources?.bitmap && !pageResources?.data) {
              continue; // No usable image data
            }

            // Create canvas to convert image to base64
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (pageResources.bitmap) {
              // ImageBitmap case
              canvas.width = pageResources.bitmap.width;
              canvas.height = pageResources.bitmap.height;
              ctx?.drawImage(pageResources.bitmap, 0, 0);
            } else if (pageResources.data) {
              // Raw image data case
              canvas.width = pageResources.width || 100;
              canvas.height = pageResources.height || 100;
              const imageData = new ImageData(
                new Uint8ClampedArray(pageResources.data),
                canvas.width,
                canvas.height
              );
              ctx?.putImageData(imageData, 0, 0);
            }

            const imageDataUrl = canvas.toDataURL('image/png');

            // Use current CTM for positioning
            const x = currentCTM[4] || 0;
            const y = viewport.height - (currentCTM[5] || 0); // PDF coords are bottom-up

            // Filter out unwanted images
            const MIN_IMAGE_SIZE = 50; // Skip logos/watermarks smaller than 50x50px
            const HEADER_FOOTER_MARGIN = 0.1; // Skip top/bottom 10% (headers/footers)

            // Skip small images (likely logos/watermarks)
            if (canvas.width < MIN_IMAGE_SIZE || canvas.height < MIN_IMAGE_SIZE) {
              console.log(`⏭️ [PDF EXTRACTOR] Page ${pageNum}: Skipping small image (${canvas.width}x${canvas.height}px)`);
              continue;
            }

            // Skip header/footer regions (top/bottom 10% of page)
            const headerThreshold = viewport.height * HEADER_FOOTER_MARGIN;
            const footerThreshold = viewport.height * (1 - HEADER_FOOTER_MARGIN);
            if (y < headerThreshold || y > footerThreshold) {
              console.log(`⏭️ [PDF EXTRACTOR] Page ${pageNum}: Skipping header/footer image at y=${y.toFixed(0)} (page height=${viewport.height.toFixed(0)})`);
              continue;
            }

            images.push({
              imageData: imageDataUrl,
              x,
              y,
              width: canvas.width,
              height: canvas.height,
              pageNum
            });

            console.log(`✅ [PDF EXTRACTOR] Page ${pageNum}: Extracted image at (${x.toFixed(0)}, ${y.toFixed(0)}) size ${canvas.width}x${canvas.height}px`);
          } catch (err) {
            // Skip images that fail to extract
            // AI descriptions will still work
          }
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
 * @param file PDF file to extract from
 * @param pageFilter Optional array of page numbers to process (1-indexed)
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
    const viewport = page.getViewport({ scale: 1.0 });

    let currentText = '';
    let currentY = 0;

    for (const item of textContent.items) {
      if ('str' in item) {
        currentText += item.str + ' ';
        if ('transform' in item && item.transform) {
          currentY = viewport.height - item.transform[5]; // Convert to top-down coords
        }

        // Detect question numbers with multiple patterns
        // Matches: Q1, Q.1, Q 1, Question 1, 1., 1), (1), etc.
        const patterns = [
          /(?:Question|Q)[\s\.]?(\d+)/i,  // Q1, Q.1, Q 1, Question 1
          /^(\d+)[\.\)]/,                   // 1., 1)
          /\((\d+)\)/,                       // (1)
          /^(\d+)\s+[A-Z]/                   // 1 followed by capital letter
        ];

        let matched = false;
        for (const pattern of patterns) {
          const questionMatch = currentText.match(pattern);
          if (questionMatch) {
            const questionNum = parseInt(questionMatch[1]);
            if (questionNum >= 1 && questionNum <= 100) { // Valid range
              // Check if we already have this question on this page
              const existing = locations.find(l => l.pageNum === pageNum && l.questionNumber === questionNum);
              if (!existing) {
                locations.push({
                  questionNumber: questionNum,
                  questionText: currentText.slice(0, 100), // First 100 chars
                  y: currentY,
                  pageNum
                });
              }
              currentText = ''; // Reset for next question
              matched = true;
              break;
            }
          }
        }

        // Prevent text from growing too large
        if (!matched && currentText.length > 200) {
          currentText = currentText.slice(-100); // Keep last 100 chars
        }
      }
    }
  }

  console.log('📍 [PDF EXTRACTOR] Found', locations.length, 'question locations');
  if (locations.length > 0) {
    console.log('📍 [PDF EXTRACTOR] Sample locations:', locations.slice(0, 3).map(l => ({
      q: l.questionNumber,
      page: l.pageNum,
      text: l.questionText.substring(0, 40) + '...'
    })));
  } else {
    console.warn('⚠️ [PDF EXTRACTOR] No question locations found - images cannot be mapped to questions');
  }
  return locations;
}

/**
 * Map extracted images to questions based on spatial proximity
 *
 * Algorithm:
 * 1. For each image, find the closest question above it (same page)
 * 2. If no question above, find closest question below
 * 3. Associate image with that question
 */
export function mapImagesToQuestions(
  images: ExtractedImage[],
  questions: QuestionLocation[]
): Map<number, ExtractedImage[]> {
  const questionImageMap = new Map<number, ExtractedImage[]>();

  for (const image of images) {
    // Find questions on the same page
    const samePage = questions.filter(q => q.pageNum === image.pageNum);

    if (samePage.length === 0) {
      console.warn('⚠️ [PDF EXTRACTOR] No questions found on page', image.pageNum);
      continue;
    }

    // Find closest question (prefer question above the image)
    let closestQuestion = samePage[0];
    let minDistance = Math.abs(image.y - samePage[0].y);

    for (const q of samePage) {
      const distance = Math.abs(image.y - q.y);

      // Prefer questions above the image (q.y < image.y)
      // Images usually appear below their questions
      if (q.y < image.y && distance < minDistance) {
        closestQuestion = q;
        minDistance = distance;
      } else if (closestQuestion.y > image.y && q.y < image.y) {
        // Switch to question above if we only had questions below
        closestQuestion = q;
        minDistance = distance;
      }
    }

    const qNum = closestQuestion.questionNumber;
    if (!questionImageMap.has(qNum)) {
      questionImageMap.set(qNum, []);
    }
    questionImageMap.get(qNum)!.push(image);

    console.log(`🔗 [PDF EXTRACTOR] Mapped image to Q${qNum} (distance: ${minDistance.toFixed(0)}px)`);
  }

  return questionImageMap;
}

/**
 * Main function: Extract images and map them to question numbers
 * @param file PDF file to extract from
 * @param pageFilter Optional array of page numbers to process (1-indexed)
 */
export async function extractAndMapImages(file: File, pageFilter?: number[] | null): Promise<Map<number, ExtractedImage[]>> {
  console.log('🚀 [PDF EXTRACTOR] Starting image extraction...');

  const [images, questionLocations] = await Promise.all([
    extractImagesFromPDF(file, pageFilter),
    extractQuestionLocations(file, pageFilter)
  ]);

  console.log(`📊 [PDF EXTRACTOR] Found ${images.length} images and ${questionLocations.length} question locations`);

  const mapping = mapImagesToQuestions(images, questionLocations);

  console.log('✅ [PDF EXTRACTOR] Complete:', mapping.size, 'questions have images');
  return mapping;
}
