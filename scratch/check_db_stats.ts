import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
  const userId = 'b3f68487-6e42-4e9f-8566-646702674681'; // From session if possible, but I'll try to find any active user
  const subject = 'Mathematics';
  const examContext = 'KCET';

  console.log('--- SUBJECT PROGRESS ---');
  const { data: progress, error: pError } = await supabase
    .from('subject_progress')
    .select('*')
    .eq('subject', subject);
  console.log(progress || pError);

  console.log('--- TOPIC RESOURCES ---');
  const { data: topics, error: tError } = await supabase
    .from('topic_resources')
    .select('topic_name, mastery_level, average_accuracy, questions_attempted')
    .eq('subject', subject)
    .limit(5);
  console.log(topics || tError);
}

checkStats();
