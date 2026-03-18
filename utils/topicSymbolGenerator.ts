/**
 * Topic Symbol and Image Generator
 * Uses Gemini AI to generate representative symbols and images for topics
 */

import { getGeminiClient, withGeminiRetry } from "./geminiClient";

export interface TopicSymbol {
  symbol: string;
  type: 'math' | 'emoji' | 'text';
}

export interface TopicVisuals {
  symbol: string;
  symbolType: 'math' | 'emoji' | 'text';
  imageBase64?: string; // Base64 encoded image
}

/**
 * Generate a representative symbol for a topic using Gemini AI
 */
export async function generateTopicSymbol(
  topicName: string,
  subject: string,
  examContext: string,
  apiKey: string
): Promise<TopicSymbol> {
  try {
    const ai = getGeminiClient(apiKey);
    const prompt = `You are an expert in ${subject} education for ${examContext} exams.
For the topic "${topicName}", provide a SINGLE, CLEAR visual representation.
Respond ONLY in this JSON format: {"symbol": "your_symbol_here", "type": "math"}`;

    const result = await withGeminiRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
    });

    const responseText = (result as any).text || "{}";
    const parsed: TopicSymbol = JSON.parse(responseText);

    return parsed;
  } catch (error) {
    console.error(`Error generating symbol for topic "${topicName}":`, error);
    return getFallbackSymbol(topicName);
  }
}

function getFallbackSymbol(topicName: string): TopicSymbol {
  const lowerTopic = topicName.toLowerCase();
  if (lowerTopic.includes('integral')) return { symbol: '∫', type: 'math' };
  if (lowerTopic.includes('derivative')) return { symbol: "f'(x)", type: 'math' };
  return { symbol: '📚', type: 'emoji' };
}

/**
 * Generate a visual image for a topic
 */
export async function generateTopicImage(
  topicName: string,
  subject: string,
  examContext: string,
  apiKey: string
): Promise<string | null> {
  try {
    const ai = getGeminiClient(apiKey);
    const prompt = `Minimalist educational icon for ${subject} topic: "${topicName}"`;

    const result = await withGeminiRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-3-flash-preview-exp-image-01',
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
    });

    const imagePart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    return imagePart?.inlineData?.data || null;
  } catch (error) {
    console.error(`Error generating image for topic "${topicName}":`, error);
    return null;
  }
}

export async function generateTopicVisuals(
  topicName: string,
  subject: string,
  examContext: string,
  apiKey: string
): Promise<TopicVisuals> {
  const symbolData = await generateTopicSymbol(topicName, subject, examContext, apiKey);
  const imageBase64 = await generateTopicImage(topicName, subject, examContext, apiKey);

  return {
    symbol: symbolData.symbol,
    symbolType: symbolData.type,
    imageBase64: imageBase64 || undefined
  };
}
