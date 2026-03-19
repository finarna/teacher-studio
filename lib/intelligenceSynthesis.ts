import { getGeminiClient, withGeminiRetry } from '../utils/geminiClient';
import { SupabaseClient } from '@supabase/supabase-js';
import { AI_CONFIG } from '../config/aiConfigs';
import { safeAiParse } from '../utils/aiParser';

/**
 * INTELLIGENCE SYNTHESIS ENGINE
 * Handles generating missing solutions, insights, tips, and formulas for questions.
 * Used for both scanned papers and AI-generated questions that might be missing data.
 * 
 * DESIGNED TO WORK ON BOTH CLIENT AND SERVER.
 */

export interface SynthesisResult {
    subtopic: string;
    solutionSteps: string[];
    markingSteps: { step: string; mark: string }[];
    aiReasoning: string;
    whyItMatters: string;
    studyTip: string;
    commonMistakes: { mistake: string; why: string; howToAvoid: string }[];
    keyFormulas: string[];
    keyConcepts: { name: string; explanation: string }[];
    difficulty: 'Easy' | 'Moderate' | 'Hard';
    verifiedCorrectOptionIndex?: number;
    historicalPattern?: string;
    historical_pattern?: string;
    predictiveInsight?: string;
    predictive_insight?: string;
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
        const ai = getGeminiClient(apiKey);

        console.log(`🧠 [SynthesisEngine] Synthesizing for Q ID: ${question.id}`);

        const prompt = `You are a world-class ${examContext} examiner and a master of ${subject} pedagogy. 
Your goal is to transform a simple question into a "High-Yield Mastery Engine".

Analyze this question and generate "Deep Intelligence" that an elite student would value. 

QUESTION: 
${question.text}

OPTIONS:
${question.options?.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n') || 'N/A'}

CORRECT OPTION INDEX: ${question.correct_option_index ?? 0}

TASK:
Provide a rigorous, brutally detailed analysis. Generic advice like "Check calculations" is FORBIDDEN.

1. solutionSteps: Minimum 3 logical steps. Every step must explain the "WHY" not just the "WHAT". Format: "Sub-task title ::: Detailed logic including math $formula$".
2. aiReasoning: Provide the "Expert Examiner Mindset". Explain the "Psychological Trap". What exactly is the examiner trying to confuse? Is it a unit conversion? A boundary condition? A similar-looking concept? Explain the "Cognitive Pivot".
3. historicalPattern: Provide the "Syllabus History & Exam Pattern". Syllabus-specific context. (e.g., "Frequent in ${examContext} 2018-2022; shifted in 2024 to test domain properties rather than direct substitution").
4. predictiveInsight: Provide the "Cycle Predictions". Describe the next logical evolution. "Expect a version of this involving [concept X] in the next cycle."
5. whyItMatters: Connect to engineering/medical/science reality. "This logic is why control systems in [application] don't fail under pressure."
6. studyTip: Provide the "Strategic Memory Anchor". A professional "Mastery" shortcut, mnemonic, or "Base-Check Ritual". Must be a specific, actionable mental tool.
7. pitfalls: Provide the "Trap Vigilance Protocol". Identify the exact mathematical or conceptual traps in THIS problem. Be ultra-specific.
8. subtopic: Granular subtopic name (3 words max).
9. keyConcepts: List at least 2 fundamental principles at play, with explanations that link them to the problem.
10. verifiedCorrectOptionIndex: Rigorously verify if the provided CORRECT OPTION INDEX (${question.correct_option_index ?? 0}) is actually correct based on your derivation. If it is wrong, provide the correct index (0 for A, 1 for B, 2 for C, 3 for D). Explain WHY in your reasoning.

GOLD STANDARD EXAMPLE (Biology):
aiReasoning: "The examiner leverages the 'Location Ambiguity' trap. Students often confuse Anterior vs Posterior junctions in insect anatomy (e.g., Cockroach midgut). Focus on the 'M-H Junction' mnemonic to distinguish Malpighian tubules from Gastric Caeca."
historicalPattern: "High-frequency topic since 2012. 2024 trends show a move toward 'Structural Linkage' questions where location is tied to function."

Return ONLY valid JSON:
{
  "solutionSteps": [ "Subtask Title ::: Detailed reasoning $Formula$..." ],
  "aiReasoning": "Crucial: Deep psychological analysis of the trap. (e.g., 'Examiner focuses on anterior vs posterior junction of midgut to catch students who memorized but didn't visualize anatomy.')",
  "historicalPattern": "Exam history: 'Topic appears consistently every 2 years; 2024 saw a move toward structural links.')",
  "predictiveInsight": "Prediction: 'Expect future variants involving Malpighian tubule count or precise junction chemistry.')",
  "whyItMatters": "Application: 'This anatomical precision is the basis for veterinary surgery logic.')",
  "studyTip": "Mastery Protocol: 'Always use 'A-P' relative mapping rituals during recall.')",
  "commonMistakes": [{ "mistake": "Identifying posterior instead of anterior", "why": "Students rush the location mapping", "howToAvoid": "Always sketch the junction mentally first" }],
  "keyFormulas": ["None"],
  "keyConcepts": [{ "name": "Insect Anatomy", "explanation": "Structural organisation of junctions." }],
  "difficulty": "Moderate",
  "subtopic": "Animal Tissues",
  "verifiedCorrectOptionIndex": 0
}

RULES:
- ALWAYS populate every field. DO NOT leave historicalPattern or predictiveInsight empty.
- Use SINGLE dollar signs for LaTeX: $E=mc^2$.
- ONLY double-backslash LaTeX COMMANDS: "\\\\frac{1}{2}".
- NO markdown outside JSON.`;



