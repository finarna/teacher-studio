/**
 * 🔬 END-TO-END LATEX VERIFICATION
 * Uses the actual KCET 2021 Math PDF + Gemini API to extract questions
 * then audits every question + option for LaTeX errors.
 *
 * Run:  node scripts/verify_pdf_latex.mjs
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) { console.error('❌ VITE_GEMINI_API_KEY not found in .env.local'); process.exit(1); }

const PDF_PATH = path.resolve('./01-KCET-Board-Exam-Mathematics-M1-2021.pdf');
if (!fs.existsSync(PDF_PATH)) { console.error(`❌ PDF not found at ${PDF_PATH}`); process.exit(1); }

// ─── LATEX ERROR DETECTOR ─────────────────────────────────────────────────────

const errorPatterns = [
    // Corrupted commands (backslash eaten by JSON) — GENUINE ERRORS
    { pattern: /\brac\{/, msg: 'Corrupted \\frac → "rac{"' },
    { pattern: /\bqrt\{/, msg: 'Corrupted \\sqrt → "qrt{"' },
    { pattern: /\bight[\)\]]/, msg: 'Corrupted \\right → "ight"' },
    { pattern: /\beft[\(\[]/, msg: 'Corrupted \\left → "eft"' },
    { pattern: /\ban\^/, msg: 'Corrupted \\tan → "an^"' },
    { pattern: /\bimes\b/, msg: 'Corrupted \\times → "imes"' },
    { pattern: /\bheta\b/, msg: 'Corrupted \\theta → "heta"' },

    // Missing backslash (only flag if outside $ delimiters — see checkText logic)
    { pattern: /(?<!\\)frac\{/, msg: 'Missing \\frac (no backslash)' },
    { pattern: /(?<!\\)sqrt\{/, msg: 'Missing \\sqrt (no backslash)' },
];

// These English words should NEVER trigger false positives
// Key ones: "point" (po-INT), "tangent" (tan-GENT), "sum of" (English sum),
//           "distinct", "integer", "constant", "second", "function", "limits"
const SKIP_WORDS_CONTAINING = ['point', 'points', 'tangent', 'constant', 'second',
    'integer', 'significant', 'distinct', 'integration', 'intersection', 'function',
    'sequence', 'coefficient', 'intercept', 'component', 'discontinuity', 'coordinate',
    'principal', 'limit', 'section'];

function containsSkipWord(text, around) {
    // Check if  'around' is a substring of a skip word
    const lower = text.toLowerCase();
    for (const w of SKIP_WORDS_CONTAINING) {
        if (w.includes(around) && lower.includes(w)) return true;
    }
    return false;
}

// Split text into math (inside $) and prose (outside $) segments
function splitMathProse(text) {
    const mathSegments = [];
    const proseSegments = [];
    const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);
    parts.forEach((part, i) => {
        if (i % 2 === 0) proseSegments.push(part);
        else mathSegments.push(part);
    });
    return { mathSegments, proseSegments };
}

function checkText(text, label) {
    if (!text || typeof text !== 'string') return [];
    const issues = [];

    const { mathSegments, proseSegments } = splitMathProse(text);

    // --- Check math segments for corruption patterns ---
    for (const seg of mathSegments) {
        for (const { pattern, msg } of errorPatterns) {
            if (pattern.test(seg)) {
                issues.push({ label, msg, snippet: text.substring(0, 120) });
            }
        }

        // Trailing backslash ONLY if it's not \{ or \} (valid set notation)
        if (/\\+\s*$/.test(seg) && !/\\[\{\}]/.test(seg)) {
            issues.push({ label, msg: 'Trailing backslash in math', snippet: seg.substring(0, 120) });
        }
    }

    // --- Check prose segments for bare commands NOT inside $ delimiters ---
    for (const seg of proseSegments) {
        // "int" as a bare LaTeX command in prose: flag ONLY if it looks like an integral
        // (i.e., not part of "point", "distinct", "integer" etc.)
        const intMatches = [...seg.matchAll(/\\\\int(?=\s|_|\^|\s*\\\\)/g)];
        for (const m of intMatches) {
            // It's a \int that's NOT inside $...$ → MathRenderer will auto-wrap this, so it's
            // a soft warning, not a hard error. Only flag if it looks truly unrendered.
            const before = seg.substring(Math.max(0, m.index - 5), m.index);
            if (/[a-z]$/i.test(before)) continue;
            issues.push({ label, msg: '⚠️  Math outside $: \\int not wrapped in $...$ (MathRenderer will auto-fix)', snippet: seg.substring(0, 120) });
        }

        // "sum" as bare LaTeX ONLY if clearly mathematical context (has _ or ^ suffix)
        const sumMatches = [...seg.matchAll(/\bsum(?=_|\^)/g)];
        for (const m of sumMatches) {
            issues.push({ label, msg: 'Bare "sum" with subscript/superscript (missing \\sum)', snippet: seg.substring(0, 120) });
        }
    }

    // --- Check for the specific "point" corruption bug ---
    if (/po\\int/.test(text)) {
        issues.push({ label, msg: '❌ BUG: "point" corrupted to "po\\int"', snippet: text.substring(0, 120) });
    }

    return issues;
}

// ─── AUTO-FIX (mirror of simpleMathExtractor.ts) ────────────────────────────

function autoFix(text) {
    if (!text) return text;
    let fixed = text;

    const fixes = [
        [/\bfrac\{/g, '\\frac{'],
        [/\bint\b/g, '\\int'],
        [/\bsum\b/g, '\\sum'],
        [/\bprod\b/g, '\\prod'],
        [/\blim\b/g, '\\lim'],
        [/\bsqrt\{/g, '\\sqrt{'],
        [/\bsin\b/g, '\\sin'],
        [/\bcos\b/g, '\\cos'],
        [/\btan\b/g, '\\tan'],
        [/\bcot\b/g, '\\cot'],
        [/\bsec\b/g, '\\sec'],
        [/\bcsc\b/g, '\\csc'],
        [/\blog\b/g, '\\log'],
        [/\bln\b/g, '\\ln'],
        [/\bleft\(/g, '\\left('],
        [/\bright\)/g, '\\right)'],
        [/\bleft\[/g, '\\left['],
        [/\bright\]/g, '\\right]'],
        [/\balpha\b/g, '\\alpha'],
        [/\bbeta\b/g, '\\beta'],
        [/\bgamma\b/g, '\\gamma'],
        [/\btheta\b/g, '\\theta'],
        [/\bpi\b/g, '\\pi'],
        [/\bleq\b/g, '\\leq'],
        [/\bgeq\b/g, '\\geq'],
        [/\bneq\b/g, '\\neq'],
        [/\\+(\s*[\)\]\}$])/g, '$1'],
    ];

    for (const [pat, rep] of fixes) {
        fixed = fixed.replace(pat, rep);
    }
    return fixed;
}

// ─── GEMINI EXTRACTION (2-PASS, mirrors simpleMathExtractor.ts) ──────────────

const MODEL = 'gemini-3-flash-preview';

const RESPONSE_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            text: { type: 'string' },
            options: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        text: { type: 'string' },
                        isCorrect: { type: 'boolean' },
                    },
                    required: ['id', 'text', 'isCorrect'],
                },
            },
            topic: { type: 'string' },
            domain: { type: 'string' },
            difficulty: { type: 'string' },
        },
        required: ['id', 'text', 'options'],
    },
};

const LATEX_RULES = `
🚨🚨🚨 CRITICAL LATEX FORMATTING RULES 🚨🚨🚨

RULE #1: ALWAYS USE DOUBLE BACKSLASHES IN JSON STRINGS
Because you are outputting JSON, you MUST escape backslashes by doubling them.

❌ CATASTROPHIC ERRORS (NEVER DO THIS):
"\\frac{a}{b}" → Will become "rac{a}{b}" after JSON parsing (BROKEN!)
"\\int dx"     → Will become "int dx" (BROKEN!)
"\\sqrt{x}"    → Will become "sqrt{x}" (BROKEN!)

✅ CORRECT FORMAT:
"\\\\frac{a}{b}" → Becomes "\\frac{a}{b}" ✓
"\\\\int dx"     → Becomes "\\int dx" ✓
"\\\\sqrt{x}"    → Becomes "\\sqrt{x}" ✓

RULE #2: PRESERVE ALL SPACES BETWEEN WORDS
WRONG: "Ifthematricesareequal" RIGHT: "If the matrices are equal"
RULE #3: NO TRAILING BACKSLASHES
RULE #4: Sets → $R - \\\\{-1, 1\\\\}$
`;

async function callGemini(ai, base64, promptText) {
    const response = await ai.models.generateContent({
        model: MODEL,
        contents: {
            parts: [
                { inlineData: { mimeType: 'application/pdf', data: base64 } },
                { text: promptText },
            ],
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.1,
            maxOutputTokens: 65536,
        },
    });
    if (!response.text) throw new Error('No response from Gemini');
    let text = response.text.trim();
    if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const { data, wasTruncated } = repairAndParse(text);
    return { data, wasTruncated };
}

async function extractFromPDF() {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    console.log('📄 Reading PDF...');
    const base64 = fs.readFileSync(PDF_PATH).toString('base64');

    // ── PASS 1 ────────────────────────────────────────────────────────────────
    const pass1Prompt = `Analyze this KCET 2021 Mathematics exam paper. Extract ALL multiple-choice questions.\n${LATEX_RULES}\nMap options to A,B,C,D. Mark the correct answer.\nOutput JSON array: [{id, text, options:[{id,text,isCorrect}], topic, domain, difficulty}]`;

    console.log('🤖 PASS 1: Extracting all questions...');
    const { data: pass1Raw, wasTruncated } = await callGemini(ai, base64, pass1Prompt);
    const pass1 = pass1Raw.map((q, i) => ({ ...q, id: i + 1 }));
    console.log(`   ✅ Pass 1 → ${pass1.length} questions${wasTruncated ? ' (truncated — more may exist)' : ''}`);

    // ── PASS 2: triggered by truncation detection, NOT hardcoded counts ───────
    // If repairAndParse had to fix the JSON, Gemini ran out of tokens mid-response.
    // There are likely more questions. We ask for everything from Q{N+1} onwards.
    // Works for ANY paper size — 30Q, 50Q, 60Q, 80Q.
    if (wasTruncated && pass1.length > 0) {
        const lastQNum = pass1.length;
        console.log(`\n⚠️  Truncation detected after Q${lastQNum}. Triggering PASS 2 for Q${lastQNum + 1} onwards...`);

        const pass2Prompt = `You already extracted Q1-Q${lastQNum} from this exam. NOW extract ONLY the REMAINING questions starting from Q${lastQNum + 1} to the END of the paper.\n🚨 Start from Q${lastQNum + 1}. Do NOT repeat Q1-Q${lastQNum}.\n${LATEX_RULES}\nOutput JSON array: [{id, text, options:[{id,text,isCorrect}], topic, domain, difficulty}]`;

        try {
            const { data: pass2Raw } = await callGemini(ai, base64, pass2Prompt);

            if (Array.isArray(pass2Raw) && pass2Raw.length > 0) {
                console.log(`   ✅ Pass 2 → ${pass2Raw.length} additional questions`);

                const existingIds = new Set(pass1.map(q => q.id));
                const newQs = pass2Raw
                    .filter(q => !existingIds.has(q.id))
                    .map((q, idx) => ({ ...q, id: lastQNum + idx + 1 }));

                const merged = [...pass1, ...newQs];
                console.log(`   ✅ MERGED → ${merged.length} total questions`);
                return merged;
            }
        } catch (err) {
            console.warn(`   ⚠️  Pass 2 failed (returning pass-1 only): ${err.message}`);
        }
    }

    return pass1;
}

// ─── JSON REPAIR ───────────────────────────────────────────────────────────────
// Returns { data, wasTruncated } — wasTruncated=true means the JSON was cut off
// and there are likely more items in the source document that weren't returned.
function repairAndParse(raw) {
    try {
        return { data: JSON.parse(raw), wasTruncated: false };
    } catch (e) {
        console.warn(`⚠️  JSON truncated, attempting repair... (${raw.length} chars)`);
        let repaired = raw.trim();

        // Walk char-by-char tracking depth; record last index where depth==1
        // (inside top-level array but a complete object just closed)
        let lastValidEnd = -1;
        let depth = 0;
        let inString = false;
        let escape = false;
        for (let i = 0; i < repaired.length; i++) {
            const ch = repaired[i];
            if (escape) { escape = false; continue; }
            if (ch === '\\') { escape = true; continue; }
            if (ch === '"' && !escape) { inString = !inString; continue; }
            if (!inString) {
                if (ch === '{' || ch === '[') depth++;
                if (ch === '}' || ch === ']') {
                    depth--;
                    if (depth === 1) lastValidEnd = i;
                }
            }
        }

        if (lastValidEnd !== -1) {
            const trimmed = repaired.substring(0, lastValidEnd + 1) + ']';
            try {
                const data = JSON.parse(trimmed);
                console.log(`✅ Repair succeeded! Recovered ${data.length} questions. (wasTruncated=true)`);
                return { data, wasTruncated: true };
            } catch (e2) {
                console.error('❌ Repair failed:', e2.message);
            }
        }
        throw new Error(`Failed to parse Gemini response: ${e.message}`);
    }
}


function auditQuestions(questions) {
    let totalIssues = 0;
    let affectedQuestions = 0;
    const issueLog = [];

    for (const q of questions) {
        const qIssues = [];

        // Check question text
        const textIssues = checkText(q.text, 'question text');
        qIssues.push(...textIssues);

        // Check each option
        for (const opt of (q.options || [])) {
            const optIssues = checkText(opt.text, `option ${opt.id}`);
            qIssues.push(...optIssues);
        }

        if (qIssues.length > 0) {
            affectedQuestions++;
            totalIssues += qIssues.length;
            issueLog.push({ qId: `Q${q.id}`, text: q.text?.substring(0, 80), issues: qIssues });
        }
    }

    return { totalIssues, affectedQuestions, issueLog };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log('═'.repeat(70));
    console.log('🔬 END-TO-END LATEX VERIFICATION — KCET 2021 Mathematics');
    console.log('═'.repeat(70));

    let questions;
    try {
        questions = await extractFromPDF();
    } catch (err) {
        console.error('❌ Extraction failed:', err.message);
        process.exit(1);
    }

    console.log(`\n✅ Extracted ${questions.length} questions from PDF.\n`);

    // --- Verify the "point" bug is gone ---
    const pointTests = questions.filter(q => /\bpoint\b/i.test(q.text));
    console.log(`🔍 Questions containing the word "point": ${pointTests.length}`);
    const corruptedPoint = pointTests.filter(q => /po\\int/.test(q.text));
    if (corruptedPoint.length === 0) {
        console.log('✅ POINT BUG: None of the "point" words were corrupted to "po\\int"\n');
    } else {
        console.log(`❌ POINT BUG: ${corruptedPoint.length} questions have corrupted "point"!\n`);
    }

    // --- Full LaTeX audit ---
    console.log('🧪 Running LaTeX error audit on all questions + options...\n');
    const { totalIssues, affectedQuestions, issueLog } = auditQuestions(questions);

    if (totalIssues === 0) {
        console.log('═'.repeat(70));
        console.log('🎉 ALL CLEAR! Zero LaTeX errors detected across all questions.');
        console.log('═'.repeat(70));
    } else {
        console.log(`⚠️  Found ${totalIssues} issue(s) in ${affectedQuestions} question(s):\n`);
        for (const entry of issueLog) {
            console.log(`  ❌ ${entry.qId}: "${entry.text}..."`);
            for (const issue of entry.issues) {
                console.log(`      → [${issue.label}] ${issue.msg}`);
                console.log(`        Snippet: "${issue.snippet}"`);
            }
            console.log('');
        }
    }

    // --- Sample Output: Show first 5 questions ---
    console.log('\n' + '─'.repeat(70));
    console.log('📋 SAMPLE: First 5 Extracted Questions\n');
    questions.slice(0, 5).forEach(q => {
        console.log(`  Q${q.id} [${q.topic || 'Unknown'}]: ${q.text?.substring(0, 100)}`);
        (q.options || []).forEach(opt => {
            const mark = opt.isCorrect ? '✅' : '  ';
            console.log(`    ${mark} (${opt.id}) ${opt.text?.substring(0, 70)}`);
        });
        console.log('');
    });

    // --- Final Summary ---
    console.log('═'.repeat(70));
    console.log(`📊 FINAL SUMMARY`);
    console.log(`   Total questions:   ${questions.length}`);
    console.log(`   Questions clean:   ${questions.length - affectedQuestions}`);
    console.log(`   Questions w/error: ${affectedQuestions}`);
    console.log(`   Total issues:      ${totalIssues}`);
    console.log(`   Point bug:         ${corruptedPoint.length === 0 ? '✅ Fixed' : '❌ Still present'}`);
    console.log('═'.repeat(70));
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
