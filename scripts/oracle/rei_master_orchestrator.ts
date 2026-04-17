
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { auditPaperHistoricalContext } from '../../lib/aiPaperAuditor';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

// PURE CONFIG SOURCES (ZERO HARDCODING)
const CONFIG = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib/oracle/engine_config.json'), 'utf8'));
const EXAM = 'KCET';
const SUBJECTS = ['Math']; // REQUESTED: MATH ONLY

async function runHighFidelityMaster() {
    console.log(`\n🌌 REI v16.17 MASTER PIPELINE: CONFIG-DRIVEN DISCOVERY`);
    console.log(`========================================================================`);

    for (const subject of SUBJECTS) {
        console.log(`\n🧬 SUBJECT: ${subject}`);
        console.log(`------------------------------------------------------------------------`);

        const bankPath = path.join(process.cwd(), `lib/oracle/identities/kcet_${subject.toLowerCase()}.json`);
        if (!fs.existsSync(bankPath)) continue;
        const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));

        const scanRegistry = await discoverScans(EXAM, subject);
        const years = Object.keys(scanRegistry).map(Number).sort();
        
        if (years.length < 2) continue;

        let evolvedDNA = bank.identities;
        let auditHistory: any[] = [];
        let matchHistory: number[] = [];

        for (let i = 0; i < years.length; i++) {
            const currentYear = years[i];
            const actualSignature = await getDeepAuditSignature(EXAM, subject, currentYear, scanRegistry[currentYear].id, evolvedDNA);
            auditHistory.push(actualSignature);

            if (i > 0) {
                const driftResult = compareVirtualToActual(evolvedDNA, actualSignature);
                matchHistory.push(driftResult.matchRate);
                console.log(`   [Cycle ${years[i-1]} -> ${currentYear}] Board Match: ${driftResult.matchRate.toFixed(1)}%`);
                evolvedDNA = applyDeepRWC(evolvedDNA, driftResult, currentYear);
            }
        }

        await sealEvolvedBrain(EXAM, subject, evolvedDNA, auditHistory, matchHistory, bank);
        await generate2026TopologicalForecast(EXAM, subject, evolvedDNA, bank.calibration);
    }
}

async function sealEvolvedBrain(exam: string, subject: string, evolved: any[], history: any[], matches: number[], bank: any) {
    const idsValues = history.map(h => h.idsActual);
    const firstIDS = idsValues[0] || 0.70;
    const lastIDS = idsValues[idsValues.length - 1] || 0.70;
    const peakIDS = Math.max(...idsValues);
    
    // 1. Rigor Multiplier (Targeted at Peak Capability)
    const rigorMultiplier = (peakIDS / firstIDS).toFixed(2);
    
    // 2. PCS Accuracy (Stability)
    const avgPCS = matches.length > 0 ? matches.reduce((a, b) => a + b, 0) / matches.length : 100;

    // 3. TARGET 2026 IDS (Config-Driven Buffer)
    const targetIDS = Math.max(lastIDS, peakIDS * CONFIG.projection_buffer);

    bank.identities = evolved;
    bank.version = `REI v16.17 (${CONFIG.last_updated})`;
    bank.calibration = { 
        subject, 
        ids_target: parseFloat(targetIDS.toFixed(3)), 
        rigor_vel: `${rigorMultiplier}x`, 
        pcs: `${avgPCS.toFixed(1)}%`, 
        status: "CONFIG_DRIVEN_SEAL" 
    };
    
    const p = path.join(process.cwd(), `lib/oracle/identities/kcet_${subject.toLowerCase()}.json`);
    fs.writeFileSync(p, JSON.stringify(bank, null, 2));
    console.log(`   🏁 SEALED: IDS Target: ${targetIDS.toFixed(2)} | Velocity: ${rigorMultiplier}x | PCS: ${avgPCS.toFixed(1)}%`);
}

