
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import fs from 'fs';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const SUBJECT = 'Physics';
const EXAM_CONTEXT = 'KCET';
const IDENTITY_BANK_PATH = path.join(process.cwd(), 'lib/oracle/identities/kcet_physics.json');

interface HistoricalRecord {
  year: number;
  ids_actual: number;
  difficulty_hard_pct: number;
  intent_signature: {
    synthesis: number;
    trapDensity: number;
    linguisticLoad: number;
    speedRequirement: number;
  };
  board_signature: string;
  topic_distribution?: Record<string, number>;
}

interface Prediction {
  year: number;
  ids_predicted: number;
  hard_pct_predicted: number;
  intent_predicted: any;
  topic_distribution_predicted?: Record<string, number>;
}

class RWCLearningEngine {
  private history: HistoricalRecord[] = [];
  private currentWeights = {
    rigorDriftMultiplier: 1.5,
    idsBaseline: 0.85,
    intentLearningRate: 0.2,
    volatilityFactor: 1.0 
  };
  private identityBank: any;
  private learningLog: any[] = [];

  constructor(records: HistoricalRecord[], identityBank: any) {
    this.history = records.sort((a, b) => a.year - b.year);
    this.identityBank = identityBank;
  }

  async runIterativeLearning() {
    console.log(`🚀 Starting REI v16.0 RWC Iterative Learning Loop for ${SUBJECT}...`);
    
    const baseline = this.history.find(r => r.year === 2021);
    if (!baseline) throw new Error('2021 baseline not found');

    let trainingSet = [baseline];
    const testYears = this.history.filter(r => r.year > 2021).map(r => r.year);

    for (const year of testYears) {
      const prediction = this.predict(year, trainingSet);
      const actual = this.history.find(r => r.year === year)!;
      const error = this.calculateError(prediction, actual);
      this.applyRWC(error, prediction, actual);
      trainingSet.push(actual);
      
      this.learningLog.push({
        year,
        prediction,
        actual,
        error,
        updatedWeights: { ...this.currentWeights }
      });
    }

    const final2026 = this.predict(2026, trainingSet);
    return { log: this.learningLog, final2026 };
  }

  private predict(year: number, knownHistory: HistoricalRecord[]): Prediction {
    const latest = knownHistory[knownHistory.length - 1];
    const prev = knownHistory.length > 1 ? knownHistory[knownHistory.length - 2] : null;

    let idsGradient = 0;
    if (prev) {
      const idsDelta = latest.ids_actual - prev.ids_actual;
      if (Math.abs(idsDelta) > 0.08) {
        idsGradient = -idsDelta * 0.4; 
      } else {
        idsGradient = idsDelta;
      }
    }

    const hardDrift = prev ? (latest.difficulty_hard_pct - prev.difficulty_hard_pct) : 5;
    const predictedHard = Math.min(65, Math.max(15, latest.difficulty_hard_pct + (hardDrift * this.currentWeights.rigorDriftMultiplier)));
    const predictedIDS = Math.min(1.0, Math.max(0.5, latest.ids_actual + idsGradient));

    return {
      year,
      ids_predicted: Number(predictedIDS.toFixed(3)),
      hard_pct_predicted: Math.round(predictedHard),
      intent_predicted: { ...latest.intent_signature }
    };
  }

  private calculateError(pred: Prediction, actual: HistoricalRecord) {
    return {
      idsError: actual.ids_actual - pred.ids_predicted,
      hardError: actual.difficulty_hard_pct - pred.hard_pct_predicted,
      intentShift: {
          synthesis: (actual.intent_signature?.synthesis || 0) - (pred.intent_predicted?.synthesis || 0),
          trap: (actual.intent_signature?.trapDensity || 0) - (pred.intent_predicted?.trapDensity || 0)
      }
    };
  }

  private applyRWC(error: any, pred: Prediction, actual: HistoricalRecord) {
    if (Math.abs(error.hardError) > 2) {
        const correction = error.hardError / 10;
        this.currentWeights.rigorDriftMultiplier = Math.max(0.5, Math.min(3.5, this.currentWeights.rigorDriftMultiplier + correction));
    }
  }

  getFinalTable(result: any) {
    const latest = result.log[result.log.length - 1];
    const forecast = result.final2026;
    
    return [
      {
        subject: `${EXAM_CONTEXT} ${SUBJECT}`,
        ids_score: forecast.ids_predicted,
        rigor_vel: `${this.currentWeights.rigorDriftMultiplier.toFixed(2)}x`,
        synthesis: forecast.intent_predicted.synthesis,
        trap_density: forecast.intent_predicted.trapDensity,
        target_strategy: "Dimension-Graph Logic"
      }
    ];
  }
}

async function main() {
  const { data: records, error: pError } = await supabase
    .from('exam_historical_patterns')
    .select('*')
    .eq('exam_context', EXAM_CONTEXT)
    .eq('subject', SUBJECT)
    .not('ids_actual', 'is', null)
    .order('year', { ascending: true });

  if (pError || !records || records.length === 0) {
    console.error('Failed to fetch historical data for Physics');
    return;
  }

  // [START FROM SCRATCH] Force 2021 Baseline Integrity
  const baseline2021 = records.find(r => Number(r.year) === 2021);
  if (baseline2021) {
    console.log('🏛️  Hard-Anchoring 2021 Physics Baseline...');
    baseline2021.ids_actual = 0.78;
    baseline2021.difficulty_hard_pct = 8;
    baseline2021.intent_signature = {
      ...baseline2021.intent_signature,
      synthesis: 0.75,
      trapDensity: 0.45,
      linguisticLoad: 0.40,
      speedRequirement: 0.92
    };
    baseline2021.board_signature = 'SYNTHESIZER';
  }

  const identityBank = JSON.parse(fs.readFileSync(IDENTITY_BANK_PATH, 'utf8'));
  const engine = new RWCLearningEngine(records, identityBank);
  const result = await engine.runIterativeLearning();
  
  const table = engine.getFinalTable(result);
  console.log('\n--- FINAL CALIBRATION TABLE (REI v16.0 RESET) ---');
  console.table(table);

  // Update kcet_physics.json with the results
  identityBank.calibration = table[0];
  fs.writeFileSync(IDENTITY_BANK_PATH, JSON.stringify(identityBank, null, 2));
  console.log(`\n✅ Updated ${IDENTITY_BANK_PATH} with forensic calibration.`);
}

main().catch(console.error);
