/**
 * TEST: SCAN → LEARNING JOURNEY INTEGRATION
 *
 * Verifies that scanned content flows correctly into Learning Journey
 * Tests with: /Users/apple/Downloads/CETPAPERS/2022_physics.pdf
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testScanToJourneyFlow() {
  console.log('\n🔬 TESTING: SCAN → LEARNING JOURNEY INTEGRATION\n');
  console.log('='.repeat(80));
  console.log('Test File: /Users/apple/Downloads/CETPAPERS/2022_physics.pdf');
  console.log('Expected: KCET Physics questions appear in Learning Journey\n');
  console.log('='.repeat(80));

  // Step 1: Check if any existing scans match our test case
  console.log('\n📊 STEP 1: Checking Existing Scans\n');
  console.log('-'.repeat(80));

  const { data: existingScans, error: scansError } = await supabase
    .from('scans')
    .select('id, name, subject, status, created_at')
    .eq('subject', 'Physics')
    .order('created_at', { ascending: false })
    .limit(5);

  if (scansError) {
    console.error('❌ Error fetching scans:', scansError.message);
  } else if (!existingScans || existingScans.length === 0) {
    console.log('⚠️  No Physics scans found in database');
    console.log('   To test the flow:');
    console.log('   1. Open the app in browser');
    console.log('   2. Upload: /Users/apple/Downloads/CETPAPERS/2022_physics.pdf');
    console.log('   3. Select: Subject=Physics, Grade=Class 12, Exam=KCET');
    console.log('   4. Wait for processing to complete');
    console.log('   5. Run this test again\n');
  } else {
    console.log(`✅ Found ${existingScans.length} Physics scan(s):\n`);
    existingScans.forEach((scan, i) => {
      console.log(`${i + 1}. ${scan.name}`);
      console.log(`   ID: ${scan.id}`);
      console.log(`   Status: ${scan.status}`);
      console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}\n`);
    });
  }

  // Step 2: Check questions from Physics scans
  console.log('='.repeat(80));
  console.log('\n📊 STEP 2: Checking Questions from Physics Scans\n');
  console.log('-'.repeat(80));

  if (!existingScans || existingScans.length === 0) {
    console.log('⏭️  Skipping (no scans found)\n');
  } else {
    const scanIds = existingScans.map(s => s.id);

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, text, topic, difficulty, marks')
      .in('scan_id', scanIds);

    if (questionsError) {
      console.error('❌ Error fetching questions:', questionsError.message);
    } else if (!questions || questions.length === 0) {
      console.log('⚠️  No questions found for these scans');
      console.log('   This means scans are uploaded but not processed yet\n');
    } else {
      console.log(`✅ Found ${questions.length} questions\n`);

      // Group by topic
      const topicCounts = new Map<string, number>();
      questions.forEach(q => {
        const topic = q.topic || 'Uncategorized';
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });

      console.log('Questions by Topic:');
      Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([topic, count]) => {
          console.log(`  📚 ${topic}: ${count} questions`);
        });

      console.log('\nSample Questions:');
      questions.slice(0, 3).forEach((q, i) => {
        console.log(`\n${i + 1}. ${q.text.substring(0, 100)}...`);
        console.log(`   Topic: ${q.topic}`);
        console.log(`   Difficulty: ${q.difficulty}`);
        console.log(`   Marks: ${q.marks}`);
      });
      console.log('');
    }
  }

  // Step 3: Check if topics appear in Learning Journey
  console.log('='.repeat(80));
  console.log('\n📊 STEP 3: Simulating Learning Journey Query\n');
  console.log('-'.repeat(80));

  // Import the aggregator function
  const { aggregateTopicsForUser } = await import('../lib/topicAggregator.js');

  // Test with first user (if scans exist)
  if (existingScans && existingScans.length > 0) {
    const firstScan = existingScans[0];

    // Get user_id from the scan (we need to query it)
    const { data: scanWithUser } = await supabase
      .from('scans')
      .select('user_id')
      .eq('id', firstScan.id)
      .single();

    if (scanWithUser?.user_id) {
      console.log(`Testing Learning Journey for user: ${scanWithUser.user_id}\n`);

      try {
        const topics = await aggregateTopicsForUser(
          scanWithUser.user_id,
          'Physics',
          'KCET'
        );

        console.log(`✅ Learning Journey shows ${topics.length} Physics topics for KCET\n`);

        // Show topics with questions
        const topicsWithQuestions = topics.filter(t => t.totalQuestions > 0);
        const topicsWithoutQuestions = topics.filter(t => t.totalQuestions === 0);

        if (topicsWithQuestions.length > 0) {
          console.log('📚 Topics WITH Questions (from scans):');
          topicsWithQuestions.forEach(t => {
            console.log(`  ✅ ${t.topicName}: ${t.totalQuestions} questions (${t.masteryLevel}% mastery)`);
          });
          console.log('');
        }

        if (topicsWithoutQuestions.length > 0) {
          console.log(`📖 Topics WITHOUT Questions: ${topicsWithoutQuestions.length}`);
          console.log('   (These are official topics waiting for content)\n');
        }

        // Verify integration success
        console.log('='.repeat(80));
        console.log('\n✅ INTEGRATION TEST RESULTS:\n');
        if (topicsWithQuestions.length > 0) {
          console.log('✅ SUCCESS: Scanned content appears in Learning Journey!');
          console.log(`   - ${topicsWithQuestions.length} topics have questions`);
          console.log(`   - Total questions: ${topics.reduce((sum, t) => sum + t.totalQuestions, 0)}`);
          console.log('   - Questions are grouped by official topic names');
          console.log('\n🎯 User Flow Working:');
          console.log('   1. User uploads scan → ✅');
          console.log('   2. Questions extracted → ✅');
          console.log('   3. Topics assigned → ✅');
          console.log('   4. Learning Journey shows content → ✅');
        } else {
          console.log('⚠️  WARNING: Scans exist but no questions in Learning Journey');
          console.log('   Possible reasons:');
          console.log('   - Scans not fully processed yet');
          console.log('   - Questions have different topic names than expected');
          console.log('   - Database mapping issue');
        }

      } catch (error: any) {
        console.error('❌ Error testing Learning Journey:', error.message);
      }
    }
  } else {
    console.log('⏭️  Skipping (no scans to test with)\n');
    console.log('📋 TO TEST THE COMPLETE FLOW:\n');
    console.log('1. Upload KCET Physics scan via app');
    console.log('2. Wait for BoardMastermind processing');
    console.log('3. Run this test again');
    console.log('4. Expected: Topics with questions in Learning Journey\n');
  }

  console.log('='.repeat(80));
  console.log('\n🔍 HOW THE INTEGRATION WORKS:\n');
  console.log('SCAN UPLOAD FLOW:');
  console.log('  1. User uploads PDF → BoardMastermind');
  console.log('  2. OCR/Vision AI extracts questions');
  console.log('  3. cleanPhysicsExtractor assigns OFFICIAL topic names');
  console.log('     (e.g., "Electric Charges and Fields", not "Electrostatics")');
  console.log('  4. Questions saved to database with topic field\n');

  console.log('LEARNING JOURNEY FLOW:');
  console.log('  1. User selects KCET → Physics');
  console.log('  2. topicAggregator.ts fetches:');
  console.log('     - All official Physics topics (14 total)');
  console.log('     - Filters by KCET exam (all 14 included)');
  console.log('     - Groups user questions by topic name');
  console.log('  3. Dashboard shows topics with question counts');
  console.log('  4. User clicks topic → sees questions from scans\n');

  console.log('FILTER RELATIONSHIP:');
  console.log('  📁 Top Dropdown (Scan Level):');
  console.log('     - Filters existing scans by Subject/Exam');
  console.log('     - Used in: Vault, RapidRecall, Sketch Gallery');
  console.log('     - Shows: All scans matching filter\n');

  console.log('  🗺️  Learning Journey (Topic Level):');
  console.log('     - Aggregates questions from ALL user scans');
  console.log('     - Groups by official topic names');
  console.log('     - Shows: Topic-based view regardless of which scan');
  console.log('     - Example: "Current Electricity" topic shows questions');
  console.log('       from ALL Physics scans, not just one scan\n');

  console.log('='.repeat(80));
  console.log('\n✅ TEST COMPLETE\n');
}

testScanToJourneyFlow().catch(console.error);
