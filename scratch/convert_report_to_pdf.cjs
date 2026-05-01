const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function convert() {
  const mdPath = path.join(process.cwd(), 'neet_answer_key_report.md');
  if (!fs.existsSync(mdPath)) {
    console.error('Report file not found!');
    return;
  }

  let mdContent = fs.readFileSync(mdPath, 'utf8');

  // Simple Markdown to HTML conversion for the report structure
  // (We only need headers and tables for this specific report)
  let htmlBody = mdContent
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^---$/gim, '<hr>')
    .replace(/\*\*Total Questions:\*\* (.*)/g, '<p><strong>Total Questions:</strong> $1</p>');

  // Handle tables
  const lines = htmlBody.split('\n');
  let inTable = false;
  let tableHtml = '';
  const finalHtmlLines = [];

  lines.forEach(line => {
    if (line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">';
      }
      
      const cells = line.split('|').filter(c => c.trim() !== '' || line.indexOf('|'+c+'|') !== -1);
      // Skip the separator line |---|---|
      if (line.includes('---')) return;

      tableHtml += '<tr>';
      cells.forEach((cell, i) => {
        const tag = (finalHtmlLines.length === 0 || !inTable) ? 'th' : 'td'; // Very basic logic
        const style = 'border: 1px solid #e2e8f0; padding: 8px; text-align: left;';
        tableHtml += `<td style="${style}">${cell.trim()}</td>`;
      });
      tableHtml += '</tr>';
    } else {
      if (inTable) {
        inTable = false;
        tableHtml += '</table>';
        finalHtmlLines.push(tableHtml);
      }
      finalHtmlLines.push(line);
    }
  });
  if (inTable) {
    tableHtml += '</table>';
    finalHtmlLines.push(tableHtml);
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Outfit:wght@800&display=swap" rel="stylesheet">
    <style>
        body { 
            font-family: 'Inter', sans-serif; 
            padding: 40px; 
            color: #1e293b;
            line-height: 1.6;
        }
        .watermark-container {
            position: fixed;
            inset: 0;
            z-index: 9999;
            pointer-events: none;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(5, 1fr);
            overflow: hidden;
            opacity: 0.05;
        }
        .watermark-item {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40pt;
            font-family: 'Outfit', sans-serif;
            font-weight: 800;
            transform: rotate(-30deg);
            white-space: nowrap;
            color: #000;
        }
        h1 { font-family: 'Outfit', sans-serif; color: #065f46; border-bottom: 3px solid #065f46; padding-bottom: 10px; }
        h2 { font-family: 'Outfit', sans-serif; color: #1e40af; margin-top: 40px; border-left: 5px solid #1e40af; padding-left: 15px; }
        table { font-size: 10pt; }
        tr:nth-child(even) { background-color: #f8fafc; }
        td:first-child { font-weight: bold; width: 60px; color: #64748b; }
        hr { border: 0; border-top: 2px dashed #cbd5e1; margin: 40px 0; }
        @media print {
            h2 { page-break-before: always; }
            .no-break { page-break-inside: avoid; }
        }
    </style>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body, {delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}]});"></script>
</head>
<body>
    <div class="watermark-container">
        ${Array(15).fill('<div class="watermark-item">Plus2AI</div>').join('')}
    </div>
    <div style="text-align: right; font-size: 8pt; color: #94a3b8; margin-bottom: 20px;">
        OFFICIAL PLUS2AI NEET 2026 PREDICTION SYSTEM
    </div>
    ${finalHtmlLines.join('\n')}
</body>
</html>
  `;

  console.log('Starting Puppeteer...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  // Wait a bit for KaTeX to render
  await new Promise(r => setTimeout(r, 2000));

  const pdfPath = path.join(process.cwd(), 'NEET_2026_Flagship_Master_Answer_Key.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%; font-size:8pt; text-align:center; color:#94a3b8; font-family:Inter;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    printBackground: true
  });

  await browser.close();
  console.log('PDF Generated successfully: NEET_2026_Flagship_Master_Answer_Key.pdf');
}

convert().catch(console.error);
