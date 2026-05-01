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

import { GoogleGenAI } from '@google/genai';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Gemini client ─────────────────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  return `You are an expert NEET exam paper formatter. Generate a COMPLETE, SELF-CONTAINED HTML document for a professional NEET 2026 mock test paper. It will be rendered by Puppeteer into a PDF.

## PAPER DETAILS
- Subject: ${subject}  |  Set: ${set}  |  Questions: ${questions.length}  |  Total Marks: ${totalMarks}
- Serial No: ${serialNo}
- Generated: ${dateStr} at ${timeStr}
- Accent Color: ${color}

## QUESTIONS JSON
${JSON.stringify(qData, null, 2)}

---

## PAGE & GLOBAL RULES

### Watermark (every page)
- body::before, position:fixed, top:0 left:0 width:100% height:100%, z-index:-1
- SVG repeating background: diagonal text "Plus2AI · Exam DNA · 2026", fill-opacity 0.06, rotate -35deg

### CSS @page Footer (every page, NO exceptions)
\`\`\`css
@page {
  size: A4;
  margin: 15mm 15mm 22mm 15mm;
  @bottom-center {
    content: "Reproduction strictly prohibited. © 2026 Plus2AI. | NEET 2026 Simulation - SET ${set} | Page " counter(page) " of " counter(pages);
    font-family: Arial, sans-serif;
    font-size: 7.5pt;
    color: #555;
    border-top: 0.5pt solid #bbb;
    padding-top: 3pt;
  }
}
\`\`\`

### KaTeX (math rendering)
Include in <head>:
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"/>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false})"></script>

---

## FIRST PAGE LAYOUT (replicate this EXACTLY)

### BLOCK 1 — Top Header Row
A single row with THREE elements:
- LEFT: Empty (spacer)
- CENTER: "Plus2AI" logo text — LARGE, bold, centered
    * "Plus2" in font-weight:900, color:#1a2e1a (very dark green-black), font-size:32pt
    * "AI" in font-weight:900, color:#ff6b2b (orange), font-size:32pt
    * No tagline here — just the big logo mark
- RIGHT: A 55×55px QR code placeholder box (border:1px solid #999, display:flex, align/justify center)
    * Inside: tiny text "QR CODE" in gray, and below it "learn.dataziv.com" in 6pt gray

### BLOCK 2 — NEET Title
Centered, margin-top: 10px:
"NATIONAL ELIGIBILITY CUM ENTRANCE TEST (NEET) 2026"
font-size:11pt, font-weight:600, color:#222, letter-spacing:0.5px, text-transform:uppercase

### BLOCK 3 — Subject Simulation Title  
Centered, font-size:30pt, font-weight:900, text-transform:uppercase, margin:6px 0:
- "${subject.toUpperCase()}" in color:#1a1a1a (black)
- " SIMULATION" in color:#ff6b2b (orange)
(i.e. two <span> elements side by side: "<span style='color:#1a1a1a'>${subject.toUpperCase()}</span><span style='color:#ff6b2b'> SIMULATION</span>")

### BLOCK 4 — Serial Number Box
Centered box, border:1.5px solid #222, display:inline-block, padding:5px 24px, margin:8px auto:
"Serial No: " normal weight + "<strong>${serialNo}</strong>" bold
font-size:10pt

### BLOCK 5 — Info Table
Full-width bordered table (border:1.5px solid #333), no border-collapse gaps, padding 8px 14px, margin-top:10px:
| LEFT column                        | RIGHT column                  |
| Subject Code: <strong>${subjectCode}</strong>  | Version Code: <strong>REI-v17</strong>   |
| Duration: <strong>45 Minutes</strong>          | Maximum Marks: <strong>${totalMarks}</strong> |
Table has 1 row, 2 columns. Each column is 50%. Left-aligned left col, right-aligned right col.

### BLOCK 6 — Candidate Fields Row
Two fields side by side, margin-top:12px:
LEFT (60% width): "CANDIDATE NAME:" label, then a dotted underline spanning full width (border-bottom:1px dotted #555, min-width:300px, display:block, margin-top:4px)
RIGHT (40% width): "NTA REG. NO:" label, then 8 individual boxes (each box: width:28px, height:28px, border:1px solid #333, display:inline-block, margin-left:2px)

### BLOCK 7 — Legal Disclaimer Box
Full-width bordered box (border:1.5px solid #333), padding:10px 14px, margin-top:12px:
Title: "LEGAL DISCLAIMER & TERMS OF USAGE" — centered, font-weight:700, font-size:9pt, text-decoration:underline
Body paragraph (font-size:8.5pt, margin-top:6px):
"IMPORTANT: This document is an <strong>AI-generated simulation</strong> based on historical analysis of the National Eligibility cum Entrance Test (NEET). It is intended <strong>strictly for practice</strong> and training purposes. Plus2AI does not claim that these specific questions will appear in the actual 2026 NEET examination. Plus2AI assumes no legal liability for any discrepancies, variations, or performance outcomes in the actual exam. Users are advised to use this alongside official NTA study materials."

### BLOCK 8 — Instructions Box (directly below disclaimer, still first page)
Full-width bordered box (border:1.5px solid #333), padding:10px 14px, margin-top:10px:
Title: "IMPORTANT INSTRUCTIONS TO CANDIDATES" — centered, font-weight:700, font-size:9.5pt, underline
Horizontal rule after title (border-top:1px solid #ccc, margin:6px 0)
List items (no bullets, font-size:9pt, line-height:1.7, padding-left:0):
1. "This question booklet contains <strong>${questions.length}</strong> questions. Check that all pages are intact."
2. "The Version Code and Serial Number must be correctly entered on the OMR Answer Sheet."
3. "Each question carries <strong>4 marks</strong>. There is <strong>negative marking of 1 mark</strong> for each wrong answer."
4. "Answers must be marked ONLY on the OMR sheet provided using a blue/black ballpoint pen."
5. "Calculators, log tables, and electronic gadgets are strictly prohibited."
6. "<strong>Plus2AI DNA Model (REI v17)</strong>: This is a high-fidelity pattern simulation. Final results may vary."

---

## QUESTIONS SECTION (pages 2+)

### Section Label Bar
Full-width div, background:${color}, color:white, font-weight:700, font-size:9pt, padding:5px 12px, margin-top:14px:
"${subject.toUpperCase()} | SET ${set} | ${questions.length} Questions | Total Marks: ${totalMarks}"

### Each Question Block — MUST have: break-inside:avoid; page-break-inside:avoid
Structure:
- Container: border:0.75px solid #d1d5db, border-radius:4px, padding:8px 10px, margin-bottom:7px, background:#fff
- Top meta row (display:flex, gap:8px, margin-bottom:4px, font-size:7pt):
    * Topic pill: background:#f3f4f6, border:0.5px solid #ccc, padding:1px 5px, border-radius:2px, uppercase
    * Difficulty badge: Easy→{bg:#d1fae5,color:#065f46}, Moderate→{bg:#fef3c7,color:#92400e}, Hard→{bg:#fee2e2,color:#991b1b}; font-weight:700, padding:1px 5px, border-radius:2px, uppercase
    * Marks tag: color:#6b7280, font-weight:500, margin-left:auto
- Question row (display:flex, gap:5px, font-size:9.5pt, line-height:1.6, margin-bottom:6px):
    * Number "<strong>N.</strong>" in color:${color}, min-width:22px, flex-shrink:0
    * Question text (flex:1) — LaTeX in $...$ will be rendered by KaTeX
- Options grid (display:grid, grid-template-columns:1fr 1fr, gap:2px 12px, padding-left:26px, font-size:9pt):
    * "(A) option text" — "(A)" in bold ${color}
    * "(B) option text"
    * "(C) option text"
    * "(D) option text"

---

## ANSWER KEY (last page, page-break-before: always)

- Heading "Answer Key" in ${color}, font-size:14pt, font-weight:700, border-bottom:2px solid ${color}, padding-bottom:4px
- Sub: "Generated: ${dateStr} at ${timeStr} | Plus2AI Flagship Prediction Series 2026" in 8pt gray
- Table: border-collapse:collapse, width:100%, margin-top:12px
- 9 answers per row, each cell: border:0.75px solid #d1d5db, padding:4px 6px, text-align:center, font-size:8.5pt
- Cell content: "<strong style='color:${color}'>Q.N</strong> Opt" e.g. "<strong style='color:${color}'>1.</strong> A"

---

## TYPOGRAPHY & BASE STYLES
- font-family: 'Helvetica Neue', Arial, sans-serif
- body font-size: 10pt, color: #111, background: #fff
- .katex { font-size: 1em !important; }
- * { box-sizing: border-box; margin: 0; padding: 0; }

## OUTPUT RULE
Return ONLY the complete HTML. Start immediately with <!DOCTYPE html>. No markdown code fences. No explanatory text before or after.`;
}

