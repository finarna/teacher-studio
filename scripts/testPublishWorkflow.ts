/**
 * Test Publish/Unpublish Workflow
 *
 * Verifies that:
 * 1. Published scans (is_system_scan=true) appear in Learning Journey
 * 2. Unpublishing removes questions from Learning Journey
 * 3. Publishing a different scan changes the available questions
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_SUBJECT = 'Math';
const TEST_EXAM_CONTEXT = 'KCET';

interface ScanInfo {
  id: string;
  name: string;
  is_system_scan: boolean;
  question_count: number;
}

async function getPublishedScans(): Promise<ScanInfo[]> {
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, is_system_scan')
    .eq('subject', TEST_SUBJECT)
    .eq('exam_context', TEST_EXAM_CONTEXT)
    .eq('is_system_scan', true);

  if (!scans) return [];

  // Get question counts
  const scansWithCounts = await Promise.all(
    scans.map(async (scan) => {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('scan_id', scan.id);

      return {
        id: scan.id,
        name: scan.name,
        is_system_scan: scan.is_system_scan,
        question_count: count || 0
      };
    })
  );

  return scansWithCounts;
}

async function getAllScans(): Promise<ScanInfo[]> {
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, is_system_scan')
    .eq('subject', TEST_SUBJECT)
    .eq('exam_context', TEST_EXAM_CONTEXT);

  if (!scans) return [];

  // Get question counts
  const scansWithCounts = await Promise.all(
    scans.map(async (scan) => {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('scan_id', scan.id);

      return {
        id: scan.id,
        name: scan.name,
        is_system_scan: scan.is_system_scan,
        question_count: count || 0
      };
    })
  );

  return scansWithCounts;
}

async function getLearningJourneyQuestionCount(): Promise<number> {
  const response = await fetch(
    `http://localhost:9001/api/learning-journey/topics?userId=${TEST_USER_ID}&subject=${TEST_SUBJECT}&examContext=${TEST_EXAM_CONTEXT}`
  );

  const json = await response.json();

  if (!json.success) {
    throw new Error(`API Error: ${json.error}`);
  }

  return json.meta.totalQuestions;
}

async function unpublishScan(scanId: string): Promise<void> {
  await supabase
    .from('scans')
    .update({ is_system_scan: false })
    .eq('id', scanId);
}

async function publishScan(scanId: string): Promise<void> {
  // First unpublish all other scans for this subject/exam
  await supabase
    .from('scans')
    .update({ is_system_scan: false })
    .eq('subject', TEST_SUBJECT)
    .eq('exam_context', TEST_EXAM_CONTEXT);

  // Then publish the selected scan
  await supabase
    .from('scans')
    .update({ is_system_scan: true })
    .eq('id', scanId);
}

async function runTest() {
  console.log('\n🧪 TESTING PUBLISH/UNPUBLISH WORKFLOW\n');
  console.log('='.repeat(80));

  // Step 1: Get initial state
  console.log('\n📊 STEP 1: Initial State\n');
  const allScans = await getAllScans();
  console.log(`Total scans found: ${allScans.length}`);
  allScans.forEach(scan => {
    console.log(`  ${scan.is_system_scan ? '✅ PUBLISHED' : '⚪ UNPUBLISHED'}: ${scan.name} (${scan.question_count} questions)`);
  });

  const initialPublished = allScans.filter(s => s.is_system_scan);
  const initialQuestionCount = await getLearningJourneyQuestionCount();

  console.log(`\n📈 Learning Journey shows: ${initialQuestionCount} questions`);
  console.log(`💡 Expected (from published scans): ${initialPublished.reduce((sum, s) => sum + s.question_count, 0)} questions`);

  // Step 2: Unpublish all scans
  console.log('\n📊 STEP 2: Unpublishing All Scans\n');

  for (const scan of initialPublished) {
    await unpublishScan(scan.id);
    console.log(`  ❌ Unpublished: ${scan.name}`);
  }

  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cache

  const afterUnpublishCount = await getLearningJourneyQuestionCount();
  console.log(`\n📈 Learning Journey shows: ${afterUnpublishCount} questions`);
  console.log(`💡 Expected: 0 questions (all unpublished)`);

  if (afterUnpublishCount === 0) {
    console.log('✅ PASS: Unpublishing works correctly');
  } else {
    console.log('❌ FAIL: Questions still appear after unpublishing');
  }

  // Step 3: Publish a different scan (if available)
  console.log('\n📊 STEP 3: Publishing a Specific Scan\n');

  const scanToPublish = allScans[0]; // Pick first scan
  await publishScan(scanToPublish.id);
  console.log(`  ✅ Published: ${scanToPublish.name} (${scanToPublish.question_count} questions)`);

  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cache

  const afterPublishCount = await getLearningJourneyQuestionCount();
  console.log(`\n📈 Learning Journey shows: ${afterPublishCount} questions`);
  console.log(`💡 Expected: ${scanToPublish.question_count} questions`);

  if (afterPublishCount === scanToPublish.question_count) {
    console.log('✅ PASS: Publishing works correctly');
  } else {
    console.log(`⚠️  PARTIAL: Got ${afterPublishCount} questions, expected ${scanToPublish.question_count}`);
  }

  // Step 4: Restore initial state
  console.log('\n📊 STEP 4: Restoring Initial State\n');

  for (const scan of initialPublished) {
    await publishScan(scan.id);
    console.log(`  ✅ Restored: ${scan.name}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✨ TEST COMPLETE\n');
}

runTest().catch(console.error);
