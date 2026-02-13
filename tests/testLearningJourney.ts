/**
 * COMPREHENSIVE LEARNING JOURNEY TESTING SUITE
 *
 * Tests both technical functionality and user experience flows
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test result tracking
interface TestResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(category: string, test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
  results.push({ category, test, status, message, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${category}] ${test}: ${message}`);
  if (details) {
    console.log(`   Details:`, details);
  }
}

/**
 * TEST SUITE 1: DATABASE SCHEMA & DATA INTEGRITY
 */
async function testDatabaseSchema() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 1: DATABASE SCHEMA & DATA INTEGRITY');
  console.log('='.repeat(80) + '\n');

  // Test 1.1: Topics table exists with correct schema
  try {
    const { data: topics, error } = await supabase
      .from('topics')
      .select('*')
      .limit(1);

    if (error) throw error;

    logTest('Database', 'Topics table exists', 'PASS', 'Topics table accessible');
  } catch (err: any) {
    logTest('Database', 'Topics table exists', 'FAIL', err.message);
  }

  // Test 1.2: Verify topic count (should be 54: Physics 14 + Chemistry 14 + Biology 13 + Math 13)
  try {
    const { count, error } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    if (count === 54) {
      logTest('Database', 'Topic count', 'PASS', `Found ${count} topics (expected 54)`);
    } else {
      logTest('Database', 'Topic count', 'FAIL', `Found ${count} topics, expected 54 (14+14+13+13)`);
    }
  } catch (err: any) {
    logTest('Database', 'Topic count', 'FAIL', err.message);
  }

  // Test 1.3: Verify subject distribution
  try {
    const { data: subjects, error } = await supabase
      .rpc('get_topic_counts_by_subject') as any;

    if (error) {
      // Fallback to manual counting
      const { data: topics } = await supabase
        .from('topics')
        .select('subject');

      const counts = topics?.reduce((acc: any, t: any) => {
        acc[t.subject] = (acc[t.subject] || 0) + 1;
        return acc;
      }, {});

      const expected = { Physics: 14, Chemistry: 14, Biology: 13, Math: 13 };
      const match = JSON.stringify(counts) === JSON.stringify(expected);

      if (match) {
        logTest('Database', 'Subject distribution', 'PASS', 'Correct topic counts per subject', counts);
      } else {
        logTest('Database', 'Subject distribution', 'FAIL', 'Incorrect distribution', { found: counts, expected });
      }
    }
  } catch (err: any) {
    logTest('Database', 'Subject distribution', 'FAIL', err.message);
  }

  // Test 1.4: Verify KCET Chemistry exclusions
  try {
    const { data: chemTopics, error } = await supabase
      .from('topics')
      .select('name, exam_weightage')
      .eq('subject', 'Chemistry')
      .order('name');

    if (error) throw error;

    const kcetTopics = chemTopics?.filter((t: any) => {
      const weightage = t.exam_weightage as any;
      return weightage.KCET > 0;
    });

    if (kcetTopics?.length === 12) {
      logTest('Database', 'KCET Chemistry filtering', 'PASS', '12/14 Chemistry topics for KCET');
    } else {
      logTest('Database', 'KCET Chemistry filtering', 'FAIL', `Found ${kcetTopics?.length} topics, expected 12`);
    }

    // Verify excluded topics
    const excluded = chemTopics?.filter((t: any) => {
      const weightage = t.exam_weightage as any;
      return weightage.KCET === 0;
    });

    const excludedNames = excluded?.map((t: any) => t.name);
    const expectedExcluded = ['Chemistry in Everyday Life', 'Surface Chemistry'];
    const correctExclusions = expectedExcluded.every(name => excludedNames?.includes(name));

    if (correctExclusions) {
      logTest('Database', 'KCET exclusions correct', 'PASS', 'Surface Chemistry & Chemistry in Everyday Life excluded', excludedNames);
    } else {
      logTest('Database', 'KCET exclusions correct', 'FAIL', 'Wrong exclusions', { found: excludedNames, expected: expectedExcluded });
    }
  } catch (err: any) {
    logTest('Database', 'KCET Chemistry filtering', 'FAIL', err.message);
  }

  // Test 1.5: Verify Biology topic count
  try {
    const { count, error } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true })
      .eq('subject', 'Biology');

    if (error) throw error;

    if (count === 13) {
      logTest('Database', 'Biology topic count', 'PASS', `Found ${count} topics (expected 13)`);
    } else {
      logTest('Database', 'Biology topic count', 'FAIL', `Found ${count} topics, expected 13`);
    }

    // Verify "Strategies for Enhancement in Food Production" exists
    const { data: foodTopic } = await supabase
      .from('topics')
      .select('name')
      .eq('subject', 'Biology')
      .eq('name', 'Strategies for Enhancement in Food Production')
      .single();

    if (foodTopic) {
      logTest('Database', 'Biology missing topic added', 'PASS', 'Food Production topic exists');
    } else {
      logTest('Database', 'Biology missing topic added', 'FAIL', 'Food Production topic not found');
    }
  } catch (err: any) {
    logTest('Database', 'Biology topic verification', 'FAIL', err.message);
  }

  // Test 1.6: Verify exam_weightage structure
  try {
    const { data: sampleTopic, error } = await supabase
      .from('topics')
      .select('name, exam_weightage')
      .limit(1)
      .single();

    if (error) throw error;

    const weightage = sampleTopic.exam_weightage as any;
    const hasAllExams = ['NEET', 'JEE', 'KCET', 'PUCII', 'CBSE'].every(exam => exam in weightage);

    if (hasAllExams) {
      logTest('Database', 'exam_weightage structure', 'PASS', 'All exam contexts present', weightage);
    } else {
      logTest('Database', 'exam_weightage structure', 'FAIL', 'Missing exam contexts', weightage);
    }
  } catch (err: any) {
    logTest('Database', 'exam_weightage structure', 'FAIL', err.message);
  }

  // Test 1.7: Verify other tables exist
  const tables = [
    'topic_resources',
    'topic_activities',
    'test_attempts',
    'test_responses',
    'subject_progress',
    'topic_question_mapping'
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error && !error.message.includes('0 rows')) {
        throw error;
      }

      logTest('Database', `Table ${table}`, 'PASS', 'Table accessible');
    } catch (err: any) {
      logTest('Database', `Table ${table}`, 'FAIL', err.message);
    }
  }
}