// ── Call Gemini ───────────────────────────────────────────────────────────────
async function generateHtmlWithGemini(paperData, subject, set, color) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const prompt = buildGeminiPrompt(paperData, subject, set, color);

  console.log(`[PDF Gen] Calling Gemini (${model}) with ${prompt.length} char prompt...`);

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      maxOutputTokens: 65536,
      temperature: 0.15,  // Low temperature for deterministic, structured output
    }
  });

  let html = response.text;

  // Strip any accidental markdown fences Gemini may add
  html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  if (!html.toLowerCase().includes('<!doctype html')) {
    throw new Error('Gemini response did not contain a valid HTML document');
  }

  return html;
}

// ── Puppeteer PDF render ──────────────────────────────────────────────────────
async function renderPdf(html) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });

  try {
    const page = await browser.newPage();

    // Load HTML — networkidle0 waits for CDN (KaTeX) to load
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });

    // Extra wait for KaTeX auto-render to complete after scripts run
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2500)));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
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
    const qCount = paperData.test_config?.questions?.length || 0;
    console.log(`[PDF Gen] ✓ Loaded ${qCount} questions`);

    const html = await generateHtmlWithGemini(paperData, subject, set, color);
    console.log(`[PDF Gen] ✓ Gemini HTML: ${html.length} chars. Launching Puppeteer...`);

    const pdfBuffer = await renderPdf(html);
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
