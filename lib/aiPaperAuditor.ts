
import { getGeminiClient, withGeminiRetry } from '../utils/geminiClient';
import { SupabaseClient } from '@supabase/supabase-js';
import { AI_CONFIG } from '../config/aiConfigs';

/**
 * AI Paper Auditor (REI v3.0 Phase 1)
 */

export interface PaperAuditResult {
    boardSignature: 'SYNTHESIZER' | 'LOGICIAN' | 'INTIMIDATOR' | 'ANCHOR' | 'DEFAULT';
    intentSignature: {
        synthesis: number; // 0-1
        trapDensity: number; // 0-1
        linguisticLoad: number; // 0-1
        speedRequirement: number; // 0-1
    };
    evolutionNote: string;
    rigorDetected: number; // 0-10 index
    idsActual: number; // Estimated average Item Difficulty Score
}

export async function auditPaperHistoricalContext(
    paperText: string,
    examContext: string,
    subject: string,
    year: number,
    apiKey: string
): Promise<PaperAuditResult | null> {
    try {
        const ai = getGeminiClient(apiKey);

        const prompt = `You are an expert ${examContext} Exam Auditor.
Analyze the following text of the ${year} ${subject} paper to identify the "Evolutionary Intent".

TEXT:
${paperText.substring(0, 20000)}... (truncated for analysis)

TASK:
1. Determine the "Board Signature":
   - 'SYNTHESIZER': Focus on property-based shortcuts and speed.
   - 'LOGICIAN': Focus on cross-chapter conceptual fusion and multi-step derivation.
   - 'INTIMIDATOR': Focus on linguistic traps and complex A-R reasoning.
   - 'ANCHOR': Standard syllabus-aligned blueprint.
2. Rate the Intent Signature (0-1.0) for:
   - Synthesis: How many questions require merging two distinct topics?
   - Trap Density: Frequency of distractors targeting common cognitive biases.
   - Linguistic Load: Complexity of question phrasing.
   - Speed Requirement: Ability to be solved in < 60 seconds per question.
3. Evolution Note: A technical summary of how this year differs from previous (e.g., "Shifted from linear algebra to matrix symmetry as the primary differentiator").
4. Rigor detected (1-10) and Average IDS (0-1.0).

Return ONLY valid JSON:
{
  "boardSignature": "SYNTHESIZER",
  "intentSignature": {
    "synthesis": 0.8,
    "trapDensity": 0.5,
    "linguisticLoad": 0.3,
    "speedRequirement": 0.95
  },
  "evolutionNote": "Summary of evolution...",
  "rigorDetected": 7,
  "idsActual": 0.82
}`;

        const result = await withGeminiRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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
        return JSON.parse(cleaned);

    } catch (error) {
        console.error('❌ [PaperAuditor] Failed:', error);
        return null;
    }
}

/**
 * Updates the historical pattern in DB with the Auditor's findings
 */
export async function persistAuditToHistoricalPattern(
    supabase: SupabaseClient,
    patternId: string,
    audit: PaperAuditResult
) {
    const { error } = await supabase
        .from('exam_historical_patterns')
        .update({
            board_signature: audit.boardSignature,
            intent_signature: audit.intentSignature,
            evolution_note: audit.evolutionNote,
            ids_actual: audit.idsActual
            // rigor_velocity will be calculated by the Evolution Engine comparing this to previous
        })
        .eq('id', patternId);

    if (error) console.error('❌ [PaperAuditor] Persistence failed:', error);
    else console.log(`✅ [PaperAuditor] Signature persisted for pattern ${patternId}`);
}
