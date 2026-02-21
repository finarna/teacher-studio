/**
 * Test Gemini API directly to see what it returns
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGemini() {
  console.log('🧪 Testing Gemini API\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not set');
    process.exit(1);
  }

  const prompt = `You are a test. Return ONLY this JSON:
{
  "topics": [
    {
      "topicId": "test",
      "topicName": "Test Topic",
      "probability": 0.8,
      "expectedQuestionCount": 10,
      "trend": "stable",
      "confidence": 0.7,
      "reasoning": "Test"
    }
  ],
  "difficultyDistribution": { "easy": 40, "moderate": 45, "hard": 15 },
  "overallConfidence": 0.75
}`;

  try {
    console.log('📡 Calling Gemini API...\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 4096,
          }
        })
      }
    );

    if (!response.ok) {
      console.error(`❌ API returned ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Response:', errorText);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ API Response received\n');
    console.log('Raw response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Extracted text:');
    console.log(text);
    console.log('\n');

    // Try to parse JSON
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

    console.log('JSON string to parse:');
    console.log(jsonStr);
    console.log('\n');

    const parsed = JSON.parse(jsonStr);
    console.log('✅ Parsed JSON:');
    console.log(JSON.stringify(parsed, null, 2));
    console.log('\n');

    if (parsed.topics) {
      console.log(`✅ Has topics array with ${parsed.topics.length} items`);
    } else {
      console.log('❌ NO topics property!');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testGemini();
