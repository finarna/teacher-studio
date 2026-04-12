import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    console.log('🏁 INITIATING REI COVERAGE FORENSIC REPORT...');
    
    // Fetch last 120 questions from Smart-Batch
    const { data, error } = await supabase
        .from('questions')
        .select('id, topic, difficulty, source')
        .ilike('source', '%Smart-Batch%')
        .order('created_at', { ascending: false })
        .limit(120);

    if (error || !data || data.length === 0) {
        console.error('❌ Failed to fetch questions or no questions found:', error);
        return;
    }

    console.log(`🔍 AUDITING ${data.length} REI-CALIBRATED QUESTIONS...\n`);

    const stats = {
        total: data.length,
        difficulty: {
            Easy: 0,
            Moderate: 0,
            Hard: 0
        },
        topics: {}
    };

    data.forEach(q => {
        // Difficulty Count
        const d = q.difficulty || 'Moderate';
        if (stats.difficulty[d] !== undefined) stats.difficulty[d]++;
        else stats.difficulty['Moderate']++;

        // Topic Count
        const t = q.topic || 'General';
        stats.topics[t] = (stats.topics[t] || 0) + 1;
    });

    console.log('--- 📊 DIFFICULTY PROFILE (REI ALIGNMENT) ---');
    const easyP = ((stats.difficulty.Easy / stats.total) * 100).toFixed(1);
    const modP = ((stats.difficulty.Moderate / stats.total) * 100).toFixed(1);
    const hardP = ((stats.difficulty.Hard / stats.total) * 100).toFixed(1);

    console.log(`🟢 EASY:     ${stats.difficulty.Easy} questions (${easyP}%) [Target: ~58%]`);
    console.log(`🟡 MODERATE: ${stats.difficulty.Moderate} questions (${modP}%) [Target: ~25%]`);
    console.log(`🔴 HARD:     ${stats.difficulty.Hard} questions (${hardP}%) [Target: ~17%]`);

    console.log('\n--- 📚 TOPIC COVERAGE MATRIX ---');
    const sortedTopics = Object.entries(stats.topics).sort((a, b) => b[1] - a[1]);
    sortedTopics.forEach(([name, count]) => {
        const p = ((count / stats.total) * 100).toFixed(1);
        console.log(`${count.toString().padStart(2, ' ')}Q | ${p.padStart(5, ' ')}% | ${name}`);
    });

    const topicCount = Object.keys(stats.topics).length;
    console.log(`\n✅ TOTAL TOPICS COVERED: ${topicCount}`);
    
    if (topicCount < 10) {
        console.log('⚠️  REI WARNING: Topic distribution feels narrow. Audit required.');
    } else {
        console.log('✅ REI SUCCESS: Broad curriculum coverage across 2026 Prediction Blueprint.');
    }

    process.exit(0);
}

verify();
