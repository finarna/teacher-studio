import dotenv from 'dotenv';
import { supabaseAdmin } from '../lib/supabaseServer.ts';

dotenv.config({ path: '.env.local' });
dotenv.config();

const exams = ['KCET', 'JEE', 'NEET'];

for (const exam of exams) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 ' + exam + ' Exam Configurations:');
  console.log('='.repeat(60));
  
  const { data, error } = await supabaseAdmin
    .from('exam_configurations')
    .select('*')
    .eq('exam_context', exam)
    .order('subject');
  
  if (error) {
    console.error('Error for ' + exam + ':', error);
  } else if (!data || data.length === 0) {
    console.log('❌ No configurations found for ' + exam);
  } else {
    data.forEach(config => {
      console.log('\n📚 Subject: ' + config.subject);
      console.log('   Total Questions: ' + config.total_questions);
      console.log('   Duration: ' + config.duration_minutes + ' minutes');
      console.log('   Marks per Question: ' + config.marks_per_question);
      console.log('   Negative Marking: ' + (config.negative_marking_enabled ? 'Yes' : 'No'));
      if (config.negative_marking_enabled) {
        console.log('   Negative Deduction: ' + config.negative_marking_deduction);
      }
      console.log('   Passing: ' + config.passing_percentage + '%');
    });
  }
}

process.exit(0);
