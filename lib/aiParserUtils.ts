
/**
 * REI SHIELD: A robust JSON cleaner for AI responses
 * Specifically designed to handle LaTeX backslashes and missing delimiters
 * that common LLMs (like Gemini) hallucinate in structured output mode.
 */
export function cleanJsonResponse(text: string): string {
    if (!text) return '[]';

    // 1. Extract JSON block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
        text.match(/```\s*([\s\S]*?)\s*```/) ||
        text.match(/\[[\s\S]*\]/) ||
        text.match(/\{[\s\S]*\}/);

    let jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

    // 2. REI SHIELD: Protect valid escapes, then double remaining
    // This is the most robust way to handle LaTeX in JSON values.

    // Step A: Protect double-backslashes (already escaped LaTeX or intended single \)
    const B_PLACEHOLDER = "___REI_B_";
    jsonStr = jsonStr.replace(/\\\\/g, B_PLACEHOLDER);

    // Step B: Protect escaped quotes
    const Q_PLACEHOLDER = "___REI_Q_";
    jsonStr = jsonStr.replace(/\\"/g, Q_PLACEHOLDER);

    // Step C: Double all remaining single backslashes (the naked \sum cases)
    jsonStr = jsonStr.replace(/\\/g, '\\\\');

    // Step D: Restore protected characters
    jsonStr = jsonStr.replace(new RegExp(Q_PLACEHOLDER, 'g'), '\\"');
    jsonStr = jsonStr.replace(new RegExp(B_PLACEHOLDER, 'g'), '\\\\\\\\');

    // 3. Fix common JSON hallucinations
    // Fix missing trailing commas or accidental multi-line strings
    jsonStr = jsonStr.trim();

    // Attempt to handle case where JSON might have text outside it
    if (!jsonStr.startsWith('[') && !jsonStr.startsWith('{')) {
        const firstBracket = jsonStr.indexOf('[');
        const lastBracket = jsonStr.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
        }
    }

    return jsonStr;
}
