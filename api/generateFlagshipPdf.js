/**
 * generateFlagshipPdf.js
 * Route: POST /api/generate-flagship-pdf
 * Body:  { paperId: 'neet-physics-set-a' | 'neet-physics-set-b' | 'neet-chemistry-set-a' | 'neet-chemistry-set-b' }
 *
 * Pipeline:
 *   1. Read flagship JSON from disk
 *   2. Send to Gemini (@google/genai) → Gemini generates complete, production-quality NEET HTML
 *   3. Puppeteer renders HTML → PDF (server-side, no canvas limits)
 *   4. Stream PDF to client
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Gemini client ─────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Paper Registry ────────────────────────────────────────────────────────────
export const PAPER_REGISTRY = {
  'neet-physics-set-a':   { file: 'flagship_neet_physics_2026_set_a.json',   subject: 'Physics',   set: 'A', color: '#1e40af' },
  'neet-physics-set-b':   { file: 'flagship_neet_physics_2026_set_b.json',   subject: 'Physics',   set: 'B', color: '#1e40af' },
  'neet-chemistry-set-a': { file: 'flagship_neet_chemistry_2026_set_a.json', subject: 'Chemistry', set: 'A', color: '#065f46' },
  'neet-chemistry-set-b': { file: 'flagship_neet_chemistry_2026_set_b.json', subject: 'Chemistry', set: 'B', color: '#065f46' },
};

// ── Gemini prompt ─────────────────────────────────────────────────────────────
function buildGeminiPrompt(paperData, subject, set, color) {
  const questions = paperData.test_config?.questions || [];
  const totalMarks = paperData.total_marks || questions.length * 4;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const subjectCode = subject.slice(0, 4).toUpperCase();
  const serialNo = `P2-2026-${subjectCode}-${set}`;

  // Serialize questions compactly for Gemini
  const qData = questions.map((q, i) => ({
    num: i + 1,
    topic: q.topic,
    difficulty: q.difficulty,
    marks: q.marks || 4,
    text: q.text,
    options: q.options,
    correctOptionIndex: q.correctOptionIndex
  }));

  return `You are an expert NEET exam paper formatter and senior front-end designer. Your goal is to generate a COMPLETE, PRODUCTION-READY HTML document that mirrors a premium, institutional NTA examination paper.

## CONTEXT
- Subject: ${subject} | Set: ${set} | Questions: ${questions.length} | Total Marks: ${totalMarks}
- Serial No: ${serialNo}
- Accent Color: ${color}

## QUESTIONS JSON
${JSON.stringify(qData, null, 2)}

---

## HTML STRUCTURE REQUIREMENTS

### Head Section
- Include Google Fonts: Inter (400, 500, 600, 700) and Public Sans (700, 900).
- Include KaTeX CSS/JS and Auto-render extension.
- Custom CSS:
  - \`body\`: font-family 'Inter', sans-serif; line-height: 1.6; color: #111;
  - \`.watermark\`: position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0.03; font-size: 80pt; font-weight: 900; color: #000; transform: rotate(-35deg); white-space: nowrap;
  - \`.question-block\`: margin-bottom: 28px; padding: 18px; border: 0.5pt solid #e2e8f0; border-radius: 8px; break-inside: avoid; background: #fff;
  - \`.topic-pill\`: font-size: 7.5pt; color: #64748b; margin-bottom: 8px; border-bottom: 1px dotted #e2e8f0; padding-bottom: 4px;
  - \`.question-num\`: font-weight: 800; color: ${color}; font-size: 10.5pt;
  - \`.question-text\`: font-weight: 400; font-size: 9.8pt; margin-bottom: 12px;
  - \`.option-grid\`: display: flex; flex-direction: column; gap: 6px; margin-top: 12px; padding-left: 15px;
  - \`.option-row\`: display: flex; align-items: flex-start; gap: 10px;
  - \`.option-label\`: font-weight: 700; color: ${color}; min-width: 28px; flex-shrink: 0;
  - \`.option-text\`: font-size: 9.2pt;
  - \`.math-table\`: border-collapse: collapse; width: 100%; margin: 15px 0; font-size: 9pt;
  - \`.math-table td\`: border: 0.5pt solid #cbd5e1; padding: 8px; vertical-align: top;
  - \`.katex\`: font-size: 1.08em !important; margin: 0 2px;
  - \`.katex-display\`: margin: 1em 0 !important;
  - \`.diagram-container\`: margin: 15px auto; text-align: center; max-width: 100%;
  - \`.diagram-description\`: font-style: italic; font-size: 8.5pt; color: #475569; background: #f8fafc; border-left: 3px solid ${color}; padding: 10px 15px; margin: 10px 0; border-radius: 0 4px 4px 0;
  - \`@page { size: A4; margin: 15mm 15mm 25mm 15mm; }\`

### FIRST PAGE LAYOUT (MANDATORY BLOCKS)

1. **HEADER**:
   - Centered **Plus2AI** logo (Plus2 dark green, AI orange, large bold).
   - Top-right: **TWO Dynamic QR Codes** (50px each, side-by-side).
     - QR 1: https://learn.dataziv.com with label "Learning Portal" below it.
     - QR 2: https://plus2ai.com with label "Plus2AI Official" below it.
     - Use https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=[URL] for the images.
   - Title: "NATIONAL ELIGIBILITY CUM ENTRANCE TEST (NEET) 2026" (Centered, 11pt, bold).
   - Large Subtitle: "${subject.toUpperCase()} <span style='color:#ff6b2b'>SIMULATION</span>" (30pt, heavy bold).

2. **IDENTIFIERS**:
   - Serial No Box: "Serial No: P2-2026-${subject.slice(0, 4).toUpperCase()}-${set}" (Centered, bordered box).
   - Info Table: 2-col bordered table. Left: Subject Code & Duration (45 mins). Right: Version Code (REI-v17) & Max Marks (180).

3. **CANDIDATE ENTRY**:
   - Dotted line for "CANDIDATE NAME".
   - "NTA REG. NO:" with 8 empty grid boxes.

4. **LEGAL DISCLAIMER**:
   - Bordered box titled "LEGAL DISCLAIMER & TERMS OF USAGE".
   - Text: "IMPORTANT: This document is an AI-generated simulation... Intended strictly for practice... Plus2AI assumes no legal liability..."

5. **INSTRUCTIONS**:
   - Bordered box titled "IMPORTANT INSTRUCTIONS TO CANDIDATES".
   - 6 items: (1) 45 questions check, (2) OMR Version/Serial entry, (3) 4 marks each / -1 wrong, (4) OMR pen use, (5) No gadgets, (6) Plus2AI DNA Model REI v17 note.

### WATERMARK & DIAGRAMS
- **WATERMARK**: Include a \`<div class="watermark">Plus2AI DNA</div>\` at the very start of the body.
- **DIAGRAMS**: If a question includes a "Diagram Description", **GENERATE a supplementary inline SVG**.
  - Use clean lines, labeled axes, and clear markers.
  - Place the SVG inside a \`.diagram-container\`.

### DATA INTEGRITY & VERBATIM REPRODUCTION (CRITICAL)
- **STRICT ADHERENCE**: You must replicate the question text, option text, and diagram descriptions **EXACTLY as they appear in the JSON**.
- **DO NOT** rephrase, summarize, "improve", or modify any content. 
- **DO NOT** omit any part of the text.
- You **MUST include the verbatim "Diagram Description" text** below any generated SVG.

### IMPORTANT: NO CONTENT FOOTERS
- **DO NOT** include any footer, page numbers, or bottom lines in the HTML body. 
- These are handled automatically by the PDF engine. 

### Output format
Return ONLY the raw HTML. No markdown code fences. Start with <!DOCTYPE html>.`;
}

// ── Call Gemini ───────────────────────────────────────────────────────────────
async function generateHtmlWithGemini(paperData, subject, set, color) {
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const prompt = buildGeminiPrompt(paperData, subject, set, color);

  console.log(`[PDF Gen] Calling Gemini (${modelName}) with ${prompt.length} char prompt...`);

  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  let html = response.text();

  html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  if (!html.toLowerCase().includes('<!doctype html')) {
    throw new Error('Gemini response did not contain a valid HTML document');
  }
  return html;
}

// ── Puppeteer PDF render ──────────────────────────────────────────────────────
async function renderPdf(html, subject, set) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });

  try {
    const page = await browser.newPage();
    // Set a larger viewport to ensure charts/SVG render well
    await page.setViewport({ width: 1200, height: 1600 });
    
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 90000 });
    
    // Give KaTeX and any SVGs time to settle
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>', // Empty header
      footerTemplate: `
        <div style="width: 100%; font-size: 8pt; color: #666; border-top: 0.5pt solid #eee; padding: 5px 40px; font-family: 'Inter', sans-serif; display: flex; justify-content: space-between;">
          <span>Reproduction strictly prohibited. © 2026 Plus2AI. | NEET 2026 Simulation - SET ${set}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '15mm',
        bottom: '25mm', // Extra room for the footer
        left: '15mm',
        right: '15mm'
      }
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

// ── Express route handler ─────────────────────────────────────────────────────
export async function handleGenerateFlagshipPdf(req, res) {
  const { paperId } = req.body;

  if (!paperId || !PAPER_REGISTRY[paperId]) {
    return res.status(400).json({
      error: `Invalid paperId. Valid options: ${Object.keys(PAPER_REGISTRY).join(', ')}`
    });
  }

  const { file, subject, set, color } = PAPER_REGISTRY[paperId];
  const filePath = path.join(ROOT, file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Paper file not found: ${file}` });
  }

  try {
    console.log(`[PDF Gen] ▶ Starting for ${paperId}...`);
    const paperData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const html = await generateHtmlWithGemini(paperData, subject, set, color);
    const pdfBuffer = await renderPdf(html, subject, set);
    const filename = `Plus2AI_NEET_2026_${subject}_SET_${set}_Prediction.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);

    console.log(`[PDF Gen] ✅ Sent ${(pdfBuffer.length / 1024).toFixed(0)} KB → ${filename}`);
  } catch (err) {
    console.error('[PDF Gen] ❌ Error:', err);
    res.status(500).json({ error: 'PDF generation failed', detail: err.message });
  }
}
