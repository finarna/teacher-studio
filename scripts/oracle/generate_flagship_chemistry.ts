import { createCustomTest } from '../../api/learningJourneyEndpoints.js';
import { getForecastedCalibration } from '../../lib/reiEvolutionEngine';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CHEMISTRY FLAGSHIP GENERATOR - REI v17
 * Full calibration pipeline with proper identity assignment
 * Question type tagging, IDS calculation, and validation
 */
function normalizeMix(mix: { easy: number; moderate: number; hard: number }) {
    const total = (mix.easy || 0) + (mix.moderate || 0) + (mix.hard || 0);
    if (total === 100) return mix;
    if (total === 0) return { easy: 60, moderate: 39, hard: 2 }; // Chemistry default
    const factor = 100 / total;
    return {
        easy: Math.round(mix.easy * factor),
        moderate: Math.round(mix.moderate * factor),
        hard: 100 - Math.round(mix.easy * factor) - Math.round(mix.moderate * factor)
    };
}

async function generateFlagshipChemistry() {
    console.log("🧪 GENERATING KCET CHEMISTRY 2026 FLAGSHIP - REI v17");
    console.log("═══════════════════════════════════════════════════════\n");

    const subject = "Chemistry";
    const exam = "KCET";

    // 1. Load Forensic Brain Data (Calibration)
    console.log("📊 Loading calibration forecast...");
    const forecast = await getForecastedCalibration(exam, subject);

    // Load question type profile from historical analysis
    const questionTypeAnalysisPath = path.join(__dirname, '../../docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_CHEMISTRY.json');
    const questionTypeData = JSON.parse(fs.readFileSync(questionTypeAnalysisPath, 'utf8'));
    const questionTypeProfile = questionTypeData.questionTypeProfile;

    console.log("📊 Loading question type distribution from historical analysis...");
    console.log(`   Theory Conceptual: ${questionTypeProfile.theory_conceptual}%`);
    console.log(`   Property Based: ${questionTypeProfile.property_based}%`);
    console.log(`   Reaction Based: ${questionTypeProfile.reaction_based}%`);
    console.log(`   Calculation: ${questionTypeProfile.calculation}%`);
    console.log(`   Structure Based: ${questionTypeProfile.structure_based}%`);
    console.log(`   Application: ${questionTypeProfile.application}%`);

    // Calculate exact counts for 60 questions
    const questionTypeCounts = {
        theory_conceptual: Math.round(60 * questionTypeProfile.theory_conceptual / 100),  // 20
        property_based: Math.round(60 * questionTypeProfile.property_based / 100),        // 15
        reaction_based: Math.round(60 * questionTypeProfile.reaction_based / 100),        // 15
        calculation: Math.round(60 * questionTypeProfile.calculation / 100),              // 5
        structure_based: Math.round(60 * questionTypeProfile.structure_based / 100),      // 4
        application: Math.round(60 * questionTypeProfile.application / 100)               // 1
    };

    console.log("\n🎯 Target Question Counts (60 questions):");
    Object.entries(questionTypeCounts).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} questions`);
    });

    // Use REI v17 calibrated values
    const chemistryForecast = {
        idsTarget: 0.724,  // From 5-year calibration
        rigorVelocity: 1.607, // rigor_drift_multiplier
        boardSignature: 'CONCEPT_PROPERTY_REACTION',
        intentSignature: {
            synthesis: 0.258,  // synthesis_weight
            trapDensity: 0.30, // trap_weight
            linguisticLoad: 0.25, // intent_learning_rate
            speedRequirement: 0.85
        },
        difficultyProfile: {
            easy: 60,      // Historical: 60%
            moderate: 39,  // Historical: 39%
            hard: 2        // Historical: 2%
        },
        questionTypeProfile: questionTypeCounts,  // Add to forecast object
        directives: [
            "🎯 CRITICAL: ENFORCE EXACT QUESTION TYPE DISTRIBUTION:",
            `GENERATE EXACTLY ${questionTypeCounts.theory_conceptual} THEORY_CONCEPTUAL questions (concept understanding, definitions, principles, laws)`,
            `GENERATE EXACTLY ${questionTypeCounts.property_based} PROPERTY_BASED questions (trends, properties, comparisons, acidity/basicity orders)`,
            `GENERATE EXACTLY ${questionTypeCounts.reaction_based} REACTION_BASED questions (synthesis, reagents, products, mechanisms, organic reactions)`,
            `GENERATE EXACTLY ${questionTypeCounts.calculation} CALCULATION questions (numerical problems, pH, equilibrium constants, concentrations)`,
            `GENERATE EXACTLY ${questionTypeCounts.structure_based} STRUCTURE_BASED questions (geometry, VSEPR, hybridization, isomers)`,
            `GENERATE EXACTLY ${questionTypeCounts.application} APPLICATION questions (real-world, industrial, everyday chemistry)`,
            "",
            "Target IDS: 0.724 (Range: 0.68-0.76)",
            "Focus on high-confidence identities: CHM-007, CHM-009, CHM-016, CHM-027",
            "Include multi-statement verification (Match List, Statement-I/II formats)",
            "Laboratory-integrated theory with reagent-specific logic",
            "Organic: Multi-step synthesis paths (A→B→C chains)",
            "Physical: Graphical interpretation and conceptual stability",
            "Inorganic: Property-based identification and qualitative analysis"
        ]
    };

    // 2. Load Identity Bank
    console.log("🧬 Loading Chemistry identity bank...");
    const bankPath = path.join(__dirname, '../../lib/oracle/identities/kcet_chemistry.json');
    const bankData = JSON.parse(fs.readFileSync(bankPath, 'utf8'));

    console.log(`   ✅ Found ${bankData.identities.length} Chemistry identities`);

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
    console.log(`   IDS Target: ${chemistryForecast.idsTarget}`);
    console.log(`   Rigor Velocity: ${chemistryForecast.rigorVelocity}`);
    console.log(`   Board Signature: ${chemistryForecast.boardSignature}`);
    console.log(`   Difficulty: E:${chemistryForecast.difficultyProfile.easy}% M:${chemistryForecast.difficultyProfile.moderate}% H:${chemistryForecast.difficultyProfile.hard}%`);

    // 4. Generate payload with full REI v17 calibration
    const generatePayload = (setName: string, focus: string) => ({
        testName: `KCET Chemistry 2026 Flagship - ${setName} [REI v17]`,
        subject: subject,
        examContext: exam,
        questionCount: 60,
        difficultyMix: chemistryForecast.difficultyProfile,
        strategyMode: 'predictive_mock',
        oracleMode: {
            enabled: true,
            idsTarget: chemistryForecast.idsTarget,
            rigorVelocity: chemistryForecast.rigorVelocity,
            intentSignature: chemistryForecast.intentSignature,
            directives: [
                ...chemistryForecast.directives,
                `FORENSIC_FOCUS: ${focus}`,
                `TARGET_SET: ${setName}`,
                `HIGH_YIELD_IDENTITIES: ${highYieldIdentities.slice(0, 7).join(', ')}`
            ],
            boardSignature: chemistryForecast.boardSignature
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

    // 6. Generate SET A (Physical Chemistry + Organic focus)
    console.log("\n\n📡 GENERATING SET A (Physical + Organic Chemistry)...");
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
    console.log("\n\n📡 GENERATING SET B (Inorganic + Organic Chemistry)...");
    console.log("═══════════════════════════════════════════════════════");
    await createCustomTest({
        body: {
            userId: adminUserId,
            ...generatePayload('SET_B', 'Inorganic_Organic_Balance')
        }
    } as any, mockRes as any);

    console.log("\n\n✅ CHEMISTRY FLAGSHIP GENERATION COMPLETE!");
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

generateFlagshipChemistry().catch(console.error);
