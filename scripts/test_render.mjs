
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pkg from 'canvas';
const { createCanvas } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
    const pdfPath = path.join(__dirname, '../01-KCET-Board-Exam-Mathematics-M1-2021.pdf');
    const data = new Uint8Array(fs.readFileSync(pdfPath));

    const loadingTask = pdfjsLib.getDocument({
        data,
        standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/')
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('page1.png', buffer);
    console.log('✅ Page 1 saved as page1.png');
}

run().catch(console.error);
