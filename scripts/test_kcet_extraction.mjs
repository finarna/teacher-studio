/**
 * Test KCET Math 2021 PDF Extraction
 * Verifies all 60 questions are extracted with detailed logging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the extractor
const extractorPath = path.join(__dirname, '../utils/simpleMathExtractor.ts');
const { extractQuestionsFromPDF } = await import(extractorPath);

async function testKCETExtraction() {
  const pdfPath = path.join(__dirname, '../01-KCET-Board-Exam-Mathematics-M1-2021.pdf');

  console.log('🧪 Testing KCET Math 2021 PDF Extraction\n');
  console.log(`📄 PDF: ${path.basename(pdfPath)}\n`);

  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF not found at:', pdfPath);
    process.exit(1);
  }

  try {
    // Read PDF file
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = new Uint8Array(pdfBuffer);

    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    console.log(`📊 PDF Info:`);
    console.log(`   Total pages: ${pdf.numPages}\n`);

    // Extract pages as images
    console.log('🔄 Extracting page images...\n');
    const pageImages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });

      // Create canvas
      const { createCanvas } = await import('canvas');
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      pageImages.push(dataUrl);

      console.log(`   ✓ Page ${i}/${pdf.numPages} extracted`);
    }

    console.log('\n🤖 Running AI extraction with simpleMathExtractor...\n');
    console.log('=' .repeat(60));

    // Run extraction (this will show our detailed logs)
    const questions = await extractQuestionsFromPDF(pageImages, {
      onProgress: (progress) => {
        console.log(`Progress: ${progress}%`);
      }
    });

    console.log('='.repeat(60));
    console.log('\n📋 EXTRACTION RESULTS:\n');

    if (questions && questions.length > 0) {
      console.log(`✅ Total questions extracted: ${questions.length}`);
      console.log(`📊 Expected: 60 questions`);

      if (questions.length === 60) {
        console.log(`\n🎉 SUCCESS! All 60 questions extracted!\n`);
      } else if (questions.length < 60) {
        console.log(`\n⚠️  WARNING: Missing ${60 - questions.length} questions\n`);
      } else {
        console.log(`\n⚠️  WARNING: Extracted ${questions.length - 60} extra questions\n`);
      }

      // Show question details
      console.log('📝 Question Breakdown:');
      questions.slice(0, 5).forEach((q, i) => {
        console.log(`   Q${i + 1}: ${q.text?.substring(0, 80)}...`);
        console.log(`       Topic: ${q.topic || 'N/A'}, Difficulty: ${q.difficulty || 'N/A'}`);
      });

      if (questions.length > 5) {
        console.log(`   ... and ${questions.length - 5} more questions\n`);
      }

      // Check for LaTeX issues
      console.log('🔍 LaTeX Check:');
      let latexIssues = 0;
      questions.forEach((q, i) => {
        if (q.text?.includes('\\b\\') || q.text?.includes('\\\\begin')) {
          console.log(`   ⚠️  Q${i + 1}: Contains LaTeX corruption patterns`);
          latexIssues++;
        }
      });

      if (latexIssues === 0) {
        console.log(`   ✅ No LaTeX corruption detected!`);
      } else {
        console.log(`   ❌ Found ${latexIssues} questions with LaTeX issues`);
      }

    } else {
      console.log('❌ No questions extracted!');
    }

    console.log('\n✅ Test complete!\n');

  } catch (error) {
    console.error('\n❌ Extraction failed:');
    console.error(error);
    process.exit(1);
  }
}

testKCETExtraction();
