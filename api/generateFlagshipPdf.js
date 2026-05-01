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

  return `You are an expert NEET exam paper formatter. Your job is to generate a COMPLETE, SELF-CONTAINED HTML document that represents a professional NEET 2026 mock test paper. This HTML will be rendered by a headless Puppeteer browser into a PDF.

## PAPER DETAILS
- Title: ${paperData.test_name}
- Subject: ${subject}
- Set: ${set}
- Total Questions: ${questions.length}
- Total Marks: ${totalMarks}
- Date/Time Generated: ${dateStr} at ${timeStr}
- Brand Color: ${color}

## QUESTIONS DATA (JSON)
${JSON.stringify(qData, null, 2)}

## ABSOLUTE REQUIREMENTS — DO NOT SKIP ANY

### 1. HTML Structure
- Return ONLY the raw HTML — no markdown fences, no explanation text
- Must start with <!DOCTYPE html> and be fully self-contained
- Include KaTeX CSS + JS from CDN in <head> with auto-render configured for $...$ delimiters

### 2. Watermark (CRITICAL)
- A diagonal tiled watermark "Plus2AI · Exam DNA · 2026" across ALL pages
- Implement as body::before with fixed positioning and a repeating SVG background at ~8% opacity
- Must appear on every single page including the answer key page

### 3. CSS @page Footer (CRITICAL — every page)
- Use CSS @page with @bottom-center to add footer on EVERY page:
  "Reproduction strictly prohibited. © 2026 Plus2AI | NEET 2026 Prediction · SET ${set} | Page X of Y"
- Use counter(page) and counter(pages) for page numbering
- Footer font: 7.5pt, color: #6b7280

### 4. First Page Header
- Top row: "plus2AI" brand logo (left) — "plus2" in #0a1a16 bold, "AI" in #ff7f50 bold — and a small QR placeholder box (right)
- Tagline below logo: "Oracle REI v17 · NEET 2026 Flagship Prediction" in small gray text
- Centered title: "NATIONAL ELIGIBILITY CUM ENTRANCE TEST (NEET) 2026" in ${color}
- Centered subtitle: the full paper title
- A colored info bar showing: Subject | Set ${set} | Duration: 80 Minutes | Questions: ${questions.length} | Total Marks: ${totalMarks}
- Generated timestamp: "${dateStr} at ${timeStr}" in small gray text right-aligned

### 5. Instructions Box (first page only, before questions)
- Left border accent in ${color}
- Heading: "⚠ Important Instructions — Read Carefully"
- Bullet points including:
  * ${questions.length} MCQs, one correct answer each
  * Duration: 80 minutes (~1 min 45 sec per question)
  * Marking: +4 correct, −1 wrong, 0 unattempted, max ${totalMarks} marks
  * Plus2AI Oracle REI v17 AI-generated prediction calibrated on 5 years of NEET patterns
  * Do not share — strictly prohibited

### 6. Section Label
- A colored banner bar: "📖 ${subject} — SET ${set} · ${questions.length} Questions · ${totalMarks} Marks"

### 7. Every Question Block (MOST IMPORTANT)
- MUST have CSS: break-inside: avoid; page-break-inside: avoid;
- Structure per question:
  * Top meta row: Topic tag (gray pill) | Difficulty badge (Easy=green, Moderate=amber, Hard=red) | Marks tag
  * Question number in bold ${color} followed by question text (LaTeX in $...$)
  * Options in a 2-column grid: (A) ... (B) ... / (C) ... (D) ...
  * Thin border around entire block, slight border-radius
  * Small spacing between blocks

### 8. Answer Key (last page, page-break-before: always)
- Heading: "Answer Key" styled with ${color}
- Compact table: Q number + correct option letter (A/B/C/D)
- 9 questions per row
- All ${questions.length} questions covered

### 9. Math Rendering
- All LaTeX between $...$ must render via KaTeX auto-render
- Include this in the HTML <head>:
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"/>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false})"></script>

### 10. Typography & Layout
- Font: 'Helvetica Neue', Arial, sans-serif
- A4 size, 18mm top/bottom, 16mm left/right margins
- Question text: ~9.5pt
- Options: ~9pt
- Clean, institutional, professional NEET paper look — black on white, no decorative flourishes

## OUTPUT
Return ONLY the complete HTML document. Start with <!DOCTYPE html>. Zero markdown. Zero extra text.`;
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
