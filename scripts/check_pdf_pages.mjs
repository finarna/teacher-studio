/**
 * Check PDF pages 3 and 5 to see why extraction failed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkPDFPages() {
  const pdfPath = path.join(__dirname, '../01-KCET-Board-Exam-Mathematics-M1-2021.pdf');

  console.log('🔍 Checking PDF Pages 3 and 5\n');

  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfData = new Uint8Array(pdfBuffer);

  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;

  console.log(`📄 Total pages: ${pdf.numPages}\n`);

  // Check pages 1, 2, 3, 4
  for (const pageNum of [1, 2, 3, 4]) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 PAGE ${pageNum}`);
    console.log('='.repeat(60));

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    console.log(`\n📐 Page Dimensions:`);
    console.log(`   Width: ${viewport.width}px`);
    console.log(`   Height: ${viewport.height}px`);
    console.log(`   Rotation: ${viewport.rotation}°`);

    // Get text content
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');

    console.log(`\n📝 Text Content (first 500 chars):`);
    console.log(text.substring(0, 500));
    console.log(`\n   Total text length: ${text.length} characters`);
    console.log(`   Total text items: ${textContent.items.length}`);

    // Check for question numbers
    const questionNumbers = text.match(/\b\d+\.\s/g) || [];
    console.log(`\n🔢 Question numbers found: ${questionNumbers.length}`);
    if (questionNumbers.length > 0) {
      console.log(`   Numbers: ${questionNumbers.slice(0, 10).join(', ')}`);
    }

    // Check page structure
    console.log(`\n🏗️ Page Structure:`);
    const hasMultipleColumns = text.includes('  ') && text.split('  ').length > 10;
    console.log(`   Likely multi-column: ${hasMultipleColumns}`);

    // Check for mathematical symbols
    const mathSymbols = text.match(/[∫∑∏√∞≤≥≠±×÷]/g) || [];
    console.log(`   Math symbols count: ${mathSymbols.length}`);

    // Get operators (images/graphics count)
    const ops = await page.getOperatorList();
    const imageOps = ops.fnArray.filter((fn, i) =>
      fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject
    );
    console.log(`   Images/graphics: ${imageOps.length}`);
  }

  console.log('\n\n✅ Analysis complete\n');
}

checkPDFPages().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
