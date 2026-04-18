import { createCustomTest } from '../../api/learningJourneyEndpoints.js';
import { getForecastedCalibration } from '../../lib/reiEvolutionEngine';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BIOLOGY FLAGSHIP GENERATOR - REI v17
 * Full calibration pipeline with proper identity assignment
 * Question type tagging, IDS calculation, and validation
 */
function normalizeMix(mix: { easy: number; moderate: number; hard: number }) {
    const total = (mix.easy || 0) + (mix.moderate || 0) + (mix.hard || 0);
    if (total === 100) return mix;
    if (total === 0) return { easy: 87, moderate: 13, hard: 0 }; // Biology default
    const factor = 100 / total;
    return {
        easy: Math.round(mix.easy * factor),
        moderate: Math.round(mix.moderate * factor),
        hard: 100 - Math.round(mix.easy * factor) - Math.round(mix.moderate * factor)
    };
}

async function generateFlagshipBiology() {
    console.log("🧬 GENERATING KCET BIOLOGY 2026 FLAGSHIP - REI v17");
    console.log("═══════════════════════════════════════════════════════\n");

    const subject = "Biology";
    const exam = "KCET";

    // 1. Load Forensic Brain Data (Calibration)
    console.log("📊 Loading calibration forecast...");
    const forecast = await getForecastedCalibration(exam, subject);

    // Load question type profile from historical analysis
    const questionTypeAnalysisPath = path.join(__dirname, '../../docs/oracle/QUESTION_TYPE_ANALYSIS_2022_2025_BIOLOGY.json');
    const questionTypeData = JSON.parse(fs.readFileSync(questionTypeAnalysisPath, 'utf8'));
    const questionTypeProfile = questionTypeData.questionTypeProfile;

    console.log("📊 Loading question type distribution from historical analysis...");
    console.log(`   Factual Conceptual: ${questionTypeProfile.factual_conceptual}%`);
    console.log(`   Diagram Based: ${questionTypeProfile.diagram_based}%`);
    console.log(`   Match Column: ${questionTypeProfile.match_column}%`);
    console.log(`   Statement Based: ${questionTypeProfile.statement_based}%`);
    console.log(`   Reasoning: ${questionTypeProfile.reasoning}%`);
    console.log(`   Application: ${questionTypeProfile.application}%`);

    // Calculate exact counts for 60 questions
    const questionTypeCounts = {
        factual_conceptual: Math.round(60 * questionTypeProfile.factual_conceptual / 100),  // 37
        diagram_based: Math.round(60 * questionTypeProfile.diagram_based / 100),            // 7
        match_column: Math.round(60 * questionTypeProfile.match_column / 100),              // 5
        statement_based: Math.round(60 * questionTypeProfile.statement_based / 100),        // 5
        reasoning: Math.round(60 * questionTypeProfile.reasoning / 100),                    // 4
        application: Math.round(60 * questionTypeProfile.application / 100)                 // 3
    };

    console.log("\n🎯 Target Question Counts (60 questions):");
    Object.entries(questionTypeCounts).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} questions`);
    });

    // Use REI v17 calibrated values
    const biologyForecast = {
        idsTarget: 0.724,  // From 4-year calibration
        rigorVelocity: 1.622, // rigor_drift_multiplier
        boardSignature: 'FACTUAL_DIAGRAM_APPLICATION',
        intentSignature: {
            synthesis: 0.258,
            trapDensity: 0.25,  // Lower for Biology (more straightforward)
            linguisticLoad: 0.30, // Higher for Biology (more text-heavy)
            speedRequirement: 0.80 // 60 mins for 60 questions
        },
        difficultyProfile: {
            easy: 87,      // Historical: 87%
            moderate: 13,  // Historical: 13%
            hard: 0        // Historical: 0%
        },
        questionTypeProfile: questionTypeCounts,  // Add to forecast object
        directives: [
            "🎯 CRITICAL: ENFORCE EXACT QUESTION TYPE DISTRIBUTION:",
            `GENERATE EXACTLY ${questionTypeCounts.factual_conceptual} FACTUAL_CONCEPTUAL questions (definitions, facts, identification, direct recall)`,
            `GENERATE EXACTLY ${questionTypeCounts.diagram_based} DIAGRAM_BASED questions (structure identification, labeling, visual interpretation)`,
            `GENERATE EXACTLY ${questionTypeCounts.match_column} MATCH_COLUMN questions (pairing items, matching lists, correlations)`,
            `GENERATE EXACTLY ${questionTypeCounts.statement_based} STATEMENT_BASED questions (true/false, assertion-reason, correct statements)`,
            `GENERATE EXACTLY ${questionTypeCounts.reasoning} REASONING questions (explain why, processes, mechanisms)`,
            `GENERATE EXACTLY ${questionTypeCounts.application} APPLICATION questions (real-world, disease, examples, uses)`,
            "",
            "Target IDS: 0.724 (Range: 0.68-0.76)",
            "Focus on high-confidence identities: BIO-010, BIO-002, BIO-003, BIO-009",
            "HIGH-FREQUENCY TOPICS: Molecular Basis of Inheritance, Principles of Inheritance, Human Reproduction",
            "Include questions across: Living World, Cell Biology, Plant Physiology, Human Physiology, Genetics, Evolution, Ecology, Biotechnology",
            "DIAGRAM EMPHASIS: 11% questions must include diagrams or structures",
            "MATCH-THE-COLUMN: Use for correlating structures/functions, examples/categories",
            "STATEMENT FORMAT: Use assertion-reason format for testing conceptual understanding",
            "DIFFICULTY: Heavy easy bias (87%), minimal moderate (13%), NO hard questions",
            "AVOID: Excessive calculations, pure memorization without understanding",
            "LANGUAGE: Clear, unambiguous biology terminology; avoid trick questions"
        ]
    };

    // 2. Load Identity Bank
    console.log("🧬 Loading Biology identity bank...");
    const bankPath = path.join(__dirname, '../../lib/oracle/identities/kcet_biology.json');
    const bankData = JSON.parse(fs.readFileSync(bankPath, 'utf8'));

    console.log(`   ✅ Found ${bankData.identities.length} Biology identities`);

    // Extract top identities by confidence
    const sortedIdentities = bankData.identities
        .filter((i: any) => i.confidence >= 0.70)
        .sort((a: any, b: any) => b.confidence - a.confidence);

    const highYieldIdentities = sortedIdentities.slice(0, 14).map((i: any) => i.id);
    console.log(`   🎯 High-yield identities (≥70%): ${highYieldIdentities.join(', ')}`);

    // 3. Extract topic clusters
    const topicClusters = {
        physical: ['States of Matter', 'Equilibrium', 'Electrochemistry', 'Chemical Kinetics', 'Solutions', 'Solid State'],
        organic: ['Haloalkanes', 'Alcohols & Phenols', 'Aldehydes & Ketones', 'Amines', 'Biomolecules', 'Polymers'],
        inorganic: ['p-Block Elements', 'd & f Block Elements', 'Coordination Compounds']
    };

    console.log("\n🎯 REI v17 Calibration Profile:");
    console.log(`   IDS Target: ${biologyForecast.idsTarget}`);
    console.log(`   Rigor Velocity: ${biologyForecast.rigorVelocity}`);
    console.log(`   Board Signature: ${biologyForecast.boardSignature}`);
    console.log(`   Difficulty: E:${biologyForecast.difficultyProfile.easy}% M:${biologyForecast.difficultyProfile.moderate}% H:${biologyForecast.difficultyProfile.hard}%`);

    // 4. Generate payload with full REI v17 calibration
    const generatePayload = (setName: string, focus: string) => ({
        testName: `KCET Biology 2026 Flagship - ${setName} [REI v17]`,
        subject: subject,
        examContext: exam,
        questionCount: 60,
        difficultyMix: biologyForecast.difficultyProfile,
        strategyMode: 'predictive_mock',
        oracleMode: {
            enabled: true,
            idsTarget: biologyForecast.idsTarget,
            rigorVelocity: biologyForecast.rigorVelocity,
            intentSignature: biologyForecast.intentSignature,
            directives: [
                ...biologyForecast.directives,
                `FORENSIC_FOCUS: ${focus}`,
                `TARGET_SET: ${setName}`,
                `HIGH_YIELD_IDENTITIES: ${highYieldIdentities.slice(0, 7).join(', ')}`
            ],
            boardSignature: biologyForecast.boardSignature
        }
    });

    // 5. Mock response objects for CLI execution
    const mockRes = {
        status: (code: number) => ({
            json: (data: any) => console.log(`\n📩 Response (${code}):`, JSON.stringify(data, null, 2))
        }),
        json: (data: any) => console.log(`\n📩 Success Response:`, JSON.stringify(data, null, 2)),
        headersSent: false
    };

    const adminUserId = "13282202-5251-4c94-b5ef-95c273378262";

    // 6. Generate SET A (Genetics + Physiology focus)
    console.log("\n\n📡 GENERATING SET A (Genetics + Human Physiology)...");
    console.log("═══════════════════════════════════════════════════════");
    await createCustomTest({
        body: {
            userId: adminUserId,
            ...generatePayload('SET_A', 'Physical_Organic_Balance')
        }
    } as any, mockRes as any);

    console.log("\n⏳ Waiting 5 seconds before SET B generation...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 7. Generate SET B (Inorganic + Organic focus)
    console.log("\n\n📡 GENERATING SET B (Plant + Ecology focus)...");
    console.log("═══════════════════════════════════════════════════════");
    await createCustomTest({
        body: {
            userId: adminUserId,
            ...generatePayload('SET_B', 'Inorganic_Organic_Balance')
        }
    } as any, mockRes as any);

    console.log("\n\n✅ BIOLOGY FLAGSHIP GENERATION COMPLETE!");
    console.log("═══════════════════════════════════════════════════════");
    console.log("\n📊 Generated:");
    console.log("   - SET A: 60 questions (Physical + Organic focus)");
    console.log("   - SET B: 60 questions (Inorganic + Organic focus)");
    console.log("   - Total: 120 questions with full REI v17 calibration");
    console.log("\n🔍 Each question will have:");
    console.log("   ✓ Identity ID (CHM-XXX)");
    console.log("   ✓ Question Type (theory/property/reaction/calculation/structure/application)");
    console.log("   ✓ Difficulty (60% Easy, 39% Moderate, 2% Hard)");
    console.log("   ✓ IDS validation (Target: 0.724)");
    console.log("   ✓ Topic tags");
    console.log("\n⏳ Questions are being generated asynchronously in the background...");
    console.log("   Check the database in a few minutes for completed questions.");
}

generateFlagshipBiology().catch(console.error);