/**
 * TEST SUITE 2: TOPIC FILTERING & EXAM CONTEXT
 */
async function testTopicFiltering() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 2: TOPIC FILTERING & EXAM CONTEXT');
  console.log('='.repeat(80) + '\n');

  const examContexts = ['NEET', 'JEE', 'KCET', 'PUCII'];
  const subjects = ['Physics', 'Chemistry', 'Biology', 'Math'];

  // Test 2.1: Filter topics by exam context
  for (const exam of examContexts) {
    for (const subject of subjects) {
      // Skip invalid combinations
      if ((exam === 'NEET' || exam === 'KCET' || exam === 'PUCII') && subject === 'Math') continue;
      if (exam === 'JEE' && subject === 'Biology') continue;

      try {
        const { data: topics, error } = await supabase
          .from('topics')
          .select('name, exam_weightage')
          .eq('subject', subject);

        if (error) throw error;

        // Filter by exam weightage
        const filteredTopics = topics?.filter((t: any) => {
          const weightage = t.exam_weightage as any;
          return weightage[exam] > 0;
        });

        // Expected counts
        const expectedCounts: any = {
          'NEET-Physics': 14,
          'NEET-Chemistry': 14,
          'NEET-Biology': 13,
          'JEE-Physics': 14,
          'JEE-Chemistry': 14,
          'JEE-Math': 13,
          'KCET-Physics': 14,
          'KCET-Chemistry': 12,  // Excludes 2 topics
          'KCET-Biology': 13,
          'KCET-Math': 13,
          'PUCII-Physics': 14,
          'PUCII-Chemistry': 12,  // Excludes 2 topics
          'PUCII-Biology': 13,
          'PUCII-Math': 13
        };

        const key = `${exam}-${subject}`;
        const expected = expectedCounts[key];
        const found = filteredTopics?.length || 0;

        if (found === expected) {
          logTest('Filtering', `${key}`, 'PASS', `${found} topics (expected ${expected})`);
        } else {
          logTest('Filtering', `${key}`, 'FAIL', `Found ${found} topics, expected ${expected}`);
        }
      } catch (err: any) {
        logTest('Filtering', `${exam}-${subject}`, 'FAIL', err.message);
      }
    }
  }

  // Test 2.2: Verify KCET = PUC II (same topics)
  try {
    const { data: topics } = await supabase
      .from('topics')
      .select('name, exam_weightage');

    const mismatches = topics?.filter((t: any) => {
      const weightage = t.exam_weightage as any;
      return weightage.KCET !== weightage.PUCII;
    });

    if (mismatches?.length === 0) {
      logTest('Filtering', 'KCET = PUC II equivalence', 'PASS', 'All topics have matching KCET/PUCII weightage');
    } else {
      logTest('Filtering', 'KCET = PUC II equivalence', 'FAIL', `${mismatches?.length} topics have mismatched weightage`, mismatches);
    }
  } catch (err: any) {
    logTest('Filtering', 'KCET = PUC II equivalence', 'FAIL', err.message);
  }
}

