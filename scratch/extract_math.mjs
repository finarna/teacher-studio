import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractTextFromPdf(pdfPath) {
    if (!fs.existsSync(pdfPath)) return `FILE NOT FOUND: ${pdfPath}`;
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
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += `--- PAGE ${i} ---\n${pageText}\n\n`;
    }
    return fullText;
}

const files = [
    { name: 'real', path: '/Users/apple/FinArna/edujourney---universal-teacher-studio/REAL_2026_KCET/Math_2026_real.pdf' },
    { name: 'setA', path: '/Users/apple/FinArna/edujourney---universal-teacher-studio/REAL_2026_KCET/maths_setA.pdf' },
    { name: 'setB', path: '/Users/apple/FinArna/edujourney---universal-teacher-studio/REAL_2026_KCET/maths_setB.pdf' }
];

async function main() {
    for (const file of files) {
        console.log(`Extracting ${file.name}...`);
        const text = await extractTextFromPdf(file.path);
        fs.writeFileSync(`./scratch/extracted_${file.name}.txt`, text);
        console.log(`✅ ${file.name} saved.`);
    }
}

main().catch(err => console.error(err));
