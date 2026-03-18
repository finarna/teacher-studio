import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  const scanId = '6f10ca9c-8431-466c-becf-1dc8ec8f6446';

  // Step 1: Get questions
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, scan_id')
    .eq('scan_id', scanId);
  
  console.log('Questions fetched:', questions?.length, 'error:', qErr?.message);
  
  const qIds = questions?.map(q => q.id) || [];
  console.log('Sample question IDs:', qIds.slice(0, 3));

  // Step 2: Count mappings
  const { data: mappings, error: mErr, count } = await supabase
    .from('topic_question_mapping')
    .select('question_id', { count: 'exact' })
    .in('question_id', qIds)
    .limit(200);

  console.log('Mappings fetched:', mappings?.length, 'count:', count, 'error:', mErr?.message);
  console.log('Sample mapping question_ids:', mappings?.slice(0, 3).map(m => m.question_id));

  // Cross check
  const mapped = new Set(mappings?.map(m => m.question_id));
  console.log('Unique mapped question count:', mapped.size);
  console.log('Unmapped:', qIds.filter(id => !mapped.has(id)).length);
}

debug().catch(console.error);
