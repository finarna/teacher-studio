import { supabaseAdmin } from '../lib/supabaseServer.ts';
import { generateSketch } from '../utils/sketchGenerators.ts';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function generateMissingVisuals() {
    console.log('Fetching most recent scan...');
    const { data: scan } = await supabaseAdmin.from('scans').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (!scan) return;

    console.log(`Generating visual notes for questions in Scan: ${scan.name}\n`);

    const { data: questions } = await supabaseAdmin.from('questions')
        .select('*')
        .eq('scan_id', scan.id);

    if (!questions) return;

    const questionsWithoutVisuals = questions.filter(q => !q.sketch_svg_url);
    console.log(`Found ${questionsWithoutVisuals.length} questions missing visuals.`);

    if (questionsWithoutVisuals.length === 0) {
        console.log('All questions have visuals already!');
        return;
    }

    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("Missing Gemini API key in env!");
        return;
    }

    let success = 0;
    let failed = 0;

    for (let i = 0; i < Math.min(questionsWithoutVisuals.length, 5); i++) {
        const q = questionsWithoutVisuals[i];
        console.log(`\n[${i + 1}/5] Generating visual note for Q ID: ${q.id}...`);

        try {
            const visualConcept = q.visual_concept || q.topic;
            // Generate visual note directly using the backend generator logic
            // Assuming "gemini-1.5-flash" or "gemini-1.5-pro"
            const result = await generateSketch(
                'gemini-1.5-flash',
                visualConcept,
                q.text,
                scan.subject,
                apiKey,
                (status) => console.log(`   -> ${status}`)
            );

            if (result && result.imageData) {
                const { error } = await supabaseAdmin
                    .from('questions')
                    .update({ sketch_svg_url: result.imageData })
                    .eq('id', q.id);

                if (error) {
                    console.error('Database update failed:', error.message);
                    failed++;
                } else {
                    console.log(`   ✅ Saved visual for Q ID: ${q.id}`);
                    success++;
                }
            } else {
                failed++;
            }

            // Wait 2 secs to respect rate limits
            await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
            console.error(`Failed to generate visual for ${q.id}:`, err);
            failed++;
        }
    }

    console.log(`\n============== REPORT ==============`);
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failed: ${failed}`);
}

generateMissingVisuals();
