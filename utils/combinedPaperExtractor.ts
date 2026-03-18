import { getGeminiClient, withGeminiRetry } from './geminiClient';
import { AnalyzedQuestion, Subject } from '../types';
import { generateTopicInstruction, matchToOfficialTopic } from './officialTopics';
import { safeAiParse } from './aiParser';

/**
 * Combined Paper Extractor - NEET/JEE Multi-Subject High-Fidelity Logic
 */

export async function extractCombinedPaper(
    file: File,
    apiKey: string,
    modelName: string,
    examContext: 'NEET' | 'JEE',
    onProgress?: (stage: string) => void
): Promise<AnalyzedQuestion[]> {
    onProgress?.('Initializing High-Fidelity Multi-Subject Scan...');

    // Vertex AI Centralized Client
    const ai = getGeminiClient(apiKey);

    // Efficient base64 conversion
    const buffer = await file.arrayBuffer();
    const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
    const mimeType = 'application/pdf';

    const expectedCount = examContext === 'NEET' ? 200 : 90;

    onProgress?.(`Extracting ALL ${expectedCount} questions from ${examContext} paper (Mega-Scan active)...`);

    // Interactive message rotation for long-running LLM requests
    const messages = [
        `Analyzing ${examContext} paper structure...`,
        `Extracting ${expectedCount} questions and options...`,
        `Processing two-column bilingual layout...`,
        `Identifying NTA Section A/B boundaries...`,
        `Detecting figures and visual bounding boxes...`,
        `Mapping questions to official NCERT chapters...`,
        `Normalizing LaTeX mathematical expressions...`,
        `Verifying data integrity across all units...`,
        `Parsing complex chemical formulas and equations...`,
        `Structuring question metadata for final synthesis...`
    ];
    let msgIndex = 0;
    const interval = setInterval(() => {
        onProgress?.(messages[msgIndex % messages.length]);
        msgIndex++;
    }, 4000);

    const prompt = `
      You are an elite ${examContext} exam analyzer specializing in NTA (National Testing Agency) paper structures. 
      
      TASK: Extract EVERY SINGLE question from this ${examContext} combined paper.
      
      NEET PAPER STRUCTURE (Official NTA 2021+ Pattern):
      - Q1 to Q35 (Section A) & Q36 to Q50 (Section B): Physics
      - Q51 to Q85 (Section A) & Q86 to Q100 (Section B): Chemistry
      - Q101 to Q135 (Section A) & Q136 to Q150 (Section B): Botany
      - Q151 to Q185 (Section A) & Q186 to Q200 (Section B): Zoology

      JEE PAPER STRUCTURE (Official NTA Pattern):
      - Q1 to Q20 (Section A) & Q21 to Q30 (Section B): Physics
      - Q31 to Q50 (Section A) & Q51 to Q60 (Section B): Chemistry
      - Q61 to Q80 (Section A) & Q81 to Q90 (Section B): Mathematics

      SCANNING DIRECTIVES (High Fidelity & Density):
      1. TWO-COLUMN LAYOUT: This paper typically uses a two-column vertical layout. Process the left column fully before the right column on each page.
      2. BILINGUAL CONTENT: Questions are often provided in English AND a local language (like Hindi). Extract ONLY the English text. Ignore translations.
      3. FIGURES & GRAPHS: If a question has a diagram, graph, or circuit, set "hasVisualElement": true. 
         - provide "visualBoundingBox" correctly relative to the page.
         - If a figure is placed between questions, associate it with the question it describes.
      4. OPTIONS MAPPING: Options are usually labeled (1), (2), (3), (4). Even if they are arranged in a 2x2 grid or a horizontal line, ensure you recover all 4 options accurately.
      5. LATEX EXCELLENCE: Wrap ALL math, physics units ($m/s^2$), and chemicals ($H_2SO_4$) in $ delimiters ($E=mc^2$). Use double backslashes (\\\\frac{a}{b}, \\\\Delta).
      6. DATA INTEGRITY: Extract exactly ${expectedCount} questions. If a question spans across a column or page boundary, merge it into a single clean object.
      7. NOISE REDUCTION: Ignore the paper code (e.g., Q1, A2, etc.) and page footers. Go straight to the numbered questions.
      8. TOPIC PRECISION: Assign the official NCERT Chapter name (e.g., 'Moving Charges and Magnetism') to each question.

      JSON SCHEMA:
      {
        "questions": [
          {
            "id": "1",
            "subject": "Physics",
            "section": "Section A",
            "text": "The English question text with $proper \\\\LaTeX$...",
            "options": ["Option text A", "Option text B", "Option text C", "Option text D"],
            "correct_answer": "1",
            "topic": "Official NCERT Topic Name",
            "difficulty": "Easy|Moderate|Hard",
            "blooms": "Remember|Understand|Apply|Analyze",
            "hasVisualElement": true,
            "visualBoundingBox": { "pageNumber": 1, "x": "10%", "y": "20%", "width": "50%", "height": "15%" }
          }
        ]
      }
    `;

    try {
        const result = await withGeminiRetry(() => ai.models.generateContent({
            model: modelName,
            contents: [{
                role: "user",
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: prompt }
                ]
            }],
            config: {
                responseMimeType: "application/json",
                temperature: 0.1,
                maxOutputTokens: 65536
            }
        }));

        const responseText = result.text || "{}";
        const candidate = result.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const tokenCount = result.usageMetadata?.candidatesTokenCount;
        console.log(`📥 [MEGA-SCAN] Received ${responseText.length} chars | finishReason: ${finishReason} | outputTokens: ${tokenCount}. Repairing JSON...`);

        // Use our battle-tested safeAiParse from aiParser.ts
        const parsedData = safeAiParse<any>(responseText, { questions: [] }, true);
        const questions = parsedData.questions || [];

        console.log(`✅ [MEGA-SCAN] Success: Recovered ${questions.length} / ${expectedCount} units.`);
        onProgress?.(`Synthesis complete: ${questions.length} units recovered.`);

        // Final normalization to AnalyzedQuestion type
        return questions.map((q: any, idx: number) => {
            const rawId = (q.id || q.question_number || (idx + 1)).toString();
            const qNum = parseInt(rawId.replace(/\D/g, '')) || (idx + 1);

            let subj: Subject = 'Physics';
            const rawSubj = (q.subject || '').toLowerCase();

            // 1. Determine Subject from Range (Most Reliable for combined papers)
            if (examContext === 'NEET') {
                if (qNum <= 50) subj = 'Physics';
                else if (qNum <= 100) subj = 'Chemistry';
                else if (qNum <= 150) subj = 'Botany';
                else subj = 'Zoology';
            } else {
                if (qNum <= 30) subj = 'Physics';
                else if (qNum <= 60) subj = 'Chemistry';
                else subj = 'Math';
            }

            // 2. Determine Section from Range (NTA Mandate)
            let section = q.section || 'Section A';
            if (examContext === 'NEET') {
                const subPost = qNum % 50;
                // Sections: 1-35 (A), 36-50 (B). Handle boundary for 50, 100, 150, 200
                if (subPost === 0 || (subPost > 35)) section = 'Section B';
                else section = 'Section A';
            } else {
                const subPost = qNum % 30;
                // Sections: 1-20 (A), 21-30 (B).
                if (subPost === 0 || (subPost > 20)) section = 'Section B';
                else section = 'Section A';
            }

            return {
                id: qNum.toString(),
                subject: subj,
                section: section,
                text: q.text || '',
                options: Array.isArray(q.options) ? q.options : [],
                correctOptionIndex: parseInt(q.correct_answer) - 1 || 0,
                topic: matchToOfficialTopic(q.topic || '', subj) || q.topic || 'General',
                difficulty: q.difficulty || 'Moderate',
                marks: q.marks || (examContext === 'NEET' ? 4 : 1),
                blooms: q.blooms || 'Understand',
                hasVisualElement: !!q.hasVisualElement,
                visualBoundingBox: q.visualBoundingBox || null
            } as AnalyzedQuestion;
        });
    } catch (error) {
        console.error("❌ [MEGA-SCAN] Critical Error:", error);
        onProgress?.("Extraction failed. Check console for logs.");
        return [];
    } finally {
        clearInterval(interval);
    }
}
