import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('topics')
  .select('name, subject, exam_weightage')
  .eq('subject', 'Math');

if (error) {
  console.error('Error:', error);
} else {
  console.log(`\nFound ${data.length} Math topics in database:\n`);
  data.forEach(t => {
    const kcetWeightage = t.exam_weightage?.KCET || 0;
    console.log(`  ✓ ${t.name}`);
    console.log(`    KCET weightage: ${kcetWeightage}`);
    console.log(`    Full weightage: ${JSON.stringify(t.exam_weightage)}`);
    console.log('');
  });
}
