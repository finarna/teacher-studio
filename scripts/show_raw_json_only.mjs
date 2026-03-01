#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: scans } = await supabase
  .from('scans')
  .select('id')
  .order('created_at', { ascending: false })
  .limit(1);

const { data: questions } = await supabase
  .from('questions')
  .select('question_order, text, options')
  .eq('scan_id', scans[0].id)
  .in('question_order', [5, 18, 20, 21])
  .order('question_order');

for (const q of questions) {
  console.log(`Q${q.question_order} TEXT:`);
  console.log(JSON.stringify(q.text));
  console.log();

  console.log(`Q${q.question_order} OPTIONS:`);
  console.log(JSON.stringify(q.options, null, 2));
  console.log();
  console.log('─'.repeat(80));
  console.log();
}