        const result = await withGeminiRetry(() => ai.models.generateContent({
            model: modelName,
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            config: {
                responseMimeType: "application/json",
                temperature: 0.1
            }
        }));
        
        const text = (result.text || "{}").trim();
        const cleaned = text.replace(/```json|```/g, '').trim();
        const synthesis = safeAiParse<SynthesisResult>(cleaned, {} as any);
        
        if (!synthesis || !synthesis.solutionSteps) {
            console.error('❌ [SynthesisEngine] Failed to parse AI response as valid synthesis JSON');
            return null;
        }

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
                correct_option_index: synthesis.verifiedCorrectOptionIndex !== undefined ? synthesis.verifiedCorrectOptionIndex : (question.correct_option_index ?? 0),
                solution_steps: synthesis.solutionSteps,
                study_tip: synthesis.studyTip,
                exam_tip: synthesis.studyTip, // Maintain backward compatibility
                key_formulas: synthesis.keyFormulas,
                ai_reasoning: synthesis.aiReasoning,
                historical_pattern: synthesis.historicalPattern || synthesis.historical_pattern,
                predictive_insight: synthesis.predictiveInsight || synthesis.predictive_insight,
                why_it_matters: synthesis.whyItMatters,
                pitfalls: synthesis.commonMistakes?.map(m => ({
                    mistake: m.mistake || (m as any).pitfall,
                    why: (m as any).why || '',
                    howToAvoid: (m as any).howToAvoid || ''
                })) || [],
                metadata: {
                    ...(question.metadata || {}),
                    subtopic: synthesis.subtopic,
                    complexity_matrix: {
                        blooms: synthesis.difficulty === 'Easy' ? 'Apply' : synthesis.difficulty === 'Hard' ? 'Evaluate' : 'Analyze',
                        relevancy: 'High'
                    }
                },
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
            try {
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

                // Artificial delay to prevent rate limiting
                await new Promise(r => setTimeout(r, 1000));
            } catch (innerError: any) {
                const errorText = innerError?.message?.toLowerCase() || "";
                console.error(`❌ [SynthesisEngine] Question loop error: ${innerError.message}`);
                
                // CRITICAL: Stop the entire scan synthesis if the key is expired
                if (errorText.includes("expired") || errorText.includes("401") || errorText.includes("invalid_argument")) {
                    console.error('⛔ [SynthesisEngine] FATAL: API Key is invalid or expired. ABORTING SCAN SYNTHESIS.');
                    break; 
                }
                // Otherwise continue to next question
            }
        }

        console.log(`✅ [SynthesisEngine] Scan synthesis complete. Success: ${successCount}/${questions.length}`);
        return { processed: questions.length, success: successCount };

    } catch (error) {
        console.error('❌ [SynthesisEngine] Scan synthesis failed:', error);
        return { processed: 0, success: 0 };
    }
}
