
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    // The SDK might not have a direct listModels but we can try
    console.log('Listing models...');
    // Actually, go through the models object if it exists or use fetch
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await resp.json();
    console.log(JSON.stringify(data, null, 2));
}
main();