async function generate2026TopologicalForecast(exam, subject, dna, calibration) {
    let report = `# 🔮 2026 MASTER PROJECTION: ${subject}\n\n`;
    report += `**Intensity Target (IDS)**: ${calibration.ids_target}\n`;
    report += `**Rigor Velocity**: ${calibration.rigor_vel}\n`;
    report += `**Pattern Consistency (PCS)**: ${calibration.pcs}\n\n`;
    report += `| ID | Name | Density | Confidence |\n|---|---|---|---|\n`;

    const sorted = [...dna].sort((a,b) => (b.confidence || 0) - (a.confidence || 0));
    sorted.forEach(id => {
        report += `| ${id.id} | ${id.name} | ${id.high_yield ? "2-3 Slots" : "1 Slot"} | ${(id.confidence * 100).toFixed(1)}% |\n`;
    });

    const dir = path.join(process.cwd(), `docs/oracle/forensics/${subject}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '2026_MASTER_PROJECTION.md'), report);
}

async function getDeepAuditSignature(exam, subject, year, scanId, currentIdentities) {
    const { data: existing } = await supabase.from('exam_historical_patterns').select('intent_signature, ids_actual').eq('exam_context', exam).eq('subject', subject).eq('year', year).single();
    
    // FORCE RE-AUDIT if IDS is missing or TOPOLOGICAL VECTOR is missing
    if (existing?.intent_signature?.identityVector && existing.ids_actual > 0.1) {
        return { identityVector: existing.intent_signature.identityVector, idsActual: existing.ids_actual };
    }
    
    const { data: qs } = await supabase.from('questions').select('text').eq('scan_id', scanId);
    if (!qs) return { identityVector: {}, idsActual: 0.70 };

    const audit = await auditPaperHistoricalContext(qs.map(q => q.text).join('\n\n'), exam, subject, year, GEMINI_API_KEY!, currentIdentities);
    if (audit) {
        // CONFIG-DRIVEN EFFECTIVE IDS (v16.17)
        const rawIds = audit.idsActual || 0.70;
        const synthesis = audit.intentSignature?.synthesis || 0.5;
        const trapDensity = audit.intentSignature?.trapDensity || 0.5;
        
        const rawWeight = 1 - CONFIG.synthesis_weight - CONFIG.trap_weight;
        const baseEIDS = (rawIds * rawWeight) + (synthesis * CONFIG.synthesis_weight) + (trapDensity * CONFIG.trap_weight);
        const effectiveIDS = Math.min(0.99, baseEIDS * CONFIG.solve_tension_multiplier);
        
        console.log(`      🧪 DEBUG Audit [${year}]: E-IDS=${effectiveIDS.toFixed(3)} (Raw:${rawIds})`);
        
        const normalizedVector: Record<string, number> = {};
        Object.entries(audit.identityVector || {}).forEach(([k, v]) => {
            const auditKey = k.toUpperCase().replace(/[^A-Z0-9]/g, '');
            let matchedId = currentIdentities.find(id => id.id.toUpperCase().replace(/[^A-Z0-9]/g, '') === auditKey)?.id;
            
            if (!matchedId) {
                const searchKey = k.toLowerCase();
                const keywords = searchKey.split(/[^a-z0-9]/i).filter(w => w.length > 2);
                const fuzz = currentIdentities.find(id => {
                    const idTerms = `${id.name} ${id.topic} ${id.logic}`.toLowerCase();
                    return keywords.some(kw => idTerms.includes(kw) || kw.includes(id.topic.toLowerCase().substring(0, 3)));
                });
                if (fuzz) matchedId = fuzz.id;
            }

            if (matchedId) normalizedVector[matchedId.toUpperCase().replace(/[^A-Z0-9]/g, '')] = v as number;
        });
        
        audit.identityVector = normalizedVector;
        await supabase.from('exam_historical_patterns').upsert({
            exam_context: exam, subject, year,
            intent_signature: { ...audit.intentSignature, identityVector: audit.identityVector },
            ids_actual: effectiveIDS,
            total_marks: 60 // KCET STANDARD
        }, { onConflict: 'exam_context,subject,year' });
        return { identityVector: audit.identityVector, idsActual: effectiveIDS };
    }
    return { identityVector: {}, idsActual: 0.70 };
}

function generateVirtualIdentityVector(dna: any[]) {
    const vector: Record<string, number> = {};
    dna.forEach(id => {
        const base = id.high_yield ? 3 : 1;
        vector[id.id] = Math.round(base * (id.confidence || 0.8));
    });
    return vector;
}

function compareVirtualToActual(dna: any[], actual: any) {
    const rawPred = generateVirtualIdentityVector(dna);
    const act = actual.identityVector || {};
    const pred: Record<string, number> = {};
    Object.entries(rawPred).forEach(([k, v]) => {
        pred[k.toUpperCase().replace(/[^A-Z0-9]/g, '')] = v;
    });

    let matches = 0, totalAct = 0;
    const allIds = new Set([...Object.keys(pred), ...Object.keys(act)]);
    allIds.forEach(id => {
        const pVal = pred[id] || 0;
        const aVal = act[id] || 0;
        if (pVal > 0 && aVal > 0) matches += 1;
        else if (pVal > 0 || aVal > 0) {
            const pClass = id.substring(0, 5);
            const categoryMatch = Object.keys(act).some(actId => actId.startsWith(pClass));
            if (categoryMatch) matches += 0.5;
        }
        if (aVal > 0) totalAct++;
    });
    return { matchRate: totalAct > 0 ? Math.min(100, (matches / totalAct) * 100) : 0, actualVector: act };
}

function applyDeepRWC(dna: any[], drift: any, year: number) {
    return dna.map(id => {
        const appeared = drift.actualVector[id.id.replace(/-/g, '')] || 0;
        return {
            ...id,
            logic: id.logic.includes(`| Disc_${year}`) ? id.logic : `${id.logic} | Disc_${year}`,
            confidence: appeared > 0 ? Math.min(0.99, (id.confidence || 0.8) + 0.05) : Math.max(0.4, (id.confidence || 0.8) - 0.1),
            high_yield: appeared > 1
        };
    });
}

async function discoverScans(exam: string, subject: string) {
    const { data: scans } = await supabase.from('scans').select('id, name, year').eq('exam_context', exam).eq('subject', subject);
    const reg: any = {};
    for (const s of scans || []) {
        const year = s.year ? parseInt(s.year) : parseInt(s.name.match(/20\d{2}/)?.[0] || "0");
        if (year > 2000 && year < 2026) reg[year] = { id: s.id };
    }
    return reg;
}

runHighFidelityMaster().catch(console.error);
