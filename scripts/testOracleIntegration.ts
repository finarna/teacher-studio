import { generateTestQuestions } from '../lib/aiQuestionGenerator.ts';
import type { GenerationContext } from '../lib/aiQuestionGenerator.ts';
import type { Subject, ExamContext } from '../types.ts';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

async function runOracleImplementationTest() {
    const geminiApiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
        console.error('❌ Missing Gemini API Key');
        return;
    }

    console.log('🧪 Starting REI v3.0 Implementation Test...');
    console.log('---');

    const context: GenerationContext = {
        examConfig: {
            examContext: 'JEE' as ExamContext,
            subject: 'Math' as Subject,
            totalQuestions: 5,
            durationMinutes: 15,
            marksPerQuestion: 4,
            passingPercentage: 40,
            negativeMarking: {
                enabled: true,
                deduction: -1
            }
        },
        historicalData: [],
        studentProfile: {
            userId: 'test-user-id',
            examContext: 'JEE' as ExamContext,
            subject: 'Math' as Subject,
            topicMastery: [],
            overallAccuracy: 85,
            studyStreak: 12
        },
        topics: [
            {
                topicId: 'matrices-id',
                topicName: 'Matrices and Determinants',
                syllabus: 'Properties of adjoint, Inverse, System of linear equations, Orthogonal matrices',
                bloomsLevels: ['Apply', 'Analyze'],
                estimatedDifficulty: 0.8,
                prerequisites: []
            }
        ],
        generationRules: {
            weights: {
                predictedExamPattern: 0.8,
                studentWeakAreas: 0.1,
                curriculumBalance: 0.05,
                recentTrends: 0.05
            },
            adaptiveDifficulty: { enabled: true, baselineAccuracy: 70, stepSize: 0.1 },
            freshness: { avoidRecentQuestions: true, daysSinceLastAttempt: 7, maxRepetitionAllowed: 1 },
            strategyMode: 'predictive_mock',
            oracleMode: {
                enabled: true,
                idsTarget: 0.95,
                directives: [
                    "Apply Board Signature: THE SYNTHESIZER",
                    "MANDATORY: Merge Matrix Adjoint properties with Trigonometric series",
                    "TRAP: Predict |A^n| where n is a hidden sequence sum",
                    "Eliminate direct numerical calculation"
                ],
                boardSignature: 'SYNTHESIZER'
            }
        }
    };

    try {
        const questions = await generateTestQuestions(context, geminiApiKey);

        console.log('\n📊 TEST RESULT SUMMARY:');
        console.log(`✅ Total Questions Generated: ${questions.length}`);

        questions.forEach((q, i) => {
            console.log(`\n--- Q${i + 1} Logic Log ---`);
            console.log(`- Topic: ${q.topic}`);
            console.log(`- Source: ${q.source}`);
            console.log(`- Logic: ${q.masteryMaterial?.logic || 'N/A'}`);
            console.log(`- Trap Detected: ${q.pitfalls?.[0] || 'None'}`);

            const textLower = q.text.toLowerCase();
            const logicLower = (q.masteryMaterial?.logic || '').toLowerCase();
            const pitfallsLower = (q.pitfalls || []).join(' ').toLowerCase();

            // CRITICAL IDS 1.0 CRITERIA:
            // 1. Cross-Concept Fusion (e.g. Matrix + Trig, Matrix + Series, Matrix + Complex, Matrix + Calculus)
            // 2. Non-trivial Trap (Identification of high-level cognitive bias)
            const hasSynthesis = (textLower.includes('matrix') || textLower.includes('determinant')) &&
                (textLower.includes('sin') || textLower.includes('cos') || textLower.includes('series') ||
                    textLower.includes('integral') || textLower.includes('limit') || textLower.includes('complex') ||
                    textLower.includes('root') || textLower.includes('polynomial'));

            const isHighlyAnalytical = logicLower.includes('seam') || logicLower.includes('fusion') ||
                (logicLower.includes('property') && (logicLower.includes('nest') || logicLower.includes('transition') || logicLower.includes('merge')));

            const hasRealTrap = pitfallsLower.length > 20 && !pitfallsLower.includes('easy') && !pitfallsLower.includes('basic');

            let ids = 0;
            if (hasSynthesis && isHighlyAnalytical && hasRealTrap) ids = 1.0;
            else if (hasSynthesis || isHighlyAnalytical) ids = 0.5;

            console.log(`- Deterministic IDS Score: ${ids}`);
        });

        console.log('\n--- VERIFICATION COMPLETE ---');

    } catch (error) {
        console.error('❌ Test execution failed:', error);
    }
}

runOracleImplementationTest();
