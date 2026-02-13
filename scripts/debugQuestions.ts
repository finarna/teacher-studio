/**
 * DEBUG: Check question data structure
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugQuestions() {
  console.log('\n🔍 DEBUGGING QUESTION DATA\n');

  // Test 1: Simple count
  const { count, error: countError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });

  console.log('Test 1 - Simple Count:');
  console.log(`  Total questions: ${count}`);
  if (countError) console.log(`  Error: ${countError.message}`);

  // Test 2: Get sample question
  const { data: sample, error: sampleError } = await supabase
    .from('questions')
    .select('id, topic, scan_id')
    .limit(1)
    .single();

  console.log('\nTest 2 - Sample Question:');
  if (sample) {
    console.log(`  ID: ${sample.id}`);
    console.log(`  Topic: ${sample.topic}`);
    console.log(`  Scan ID: ${sample.scan_id}`);
  }
  if (sampleError) console.log(`  Error: ${sampleError.message}`);

  // Test 3: Join with scans
  const { data: withScan, error: joinError } = await supabase
    .from('questions')
    .select(`
      id,
      topic,
      scan_id,
      scans (
        id,
        subject
      )
    `)
    .limit(1)
    .single();

  console.log('\nTest 3 - Question with Scan Join:');
  if (withScan) {
    console.log(`  ID: ${withScan.id}`);
    console.log(`  Topic: ${withScan.topic}`);
    console.log(`  Scans data:`, (withScan as any).scans);
  }
  if (joinError) console.log(`  Error: ${joinError.message}`);

  // Test 4: Using inner join
  const { data: innerJoin, error: innerError } = await supabase
    .from('questions')
    .select(`
      id,
      topic,
      scans!inner (
        subject
      )
    `)
    .limit(1);

  console.log('\nTest 4 - Inner Join (script uses this):');
  console.log(`  Results: ${innerJoin?.length || 0}`);
  if (innerJoin && innerJoin.length > 0) {
    console.log(`  Sample:`, innerJoin[0]);
  }
  if (innerError) console.log(`  Error: ${innerError.message}`);

  console.log('\n');
}

debugQuestions().catch(console.error);