/**
 * TEST SUITE 3: OFFICIAL TOPICS UTILITY
 */
async function testOfficialTopicsUtility() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 3: OFFICIAL TOPICS UTILITY');
  console.log('='.repeat(80) + '\n');

  try {
    // Dynamic import for ES module
    const { getOfficialTopics, isOfficialTopic, matchToOfficialTopic, generateTopicInstruction } = await import('../utils/officialTopics.js');

    // Test 3.1: Get official topics
    const physicsTopics = getOfficialTopics('Physics');
    if (physicsTopics.length === 14) {
      logTest('Utility', 'getOfficialTopics(Physics)', 'PASS', '14 Physics topics returned');
    } else {
      logTest('Utility', 'getOfficialTopics(Physics)', 'FAIL', `Expected 14, got ${physicsTopics.length}`);
    }

    const chemTopics = getOfficialTopics('Chemistry');
    if (chemTopics.length === 14) {
      logTest('Utility', 'getOfficialTopics(Chemistry)', 'PASS', '14 Chemistry topics returned');
    } else {
      logTest('Utility', 'getOfficialTopics(Chemistry)', 'FAIL', `Expected 14, got ${chemTopics.length}`);
    }

    // Test 3.2: Validate topic names
    const validTopic = isOfficialTopic('Electric Charges and Fields', 'Physics');
    if (validTopic) {
      logTest('Utility', 'isOfficialTopic(valid)', 'PASS', 'Correctly identified official topic');
    } else {
      logTest('Utility', 'isOfficialTopic(valid)', 'FAIL', 'Failed to identify valid topic');
    }

    const invalidTopic = isOfficialTopic('Electrostatics', 'Physics');
    if (!invalidTopic) {
      logTest('Utility', 'isOfficialTopic(invalid)', 'PASS', 'Correctly rejected informal name');
    } else {
      logTest('Utility', 'isOfficialTopic(invalid)', 'FAIL', 'Incorrectly accepted informal name');
    }

    // Test 3.3: Topic matching
    const matched = matchToOfficialTopic('Electrostatics', 'Physics');
    if (matched === 'Electric Charges and Fields') {
      logTest('Utility', 'matchToOfficialTopic', 'PASS', 'Correctly mapped "Electrostatics" → "Electric Charges and Fields"');
    } else {
      logTest('Utility', 'matchToOfficialTopic', 'FAIL', `Expected "Electric Charges and Fields", got "${matched}"`);
    }

    // Test 3.4: Generate instruction
    const instruction = generateTopicInstruction('Physics');
    const hasOfficialList = instruction.includes('Electric Charges and Fields') &&
                           instruction.includes('Current Electricity');
    const hasMappingHints = instruction.includes('Electrostatics') &&
                           instruction.includes('Common Mapping');

    if (hasOfficialList && hasMappingHints) {
      logTest('Utility', 'generateTopicInstruction', 'PASS', 'Instruction includes official list + mapping hints');
    } else {
      logTest('Utility', 'generateTopicInstruction', 'FAIL', 'Instruction missing required content');
    }
  } catch (err: any) {
    logTest('Utility', 'officialTopics module', 'FAIL', err.message);
  }
}

/**
 * TEST SUITE 4: AI EXTRACTION PROMPTS
 */
