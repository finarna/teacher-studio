
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkQuestion() {
    const scanId = 'eba5ed94-dde7-4171-80ff-aecbf0c969f7';
    console.log('Checking questions for scan:', scanId);

    const { data: questions, error } = await supabase
        .from('questions')
        .select('id, sketch_svg_url, metadata, question_order')
        .eq('scan_id', scanId)
        .not('sketch_svg_url', 'is', null);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Questions with sketches: ${questions?.length || 0}`);

    questions?.forEach(q => {
        console.log(`- Q ID: ${q.id}, App ID: ${q.metadata?.appId}, Order: ${q.question_order}, URL length: ${q.sketch_svg_url?.length}`);
    });
}

checkQuestion();
