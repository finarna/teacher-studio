/**
 * AI Parser Utility - Semantic-Aware JSON Recovery
 * 
 * Specifically designed to handle AI responses that:
 * 1. Use singular "question" instead of plural "questions"
 * 2. Return an object of questions instead of an array
 * 3. Truncate mid-output (handles mid-string/mid-object truncation)
 * 4. Include extraneous conversational text
 */

const extractJson = (raw: string): string => {
    let clean = raw.trim();
    // Skip markdown wrappers
    clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/, '');

    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');

    let start = -1;
    if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
    else if (firstBrace !== -1) start = firstBrace;
    else if (firstBracket !== -1) start = firstBracket;

    if (start === -1) return "{}";

    // If truncated, we might not have a closing brace/bracket at the very end.
    // We take everything from the start to the end of the string
    // and let repairJson handle the closing logic.
    return clean.substring(start);
};

export const repairJson = (raw: string): string => {
    if (!raw) return "{}";
    let str = extractJson(raw);
    let repaired = "";
    let inString = false;
    let escape = false;
    let stack: string[] = [];

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (inString) {
            if (escape) {
                // Potential JSON escapes. If it's a quote, we MUST stay in string.
                // If it's anything else, we might need to double-escape it for JSON validity (LaTeX case).
                if (char === '"' || char === '\\' || char === '/' || char === 'n' || char === 'r' || char === 't' || char === 'b' || char === 'f' || char === 'u') {
                    repaired += char;
                } else {
                    // It's a non-standard escape (like \O in \Omega). 
                    // We turn \O into \\O so JSON.parse is happy and UI gets \O.
                    repaired += '\\' + char;
                }
                escape = false;
                continue;
            }
            if (char === '\\') {
                escape = true;
                repaired += char;
                continue;
            }
            if (char === '"') {
                inString = false;
                repaired += char;
                continue;
            }

            // Handle literal newlines and tabs in strings - standard JSON doesn't allow these
            if (char === '\n') {
                repaired += '\\n';
                continue;
            }
            if (char === '\r') {
                repaired += '\\r';
                continue;
            }
            if (char === '\t') {
                repaired += '\\t';
                continue;
            }

            repaired += char;
        } else {
            if (char === '"') inString = true;
            repaired += char;

            if (!inString) {
                if (char === '{') stack.push('}');
                if (char === '[') stack.push(']');
                if (char === '}' || char === ']') {
                    if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
                }
            }
        }
    }

    // Close open quotes
    if (inString) repaired += '"';

    // LaTeX fix: AI often leaves trailing backslashes at truncation or mid-sentence
    repaired = repaired.replace(/\\\\+"$/g, '"').replace(/\\\\+$/g, '');

    // Handle dangling punctuation
    repaired = repaired.trim();
    // If ends in :, add a null value
    if (repaired.endsWith(':')) repaired += ' null';
    // If ends in a potential key (preceded by { or ,)
    if (repaired.match(/(?:\{|,)\s*"[^"]+"\s*$/)) repaired += ': null';

    // Remove trailing comma
    repaired = repaired.replace(/,\s*$/, '');
    // Remove dangling commas before closing tags
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');

    // Close open tags in reverse order
    while (stack.length > 0) {
        const closing = stack.pop();
        // If we're closing an object, check if we need a null value for a trailing key
        if (closing === '}' && repaired.trim().endsWith(':')) {
            repaired += ' null';
        }
        repaired += closing;
    }

    return repaired;
};

export const normalizeData = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return { questions: [] };

    let questions: any[] = [];

    // 1. Look for questions in common places
    const questionKeys = ['questions', 'items', 'paper', 'exam', 'list', 'data', 'content', 'result'];
    for (const key of questionKeys) {
        let val = obj[key] || obj[key.slice(0, -1)]; // check plural and singular

        if (Array.isArray(val)) {
            questions = val;
            break;
        }

        // Handle nested common keys like { data: { questions: [...] } }
        if (val && typeof val === 'object') {
            for (const subKey of questionKeys) {
                const subVal = val[subKey] || val[subKey.slice(0, -1)];
                if (Array.isArray(subVal)) {
                    questions = subVal;
                    break;
                }
            }
            if (questions.length > 0) break;
        }

        if (val && typeof val === 'object' && !Array.isArray(val)) {
            // Check if it's a map (e.g., {"Q1": {...}, "Q2": {...}})
            const values = Object.values(val);
            if (values.length > 0 && typeof values[0] === 'object' && !Array.isArray(values[0])) {
                questions = values;
                break;
            }
        }
    }

    // 2. If questions is STILL empty, check if the root itself is a question or a list
    if (questions.length === 0) {
        if (Array.isArray(obj)) {
            questions = obj;
        } else if (obj.text || obj.question || obj.id) {
            questions = [obj];
        } else {
            // Check for numeric keys at the root
            const keys = Object.keys(obj);
            const numericKeys = keys.filter(k => !isNaN(Number(k)) || k.startsWith('Q'));
            if (numericKeys.length > 0) {
                questions = numericKeys.map(k => obj[k]);
            }
        }
    }

    // 3. SECURE CONSISTENCY: ALWAYS derive stats from questions to avoid AI hallucinations
    const topicsMap: Record<string, number> = {};
    const difficultyCounts: Record<string, number> = { 'Easy': 0, 'Moderate': 0, 'Hard': 0 };
    const bloomsMap: Record<string, number> = {};

    const VALID_BLOOMS = ['Knowledge', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
    const VALID_DIFF = ['Easy', 'Moderate', 'Hard'];

    questions = questions.filter(q => q && (typeof q === 'object')).map(q => {
        const marks = Number(q.marks);
        let b = q.blooms || 'Understand';
        if (b.toLowerCase() === 'null') b = 'Understand';

        let d = q.difficulty || 'Moderate';
        if (d.toLowerCase() === 'null') d = 'Moderate';
        if (d === 'Medium') d = 'Moderate';

        return {
            ...q,
            marks: isNaN(marks) || marks < 1 ? 1 : marks,
            topic: q.topic || q.chapter || 'General',  // ⭐ FIX: Use chapter as fallback for topic
            blooms: b,
            difficulty: d
        };
    });

    questions.forEach(q => {
        // Topic Mapping
        const t = q.topic || 'General';
        topicsMap[t] = (topicsMap[t] || 0) + q.marks;

        // Difficulty Mapping
        let d = q.difficulty;
        if (d === 'Medium') d = 'Moderate';

        if (difficultyCounts[d] !== undefined) difficultyCounts[d]++;
        else difficultyCounts['Moderate']++;

        // blooms Mapping
        const b = q.blooms;
        bloomsMap[b] = (bloomsMap[b] || 0) + 1;
    });

    const topicWeightage = (Array.isArray(obj.topicWeightage) && obj.topicWeightage.length > 0)
        ? obj.topicWeightage
        : (() => {
            const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
            return Object.entries(topicsMap).map(([name, marks], i) => ({
                name, marks, color: colors[i % colors.length]
            }));
        })();

    const totalQ = Math.max(1, questions.length);
    const difficultyDistribution = (Array.isArray(obj.difficultyDistribution) && obj.difficultyDistribution.length > 0)
        ? obj.difficultyDistribution
        : [
            { name: 'Easy', percentage: Math.round((difficultyCounts['Easy'] / totalQ) * 100), color: '#10b981' },
            { name: 'Moderate', percentage: Math.round((difficultyCounts['Moderate'] / totalQ) * 100), color: '#f59e0b' },
            { name: 'Hard', percentage: Math.round((difficultyCounts['Hard'] / totalQ) * 100), color: '#ef4444' }
        ];

    const bloomsTaxonomy = (Array.isArray(obj.bloomsTaxonomy) && obj.bloomsTaxonomy.length > 0)
        ? obj.bloomsTaxonomy
        : (() => {
            const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
            return Object.entries(bloomsMap).map(([name, count], i) => ({
                name, percentage: Math.round((count / totalQ) * 100), color: colors[i % colors.length]
            }));
        })();

    // 4. SECURE UNIQUE IDs: Prevent collisions especially in bulk portfolios
    const seenIds = new Set<string>();
    const uniqueQuestions = questions.filter(q => q && (typeof q === 'object')).map((q, idx) => {
        let qId = q.id || `q-${idx}`;
        if (seenIds.has(qId)) {
            const prefix = q.source ? q.source.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 8) : 'dup';
            qId = `${prefix}-${qId}-${idx}`;
        }
        seenIds.add(qId);
        return {
            ...q,
            id: qId,
            text: q.text || q.question || q.content || ""
        };
    });

    // 5. Final Structure Guard
    return {
        summary: obj.summary || (uniqueQuestions.length > 0 ? `Analysis of ${uniqueQuestions.length} questions.` : "Analysis complete."),
        overallDifficulty: obj.overallDifficulty || "Moderate",
        difficultyDistribution,
        bloomsTaxonomy,
        topicWeightage,
        trends: Array.isArray(obj.trends) ? obj.trends : [],
        predictiveTopics: Array.isArray(obj.predictiveTopics) ? obj.predictiveTopics : [],
        strategy: Array.isArray(obj.strategy) ? obj.strategy : [],
        faq: Array.isArray(obj.faq) ? obj.faq : [],
        questions: uniqueQuestions,
        chapterInsights: Array.isArray(obj.chapterInsights) ? obj.chapterInsights : []
    };
};

export const safeAiParse = <T>(raw: string, fallback: T, normalize: boolean = false): T => {
    if (!raw) return fallback;

    // Attempt 1: Raw JSON parsing
    try {
        const parsed = JSON.parse(raw);
        return (normalize ? normalizeData(parsed) : parsed) as T;
    } catch (e1) {
        // Attempt 2: Extract and Repair
        try {
            const repaired = repairJson(raw);
            const parsed = JSON.parse(repaired);
            let finalData = (normalize ? normalizeData(parsed) : parsed);
            // Auto-unwrap single-element arrays for synthesis results
            if (Array.isArray(finalData) && finalData.length === 1 && !normalize) {
                finalData = finalData[0];
            }
            return finalData as T;
        } catch (e2) {
            const patterns = [
                /"questions"\s*:\s*\[([\s\S]*?)(\]|$|})/,
                /"question"\s*:\s*\[([\s\S]*?)(\]|$|})/,
                /\[\s*\{\s*"id"\s*:\s*"Q([\s\S]*?)(?:\]|$)/,
                /\{\s*"questions"\s*:([\s\S]*?)(?:\}|$)/,
                /\{\s*"solutionSteps"\s*:([\s\S]*?)(?:\}|$)/
            ];

            for (const pattern of patterns) {
                const match = raw.match(pattern);
                if (match) {
                    try {
                        let captured = match[0].trim();
                        // If it doesn't end with ] or }, it's likely truncated
                        if (!captured.endsWith(']') && !captured.endsWith('}')) {
                            const lastBrace = captured.lastIndexOf('}');
                            const lastBracket = captured.lastIndexOf(']');
                            const lastOk = Math.max(lastBrace, lastBracket);
                            if (lastOk !== -1) {
                                captured = captured.substring(0, lastOk + 1);
                            }
                        }

                        const partialStr = captured.startsWith('[') || captured.startsWith('{') ? captured : '{' + captured + '}';
                        const finalRepair = repairJson(partialStr);
                        let partialObj = JSON.parse(finalRepair);

                        // Auto-unwrap for synthesis
                        if (Array.isArray(partialObj) && partialObj.length === 1 && !normalize) {
                            partialObj = partialObj[0];
                        } else if (Array.isArray(partialObj) && normalize) {
                            partialObj = { questions: partialObj };
                        }

                        return (normalize ? normalizeData(partialObj) : partialObj) as T;
                    } catch { continue; }
                }
            }

            // Log for debugging if all efforts fail
            console.error("Critical Parse Failure. Length:", raw.length);
            console.error("Raw Snippet:", raw.substring(0, 1000));
            return fallback;
        }
    }
};
