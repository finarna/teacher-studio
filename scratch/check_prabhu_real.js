const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ozrkewbrwgtcunoerzka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96cmtld2Jyd2d0Y3Vub2VyemthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjMzNjg3MCwiZXhwIjoyMDg3OTEyODcwfQ.E0e1THVo01YQwjLBBy4OVQBXkR7lOCFKQR0sNPOEicQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- USER LOOKUP ---');
  const { data: users, error: uErr } = await supabase.from('profiles').select('id, name').ilike('name', '%PRABHU%');
  if (uErr) { console.error(uErr); return; }
  console.log('Users:', users);

  if (users.length > 0) {
    const uid = users[0].id;
    console.log('--- SUBJECT PROGRESS ---');
    const { data: progress } = await supabase.from('subject_progress').select('*').eq('user_id', uid);
    console.log(progress);

    console.log('--- TOPIC DATA (MATH) ---');
    const { data: topics } = await supabase.from('topic_resources')
      .select('topic_name, mastery_level, average_accuracy, questions_attempted')
      .eq('user_id', uid)
      .eq('subject', 'Mathematics')
      .limit(10);
    console.log(topics);
  }
}

check();
