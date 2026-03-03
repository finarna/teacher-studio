import { GoogleGenerativeAI } from '@google/generative-ai';
import { SupabaseClient } from '@supabase/supabase-js';
import { AI_CONFIG } from '../config/aiConfigs';

/**
 * INTELLIGENCE SYNTHESIS ENGINE
 * Handles generating missing solutions, insights, tips, and formulas for questions.
 * Used for both scanned papers and AI-generated questions that might be missing data.
 * 
 * DESIGNED TO WORK ON BOTH CLIENT AND SERVER.
 */

export interface SynthesisResult {
    solutionSteps: string[];
    markingSteps: { step: string; mark: string }[];
    aiReasoning: string;
    whyItMatters: string;
    studyTip: string;
    commonMistakes: { mistake: string; why: string; howToAvoid: string }[];
    keyFormulas: string[];
    keyConcepts: { name: string; explanation: string }[];
    difficulty: 'Easy' | 'Moderate' | 'Hard';
    historicalPattern?: string;
    predictiveInsight?: string;
}

/**
 * Core synthesis function for a single question
 */
export async function synthesizeQuestionIntelligence(
    question: any,
    topicName: string,
    subject: string,
    examContext: string,
    supabase: SupabaseClient,
    apiKey: string,
    modelName: string = AI_CONFIG.defaultModel
): Promise<any | null> {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        console.log(`🧠 [SynthesisEngine] Synthesizing for Q ID: ${question.id}`);

        const prompt = `You are an elite ${examContext} examiner and pedagogy expert in ${subject}.
Topic: ${topicName}

Analyze this specific question and generate high-yield educational "Deep Intelligence".

QUESTION:
${question.text}

OPTIONS:
${question.options?.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n') || 'N/A'}

CORRECT OPTION INDEX: ${question.correct_option_index ?? 0}

TASK:
Provide a rigorous, structured analysis. Generic advice like "check your calculations" is STRICTLY FORBIDDEN.

1. solutionSteps: Minimum 3 logical steps. Format: "Title ::: Detailed reasoning with math".
2. aiReasoning: Explain the EXACT psychological trap or conceptual pivot the examiner is testing in THIS specific problem.
3. historicalPattern: syllabus-specific context. (e.g., "Frequent in KCET 2018-2022, shifted from direct calculation to domain properties in 2024").
4. predictiveInsight: A specific variation or "next-level" question likely to appear.
5. whyItMatters: Connect this specific concept to higher-level engineering/medical application (e.g., "Log domain checks are critical in filter stability analysis").
6. studyTip: A professional "Mastery" shortcut, mnemonic or visualization ritual (The 'Base-Check Ritual').
7. pitfalls: EXACT conceptual traps in this specific problem. Generic "Calculation errors" or "Rush through" advice is FORBIDDEN and will be rejected. Identify a real mathematical pitfall.

Return ONLY valid JSON:
{
  "solutionSteps": [
    "Identify Domain ::: First determine the range where... $x > 3$",
    "Evaluate Components ::: Substitute values into... $f(4) = 2(4) = 8$",
    "Final Logic ::: Sum all results... $f(-2) + f(3) + f(4) = -6 + 9 + 8 = 11$"
  ],
  "markingSteps": [{"step": "Correct identification of piecewise boundary", "mark": "1"}],
  "aiReasoning": "Tests the student's ability to selectively apply piecewise rules without mixing boundary conditions...",
  "whyItMatters": "Piecewise logic is fundamental to signal processing and algorithmic control loops...",
  "studyTip": "V-Table Sync: Always draw a small number line and mark boundaries to physically see which function to use.",
  "commonMistakes": [
    {
      "mistake": "Using $x^2$ for $f(3)$",
      "why": "Mistakenly including boundary value in the inequality",
      "howToAvoid": "Strictly observe the '=' sign position in piece definitions"
    }
  ],
  "keyFormulas": ["$f(x) = \\begin{cases} ... \\end{cases}$"],
  "keyConcepts": [{"name": "Piecewise Function Evaluation", "explanation": "Dynamic function selection based on input domain..."}],
  "difficulty": "Moderate",
  "historicalPattern": "High frequency in function evaluation blocks; similar logic seen in 2021 Q.12 and 2023 Q.4.",
  "predictiveInsight": "Expected to evolve into composition of piecewise functions in upcoming cycles."
}

CRITICAL:
- Use SINGLE dollar signs for ALL LaTeX: $E=mc^2$ (inline) or $$E=mc^2$$ (display).
- ONLY double-backslash internal LaTeX COMMANDS inside JSON: "\\\\frac{1}{2}" or "\\\\log".
- DO NOT use any other delimiters like \( \) or \[ \].
- NO extra text outside JSON.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Clean up potential markdown formatting
        if (text.startsWith('```json')) {
            text = text.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (text.startsWith('```')) {
            text = text.replace(/```\s*/, '').replace(/```\s*$/, '');
        }

        // Pre-parse sanitation for LaTeX backslashes
        // Fix cases where AI uses single backslash for LaTeX in JSON (invalid)
        const sanitizedText = text.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
        const synthesis: SynthesisResult = JSON.parse(sanitizedText);

        // Sanitize difficulty for DB constraint
        let finalDifficulty: 'Easy' | 'Moderate' | 'Hard' = 'Moderate';
        const rawDiff = (synthesis.difficulty || '').toLowerCase();
        if (rawDiff.includes('easy')) finalDifficulty = 'Easy';
        if (rawDiff.includes('hard')) finalDifficulty = 'Hard';

        // Update the question in Supabase
        // Handle mastery_material carefully to avoid string-spreading bug
        let existingMastery = {};
        try {
            const rawMastery = question.mastery_material;

            // If it's a string, attempt to parse it
            if (typeof rawMastery === 'string') {
                const parsed = JSON.parse(rawMastery);
                // If it looks like '{"0":"{", ...}', it's corrupt character-spreading
                if (parsed['0'] && !parsed['solutionSteps']) {
                    existingMastery = {};
                } else {
                    existingMastery = parsed;
                }
            } else if (rawMastery && typeof rawMastery === 'object') {
                // If it's an object, check for character-indexed corruption (e.g., from a previous bad save)
                if (rawMastery['0'] && !rawMastery['solutionSteps']) {
                    existingMastery = {};
                } else {
                    existingMastery = rawMastery;
                }
            }
        } catch (e) {
            existingMastery = {};
        }

        const { error } = await supabase
            .from('questions')
            .update({
                difficulty: finalDifficulty,
                solution_steps: synthesis.solutionSteps,
                study_tip: synthesis.studyTip,
                exam_tip: synthesis.studyTip, // Maintain backward compatibility
                key_formulas: synthesis.keyFormulas,
                ai_reasoning: synthesis.aiReasoning,
                historical_pattern: synthesis.historicalPattern,
                predictive_insight: synthesis.predictiveInsight,
                why_it_matters: synthesis.whyItMatters,
                pitfalls: synthesis.commonMistakes?.map(m => ({
                    mistake: m.mistake || (m as any).pitfall,
                    why: (m as any).why || '',
                    howToAvoid: (m as any).howToAvoid || ''
                })) || [],
                mastery_material: {
                    ...existingMastery,
                    ...synthesis
                }
            })
            .eq('id', question.id);

        if (error) {
            console.error('❌ [SynthesisEngine] Failed to save to DB:', error);
        } else {
            console.log('✅ [SynthesisEngine] Successfully updated question in DB');
        }

        return {
            ...question,
            ...synthesis,
            id: question.id // Ensure ID remains stable
        };
    } catch (error) {
        console.error('❌ [SynthesisEngine] Synthesis failed:', error);
        return null;
    }
}

