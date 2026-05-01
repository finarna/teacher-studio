/**
 * generateFlagshipPdf.js
 * Route: POST /api/generate-flagship-pdf
 * Body:  { paperId: 'neet-physics-set-a' | ... }
 * 
 * A professional, high-fidelity PDF generation pipeline for NEET Prediction Papers.
 * Matches the institutional aesthetic of the NTA NEET 2026 standard.
 */

import { GoogleGenAI } from '@google/genai';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Gemini Configuration ──────────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Paper Registry ────────────────────────────────────────────────────────────
export const PAPER_REGISTRY = {
  'neet-chemistry-a': 'flagship_neet_chemistry_2026_set_a.json',
  'neet-physics-a': 'flagship_neet_physics_2026_set_a.json',
  'neet-botany-a': 'flagship_neet_botany_2026_set_a.json',
  'neet-zoology-a': 'flagship_neet_zoology_2026_set_a.json',
  'neet-chemistry-b': 'flagship_neet_chemistry_2026_set_b.json',
  'neet-physics-b': 'flagship_neet_physics_2026_set_b.json',
  'neet-botany-b': 'flagship_neet_botany_2026_set_b.json',
  'neet-zoology-b': 'flagship_neet_zoology_2026_set_b.json'
};

// ── Prompt Engineering ────────────────────────────────────────────────────────
function buildProfessionalPrompt(paperData, subject, set, color) {
  const questions = paperData.test_config?.questions || [];
  const qData = questions.map((q, i) => ({
    n: i + 1,
    s: q.subject_section || null,
    t: q.text,
    o: q.options,
    d: q.metadata?.questionType === 'diagram_based_mcq' || q.text.includes('graph') || q.text.includes('diagram') || q.text.includes('Contextual Diagram')
  }));

  const qrPortal = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsAQMAAABDsxw2AAAABlBMVEX///8AAABVwtN+AAAACXBIWXMAAA7EAAAOxAGVKw4bAAABWklEQVRoge3Z3W3DMAwEYGmCjKBRvapH8ARmJfFHNJIWedQVRxhNWn99uoiinFK+q0O8rvFr/ylnf61y1rjT/0K2BbsstQHmNardU+qdSgbHNHcJr6GfNb0hQ2X2xpYw2X9g5SVzLbshg2WrRYt0KXK7/KWTk23OxMu33UfutrTJkNijRu66ou/yR5HtzY7Ifdbo0k3mik4XGRa7fDB+xUDl5x39AJChsV4WvV92q4nJZi2aDIVZ9HMwVvO24VYyMJZzl+jVMSHrqYdsGzZrDUil2kHmfdslg2C+TkNa9KWmzwAZGhOx9pvT18otmgyHpcT9OdJi9jSJDIjl8s03RuI6/4UMjB2Repxlmg9Rn0YpMgCWnuHrY4dRLUXfyPDYyv0xTc1KnZwMkqnU6NUYJoNl60sZ33CbpU+GxaJFi34vo7Px6cfYQobGxMvTn6asRS2fJi6yjdl39QOHOnuoZrXIDwAAAABJRU5ErkJggg==";
  const qrOfficial = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsAQMAAABDsxw2AAAABlBMVEX///8AAABVwtN+AAAACXBIWXMAAA7EAAAOxAGVKw4bAAABWUlEQVRoge3a0a2DMAwF0GQCRsiorMoITMB9JPY18FSkfsbVtRBqyemXwdhRS/kuVjD2/vU8A0cpFVuNFWxic7Dds9bBOEqzpVPaShVLxyzvCO+A2d/EEjP/0OMQ+w1WFvTcNxqxtOwq0cApx6rJl0ouNjkDg69dT/r22nGJTc4esfRrfJbLa4jNzdbI+wiv0mUU6jjEcjGbXnvG+Tj3+kzJs1gmNgAf5NsYC5rmlVwsFwMbqnEbHOyQ7UIVS8b4OHvs3JqwG8CnHrFZmK0+opv/71OxdAzWIC248g7Dj9SLZWEORvRia6uwybSK5WM7e6SFs0zzn8SgKpaI3QPWL+GW9JhrxPKwlUlGvH9bJL1erZRYInbbwy8l9hzqlXq2UmKJmOc9ju2+e+97v2JZGWKzl8axWGbmI8/BzV58Tr3Y3CxKtLHHnxxYrsUyMTAuxtQ3LomlYt/FHyfaPv4NgpeYAAAAAElFTkSuQmCC";

  const promptText = [
    "You are the Lead Document Architect for Plus2AI's Flagship Series.",
    "Mission: Generate a 100% EXACT HTML/CSS replica of the 'Proposed' NEET 2026 Simulation Paper.",
    `CRITICAL: Render all ${qData.length} questions for this subject. DO NOT TRUNCATE. NEVER stop mid-document.`,
    "MANDATORY: Options in the JSON are provided as an array. Render each as a standalone block (1), (2), (3), (4).",
    "- **ADAPTIVE OPTIONS LAYOUT**: **MANDATORY**: For each question, intelligently choose the best layout:",
    "  1. **2-COLUMN GRID**: Use for short, concise options (e.g., single words, simple numbers, or short LaTeX expressions like $I^A i$). This matches the official NEET 'A4 density' style.",
    "  2. **1-COLUMN STACK**: Use ONLY if an option is long (>12 words), contains multi-line LaTeX, or is a complex 'Assertion-Reason' sentence. This prevents text squeezing and ensures legibility.",
    "",
    "## 1. BRANDING & FONTS",
    "- Fonts: @import 'Outfit' (400, 500, 600, 800) and 'Inter' (400, 500, 600).",
    "- COLORS: Plus2 Green (#059669), AI Orange (#f97316), Text (#000000).",
    "",
    "## 2. COVER PAGE (PAGE 1) - EXACT SPECIFICATIONS",
    "### TOP ROW (Flex-Between)",
    "- **LEFT**: Logo 'Plus2' (Green) 'AI' (Orange) in Outfit 800 (Size: 28pt).",
    "- **CENTER**: Serial No Box: 'P2-2026-${subject.substring(0,4).toUpperCase()}-${set}' in 10pt Bold Mono. (Bordered, compact).",
    `- **RIGHT**: TWO QR Code images (75px each). Use <img> tags with these Data URIs:`,
    `  1. Learning Portal: ${qrPortal}`,
    `  2. Plus2AI Official: ${qrOfficial}`,
    "- Labels underneath: 'Learning Portal' and 'Plus2AI Official' in 9pt bold slate-600.",
    "",
    "### TITLES (Centered)",
    "- Subheader: 'NATIONAL ELIGIBILITY CUM ENTRANCE TEST (NEET) 2026' in 14pt Outfit 600, Black.",
    "- Main Header: '${subject.toUpperCase()}' in Black + ' SIMULATION' in AI Orange. Font: Outfit 800, Size: 36pt, Letter-spacing: -0.02em.",
    "",
    "### META GRID (Centered Table)",
    "- A full-width table with 4 columns. Borders: 2px solid black on all sides and between cells.",
    `- CELLS: [Subject Code: 02 (${subject.substring(0, 4).toUpperCase()})] [Duration: 200 Minutes] [Version Code: REI-v17] [Max Marks: 720].`,
    "- TYPOGRAPHY: 11pt Bold Inter, centered.",
    "",
    "### CANDIDATE SECTION",
    "- Box with 1px black border. Contents:",
    "- 'CANDIDATE NAME: ........................................................................................' (12pt Bold)",
    "- 'NTA REG. NO:' followed by exactly 8 individual 28px square boxes with black borders.",
    "",
    "### LEGAL DISCLAIMER BOX",
    "- 1.5px black border box. Centered Title: '**<u>LEGAL DISCLAIMER & TERMS OF USAGE</u>**' (11pt Bold).",
    "- Text: 'IMPORTANT: This document is an AI-generated simulation created by Plus2AI for educational purposes. It is intended strictly for practice and does not claim to be an official NTA document. All questions are modeled on the NCERT curriculum and NEET patterns. Plus2AI assumes no legal liability for discrepancies in actual examination formats.' (10pt, justified, line-height: 1.4).",
    "",
    "### IMPORTANT INSTRUCTIONS BOX",
    "- 1.5px black border box. Centered Title: '**<u>IMPORTANT INSTRUCTIONS TO CANDIDATES</u>**' (11pt Bold).",
    "- Text: 1-6 list in a single compact block. 1. This paper contains 180 questions across Physics, Chemistry, Botany, and Zoology. 2. Duration is 200 minutes... 3. +4 marks/-1 mark... 4. Blue/Black pen... 5. No calculators... 6. DNA Model REI v17 pattern matching. (10pt, justified, line-height: 1.4).",
    "- **STRICT**: This entire box MUST stay on Page 1. No splitting.",
    "",
    "### SPACE OPTIMIZATION",
    "- **MANDATORY**: Compress ALL vertical spacing on Page 1. Set `margin: 0` for boxes if needed. Ensure everything fits on ONE A4 page.",
    "",
    "- **MANDATORY**: Generate the `<div class=\"watermark-container\">` (containing the 3x5 grid of 'Plus2AI DNA' spans) as the VERY FIRST element inside the `<body>`.",
    "- CSS Template: `.watermark-container { position: fixed; inset: 0; z-index: 9999; pointer-events: none; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(5, 1fr); overflow: hidden; opacity: 0.07; }`.",
    "- Inner Text: 'Plus2AI DNA' rotated -45deg, Font: Outfit 800, Size: 48pt, Color: #94a3b8.",
    "",
    "## 4. QUESTION RENDERING (PAGE 2+)",
    "- **PAGE BREAK**: **MANDATORY**: Insert a hard page break (`break-after: page`) immediately after the cover page content. Questions MUST start on Page 2.",
    "- **SPACING**: **STRICT**: Ensure natural spacing between words and around mathematical expressions. NEVER merge words together (e.g., avoid 'decreasing1/r^2').",
    "- **MATCH THE FOLLOWING**: **STRICT MANDATE**: Detect questions containing 'Column I/II' or 'Match the'. 1. **STRUCTURE**: Use a standard HTML `<table>` with `width: 100%` and `table-layout: fixed`. 2. **COLUMNS**: Exactly TWO columns. 3. **ALIGNMENT**: Align Column I (A-D) and Column II (p-s) perfectly. 4. **FORBIDDEN**: NO manual spaces.",
    `- **DIAGRAMS**: **CRITICAL**: Produce high-precision, **full-circuit** technical vector illustrations (SVG). 
      1. **CONNECTIVITY**: Every component (resistor, battery, etc.) MUST be connected by straight, 90-degree technical 'wires' (lines). NO floating symbols.
      2. **SYMBOLS**: Use NCERT standard symbols: Resistor (zig-zag), Inductor (tight coils), Capacitor (parallel lines), AC Source (circle with sine wave). 
      3. **STYLE**: Crisp black strokes (1.2pt). Font for labels: 9pt Sans-serif. **COMPACT**: Max-width 45%, Max-height 200px. Centered. indinstinguishable from a Pearson/NCERT textbook.`,
    "- **LATEX NORMALIZATION**: **CRITICAL**: Ensure ALL mathematical expressions, units (e.g., $^\\circ C$, $\\Omega$, $\\mu F$), and physical variables are properly wrapped in standard KaTeX delimiters (\`$\`). If the source JSON has malformed LaTeX or literal symbols, you MUST fix them in the HTML to ensure perfect rendering.",
    "- **SECTION HEADERS**: **MANDATORY**: Detect subject changes using `s`. Insert a full-width section header (e.g., '**SECTION I: PHYSICS**') before the first question of each subject. Style: 14pt Outfit 800, centered, with 2px top/bottom borders.",
    "- **DENSITY**: **MANDATORY**: Maximize question density. Aim for 6-8 questions per page for subject mocks. Minimize white space between questions. Set `.card { margin-bottom: 6px; padding: 4px 0; }`.",
    "- **CLEANUP**: Ensure NO empty elements or trailing margins at the end of the document. Prevent blank pages.",
    "",
    "### DATA (JSON)",
    JSON.stringify(qData),
    "",
    "### FINAL OUTPUT",
    "- Return ONE complete HTML5 document. Include standard KaTeX (CSS/JS/Auto-render) via CDN.",
    "- **MANDATORY**: Use this EXACT script for math rendering (Support both $ and $$):",
    "  \`<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css\">\`",
    "  \`<script defer src=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js\"></script>\`",
    "  \`<script defer src=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js\" onload=\"renderMathInElement(document.body, {delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}]});\"></script>\`",
    "- **STRICT**: Only use KaTeX for mathematical expressions.",
    "- CSS: Enforce \`html, body { height: 100%; margin: 0; padding: 0; } body { font-family: 'Inter', sans-serif; background: white; text-align: left; -webkit-print-color-adjust: exact; } .card { page-break-inside: avoid !important; break-inside: avoid-page !important; margin-bottom: 8px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; background: transparent; display: block; width: 100%; } .q-num { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 12pt; margin-right: 4px; } .options-container { display: grid; gap: 8px 24px; margin-top: 10px; } .options-grid { grid-template-columns: 1fr 1fr; } .options-stack { grid-template-columns: 1fr; } .option-item { display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; } .option-label { font-weight: 800; min-width: 25px; } .content-wrapper { position: relative; z-index: 10; background: transparent; width: 100%; } .cover-page { break-after: page; padding-top: 0; } .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; } .section-header { width: 100%; text-align: center; border-top: 2px solid black; border-bottom: 2px solid black; padding: 8px 0; margin: 20px 0; font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 14pt; }\`.",
    `- MANDATORY: Ensure all ${qData.length} questions from the JSON are rendered completely. Never stop mid-document.`
  ].join("\n");

  return promptText;
}

