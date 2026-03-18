
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const PDF_PATH = "/Users/apple/Downloads/CETPAPERS/PHYSICS_2025_kcet.pdf";
const API_KEY = process.env.GEMINI_API_KEY || "";
// The error told us the project number is 186662105619
const PROJECT = "186662105619"; 
const LOCATION = "us-central1";

async function testVertex() {
  console.log("🚀 Testing Vertex AI with Project:", PROJECT);
  
  // Use the refined logic that bypasses constructor conflict
  const ai = new GoogleGenAI({
    apiKey: API_KEY,
    vertexai: true
  });
  
  const buffer = fs.readFileSync(PDF_PATH);
  const base64 = buffer.toString("base64");

  const prompt = "Extract first 2 questions as JSON: {questions: [{id: 1, text: '...'}]}";

  try {
    const result = await ai.models.generateContent({
      model: `projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/gemini-1.5-flash`,
      contents: [{
            role: "user",
            parts: [
                { inlineData: { mimeType: "application/pdf", data: base64 } },
                { text: prompt }
            ]
      }],
      config: { responseMimeType: "application/json" }
    });
    console.log("✅ Vertex Result:", result.text);
  } catch (err: any) {
    console.error("❌ Vertex Fail:", err.status, err.message);
  }
}

testVertex();
