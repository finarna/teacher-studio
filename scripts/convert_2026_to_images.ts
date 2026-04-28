
import fs from 'fs';
import { createCanvas } from 'canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function convertPdfToImages(pdfPath: string, prefix: string) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjs.getDocument({
        data,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    const numPages = Math.min(pdf.numPages, 3); // Just first 3 pages to get the gist

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(`./REAL_2026_${prefix}_PAGE_${i}.png`, buffer);
        console.log(`✅ Saved ${prefix} page ${i}`);
    }
}

const realPapers = [
    { name: 'PHYSICS', path: '/Users/apple/FinArna/edujourney---universal-teacher-studio/REAL_2026_KCET/Physics_2026_real.pdf' },
    { name: 'BIOLOGY', path: '/Users/apple/FinArna/edujourney---universal-teacher-studio/REAL_2026_KCET/Biology_2026_real.pdf' },
    { name: 'CHEMISTRY', path: '/Users/apple/FinArna/edujourney---universal-teacher-studio/REAL_2026_KCET/chemistry_2026_real_1.pdf' },
    { name: 'MATH', path: '/Users/apple/FinArna/edujourney---universal-teacher-studio/REAL_2026_KCET/Math_2026_real.pdf' }
];

async function run() {
    for (const paper of realPapers) {
        try {
            console.log(`Converting ${paper.name}...`);
            await convertPdfToImages(paper.path, paper.name);
        } catch (err) {
            console.error(`❌ Failed to convert ${paper.name}:`, err);
        }
    }
}

run();
