  
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

const pdfPath = '/Users/apple/FinArna/edujourney---universal-teacher-studio/kcet_mathematics_2025_tex_1__90977801b164e4bc9fd7871ea9e0fc8f.pdf';
extractTextFromPdf(pdfPath).then(text => {
    fs.writeFileSync('./actual_2025_text.txt', text);
    console.log('✅ Text extracted to actual_2025_text.txt');
}).catch(console.error);
