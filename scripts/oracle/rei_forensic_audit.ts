
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

dotenv.config({ path: '.env' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const SCAN_2025 = 'c202f81d-cc53-40b1-a473-8f621faac5ba';

async function main() {
    console.log('🔬 Executing REI v16 FORENSIC AUDIT...');
    const { data: actuals } = await supabase.from('questions').select('*').eq('scan_id', SCAN_2025).order('question_order', { ascending: true });
    if (!actuals) return;

    const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const bankRes = await model.generateContent('Generate 60 crucial KCET Math concept/identities. JSON: [{"idnt": "..."}]');
    const bank = JSON.parse(bankRes.response.text().replace(/```json|```/g, '').trim());

    let hits = 0;
    let report = `# 🧬 REI v16 FORENSIC AUDIT: 2025 RESULTS\n\n`;
    report += `**Settings**: RWC=0.90, IDS=0.85, PCS=0.95\n\n`;
    report += `| Q# | Actual | Oracle Identity | Bridge | PCS | Result |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (let i = 0; i < actuals.length; i += 10) {
        const batch = actuals.slice(i, i + 10);
        const prompt = `ACTUAL: ${JSON.stringify(batch.map(a => `[Q${a.question_order}] ${a.text}`))}
        BANK: ${JSON.stringify(bank)}
        For each ACTUAL, return JSON: [{"qO": num, "txt": "...", "idnt": "...", "bdg": "...", "pcs": num}]`;

        try {
            const res = await model.generateContent(prompt);
            const data = JSON.parse(res.response.text().replace(/```json|```/g, '').trim());
            data.forEach((m: any) => {
                const isHit = m.pcs > 0.7;
                if (isHit) hits++;
                report += `| ${m.qO} | ${m.txt.slice(0,25)} | ${m.idnt.slice(0,30)} | ${m.bdg.slice(0,40)} | ${(m.pcs*100).toFixed(0)}% | ${isHit?'✅':'❌'} |\n`;
            });
        } catch (e) { console.error("Err"); }
        console.log(`Progress: ${i+batch.length}/60`);
    }

    const chr = (hits / 60) * 100;
    report += `\n\n## CHR: ${chr.toFixed(1)}%`;
    fs.writeFileSync('REI_v16_FORENSIC_AUDIT_2025.md', report);
    console.log(`DONE: ${chr}%`);
}
main();
