/**
 * TEST TOPIC AGGREGATION FIX
 *
 * Verifies that topics show correctly even for new users with no scans
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables first
dotenv.config({ path: join(__dirname, '..', '.env.local') });

import { aggregateTopicsForUser } from '../lib/topicAggregator.js';

async function testTopicAggregation() {
  console.log('\n🧪 TESTING TOPIC AGGREGATION FIX\n');
  console.log('='.repeat(80));

  // Test with a valid UUID (user with no scans)
  const fakeUserId = '00000000-0000-0000-0000-000000000001';

  console.log('\n📊 Test 1: KCET Chemistry (should show 12 topics)');
  console.log('-'.repeat(80));

  try {
    const topics = await aggregateTopicsForUser(fakeUserId, 'Chemistry', 'KCET');

    console.log(`\n✅ SUCCESS: Found ${topics.length} topics`);

    if (topics.length === 12) {
      console.log('✅ PASS: Correct topic count for KCET Chemistry (12/14)');
    } else {
      console.log(`❌ FAIL: Expected 12 topics, got ${topics.length}`);
    }

    console.log('\nTopics returned:');
    topics.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.topicName} (${t.totalQuestions} questions, ${t.masteryLevel}% mastery)`);
    });

    // Verify excluded topics are NOT in the list
    const topicNames = topics.map(t => t.topicName);
    const shouldBeExcluded = ['Surface Chemistry', 'Chemistry in Everyday Life'];

    console.log('\nExclusion Check:');
    shouldBeExcluded.forEach(name => {
      if (!topicNames.includes(name)) {
        console.log(`  ✅ "${name}" correctly excluded from KCET`);
      } else {
        console.log(`  ❌ "${name}" should be excluded but is present!`);
      }
    });

    // Verify included topics ARE in the list
    const shouldBeIncluded = ['Solutions', 'Electrochemistry', 'Chemical Kinetics'];
    console.log('\nInclusion Check:');
    shouldBeIncluded.forEach(name => {
      if (topicNames.includes(name)) {
        console.log(`  ✅ "${name}" correctly included in KCET`);
      } else {
        console.log(`  ❌ "${name}" should be included but is missing!`);
      }
    });

  } catch (error: any) {
    console.log(`❌ ERROR: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));

  console.log('\n📊 Test 2: NEET Chemistry (should show 14 topics)');
  console.log('-'.repeat(80));

  try {
    const topics = await aggregateTopicsForUser(fakeUserId, 'Chemistry', 'NEET');

    console.log(`\n✅ SUCCESS: Found ${topics.length} topics`);

    if (topics.length === 14) {
      console.log('✅ PASS: Correct topic count for NEET Chemistry (14/14)');
    } else {
      console.log(`❌ FAIL: Expected 14 topics, got ${topics.length}`);
    }

    // Verify excluded topics ARE in NEET (not excluded)
    const topicNames = topics.map(t => t.topicName);
    const shouldBeIncluded = ['Surface Chemistry', 'Chemistry in Everyday Life'];

    console.log('\nInclusion Check:');
    shouldBeIncluded.forEach(name => {
      if (topicNames.includes(name)) {
        console.log(`  ✅ "${name}" correctly included in NEET`);
      } else {
        console.log(`  ❌ "${name}" should be included but is missing!`);
      }
    });

  } catch (error: any) {
    console.log(`❌ ERROR: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));

  console.log('\n📊 Test 3: KCET Biology (should show 13 topics)');
  console.log('-'.repeat(80));

  try {
    const topics = await aggregateTopicsForUser(fakeUserId, 'Biology', 'KCET');

    console.log(`\n✅ SUCCESS: Found ${topics.length} topics`);

    if (topics.length === 13) {
      console.log('✅ PASS: Correct topic count for KCET Biology (13/13)');
    } else {
      console.log(`❌ FAIL: Expected 13 topics, got ${topics.length}`);
    }

    // Show all topics
    console.log('\nAll Biology Topics:');
    topics.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.topicName}`);
    });

  } catch (error: any) {
    console.log(`❌ ERROR: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ TESTING COMPLETE!\n');
}

testTopicAggregation().catch(console.error);
