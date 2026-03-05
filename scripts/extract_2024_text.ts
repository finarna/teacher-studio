
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractTextFromPdf(pdfPath: string) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true
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

const PDF_PATH = './KCET_2024_Mathematics_Question_Paper_81dab7bc618896a8c141c546b4b6321f.pdf';
const OUTPUT_PATH = './actual_2024_text.txt';

extractTextFromPdf(PDF_PATH).then(text => {
    fs.writeFileSync(OUTPUT_PATH, text);
    console.log(`✅ Text extracted to ${OUTPUT_PATH}`);
}).catch(console.error);
