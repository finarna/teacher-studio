/**
 * POPULATE INTELLIGENCE FOR QUESTIONS
 * 
 * Generates missing solution steps, insights, tips, and formulas for questions
 * that were uploaded via scans or other admin tools.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { synthesizeQuestionIntelligence } from '../../lib/intelligenceSynthesis';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.VITE_GEMINI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
    console.error('❌ Missing credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run(scanNameFilter?: string, limit: number = 20, live: boolean = false, overwrite: boolean = false) {
    console.log('🚀 Populating AI Intelligence for Questions\n');
    console.log(`Mode: ${live ? '💾 LIVE UPDATE' : '🔍 DRY RUN'}`);
    if (scanNameFilter) console.log(`Scan Filter: ${scanNameFilter}`);
    if (overwrite) console.log(`Overwrite: 🔄 ENABLED (Replacing existing content)`);
    console.log(`Limit: ${limit} questions\n`);

    // 1. Find questions
    let query = supabase
        .from('questions')
        .select('*, scans(name, exam_context, subject)')
        .limit(limit);

    if (!overwrite) {
        query = query.or('solution_steps.is.null,solution_steps.eq.[]');
    }

    if (scanNameFilter) {
        // Get scan IDs first
        const { data: scans } = await supabase.from('scans').select('id').ilike('name', `%${scanNameFilter}%`);
        if (scans && scans.length > 0) {
            query = query.in('scan_id', scans.map(s => s.id));
        }
    }

    const { data: questions, error } = await query;

    if (error) {
        console.error('❌ Database error:', error);
        return;
    }

    console.log(`📊 Found ${questions?.length || 0} questions needing intelligence\n`);

    if (!questions || questions.length === 0) return;

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const scan = (q as any).scans;
        const topicName = q.topic || 'General';
        const subj = q.subject || scan?.subject || 'Science';
        const ctx = q.exam_context || scan?.exam_context || 'CBSE';

        console.log(`[${i + 1}/${questions.length}] Processing Q${q.id.substring(0, 8)} (${topicName}, ${ctx})`);

        if (live) {
            try {
                const result = await synthesizeQuestionIntelligence(
                    q,
                    topicName,
                    subj,
                    ctx,
                    supabase,
                    geminiApiKey
                );
                if (result) {
                    console.log(`   ✅ Synthesized solution: ${result.solutionSteps?.length} steps`);
                }
            } catch (err) {
                console.error(`   ❌ Failed for Q${q.id.substring(0, 8)}:`, err);
            }
        } else {
            console.log(`   🔍 Dry run: would synthesize for Q${q.id.substring(0, 8)}`);
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 1000));
    }
}

const args = process.argv.slice(2);
const scan = args.find(a => a.startsWith('--scan='))?.split('=')[1];
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '20');
const live = args.includes('--live');
const overwrite = args.includes('--overwrite');

run(scan, limit, live, overwrite)
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
