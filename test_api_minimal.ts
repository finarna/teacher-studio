
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || "";

async function test() {
  console.log("Testing API Key:", API_KEY.substring(0, 10) + "...");
  const ai = new GoogleGenAI({ apiKey: API_KEY, vertexai: false });
  try {
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: "Hi" }] }]
    });
    console.log("Response:", result.text);
  } catch (err: any) {
    console.error("Error:", err.status, err.message);
  }
}

test();
