import { getGeminiClient, withGeminiRetry } from "./utils/geminiClient.ts";
import dotenv from "dotenv";
dotenv.config();

const client = getGeminiClient();

async function test() {
    try {
        const result = await withGeminiRetry(() => client.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: "user", parts: [{ text: "Hello! Are you running on Vertex AI?" }] }]
        }));
        console.log("Full Result:", JSON.stringify(result, null, 2));
        console.log("Text Output:", result.text);
    } catch (e) {
        console.error("Test Failed:", e.message);
        if (e.stack) console.error(e.stack);
    }
}

test();
