import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testQuery() {
  const { data: questions, error } = await supabase
    .from('questions')
    .select('text, topic, difficulty, options, correct_option_index, solution_steps')
    .eq('scan_id', 'eba5ed94-dde7-4171-80ff-aecbf0c969f7')
    .order('question_order');

  console.log('Error:', error);
  console.log('Questions fetched:', questions?.length);
  if (questions && questions.length > 0) {
    console.log('Sample question:', {
      text: questions[0].text.substring(0, 60) + '...',
      topic: questions[0].topic,
      difficulty: questions[0].difficulty,
      hasOptions: !!questions[0].options,
      hasSolutionSteps: !!questions[0].solution_steps
    });
  }
}

testQuery();
