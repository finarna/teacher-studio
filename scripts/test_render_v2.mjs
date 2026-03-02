
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pkg from 'canvas';
const { createCanvas, Image, Canvas } = pkg;

// Polyfill for pdfjs-dist in Node.js
global.Image = Image;
global.Canvas = Canvas;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testRender() {
    const pdfPath = path.join(__dirname, '../01-KCET-Board-Exam-Mathematics-M1-2021.pdf');
    const data = new Uint8Array(fs.readFileSync(pdfPath));

    const loadingTask = pdfjsLib.getDocument({
        data,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    console.log('Rendering...');
    try {
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        console.log('✅ Success!');
    } catch (e) {
        console.error('❌ Failed:', e.message);
        if (e.stack) console.error(e.stack);
    }
}

testRender();