async function testExtractionPrompts() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 4: AI EXTRACTION PROMPTS');
  console.log('='.repeat(80) + '\n');

  try {
    // Test 4.1: Physics extractor
    const { generateCleanPhysicsPrompt } = await import('../utils/cleanPhysicsExtractor.js');
    const physicsPrompt = generateCleanPhysicsPrompt('Class 12');

    const hasOfficialTopics = physicsPrompt.includes('Electric Charges and Fields') &&
                             physicsPrompt.includes('Current Electricity') &&
                             physicsPrompt.includes('Ray Optics and Optical Instruments');

    const hasMappingInstructions = physicsPrompt.includes('OFFICIAL TOPIC ASSIGNMENT') &&
                                  physicsPrompt.includes('USE EXACT NAMES');

    const hasExamples = physicsPrompt.includes('Electrostatics') &&
                       physicsPrompt.includes('Electric Charges and Fields');

    if (hasOfficialTopics && hasMappingInstructions && hasExamples) {
      logTest('Prompts', 'cleanPhysicsExtractor', 'PASS', 'Prompt includes official topics, instructions, and examples');
    } else {
      const missing = [];
      if (!hasOfficialTopics) missing.push('official topics');
      if (!hasMappingInstructions) missing.push('mapping instructions');
      if (!hasExamples) missing.push('examples');
      logTest('Prompts', 'cleanPhysicsExtractor', 'FAIL', `Missing: ${missing.join(', ')}`);
    }
  } catch (err: any) {
    logTest('Prompts', 'cleanPhysicsExtractor', 'FAIL', err.message);
  }

  try {
    // Test 4.2: Math extractor
    const { generateCleanMathPrompt } = await import('../utils/cleanMathExtractor.js');
    const mathPrompt = generateCleanMathPrompt('Class 12');

    const hasOfficialTopics = mathPrompt.includes('Relations and Functions') &&
                             mathPrompt.includes('Integrals') &&
                             mathPrompt.includes('Probability');

    const hasMappingInstructions = mathPrompt.includes('OFFICIAL TOPIC ASSIGNMENT');

    if (hasOfficialTopics && hasMappingInstructions) {
      logTest('Prompts', 'cleanMathExtractor', 'PASS', 'Prompt includes official Math topics and instructions');
    } else {
      logTest('Prompts', 'cleanMathExtractor', 'FAIL', 'Missing official topics or instructions');
    }
  } catch (err: any) {
    logTest('Prompts', 'cleanMathExtractor', 'FAIL', err.message);
  }
}

/**
 * TEST SUITE 5: FRONTEND COMPONENT VERIFICATION
 */
async function testFrontendComponents() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE 5: FRONTEND COMPONENTS');
  console.log('='.repeat(80) + '\n');

  const components = [
    'components/TrajectorySelectionPage.tsx',
    'components/SubjectSelectionPage.tsx',
    'components/TopicDashboardPage.tsx',
    'components/TopicDetailPage.tsx',
    'contexts/LearningJourneyContext.tsx'
  ];

  const fs = await import('fs/promises');

  for (const component of components) {
    try {
      const path = join(__dirname, '..', component);
      await fs.access(path);
      logTest('Frontend', component, 'PASS', 'Component file exists');
    } catch {
      logTest('Frontend', component, 'FAIL', 'Component file not found');
    }
  }
}

/**
 * GENERATE TEST REPORT
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST REPORT SUMMARY');
  console.log('='.repeat(80) + '\n');

  const categories = [...new Set(results.map(r => r.category))];

  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.status === 'PASS').length;
    const failed = categoryResults.filter(r => r.status === 'FAIL').length;
    const skipped = categoryResults.filter(r => r.status === 'SKIP').length;
    const total = categoryResults.length;

    console.log(`\n📊 ${category} Tests:`);
    console.log(`   ✅ Passed: ${passed}/${total}`);
    if (failed > 0) console.log(`   ❌ Failed: ${failed}/${total}`);
    if (skipped > 0) console.log(`   ⚠️  Skipped: ${skipped}/${total}`);
  }

  const totalPassed = results.filter(r => r.status === 'PASS').length;
  const totalFailed = results.filter(r => r.status === 'FAIL').length;
  const totalTests = results.length;
  const successRate = ((totalPassed / totalTests) * 100).toFixed(1);

  console.log('\n' + '='.repeat(80));
  console.log(`OVERALL: ${totalPassed}/${totalTests} tests passed (${successRate}%)`);
  console.log('='.repeat(80) + '\n');

  if (totalFailed > 0) {
    console.log('❌ FAILED TESTS:\n');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`   [${r.category}] ${r.test}`);
        console.log(`   Reason: ${r.message}\n`);
      });
  }

  return {
    total: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    successRate: parseFloat(successRate),
    results
  };
}

/**
 * RUN ALL TESTS
 */
async function runAllTests() {
  console.log('\n');
  console.log('🧪 LEARNING JOURNEY - COMPREHENSIVE TEST SUITE');
  console.log('Testing Date:', new Date().toLocaleString());
  console.log('\n');

  try {
    await testDatabaseSchema();
    await testTopicFiltering();
    await testOfficialTopicsUtility();
    await testExtractionPrompts();
    await testFrontendComponents();

    const report = generateReport();

    // Save report to file
    const fs = await import('fs/promises');
    const reportPath = join(__dirname, '..', 'TEST_RESULTS.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed test results saved to: TEST_RESULTS.json\n`);

    // Exit with appropriate code
    process.exit(report.failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n❌ Test suite failed with error:', err);
    process.exit(1);
  }
}

// Run tests
runAllTests();
