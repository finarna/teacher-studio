
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
    identityVector?: Record<string, number>; // NEW: id -> count
}

export async function auditPaperHistoricalContext(
    paperText: string,
    examContext: string,
    subject: string,
    year: number,
    apiKey: string,
    identities?: any[] // Optional Identity Bank
): Promise<PaperAuditResult | null> {
    try {
        const ai = getGeminiClient(apiKey);

        let identityPrompt = "";
        if (identities && identities.length > 0) {
            const identityList = identities.map(i => i.id).join(', ');
            identityPrompt = `
VALID IDENTITY IDS (USE THESE EXACTLY):
${identityList}

IDENTITY DETAILS:
${identities.map(i => `${i.id} → ${i.name} (${i.topic})`).join('\n')}

🚨 CRITICAL INSTRUCTION - READ CAREFULLY:
You MUST use ONLY the identity IDs listed above (MAT-001, MAT-002, MAT-003, etc.) as keys in the identityVector.

EXAMPLES OF CORRECT FORMAT:
✅ CORRECT: { "MAT-001": 2, "MAT-016": 3, "MAT-027": 1 }
❌ WRONG: { "MAT-MATR-NIL": 1, "MAT-DET-PROP": 2 } ← DO NOT create new IDs
❌ WRONG: { "Sets": 2, "Matrices": 3 } ← DO NOT use topic names
❌ WRONG: { "VEC-3D": 1, "CALC-DIFF": 2 } ← DO NOT use abbreviations

If a question matches the "Matrices" topic, use MAT-016 or MAT-017 (whichever identity logic matches best).
If unsure, pick the closest matching ID from the list above.

MANDATORY: Every key in identityVector MUST be from the list: ${identityList}`;
        }

        const prompt = `You are an expert ${examContext} Exam Auditor.
Analyze the following text of the ${year} ${subject} paper to identify the "Evolutionary Intent".

TEXT:
${paperText.substring(0, 30000)}...

TASK:
1. Determine the "Board Signature":
   - 'SYNTHESIZER': Focus on property-based shortcuts and speed.
   - 'LOGICIAN': Focus on cross-chapter conceptual fusion and multi-step derivation.
   - 'INTIMIDATOR': Focus on linguistic traps and complex A-R reasoning.
   - 'ANCHOR': Standard syllabus-aligned blueprint.
2. Rate the Intent Signature (0-1.0) and calculate the **Average IDS (Intent Density Score)** using this Forensic Rubric:
   - 0.40-0.50 (LEVEL 1): Direct formula recall.
   - 0.60-0.75 (LEVEL 2): 2-step process or graph-linkage.
   - 0.80-0.90 (LEVEL 3): Synthesis/Fusion of 2+ concepts/properties.
   - 0.90-1.0 (LEVEL 4): Deep "Synthesis Traps" requiring property-level fusion and extreme speed.
3. Evolution Note: Technical summary of year-over-year differentiation.
4. Rigor detected (1-10) and FINAL Average IDS (as 'idsActual').

Return ONLY valid JSON with these EXACT keys based on the PaperAuditResult interface:
{
  "boardSignature": "SYNTHESIZER" | "LOGICIAN" | "INTIMIDATOR" | "ANCHOR" | "DEFAULT",
  "intentSignature": { "synthesis": 0.8, "trapDensity": 0.7, "linguisticLoad": 0.5, "speedRequirement": 0.9 },
  "evolutionNote": "...",
  "rigorDetected": 8,
  "idsActual": 0.82,
  "identityVector": { "MAT-001": 2, ... }
}
`;

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
        const parsed = JSON.parse(cleaned);

        // Validate and fix identity vector keys
        if (parsed.identityVector && identities && identities.length > 0) {
            const validIds = new Set(identities.map(i => i.id));
            const fixedVector: Record<string, number> = {};

            for (const [key, count] of Object.entries(parsed.identityVector)) {
                if (validIds.has(key)) {
                    // Valid ID - keep it
                    fixedVector[key] = count as number;
                } else {
                    // Invalid ID - try to map to valid one
                    console.warn(`⚠️  Invalid identity key "${key}" - attempting to map...`);

                    // Try to find matching identity by topic/name similarity
                    const matchedIdentity = identities.find(id =>
                        key.toLowerCase().includes(id.topic.toLowerCase().substring(0, 4)) ||
                        id.name.toLowerCase().includes(key.toLowerCase().substring(4, 8))
                    );

                    if (matchedIdentity) {
                        console.log(`   ✓ Mapped "${key}" → "${matchedIdentity.id}"`);
                        fixedVector[matchedIdentity.id] = (fixedVector[matchedIdentity.id] || 0) + (count as number);
                    } else {
                        console.warn(`   ✗ Could not map "${key}" - skipping`);
                    }
                }
            }

            parsed.identityVector = fixedVector;
            console.log(`✅ Identity Vector validated: ${Object.keys(fixedVector).length} valid IDs`);
        }

        return parsed;

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
