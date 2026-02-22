
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSelect() {
    console.log('Selecting questions with anon key...');
    const { data, error } = await supabase.from('questions').select('id, text, solution_steps').limit(1);

    if (error) {
        console.error('❌ Select failed:', error);
    } else {
        console.log('✅ Select succeeded!', data);
    }
}

testSelect();