async function generateHtmlWithGemini(paperData, subject, set, color) {
  const questions = paperData.test_config?.questions || [];
  const isConsolidated = questions.length > 50;

  // Force gemini-3.1-pro-preview for consolidated papers due to length/complexity
  const modelName = isConsolidated ? 'gemini-3.1-pro-preview' : (process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview');
  const prompt = buildProfessionalPrompt(paperData, subject, set, color);

  console.log(`[PDF Gen] 🚀 Dispatching to ${modelName} (@google/genai)...`);

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: 64000,
      temperature: 0.1
    }
  });

  let html = response.text;
  html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  console.log(`[PDF Gen] 📥 Received HTML (Length: ${html.length} chars)`);

  if (!html.toLowerCase().includes('<!doctype html')) {
    throw new Error('Gemini failed to return a valid HTML document');
  }
  return html;
}

// ── Puppeteer Rendering ───────────────────────────────────────────────────────
async function renderPdf(html, subject, set, outputPath) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-font-render-hinting=none']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 90000 });

    // Wait for KaTeX and SVGs to finalize
    await new Promise(r => setTimeout(r, 2500));

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 7pt; color: #94a3b8; padding: 0 45px 15px; font-family: 'Inter', sans-serif; display: flex; justify-content: space-between; border-top: 0.5px solid #e2e8f0;">
          <span>Reproduction strictly prohibited. © 2026 Plus2AI. | NEET 2026 Simulation - SET ${set} | Generated: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: { top: '15mm', bottom: '25mm', left: '15mm', right: '15mm' }
    });
  } finally {
    await browser.close();
  }
}

