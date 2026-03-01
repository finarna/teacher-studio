#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { extractQuestionsFromPDF } from '../lib/pdfExtractor.ts';

const pdfPath = '/Users/apple/FinArna/edujourney---universal-teacher-studio/01-KCET-Board-Exam-Mathematics-M1-2021.pdf';

console.log('Extracting questions from PDF...\n');

const result = await extractQuestionsFromPDF(pdfPath, {
  subject: 'Mathematics',
  exam_context: 'KCET'
});

const questionsToCheck = [18, 20, 21];

console.log('═'.repeat(80));
console.log('Fresh PDF Extraction - Questions 18, 20, 21');
console.log('═'.repeat(80));
console.log();

for (const qNum of questionsToCheck) {
  const q = result.questions.find(q => q.question_order === qNum);

  if (q) {
    console.log(`Q${qNum}:`);
    console.log(`Text: ${q.text}`);
    console.log();
    console.log('Options:');
    q.options.forEach((opt, i) => {
      console.log(`  ${String.fromCharCode(65 + i)}) ${opt}`);
    });
    console.log();
    console.log('─'.repeat(80));
    console.log();
  }
}
