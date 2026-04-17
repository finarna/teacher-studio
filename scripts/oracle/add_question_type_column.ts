import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addQuestionTypeColumn() {
  console.log('🔧 ADDING question_type_distribution COLUMN TO exam_historical_patterns\n');

  // Use raw SQL to add column
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE exam_historical_patterns
      ADD COLUMN IF NOT EXISTS question_type_distribution JSONB;

      COMMENT ON COLUMN exam_historical_patterns.question_type_distribution IS
      'Distribution of question types: word_problem, pattern_recognition, computational, property_based, abstract';
    `
  });

  if (error) {
    console.error('❌ Error adding column:', error.message);
    console.log('\n⚠️  Manual SQL needed:');
    console.log(`
ALTER TABLE exam_historical_patterns
ADD COLUMN question_type_distribution JSONB;

COMMENT ON COLUMN exam_historical_patterns.question_type_distribution IS
'Distribution of question types: word_problem, pattern_recognition, computational, property_based, abstract';
    `);
  } else {
    console.log('✅ Column added successfully');
  }
}

addQuestionTypeColumn().catch(console.error);
