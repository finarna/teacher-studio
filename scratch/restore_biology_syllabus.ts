import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function restoreBiologySyllabus() {
  console.log('🧪 Starting Biology Syllabus Restoration...');
  
  // 1. Fetch all Biology topics
  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .eq('subject', 'Biology');

  if (error) {
    console.error('❌ Error fetching topics:', error);
    return;
  }

  console.log(`📊 Found ${topics?.length || 0} Biology topics. Updating KCET weightages...`);

  const updates = topics?.map(t => {
    const weightage = t.exam_weightage || {};
    // Ensure KCET has at least 2 questions assigned if it was 0 or missing
    if (!weightage.KCET || weightage.KCET === 0) {
      weightage.KCET = 2; 
    }
    return supabase
      .from('topics')
      .update({ exam_weightage: weightage })
      .eq('id', t.id);
  });

  if (updates) {
    await Promise.all(updates);
  }

  console.log('✅ Biology Syllabus Restored! Dashboard should now show all topics.');
}

restoreBiologySyllabus();
