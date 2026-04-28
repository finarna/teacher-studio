
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractTextFromPdf(pdfPath: string) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjs.getDocument({
        data,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `--- PAGE ${i} ---\n${pageText}\n\n`;
    }

    return fullText;
}

const realPapers = [
    { name: 'Physics', path: '/Users/apple/FinArna/edujourney---universal-teacher-studio/REAL_2026_KCET/Physics_2026_real.pdf' },
    { name: 'Math', path: '/Users/apple/FinArna/edujourney---universal-teacher-studio/REAL_2026_KCET/Math_2026_real.pdf' },
    { name: 'Biology', path: '/Users/apple/FinArna/edujourney---universal-teacher-studio/REAL_2026_KCET/Biology_2026_real.pdf' },
    { name: 'Chemistry', path: '/Users/apple/FinArna/edujourney---universal-teacher-studio/REAL_2026_KCET/chemistry_2026_real_1.pdf' }
];

async function run() {
    for (const paper of realPapers) {
        try {
            console.log(`Extracting ${paper.name}...`);
            const text = await extractTextFromPdf(paper.path);
            fs.writeFileSync(`./REAL_2026_TEXT_${paper.name.toUpperCase()}.txt`, text);
            console.log(`✅ ${paper.name} extracted.`);
        } catch (err) {
            console.error(`❌ Failed to extract ${paper.name}:`, err);
        }
    }
}

run();
