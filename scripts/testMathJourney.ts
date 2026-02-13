/**
 * Test Math Learning Journey
 */

import { aggregateTopicsForUser } from '../lib/topicAggregator.ts';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMathJourney() {
  console.log('\n📐 TESTING MATH LEARNING JOURNEY\n');
  console.log('='.repeat(70));

  // Get a user with Math scans
  const { data: scan } = await supabase
    .from('scans')
    .select('user_id')
    .eq('subject', 'Math')
    .limit(1)
    .single();

  if (!scan) {
    console.log('❌ No Math scans found');
    return;
  }

  const userId = scan.user_id;
  console.log(`Testing for user: ${userId}\n`);

  // Test aggregation
  const topics = await aggregateTopicsForUser(userId, 'Math', 'KCET');

  console.log(`✅ Learning Journey returned ${topics.length} Math topics\n`);

  const topicsWithQuestions = topics.filter(t => t.totalQuestions > 0);
  const totalQuestions = topics.reduce((sum, t) => sum + t.totalQuestions, 0);

  if (topicsWithQuestions.length > 0) {
    console.log(`📚 Topics WITH Questions: ${topicsWithQuestions.length}\n`);
    topicsWithQuestions.forEach(t => {
      console.log(`  ✅ ${t.topicName}: ${t.totalQuestions} questions`);
    });
    console.log(`\n📊 Total: ${totalQuestions} questions across ${topicsWithQuestions.length} topics`);
  } else {
    console.log('⚠️  No topics have questions');
  }

  console.log('\n' + '='.repeat(70));

  if (topicsWithQuestions.length > 0) {
    console.log('\n✅ SUCCESS: Math topics now show questions in Learning Journey!');
  } else {
    console.log('\n❌ FAILED: Math topics still show 0 questions');
  }

  console.log('');
}

testMathJourney().catch(console.error);
