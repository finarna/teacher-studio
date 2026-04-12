
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkBrain() {
  console.log('📡 Fetching Latest Intelligence from ai_universal_calibration...');
  
  const { data, error } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', 'KCET')
    .eq('subject', 'Math') // The table might use 'Math' or 'Mathematics', I'll try both or just look for all KCET
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching brain:', error);
    return;
  }

  if (!data || data.length === 0) {
    // Try 'Mathematics'
    const { data: data2 } = await supabase
      .from('ai_universal_calibration')
      .select('*')
      .eq('exam_type', 'KCET')
      .eq('subject', 'Mathematics')
      .order('updated_at', { ascending: false });
    
    if (data2 && data2.length > 0) {
       logData(data2);
       return;
    }
    console.log('⚠️ No active brain found for KCET.');
    return;
  }

  logData(data);
}

function logData(data: any[]) {
  const brain = data[0];
  console.log('\n--- 🧠 ACTIVE ORACLE BRAIN (LATEST ENTRY) ---');
  console.log(`Exam Type:     ${brain.exam_type}`);
  console.log(`Subject:       ${brain.subject}`);
  console.log(`Target Year:    ${brain.target_year}`);
  console.log(`Rigor Velocity: ${brain.rigor_velocity}x`);
  console.log(`Board Sig:      ${brain.board_signature}`);
  console.log(`Last Updated:   ${brain.updated_at}`);
  console.log('\n--- 🎯 CALIBRATION DIRECTIVES ---');
  if (brain.calibration_directives) {
    brain.calibration_directives.forEach((d: string, i: number) => console.log(`${i+1}. ${d}`));
  }
  console.log('\n--- 📡 INTENT SIGNATURE ---');
  console.log(JSON.stringify(brain.intent_signature, null, 2));
}

checkBrain().catch(console.error);
