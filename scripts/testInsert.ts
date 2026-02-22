
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInsert() {
    const scanId = 'cd327060-e88d-25ce-1a38-7bd86cf83723'; // Some existing scan ID
    const question = {
        id: crypto.randomUUID(),
        scan_id: scanId,
        text: 'Test Question',
        options: ['A', 'B', 'C', 'D'],
        correct_option_index: 0,
        marks: 1,
        difficulty: 'Moderate',
        topic: 'Test Topic',
        blooms: 'Apply',
        domain: 'Test Domain',
        year: '2025',
        subject: 'Physics',
        exam_context: 'NEET',
        pedagogy: 'Conceptual',
        solution_steps: ['Step 1'],
        exam_tip: 'Tip',
        mastery_material: {
            markingScheme: [{ step: 'Step 1', mark: '1' }]
        }
    };

    console.log('Inserting question...');
    const { data, error } = await supabase.from('questions').insert([question]);

    if (error) {
        console.error('❌ Insert failed:', error);
    } else {
        console.log('✅ Insert succeeded!');
    }
}

testInsert();
