import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('topic_resources')
    .insert({
      user_id: '924a88dd-4f98-4a5f-939a-89f9b1ce4174',
      topic_id: 'test_id',
      subject: 'Math',
      exam_context: 'KCET',
      questions_attempted: 1,
      questions_correct: 1,
      average_accuracy: 100,
      mastery_level: 20,
      study_stage: 'learning'
    })
    .select();
  console.log('Insert result:', data, 'Error:', error);
}
check();