/**
 * Synthesize intelligence for all questions in a scan that are missing solutions
 */
export async function synthesizeScanIntelligence(
    supabase: SupabaseClient,
    scanId: string,
    apiKey: string,
    modelName: string = AI_CONFIG.defaultModel
): Promise<{ processed: number; success: number }> {
    try {
        console.log(`🚀 [SynthesisEngine] Starting scan-wide synthesis for scan: ${scanId}`);

        // 1. Get scan metadata for context
        const { data: scan } = await supabase
            .from('scans')
            .select('subject, exam_context')
            .eq('id', scanId)
            .single();

        if (!scan) throw new Error('Scan not found');

        // 2. Find questions for this scan missing solutions
        const { data: questions } = await supabase
            .from('questions')
            .select('*')
            .eq('scan_id', scanId)
            .or('solution_steps.is.null,solution_steps.eq.[]');

        if (!questions || questions.length === 0) {
            console.log('✅ [SynthesisEngine] No questions found missing solutions for this scan.');
            return { processed: 0, success: 0 };
        }

        console.log(`📊 [SynthesisEngine] Found ${questions.length} questions to synthesize.`);

        let successCount = 0;
        for (const q of questions) {
            const topicName = q.topic || 'General';
            const result = await synthesizeQuestionIntelligence(
                q,
                topicName,
                scan.subject,
                scan.exam_context,
                supabase,
                apiKey,
                modelName
            );

            if (result) successCount++;

            // Artificial delay to prevent rate limiting (Gemini free tier has low RPM)
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`✅ [SynthesisEngine] Scan synthesis complete. Success: ${successCount}/${questions.length}`);
        return { processed: questions.length, success: successCount };

    } catch (error) {
        console.error('❌ [SynthesisEngine] Scan synthesis failed:', error);
        return { processed: 0, success: 0 };
    }
}
