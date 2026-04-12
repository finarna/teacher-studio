import { repairJson } from '../utils/aiParser';

/**
 * REI SHIELD: A robust JSON cleaner for AI responses
 * 
 * [LEGACY WRAPPER]
 * This function is now a wrapper around the battle-tested logic in utils/aiParser.ts
 * to ensure system-wide consistency between generation and extraction.
 */
export function cleanJsonResponse(text: string): string {
    if (!text) return '[]';
    
    // We leverage the character-by-character repair engine which handles:
    // 1. LaTeX backslash doubling
    // 2. Standard JSON escape preservation (\", \n)
    // 3. Truncated output repair
    try {
        return repairJson(text);
    } catch (e) {
        console.warn('REI Shield: repairJson failed, falling back to raw strip');
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
            text.match(/```\s*([\s\S]*?)\s*```/) ||
            text.match(/\[[\s\S]*\]/) ||
            text.match(/\{[\s\S]*\}/);
        return jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    }
}
