
import { getGeminiClient, withGeminiRetry } from "./utils/geminiClient";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const PDF_PATH = "/Users/apple/Downloads/CETPAPERS/PHYSICS_2025_kcet.pdf";
const API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = "gemini-1.5-flash-002"; 

async function generateReport() {
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`❌ PDF not found at ${PDF_PATH}`);
    return;
  }

  console.log(`🚀 [REPORT] Starting Cross-Validation for ${PDF_PATH}...`);
  const ai = getGeminiClient(API_KEY);
  
  const buffer = fs.readFileSync(PDF_PATH);
  const base64 = buffer.toString("base64");

  const prompt = `
Extract ALL questions from the PDF.
For EACH question, specifically check for diagrams, graphs, circuits, or figures.

OUTPUT FORMAT (JSON):
{
  "results": [
    {
      "id": "Q1",
      "text_snippet": "A wire of length...",
      "hasVisual": true/false,
      "visuals_detected": [
        { "type": "circuit/graph/etc", "location": "question/option-A/etc", "box": [ymin, xmin, ymax, xmax] }
      ]
    }
  ]
}

Analyze the FIRST 5 PAGES total (including cover). Provide a detailed breakdown of Question ID vs Diagrams found.
`.trim();

  try {
    const result = await withGeminiRetry(() => ai.models.generateContent({
        model: MODEL,
        contents: [{
            role: "user",
            parts: [
                { inlineData: { mimeType: "application/pdf", data: base64 } },
                { text: prompt }
            ]
        }],
        config: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 65536
        }
    }));

    const data = JSON.parse(result.text || "{}");
    const results = data.results || [];

    console.log("\n### CROSS-VALIDATION REPORT: QUESTIONS vs DIAGRAMS ###\n");
    console.log("| Q# | Visual | Location | Type | Bounding Box [y1, x1, y2, x2] |");
    console.log("|---|---|---|---|---|");
    
    results.forEach((q: any) => {
      if (!q.hasVisual) {
        console.log(`| ${q.id} | ❌ None | - | - | - |`);
      } else {
        q.visuals_detected.forEach((v: any, idx: number) => {
          const prefix = idx === 0 ? q.id : "";
          console.log(`| ${prefix} | ✅ Yes | ${v.location} | ${v.type} | [${v.box.join(", ")}] |`);
        });
      }
    });

  } catch (err: any) {
    console.error("❌ Failed:", err.message);
  }
}

generateReport();
