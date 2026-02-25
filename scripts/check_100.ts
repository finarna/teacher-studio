
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('topic_resources')
        .select('average_accuracy, mastery_level, subject, topic_id')
        .eq('average_accuracy', 100);

    if (error) {
        console.error(error);
        return;
    }

    console.log('Records with 100% accuracy:', data.length);
    if (data.length > 0) {
        console.log('Sample subjects:', [...new Set(data.map(d => d.subject))]);
    }
}

check();
