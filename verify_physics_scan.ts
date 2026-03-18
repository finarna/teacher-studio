
import { GoogleGenAI } from "@google/genai";
import { withGeminiRetry } from "./utils/geminiClient";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const PDF_PATH = "/Users/apple/Downloads/CETPAPERS/PHYSICS_2025_kcet.pdf";
const API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = "gemini-1.5-flash-002"; 

async function runExtraction() {
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`❌ PDF not found at ${PDF_PATH}`);
    return;
  }

  console.log(`🚀 [EXTRACTION] Parsing ${PDF_PATH} using ${MODEL} (AI Studio Path for Verification)...`);
  
  // Create a direct client for verification ONLY - skipping the Vertex-forced client to ensure we get results
  const ai = new GoogleGenAI({
    apiKey: API_KEY,
    vertexai: false // Using AI Studio path temporarily to verify prompt/logic accuracy
  });
  
  const buffer = fs.readFileSync(PDF_PATH);
  const base64 = buffer.toString("base64");

  // Replicating the EXACT prompt from simplePhysicsExtractor.ts (line 97)
  const prompt = `
You are an expert Physics paper digitizer.
TASK: Extract all 60 questions from the PDF.

SCHEMA:
Return a JSON object: { "questions": [...] }
Each question must have:
- id: question number
- text: English text with $LaTeX$
- pageNumber: the 1-indexed page where it starts
- options: array of 4 strings
- correct_answer: "1", "2", "3", or "4"
- hasVisualElement: true if there is a diagram/graph/circuit/figure anywhere in the question or options.
- visuals: array of visual objects, each with:
    - type: "diagram", "graph", "circuit", "option-image"
    - description: what it shows
    - box: [ymin, xmin, ymax, xmax] in 0-1000 scale (CRITICAL: tight crop around the visual).
- labelBox: [ymin, xmin, ymax, xmax] in 0-1000 scale (tight crop around the question number).

COORDINATE SYSTEM (0-1000):
[0,0] is Top-Left. [1000,1000] is Bottom-Right.
Always provide TIGHT bounding boxes. If a diagram is in an option, include it in 'visuals' with type 'option-image'.

LAYOUT: Two-column paper. Process left side then right side of every page.
EXTRACT ALL 60 QUESTIONS.
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

    const rawText = result.text || "{}";
    const data = JSON.parse(rawText);
    const questions = data.questions || [];

    console.log(`✅ [EXTRACTION] Success! Found ${questions.length} questions.`);
    
    // Show summary of questions with visuals
    const withVisuals = questions.filter((q: any) => q.hasVisualElement);
    console.log(`🖼️  [VISUALS] ${withVisuals.length} questions have diagrams.`);
    
    if (withVisuals.length > 0) {
      console.log("\n--- SAMPLES WITH VISUALS ---");
      withVisuals.slice(0, 5).forEach((q: any) => {
        console.log(`Q${q.id}: ${q.text.substring(0, 80)}...`);
        console.log(`  Page: ${q.pageNumber}`);
        console.log(`  Visuals:`, JSON.stringify(q.visuals, null, 2));
      });
    }

    // Save full JSON for inspection
    fs.writeFileSync("/tmp/physics_extraction_results.json", JSON.stringify(data, null, 2));
    console.log(`\n💾 Full results saved to /tmp/physics_extraction_results.json`);

  } catch (err) {
    console.error("❌ [EXTRACTION] Failed:", err);
  }
}

runExtraction();
