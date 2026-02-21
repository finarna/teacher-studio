/**
 * Comprehensive Integration Verification
 * Tests ALL touch points and integration flows
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VerificationResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

async function verify() {
  console.log('🔍 COMPREHENSIVE INTEGRATION VERIFICATION\n');
  console.log('='.repeat(70));
  console.log('\n');

  // Test 1: All required tables exist
  await testTablesExist();

  // Test 2: Scan → AI tables integration
  await testScanToAIIntegration();

  // Test 3: Test completion → Student profile integration
  await testStudentProfileIntegration();

  // Test 4: AI mock test generation
  await testAIMockTestGeneration();

  // Test 5: Trends API endpoint
  await testTrendsAPI();

  // Test 6: Data consistency checks
  await testDataConsistency();

  // Print summary
  printSummary();
}

async function testTablesExist() {
  console.log('📊 TEST 1: Required Tables Exist\n');

  const requiredTables = [
    'exam_configurations',
    'topic_metadata',
    'exam_historical_patterns',
    'exam_topic_distributions',
    'student_performance_profiles',
    'questions',
    'scans',
    'test_attempts',
    'test_responses'
  ];

  for (const table of requiredTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    const passed = !error;
    results.push({
      name: `Table: ${table}`,
      passed,
      message: passed ? `✅ Exists (${count} rows)` : `❌ Missing or inaccessible`,
      details: error?.message
    });
  }

  console.log('\n');
}

async function testScanToAIIntegration() {
  console.log('📄 TEST 2: Scan → AI Tables Integration\n');

  // Get a scan with year
  const { data: scans } = await supabase
    .from('scans')
    .select('id, year, exam_context, subject')
    .not('year', 'is', null)
    .limit(1);

  if (!scans || scans.length === 0) {
    results.push({
      name: 'Scan → AI Tables',
      passed: false,
      message: '❌ No scans with year field available for testing'
    });
    console.log('\n');
    return;
  }

  const scan = scans[0];
  console.log(`   Testing with scan: ${scan.id} (${scan.year} ${scan.exam_context} ${scan.subject})`);

  // Check if this scan created historical pattern
  const { data: pattern } = await supabase
    .from('exam_historical_patterns')
    .select('*')
    .eq('year', parseInt(scan.year))
    .eq('exam_context', scan.exam_context)
    .eq('subject', scan.subject)
    .single();

  const hasPattern = !!pattern;
  results.push({
    name: 'Scan → Historical Pattern',
    passed: hasPattern,
    message: hasPattern ? '✅ Scan created historical pattern' : '❌ No historical pattern found',
    details: pattern?.id
  });

  // Check if topic distributions were created
  if (hasPattern && pattern) {
    const { data: distributions, count } = await supabase
      .from('exam_topic_distributions')
      .select('*', { count: 'exact' })
      .eq('historical_pattern_id', pattern.id);

    const hasDistributions = (count || 0) > 0;
    results.push({
      name: 'Scan → Topic Distributions',
      passed: hasDistributions,
      message: hasDistributions ? `✅ Created ${count} topic distributions` : '❌ No distributions found',
      details: distributions?.map(d => d.topic_id)
    });
  }

  console.log('\n');
}

async function testStudentProfileIntegration() {
  console.log('👥 TEST 3: Test Completion → Student Profile Integration\n');

  // Check if any student profiles exist
  const { data: profiles, count } = await supabase
    .from('student_performance_profiles')
    .select('*', { count: 'exact' })
    .limit(1);

  if ((count || 0) > 0 && profiles && profiles.length > 0) {
    const profile = profiles[0];
    results.push({
      name: 'Student Profile Creation',
      passed: true,
      message: '✅ Student profiles being created',
      details: {
        user_id: profile.user_id,
        exam_context: profile.exam_context,
        subject: profile.subject,
        overall_accuracy: profile.overall_accuracy,
        total_tests_taken: profile.total_tests_taken
      }
    });

    // Validate profile structure
    const hasWeakAreas = Array.isArray(profile.weak_areas);
    const hasStrongAreas = Array.isArray(profile.strong_areas);
    const hasTopicPerf = typeof profile.topic_performance === 'object';

    results.push({
      name: 'Profile Data Structure',
      passed: hasWeakAreas && hasStrongAreas && hasTopicPerf,
      message: hasWeakAreas && hasStrongAreas && hasTopicPerf
        ? '✅ Profile has correct structure'
        : '❌ Profile missing required fields'
    });
  } else {
    results.push({
      name: 'Student Profile Creation',
      passed: true,
      message: 'ℹ️  No profiles yet (will be created when students complete tests)',
      details: 'This is normal for a new system'
    });
  }

  console.log('\n');
}

async function testAIMockTestGeneration() {
  console.log('🤖 TEST 4: AI Mock Test Generation\n');

  // Check if GEMINI_API_KEY is set
  const hasAPIKey = !!process.env.GEMINI_API_KEY;
  results.push({
    name: 'Gemini API Key',
    passed: hasAPIKey,
    message: hasAPIKey ? '✅ API key configured' : '❌ GEMINI_API_KEY not set'
  });

  // Check if exam configuration exists
  const { data: config } = await supabase
    .from('exam_configurations')
    .select('*')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .single();

  results.push({
    name: 'Exam Configuration',
    passed: !!config,
    message: config ? `✅ Config exists (${config.total_questions}Q, ${config.duration_minutes}min)` : '❌ No config for KCET Math'
  });

  // Check if topics exist
  const { data: topics, count: topicCount } = await supabase
    .from('topic_metadata')
    .select('*', { count: 'exact' })
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math');

  results.push({
    name: 'Topic Metadata',
    passed: (topicCount || 0) >= 5,
    message: (topicCount || 0) >= 5 ? `✅ ${topicCount} topics defined` : `❌ Only ${topicCount} topics (need >= 5)`
  });

  // Check if historical data exists
  const { data: patterns, count: patternCount } = await supabase
    .from('exam_historical_patterns')
    .select('*', { count: 'exact' })
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math');

  results.push({
    name: 'Historical Data',
    passed: (patternCount || 0) >= 2,
    message: (patternCount || 0) >= 2 ? `✅ ${patternCount} years of data` : `❌ Only ${patternCount} years (need >= 2)`
  });

  console.log('\n');
}

async function testTrendsAPI() {
  console.log('📈 TEST 5: Trends API Endpoint\n');

  try {
    const response = await fetch('http://localhost:9001/api/trends/historical/KCET/Math');
    const data = await response.json();

    const passed = response.ok && data.success;
    results.push({
      name: 'Trends API Endpoint',
      passed,
      message: passed ? '✅ API endpoint working' : '❌ API endpoint failed',
      details: passed ? {
        patterns: data.data?.patterns?.length || 0,
        topics: Object.keys(data.data?.topicTrends || {}).length,
        predictions: Object.keys(data.data?.predictions?.topics || {}).length
      } : data.error
    });

    if (passed) {
      const hasPatterns = (data.data?.patterns?.length || 0) > 0;
      const hasTrends = Object.keys(data.data?.topicTrends || {}).length > 0;
      const hasPredictions = Object.keys(data.data?.predictions?.topics || {}).length > 0;

      results.push({
        name: 'Trends API Data Quality',
        passed: hasPatterns && hasTrends && hasPredictions,
        message: hasPatterns && hasTrends && hasPredictions
          ? '✅ API returns complete data'
          : '⚠️  API returns incomplete data'
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Trends API Endpoint',
      passed: false,
      message: '❌ Could not connect to API',
      details: error.message
    });
  }

  console.log('\n');
}

async function testDataConsistency() {
  console.log('🔧 TEST 6: Data Consistency Checks\n');

  // Check if questions are mapped to topics
  const { data: questions, count: totalQuestions } = await supabase
    .from('questions')
    .select('id, topic', { count: 'exact' });

  if (questions) {
    const mappedQuestions = questions.filter(q => q.topic && q.topic.trim() !== '');
    const mappingRatio = (mappedQuestions.length / questions.length) * 100;

    results.push({
      name: 'Question Mapping Ratio',
      passed: mappingRatio >= 70,
      message: mappingRatio >= 70
        ? `✅ ${Math.round(mappingRatio)}% questions mapped to topics`
        : `⚠️  Only ${Math.round(mappingRatio)}% mapped (need >= 70%)`,
      details: `${mappedQuestions.length}/${questions.length} questions`
    });
  }

  // Check if topic distributions match topics in metadata
  const { data: topicMeta } = await supabase
    .from('topic_metadata')
    .select('topic_id')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math');

  const { data: distributions } = await supabase
    .from('exam_topic_distributions')
    .select('topic_id')
    .limit(100);

  if (topicMeta && distributions) {
    const metaTopics = new Set(topicMeta.map(t => t.topic_id));
    const orphanDistributions = distributions.filter(d => !metaTopics.has(d.topic_id));

    results.push({
      name: 'Topic ID Consistency',
      passed: orphanDistributions.length === 0,
      message: orphanDistributions.length === 0
        ? '✅ All distributions match topic metadata'
        : `⚠️  ${orphanDistributions.length} orphan distributions found`,
      details: orphanDistributions.length > 0 ? orphanDistributions.map(d => d.topic_id) : undefined
    });
  }

  console.log('\n');
}

function printSummary() {
  console.log('='.repeat(70));
  console.log('\n📊 VERIFICATION SUMMARY\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  results.forEach(result => {
    console.log(`${result.message}`);
    console.log(`   ${result.name}`);
    if (result.details && typeof result.details === 'object') {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    } else if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
    console.log('');
  });

  console.log('='.repeat(70));
  console.log(`\n🎯 OVERALL SCORE: ${passed}/${total} (${percentage}%)\n`);

  if (percentage === 100) {
    console.log('✅ ALL SYSTEMS GO! Everything is properly integrated.\n');
  } else if (percentage >= 80) {
    console.log('✅ MOSTLY READY! A few minor issues to address.\n');
  } else if (percentage >= 60) {
    console.log('⚠️  PARTIALLY READY! Several integration issues need fixing.\n');
  } else {
    console.log('❌ NOT READY! Major integration issues detected.\n');
  }

  // Specific recommendations
  const failedCritical = results.filter(r =>
    !r.passed && (
      r.name.includes('Table:') ||
      r.name.includes('API Key') ||
      r.name.includes('Historical Data')
    )
  );

  if (failedCritical.length > 0) {
    console.log('🚨 CRITICAL ISSUES:\n');
    failedCritical.forEach(r => {
      console.log(`   • ${r.name}: ${r.message}`);
    });
    console.log('');
  }
}

verify().then(() => process.exit(0)).catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
