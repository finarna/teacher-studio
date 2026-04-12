/**
 * KCET MATH ITERATIVE LEARNING PREDICTION SYSTEM
 * ===============================================
 * REI v4.0 with Recursive Weight Correction (RWC)
 *
 * Flow:
 * 1. Use 2021 as baseline
 * 2. Predict 2022 → Compare with actual → Learn error
 * 3. Revise prediction weights based on learning
 * 4. Predict 2023 with revised weights → Compare → Learn
 * 5. Continue iterative refinement for each year
 *
 * Outputs:
 * - Learning curve (prediction accuracy over time)
 * - Revised REI parameters
 * - IDS evolution tracking
 * - Self-correcting calibration weights
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    console.error('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
    console.error('SUPABASE_KEY:', SUPABASE_KEY ? 'Set' : 'Missing');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EXAM_CONTEXT = 'KCET';
const SUBJECT = 'Mathematics';
const BASELINE_YEAR = 2021;
const TARGET_YEAR = 2022;

interface YearData {
    year: number;
    difficulty_easy_pct: number;
    difficulty_moderate_pct: number;
    difficulty_hard_pct: number;
    board_signature: string;
    intent_signature: {
        synthesis: number;
        trapDensity: number;
        linguisticLoad: number;
        speedRequirement: number;
    };
    rigor_velocity: number;
    ids_actual: number;
    topic_distribution: Record<string, number>;
    question_count: number;
}

interface PredictionWeights {
    rigor_drift_multiplier: number;
    synthesis_drift: number;
    trap_density_drift: number;
    speed_drift: number;
    topic_stability_factor: number;
}

interface LearningMetrics {
    year: number;
    predicted: YearData;
    actual?: YearData;
    error_metrics: {
        difficulty_error: number;
        intent_error: number;
        topic_error: number;
        overall_accuracy: number;
    };
    revised_weights: PredictionWeights;
    ids_prediction: number;
    ids_actual?: number;
    learning_note: string;
}

// Initial prediction weights (will be revised through learning)
let currentWeights: PredictionWeights = {
    rigor_drift_multiplier: 1.8,      // How fast rigor increases
    synthesis_drift: 0.05,             // Cross-topic integration change per year
    trap_density_drift: 0.03,          // Trap complexity change per year
    speed_drift: 0.02,                 // Speed requirement change per year
    topic_stability_factor: 0.85       // How much topics stay consistent
};

async function main() {
    console.log('🧠 KCET MATH ITERATIVE LEARNING PREDICTION SYSTEM');
    console.log('=================================================');
    console.log(`Baseline: ${BASELINE_YEAR} → Target: ${TARGET_YEAR}`);
    console.log(`REI v4.0 with Recursive Weight Correction\n`);

    // Track learning across iterations
    const learningHistory: LearningMetrics[] = [];

    // 1. Load all available KCET Math data
    const allYearData = await loadAllYearData();

    if (allYearData.length === 0) {
        console.error('❌ No KCET Math data found');
        return;
    }

    console.log(`📚 Loaded ${allYearData.length} years of data:`);
    allYearData.forEach(yd => console.log(`   - ${yd.year}: ${yd.question_count} questions`));
    console.log('');

    // 2. Find baseline year
    const baseline = allYearData.find(y => y.year === BASELINE_YEAR);

    if (!baseline) {
        console.error(`❌ Baseline year ${BASELINE_YEAR} not found`);
        return;
    }

    console.log(`✅ Baseline (${BASELINE_YEAR}) established:\n`);
    printYearSummary(baseline);

    // 3. Sort years and iterate through predictions
    const sortedYears = allYearData
        .filter(y => y.year > BASELINE_YEAR)
        .sort((a, b) => a.year - b.year);

    let previousYear = baseline;

    for (const targetYear of sortedYears) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎯 ITERATION: Predicting ${targetYear.year}`);
        console.log(`${'='.repeat(60)}\n`);

        // Step 1: Make prediction using current weights
        const prediction = predictNextYear(previousYear, targetYear.year, currentWeights);

        console.log(`📊 PREDICTION FOR ${targetYear.year}:\n`);
        printYearSummary(prediction);

        // Step 2: Compare with actual data
        console.log(`\n📈 ACTUAL DATA FOR ${targetYear.year}:\n`);
        printYearSummary(targetYear);

        // Step 3: Calculate errors and learning metrics
        const errorMetrics = calculateErrors(prediction, targetYear);

        console.log(`\n📐 ERROR ANALYSIS:\n`);
        console.log(`   Difficulty Error: ${errorMetrics.difficulty_error.toFixed(2)}%`);
        console.log(`   Intent Error: ${errorMetrics.intent_error.toFixed(3)}`);
        console.log(`   Topic Error: ${errorMetrics.topic_error.toFixed(2)}%`);
        console.log(`   Overall Accuracy: ${errorMetrics.overall_accuracy.toFixed(1)}%`);

        // Step 4: Learn and revise weights
        const revisedWeights = learnAndReviseWeights(
            currentWeights,
            errorMetrics,
            prediction,
            targetYear
        );

        console.log(`\n🧮 WEIGHT REVISION:\n`);
        printWeightComparison(currentWeights, revisedWeights);

        // Step 5: Record learning metrics
        const learningMetric: LearningMetrics = {
            year: targetYear.year,
            predicted: prediction,
            actual: targetYear,
            error_metrics: errorMetrics,
            revised_weights: revisedWeights,
            ids_prediction: prediction.ids_actual,
            ids_actual: targetYear.ids_actual,
            learning_note: generateLearningNote(errorMetrics, revisedWeights)
        };

        learningHistory.push(learningMetric);

        // Step 6: Store learned pattern
        await storeLearningIteration(learningMetric);

        // Step 7: Update weights for next iteration
        currentWeights = revisedWeights;
        previousYear = targetYear;

        console.log(`\n✅ Learning iteration complete for ${targetYear.year}`);
    }

    // 4. Generate learning report
    await generateLearningReport(baseline, learningHistory);

    // 5. Use final refined weights to predict future years
    await predictFutureYears(previousYear, currentWeights, learningHistory);

    console.log(`\n✅ ITERATIVE LEARNING COMPLETE\n`);
}

async function loadAllYearData(): Promise<YearData[]> {
    const { data: scans } = await supabase
        .from('scans')
        .select('id, title, year, exam_context, subject')
        .eq('exam_context', EXAM_CONTEXT)
        .eq('subject', SUBJECT)
        .order('year', { ascending: true });

    if (!scans) return [];

    const yearDataList: YearData[] = [];

    for (const scan of scans) {
        const { data: questions } = await supabase
            .from('questions')
            .select('difficulty, topic, chapter, correct_option_index')
            .eq('scan_id', scan.id);

        if (!questions || questions.length === 0) continue;

        const yearData = analyzeYearData(scan.year || 2021, questions);
        yearDataList.push(yearData);
    }

    return yearDataList;
}

function analyzeYearData(year: number, questions: any[]): YearData {
    const total = questions.length;

    const diffCount = {
        Easy: questions.filter(q => q.difficulty === 'Easy').length,
        Moderate: questions.filter(q => q.difficulty === 'Moderate').length,
        Hard: questions.filter(q => q.difficulty === 'Hard').length
    };

    const topicDist: Record<string, number> = {};
    questions.forEach(q => {
        if (q.topic) topicDist[q.topic] = (topicDist[q.topic] || 0) + 1;
    });

    const difficulty_easy_pct = Math.round((diffCount.Easy / total) * 100);
    const difficulty_moderate_pct = Math.round((diffCount.Moderate / total) * 100);
    const difficulty_hard_pct = Math.round((diffCount.Hard / total) * 100);

    const topicCount = Object.keys(topicDist).length;

    return {
        year,
        difficulty_easy_pct,
        difficulty_moderate_pct,
        difficulty_hard_pct,
        board_signature: determineBoardSignature(difficulty_hard_pct, topicCount),
        intent_signature: {
            synthesis: Math.min(1.0, 0.3 + (topicCount / 15)),
            trapDensity: Math.min(1.0, 0.3 + (difficulty_hard_pct / 100)),
            linguisticLoad: 0.35,
            speedRequirement: 0.88
        },
        rigor_velocity: 1.0, // Will be calculated relative to baseline
        ids_actual: 0.0,     // Will be calculated based on prediction match
        topic_distribution: topicDist,
        question_count: total
    };
}

function predictNextYear(
    previousYear: YearData,
    targetYear: number,
    weights: PredictionWeights
): YearData {
    const yearsDiff = targetYear - previousYear.year;

    // Predict difficulty evolution
    const rigorDrift = (previousYear.difficulty_hard_pct - 20) * weights.rigor_drift_multiplier / 100;
    const predicted_hard = Math.min(65, Math.max(15,
        previousYear.difficulty_hard_pct + (rigorDrift * yearsDiff * 5)
    ));

    const predicted_easy = Math.max(10,
        previousYear.difficulty_easy_pct - (rigorDrift * yearsDiff * 3)
    );

    const predicted_moderate = 100 - predicted_hard - predicted_easy;

    // Predict intent signature evolution
    const predicted_synthesis = Math.min(1.0,
        previousYear.intent_signature.synthesis + (weights.synthesis_drift * yearsDiff)
    );

    const predicted_trapDensity = Math.min(1.0,
        previousYear.intent_signature.trapDensity + (weights.trap_density_drift * yearsDiff)
    );

    const predicted_speed = Math.min(1.0,
        previousYear.intent_signature.speedRequirement + (weights.speed_drift * yearsDiff)
    );

    // Predict topic distribution (with stability factor)
    const predicted_topics: Record<string, number> = {};
    const totalQuestions = previousYear.question_count;

    for (const [topic, count] of Object.entries(previousYear.topic_distribution)) {
        const stability = weights.topic_stability_factor;
        const drift = (Math.random() - 0.5) * 0.2; // Small random variation
        predicted_topics[topic] = Math.round(count * (stability + drift));
    }

    const rigor_velocity = 1.0 + rigorDrift;

    return {
        year: targetYear,
        difficulty_easy_pct: Math.round(predicted_easy),
        difficulty_moderate_pct: Math.round(predicted_moderate),
        difficulty_hard_pct: Math.round(predicted_hard),
        board_signature: determineBoardSignature(predicted_hard, Object.keys(predicted_topics).length),
        intent_signature: {
            synthesis: predicted_synthesis,
            trapDensity: predicted_trapDensity,
            linguisticLoad: 0.35,
            speedRequirement: predicted_speed
        },
        rigor_velocity: Number(rigor_velocity.toFixed(3)),
        ids_actual: 0.0, // Will be set after comparison
        topic_distribution: predicted_topics,
        question_count: totalQuestions
    };
}

function calculateErrors(predicted: YearData, actual: YearData) {
    // Difficulty error (absolute % difference)
    const diff_easy_error = Math.abs(predicted.difficulty_easy_pct - actual.difficulty_easy_pct);
    const diff_mod_error = Math.abs(predicted.difficulty_moderate_pct - actual.difficulty_moderate_pct);
    const diff_hard_error = Math.abs(predicted.difficulty_hard_pct - actual.difficulty_hard_pct);
    const difficulty_error = (diff_easy_error + diff_mod_error + diff_hard_error) / 3;

    // Intent signature error
    const intent_error = (
        Math.abs(predicted.intent_signature.synthesis - actual.intent_signature.synthesis) +
        Math.abs(predicted.intent_signature.trapDensity - actual.intent_signature.trapDensity) +
        Math.abs(predicted.intent_signature.speedRequirement - actual.intent_signature.speedRequirement)
    ) / 3;

    // Topic distribution error
    const allTopics = new Set([
        ...Object.keys(predicted.topic_distribution),
        ...Object.keys(actual.topic_distribution)
    ]);

    let topicErrorSum = 0;
    for (const topic of allTopics) {
        const predPct = ((predicted.topic_distribution[topic] || 0) / predicted.question_count) * 100;
        const actPct = ((actual.topic_distribution[topic] || 0) / actual.question_count) * 100;
        topicErrorSum += Math.abs(predPct - actPct);
    }
    const topic_error = topicErrorSum / allTopics.size;

    // Overall accuracy (inverse of average error)
    const overall_accuracy = Math.max(0, 100 - (difficulty_error + intent_error * 50 + topic_error) / 3);

    return {
        difficulty_error,
        intent_error,
        topic_error,
        overall_accuracy
    };
}

function learnAndReviseWeights(
    currentWeights: PredictionWeights,
    errors: any,
    predicted: YearData,
    actual: YearData
): PredictionWeights {
    const learningRate = 0.15; // How aggressively to adjust weights

    // Revise rigor drift multiplier based on difficulty error
    const hardPctDiff = actual.difficulty_hard_pct - predicted.difficulty_hard_pct;
    const rigorAdjustment = hardPctDiff > 0 ? learningRate : -learningRate * 0.5;

    const revised_rigor = Math.max(1.0, Math.min(3.0,
        currentWeights.rigor_drift_multiplier + rigorAdjustment
    ));

    // Revise synthesis drift
    const synthesisDiff = actual.intent_signature.synthesis - predicted.intent_signature.synthesis;
    const revised_synthesis = Math.max(0, Math.min(0.2,
        currentWeights.synthesis_drift + (synthesisDiff * learningRate)
    ));

    // Revise trap density drift
    const trapDiff = actual.intent_signature.trapDensity - predicted.intent_signature.trapDensity;
    const revised_trap = Math.max(0, Math.min(0.15,
        currentWeights.trap_density_drift + (trapDiff * learningRate)
    ));

    // Revise speed drift
    const speedDiff = actual.intent_signature.speedRequirement - predicted.intent_signature.speedRequirement;
    const revised_speed = Math.max(0, Math.min(0.1,
        currentWeights.speed_drift + (speedDiff * learningRate)
    ));

    // Revise topic stability based on topic error
    const topicStabilityAdjust = errors.topic_error > 10 ? -0.05 : 0.02;
    const revised_stability = Math.max(0.5, Math.min(0.95,
        currentWeights.topic_stability_factor + topicStabilityAdjust
    ));

    return {
        rigor_drift_multiplier: Number(revised_rigor.toFixed(3)),
        synthesis_drift: Number(revised_synthesis.toFixed(4)),
        trap_density_drift: Number(revised_trap.toFixed(4)),
        speed_drift: Number(revised_speed.toFixed(4)),
        topic_stability_factor: Number(revised_stability.toFixed(3))
    };
}

function determineBoardSignature(hardPct: number, topicCount: number): string {
    if (topicCount >= 10 && hardPct >= 30 && hardPct <= 50) return 'SYNTHESIZER';
    if (hardPct > 50) return 'INTIMIDATOR';
    if (hardPct >= 20 && hardPct <= 35) return 'LOGICIAN';
    return 'ANCHOR';
}

function generateLearningNote(errors: any, weights: PredictionWeights): string {
    const notes: string[] = [];

    if (errors.overall_accuracy >= 85) {
        notes.push('High prediction accuracy achieved');
    } else if (errors.overall_accuracy >= 70) {
        notes.push('Moderate prediction accuracy - refinement in progress');
    } else {
        notes.push('Significant learning required - weights adjusted aggressively');
    }

    if (errors.difficulty_error > 10) {
        notes.push(`Difficulty prediction off by ${errors.difficulty_error.toFixed(1)}% - rigor multiplier revised to ${weights.rigor_drift_multiplier}`);
    }

    if (errors.topic_error > 15) {
        notes.push(`Topic distribution unstable - stability factor adjusted to ${weights.topic_stability_factor}`);
    }

    return notes.join('. ') + '.';
}

async function storeLearningIteration(metric: LearningMetrics) {
    // Store the revised weights for this year
    await supabase
        .from('rei_evolution_configs')
        .upsert({
            exam_context: EXAM_CONTEXT,
            subject: SUBJECT,
            rigor_drift_multiplier: metric.revised_weights.rigor_drift_multiplier,
            synthesis_weight: metric.revised_weights.synthesis_drift,
            trap_density_weight: metric.revised_weights.trap_density_drift,
            speed_requirement_weight: metric.revised_weights.speed_drift,
            ids_baseline: 0.95,
            learning_iteration: metric.year,
            prediction_accuracy: metric.error_metrics.overall_accuracy,
            updated_at: new Date().toISOString()
        }, { onConflict: 'exam_context,subject' });
}

async function generateLearningReport(baseline: YearData, history: LearningMetrics[]) {
    let report = `# KCET MATH ITERATIVE LEARNING REPORT\n`;
    report += `**Generated**: ${new Date().toLocaleString()}\n`;
    report += `**Baseline**: ${BASELINE_YEAR}\n`;
    report += `**Learning Iterations**: ${history.length}\n\n`;

    report += `## 📊 LEARNING CURVE\n\n`;
    report += `| Year | Prediction Accuracy | Difficulty Error | IDS Predicted | IDS Actual | Learning Note |\n`;
    report += `|------|---------------------|------------------|---------------|------------|---------------|\n`;

    for (const metric of history) {
        report += `| ${metric.year} | ${metric.error_metrics.overall_accuracy.toFixed(1)}% | ${metric.error_metrics.difficulty_error.toFixed(2)}% | ${metric.ids_prediction.toFixed(2)} | ${metric.ids_actual?.toFixed(2) || 'N/A'} | ${metric.learning_note} |\n`;
    }

    report += `\n## 🎯 WEIGHT EVOLUTION\n\n`;
    report += `| Year | Rigor Multiplier | Synthesis Drift | Trap Drift | Speed Drift | Topic Stability |\n`;
    report += `|------|------------------|-----------------|------------|-------------|------------------|\n`;

    for (const metric of history) {
        const w = metric.revised_weights;
        report += `| ${metric.year} | ${w.rigor_drift_multiplier} | ${w.synthesis_drift} | ${w.trap_density_drift} | ${w.speed_drift} | ${w.topic_stability_factor} |\n`;
    }

    const fileName = `KCET_MATH_LEARNING_REPORT_${new Date().toISOString().split('T')[0]}.md`;
    fs.writeFileSync(`./${fileName}`, report);
    console.log(`\n✅ Learning report saved: ${fileName}`);
}

async function predictFutureYears(latestYear: YearData, finalWeights: PredictionWeights, history: LearningMetrics[]) {
    console.log(`\n\n🔮 FUTURE PREDICTIONS (Using Refined Weights)`);
    console.log(`${'='.repeat(60)}\n`);

    const futureYears = [2024, 2025, 2026];

    let previousYear = latestYear;

    for (const targetYear of futureYears) {
        const prediction = predictNextYear(previousYear, targetYear, finalWeights);

        console.log(`\n📅 PREDICTION FOR ${targetYear}:\n`);
        printYearSummary(prediction);

        // Store prediction in database
        await supabase
            .from('ai_universal_calibration')
            .upsert({
                exam_type: EXAM_CONTEXT,
                subject: SUBJECT,
                target_year: targetYear,
                rigor_velocity: prediction.rigor_velocity,
                intent_signature: prediction.intent_signature,
                calibration_directives: [
                    `Learned rigor multiplier: ${finalWeights.rigor_drift_multiplier}`,
                    `Predicted ${prediction.difficulty_hard_pct}% hard questions`,
                    `Board signature: ${prediction.board_signature}`,
                    `Based on ${history.length} learning iterations`
                ],
                board_signature: prediction.board_signature,
                parameters: {
                    difficulty_profile: {
                        easy: prediction.difficulty_easy_pct,
                        moderate: prediction.difficulty_moderate_pct,
                        hard: prediction.difficulty_hard_pct
                    },
                    refined_weights: finalWeights
                }
            }, { onConflict: 'exam_type,subject,target_year' });

        previousYear = prediction;
    }
}

function printYearSummary(data: YearData) {
    console.log(`   Year: ${data.year}`);
    console.log(`   Questions: ${data.question_count}`);
    console.log(`   Difficulty: E:${data.difficulty_easy_pct}% M:${data.difficulty_moderate_pct}% H:${data.difficulty_hard_pct}%`);
    console.log(`   Board Signature: ${data.board_signature}`);
    console.log(`   Rigor Velocity: ${data.rigor_velocity}`);
    console.log(`   Intent: Synthesis=${data.intent_signature.synthesis.toFixed(2)} Trap=${data.intent_signature.trapDensity.toFixed(2)} Speed=${data.intent_signature.speedRequirement.toFixed(2)}`);
}

function printWeightComparison(old: PredictionWeights, revised: PredictionWeights) {
    console.log(`   Rigor Multiplier: ${old.rigor_drift_multiplier} → ${revised.rigor_drift_multiplier} (${((revised.rigor_drift_multiplier - old.rigor_drift_multiplier) * 100).toFixed(1)}%)`);
    console.log(`   Synthesis Drift: ${old.synthesis_drift} → ${revised.synthesis_drift}`);
    console.log(`   Trap Drift: ${old.trap_density_drift} → ${revised.trap_density_drift}`);
    console.log(`   Speed Drift: ${old.speed_drift} → ${revised.speed_drift}`);
    console.log(`   Topic Stability: ${old.topic_stability_factor} → ${revised.topic_stability_factor}`);
}

main().catch(console.error);
