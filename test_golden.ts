
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || "";
const PROJECT = "finarna-teacher-studio"; // Their snippet had 'usdproj'
const LOCATION = "us-central1";

async function runGolden() {
  console.log("🚀 Running Golden Solution...");
  try {
    const ai = new GoogleGenAI({
      apiKey: API_KEY,
      vertexai: true,
      project: PROJECT,
      location: LOCATION
    });

    console.log("✅ Client Created!");
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "Test"
    });
    console.log("Result:", result.text);
  } catch (err: any) {
    console.error("❌ Failed:", err.message);
    if (err.status) console.error("Status:", err.status);
  }
}

runGolden();
