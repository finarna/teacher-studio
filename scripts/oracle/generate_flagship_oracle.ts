import { generateTestInBackground } from '../../api/learningJourneyEndpoints.js';
import { getForecastedCalibration } from '../../lib/reiEvolutionEngine';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../../');

function normalizeMix(mix: { easy: number; moderate: number; hard: number }) {
    const total = (mix.easy || 0) + (mix.moderate || 0) + (mix.hard || 0);
    if (total === 100) return mix;
    if (total === 0) return { easy: 40, moderate: 40, hard: 20 };
    const factor = 100 / total;
    return {
        easy: Math.round(mix.easy * factor),
        moderate: Math.round(mix.moderate * factor),
        hard: 100 - Math.round(mix.easy * factor) - Math.round(mix.moderate * factor)
    };
}

async function generateFlagshipOracle() {
    console.log("💎 ANALYZING FORENSIC DATA FOR FLAGSHIP PUBLISH...");

    const subject = process.argv[2] || "Math";
    const exam = "KCET";

    // 1. DATA SOURCE: The Forensic Brain (Calibration Table)
    const forecast = await getForecastedCalibration(exam, subject as any);
    if (!forecast || !forecast.idsTarget) {
        throw new Error(`❌ CRITICAL: No IDS Target found for ${subject} in Brain. Audit required first.`);
    }

    // 2. DATA SOURCE: The Identity Bank (JSON)
    const bankFile = `kcet_${subject.toLowerCase()}.json`;
    const bankPath = path.join(__dirname, `../../lib/oracle/identities/${bankFile}`);
    
    if (!fs.existsSync(bankPath)) {
        throw new Error(`❌ CRITICAL: Identity bank ${bankFile} not found.`);
    }

    const bankData = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
    const clusters = [...new Set(bankData.identities.map((i: any) => i.logic_cluster))] as string[];
    const topClusterA = clusters[0] || "CORE_LOGIC";
    const topClusterB = clusters[1] || "PERIPHERAL_LOGIC";

    console.log(`🧠 [${subject.toUpperCase()}] BRAIN DATA: IDS=${forecast.idsTarget} | Rigor=${forecast.rigorVelocity}`);
    console.log(`🎯 IDENTITY FOCUS: Set A=${topClusterA} | Set B=${topClusterB}`);

    const adminUserId = "13282202-5251-4c94-b5ef-95c273378262";

    const sets = [
        { id: 'SET_A', focus: topClusterA },
        { id: 'SET_B', focus: topClusterB }
    ];

    for (const set of sets) {
        console.log(`\n📡 [STEP] Syncing ${subject} ${set.id} flagship...`);
        const progressId = randomUUID();
        
        const payload = {
            userId: adminUserId,
            testName: `PLUS2AI OFFICIAL ${subject.toUpperCase()} PREDICTION 2026: ${set.id}`,
            subject: subject,
            examContext: exam,
            topicIds: [], // Empty means full syllabus for predictive_mock
            questionCount: 60,
            difficultyMix: normalizeMix(forecast.difficultyProfile),
            durationMinutes: 80,
            saveAsTemplate: false,
            progressId,
            strategyMode: 'predictive_mock' as any,
            oracleMode: {
                enabled: true,
                idsTarget: forecast.idsTarget,
                rigorVelocity: forecast.rigorVelocity,
                intentSignature: forecast.intentSignature,
                directives: [
                    ...forecast.directives,
                    `FORENSIC_FOCUS: ${set.focus}`,
                    `TARGET_SET: ${set.id}`
                ],
                boardSignature: forecast.boardSignature
            }
        };

        try {
            // FIRE SYNC (This will take 1-3 minutes)
            const result = await generateTestInBackground(payload);
            
            if (result && result.questions) {
                // Filename logic
                let fileName = "";
                if (subject.toLowerCase() === 'math' || subject.toLowerCase() === 'mathematics') {
                    fileName = set.id === 'SET_A' ? 'flagship_final.json' : 'flagship_final_b.json';
                } else {
                    const subjLower = subject.toLowerCase();
                    fileName = set.id === 'SET_A' ? `flagship_${subjLower}_final.json` : `flagship_${subjLower}_final_b.json`;
                }

                const filePath = path.join(rootDir, fileName);
                
                // Construct the JSON structure our bypass expects
                const outData = {
                  test_name: payload.testName,
                  subject: subject,
                  exam_context: exam,
                  total_questions: result.questions.length,
                  test_config: { questions: result.questions },
                  is_official: true,
                  setId: set.id
                };

                fs.writeFileSync(filePath, JSON.stringify(outData, null, 2));
                console.log(`✅ [SUCCESS] Exported ${subject} ${set.id} to ${fileName} (${result.questions.length} Qs)`);
            }
        } catch (err) {
            console.error(`❌ Failed ${set.id}:`, err.message);
        }
    }
}

generateFlagshipOracle().catch(err => {
    console.error("❌ Oracle Generation Failed:", err.message);
    process.exit(1);
});
