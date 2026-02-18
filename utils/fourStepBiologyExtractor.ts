/**
 * FOUR-STEP Biology Extraction (Gemini Web Conversational Approach)
 *
 * Mimics user's successful workflow where each query builds on previous context
 * Total: ~100 seconds
 */

import { GoogleGenAI, Type } from '@google/genai';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export async function extractBiologyQuestionsFourStep(
  file: File,
  apiKey: string,
  model: string = 'gemini-3-flash-preview',
  examContext: string = 'NEET',
  onProgress?: (message: string) => void
) {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await fileToBase64(file);
  const startTime = Date.now();

  // ==========================================
  // STEP 1: EXTRACT QUESTIONS (<60 seconds)
  // ==========================================
  onProgress?.('Step 1/4: Extracting questions...');
  console.log('📝 [STEP 1/4] Extracting questions...');

  const step1Response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        },
        {
          text: `Extract all the questions from this paper ${examContext} Biology Class 12`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            text: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  isCorrect: { type: Type.BOOLEAN },
                },
                required: ["id", "text", "isCorrect"],
              },
            },
          },
          required: ["id", "text", "options"],
        },
      },
      temperature: 0.1,
      maxOutputTokens: 65536,
    },
  });

  const questions = JSON.parse(step1Response.text || '[]');
  const step1Time = Math.floor((Date.now() - startTime) / 1000);
  console.log(`✅ [STEP 1] Extracted ${questions.length} questions in ${step1Time}s`);
  onProgress?.(`Step 1: ${questions.length} questions (${step1Time}s`);

  // ==========================================
  // STEP 2: CLASSIFY TOPICS (10 seconds)
  // Context: Questions from Step 1
  // ==========================================
  onProgress?.('Step 2/4: Classifying topics...');
  console.log('🗂️ [STEP 2/4] Classifying topics (with question context)...');

  const step2Start = Date.now();

  try {
    const step2Response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            text: `Classify them as per the Biology chapters of Class 12th ${examContext}.

Questions:
${JSON.stringify(questions.map(q => ({ id: q.id, text: q.text.substring(0, 150) })), null, 2)}`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              topic: { type: Type.STRING },
              domain: { type: Type.STRING },
            },
            required: ["id", "topic", "domain"],
          },
        },
        temperature: 0.1,
        maxOutputTokens: 16384,
      },
    });

    if (!step2Response.text) {
      console.error('❌ [STEP 2] Empty response from API');
      throw new Error('Empty response from classification API');
    }

    var classifications = JSON.parse(step2Response.text);
  } catch (error) {
    console.error('❌ [STEP 2] Error:', error);
    console.log('⚠️ [STEP 2] Falling back to General Biology for all questions');
    var classifications = questions.map(q => ({ id: q.id, topic: 'General Biology', domain: 'General Biology' }));
  }
  const step2Time = Math.floor((Date.now() - step2Start) / 1000);
  console.log(`✅ [STEP 2] Classified in ${step2Time}s`);
  onProgress?.(`Step 2: Classified (${step2Time}s)`);

  // Merge
  const classifiedQuestions = questions.map((q: any) => {
    const c = classifications.find((x: any) => x.id === q.id);
    return { ...q, topic: c?.topic || 'General Biology', domain: c?.domain || 'General Biology' };
  });

  // ==========================================
  // STEP 3: ADD BLOOM'S + PEDAGOGY (20 seconds)
  // Context: Questions + Topics from Steps 1 & 2
  // ==========================================
  onProgress?.('Step 3/4: Adding Bloom\'s taxonomy...');
  console.log('🎓 [STEP 3/4] Adding Bloom\'s and pedagogy...');

  const step3Start = Date.now();

  try {
    const step3Response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            text: `Add Bloom's taxonomy and pedagogy for all questions and tabular classification.

Questions with topics:
${JSON.stringify(classifiedQuestions.map(q => ({ id: q.id, text: q.text.substring(0, 100), topic: q.topic })), null, 2)}`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              difficulty: { type: Type.STRING },
              blooms: { type: Type.STRING },
            },
            required: ["id", "difficulty", "blooms"],
          },
        },
        temperature: 0.1,
        maxOutputTokens: 16384,
      },
    });

    if (!step3Response.text) {
      console.error('❌ [STEP 3] Empty response from API');
      throw new Error('Empty response from pedagogy API');
    }

    var pedagogy = JSON.parse(step3Response.text);
  } catch (error) {
    console.error('❌ [STEP 3] Error:', error);
    console.log('⚠️ [STEP 3] Falling back to default pedagogy');
    var pedagogy = questions.map(q => ({ id: q.id, difficulty: 'Medium', blooms: 'Understanding' }));
  }
  const step3Time = Math.floor((Date.now() - step3Start) / 1000);
  console.log(`✅ [STEP 3] Added pedagogy in ${step3Time}s`);
  onProgress?.(`Step 3: Pedagogy added (${step3Time}s)`);

  // Merge
  const enrichedQuestions = classifiedQuestions.map((q: any) => {
    const p = pedagogy.find((x: any) => x.id === q.id);
    return { ...q, difficulty: p?.difficulty || 'Medium', blooms: p?.blooms || 'Understanding' };
  });

  // ==========================================
  // STEP 4: EXTRACT VISUAL ELEMENTS (10 seconds)
  // Context: PDF + Question IDs from Steps 1-3
  // ==========================================
  onProgress?.('Step 4/4: Extracting diagrams/tables...');
  console.log('🖼️ [STEP 4/4] Extracting visual elements...');

  const step4Start = Date.now();

  try {
    const step4Response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: `Extract the diagrams, images, tables and other information provided for the question. List how many have such type of information and extract and map it.

We have ${questions.length} questions total.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              hasVisualElement: { type: Type.BOOLEAN },
              visualElementType: { type: Type.STRING, nullable: true },
              visualElementDescription: { type: Type.STRING, nullable: true },
            },
            required: ["id", "hasVisualElement"],
          },
        },
        temperature: 0.1,
        maxOutputTokens: 16384,
      },
    });

    if (!step4Response.text) {
      console.error('❌ [STEP 4] Empty response from API');
      throw new Error('Empty response from visuals API');
    }

    var visuals = JSON.parse(step4Response.text);
  } catch (error) {
    console.error('❌ [STEP 4] Error:', error);
    console.log('⚠️ [STEP 4] Falling back to no visual elements');
    var visuals = [];
  }
  const step4Time = Math.floor((Date.now() - step4Start) / 1000);
  console.log(`✅ [STEP 4] Found ${visuals.length} questions with visuals in ${step4Time}s`);
  onProgress?.(`Step 4: ${visuals.length} visuals (${step4Time}s)`);

  // Final merge
  const finalQuestions = enrichedQuestions.map((q: any) => {
    const v = visuals.find((x: any) => x.id === q.id);
    return {
      ...q,
      hasVisualElement: v?.hasVisualElement || false,
      visualElementType: v?.visualElementType || null,
      visualElementDescription: v?.visualElementDescription || null,
    };
  });

  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  console.log(`\n🎉 [COMPLETE] All 4 steps in ${totalTime}s`);
  console.log(`   Step 1 (Extract):  ${step1Time}s`);
  console.log(`   Step 2 (Classify): ${step2Time}s`);
  console.log(`   Step 3 (Pedagogy): ${step3Time}s`);
  console.log(`   Step 4 (Visuals):  ${step4Time}s`);
  onProgress?.(`✅ Complete: ${questions.length} questions in ${totalTime}s`);

  return finalQuestions;
}
