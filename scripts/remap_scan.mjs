/**
 * Re-run autoMapScanQuestions for the new Math scan
 * This will apply the updated topic mappings
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { autoMapScanQuestions } from '../lib/autoMapScanQuestions.ts';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function remapScan() {
  const scanId = '988c86f0-75a3-4e53-8308-2347a41df26b';

  console.log('🔄 Re-running auto-mapping for Math scan...\n');

  const result = await autoMapScanQuestions(supabase, scanId);

  console.log('\n📊 Results:');
  console.log(`   Success: ${result.success}`);
  console.log(`   Mapped: ${result.mapped} questions`);
  console.log(`   Failed: ${result.failed} questions`);

  if (result.failedTopics && result.failedTopics.length > 0) {
    console.log(`\n⚠️  Still unmapped topics:`);
    result.failedTopics.forEach(t => console.log(`   - ${t}`));
    console.log('\n   These are Class 11 topics, intentionally not mapped');
  }

  // Check final count
  const { data: questions } = await supabase
    .from('questions')
    .select('id')
    .eq('scan_id', scanId);

  const { data: mappings } = await supabase
    .from('topic_question_mapping')
    .select('question_id')
    .in('question_id', questions.map(q => q.id));

  console.log(`\n✅ Final Status: ${mappings.length}/60 questions mapped`);

  if (mappings.length >= 53) {
    console.log('\n🎉 Success! The scan should now appear properly in Past Year Exams');
    console.log('   Refresh the admin panel and Learning Journey');
  }
}

remapScan();
