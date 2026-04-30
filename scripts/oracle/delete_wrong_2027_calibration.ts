import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteWrong2027() {
  console.log('\n🗑️  DELETING WRONG 2027 NEET PHYSICS CALIBRATION\n');

  const { error } = await supabase
    .from('ai_universal_calibration')
    .delete()
    .eq('exam_type', 'NEET')
    .eq('subject', 'Physics')
    .eq('target_year', 2027);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Deleted 2027 calibration\n');
  }
}

deleteWrong2027().catch(console.error);