// ── Main Entry Point ──────────────────────────────────────────────────────────
export async function generateFlagshipPdf(paperId) {
  const fileName = PAPER_REGISTRY[paperId];
  if (!fileName) throw new Error(`Invalid paperId: ${paperId}`);

  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${fileName}`);

  const paperData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let subject = 'Physics';
  if (paperId.includes('chemistry')) subject = 'Chemistry';
  if (paperId.includes('zoology')) subject = 'Zoology';
  if (paperId.includes('consolidated')) subject = 'NEET CONSOLIDATED';

  const set = paperId.endsWith('-a') ? 'A' : 'B';

  let color = '#065f46'; // Green for Physics/Bio
  if (subject === 'Chemistry') color = '#1e40af'; // Blue
  if (subject === 'Botany') color = '#15803d'; // Forest Green
  if (subject === 'Zoology') color = '#9333ea'; // Purple
  if (subject === 'NEET CONSOLIDATED') color = '#065f46'; // Main Institutional Green

  console.log(`[PDF Gen] 📄 Generating ${subject} Set ${set} Flagship Paper...`);

  const html = await generateHtmlWithGemini(paperData, subject, set, color);

  const outputDir = path.join(ROOT, 'public', 'flagship-pdfs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputFileName = `Plus2AI_NEET_2026_${subject}_SET_${set}_Prediction.pdf`;
  const outputPath = path.join(outputDir, outputFileName);

  await renderPdf(html, subject, set, outputPath);

  console.log(`[PDF Gen] ✅ Success: ${outputFileName}`);
  return `/flagship-pdfs/${outputFileName}`;
}

/**
 * Express Handler wrapper for the above logic
 * Returns the PDF buffer directly for high-fidelity downloading
 */
export async function handleGenerateFlagshipPdf(req, res) {
  const { paperId } = req.body;
  try {
    const fileName = PAPER_REGISTRY[paperId];
    if (!fileName) throw new Error(`Invalid paperId: ${paperId}`);

    let subject = 'Physics';
    if (paperId.includes('chemistry')) subject = 'Chemistry';
    if (paperId.includes('botany')) subject = 'Botany';
    if (paperId.includes('zoology')) subject = 'Zoology';
    if (paperId.includes('consolidated')) subject = 'NEET CONSOLIDATED';

    const set = paperId.endsWith('-a') ? 'A' : 'B';
    const outputFileName = `Plus2AI_NEET_2026_${subject}_SET_${set}_Prediction.pdf`;

    // Generate the PDF and get the server-side path
    const relativePath = await generateFlagshipPdf(paperId);
    const absolutePath = path.join(ROOT, 'public', relativePath);

    // Read the generated file
    const pdfBuffer = fs.readFileSync(absolutePath);

    // Send the buffer as a PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    console.log(`[PDF Gen] 🚀 Streamed ${outputFileName} (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.error('[PDF Gen] Error:', err);
    res.status(500).json({ error: err.message });
  }
}
