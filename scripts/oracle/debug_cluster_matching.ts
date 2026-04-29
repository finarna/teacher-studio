/**
 * Debug Cluster Matching - Diagnose Why Cluster Matches Are 0%
 *
 * This script tests cluster matching with known identities to isolate the issue.
 */

import fs from 'fs';
import path from 'path';
import {
  compareAtClusterLevel,
  findClusterForIdentity,
  NEET_PHYSICS_CLUSTERS
} from '../../lib/oracle/clusterMatcher';

// Enable debug logging
process.env.CLUSTER_DEBUG = 'true';

console.log('\n🔍 CLUSTER MATCHING DIAGNOSTIC TEST');
console.log('═'.repeat(70));

// Load identity bank
const identityBankPath = path.join(
  process.cwd(),
  'lib/oracle/identities/neet_physics.json'
);
const identityBank = JSON.parse(fs.readFileSync(identityBankPath, 'utf8'));
const identities = identityBank.identities;

console.log(`\n✅ Loaded ${identities.length} identities from bank`);
console.log(`✅ Loaded ${NEET_PHYSICS_CLUSTERS.length} cluster definitions\n`);

// Test 1: Verify cluster coverage
console.log('📊 TEST 1: Cluster Coverage Analysis');
console.log('─'.repeat(70));

const allClusterIdentities = NEET_PHYSICS_CLUSTERS.flatMap(c => c.identityIds);
const bankIdentityIds = identities.map((id: any) => id.id);

console.log(`\nCluster definitions cover: ${allClusterIdentities.length} identities`);
console.log(`Identity bank contains: ${bankIdentityIds.length} identities`);

const missingFromClusters = bankIdentityIds.filter(id => !allClusterIdentities.includes(id));
const extraInClusters = allClusterIdentities.filter(id => !bankIdentityIds.includes(id));

if (missingFromClusters.length > 0) {
  console.log(`\n⚠️  Missing from clusters: ${missingFromClusters.join(', ')}`);
}
if (extraInClusters.length > 0) {
  console.log(`\n⚠️  Extra in clusters (not in bank): ${extraInClusters.join(', ')}`);
}
if (missingFromClusters.length === 0 && extraInClusters.length === 0) {
  console.log(`\n✅ Perfect coverage - all identities are in clusters`);
}

// Test 2: Test findClusterForIdentity with known IDs
console.log('\n\n📊 TEST 2: Cluster Lookup Test');
console.log('─'.repeat(70));

const sampleIdentities = [
  'ID-NP-001', 'ID-NP-002', 'ID-NP-003', 'ID-NP-005',
  'ID-NP-011', 'ID-NP-012', 'ID-NP-021'
];

for (const identityId of sampleIdentities) {
  const cluster = findClusterForIdentity(identityId);
  console.log(`\n  ${identityId}:`);
  if (cluster) {
    console.log(`    ✅ Found in: ${cluster.clusterId} (${cluster.name})`);
    console.log(`    Members: ${cluster.identityIds.join(', ')}`);
  } else {
    console.log(`    ❌ NOT FOUND in any cluster`);
  }
}

// Test 3: Test cluster matching with known pairs
console.log('\n\n📊 TEST 3: Cluster Matching Test Cases');
console.log('─'.repeat(70));

const testCases = [
  {
    name: 'Exact match (same identity)',
    gen: 'ID-NP-003',
    act: 'ID-NP-003',
    genTopic: 'ELECTROSTATICS',
    actTopic: 'ELECTROSTATICS',
    expected: 'exact'
  },
  {
    name: 'Cluster match (both in CLUSTER-ELECTROSTATICS)',
    gen: 'ID-NP-003',
    act: 'ID-NP-011',
    genTopic: 'ELECTROSTATICS',
    actTopic: 'ELECTROSTATICS',
    expected: 'cluster'
  },
  {
    name: 'Cluster match (both in CLUSTER-OPTICS-WAVE)',
    gen: 'ID-NP-012',
    act: 'ID-NP-029',
    genTopic: 'OPTICS',
    actTopic: 'OPTICS',
    expected: 'cluster'
  },
  {
    name: 'Topic match (same topic, different clusters)',
    gen: 'ID-NP-003',  // CLUSTER-ELECTROSTATICS
    act: 'ID-NP-002',  // CLUSTER-CURRENT (different cluster)
    genTopic: 'CURRENT ELECTRICITY',
    actTopic: 'CURRENT ELECTRICITY',
    expected: 'topic'
  },
  {
    name: 'No match (different topic, different cluster)',
    gen: 'ID-NP-003',  // Electrostatics
    act: 'ID-NP-021',  // Atoms & Nuclei
    genTopic: 'ELECTROSTATICS',
    actTopic: 'ATOMS AND NUCLEI',
    expected: 'none'
  }
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`\n\n  Test: ${testCase.name}`);
  console.log(`  Expected: ${testCase.expected}`);

  const result = compareAtClusterLevel(
    testCase.gen,
    testCase.act,
    testCase.genTopic,
    testCase.actTopic
  );

  const success = result.matchType === testCase.expected;
  console.log(`  Actual: ${result.matchType} (confidence: ${result.confidence})`);
  console.log(`  ${success ? '✅ PASS' : '❌ FAIL'}`);

  if (success) {
    passed++;
  } else {
    failed++;
    console.log(`  ⚠️  Expected "${testCase.expected}" but got "${result.matchType}"`);
  }
}

console.log(`\n\n${'═'.repeat(70)}`);
console.log(`Test Results: ${passed}/${testCases.length} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n✅ All tests PASSED - Cluster matching logic is working correctly!');
  console.log('   The issue must be in how identities are assigned to generated questions.');
} else {
  console.log('\n❌ Some tests FAILED - Cluster matching logic needs fixing.');
}

// Test 4: Analyze why topic matches might not work
console.log('\n\n📊 TEST 4: Topic Matching Analysis');
console.log('─'.repeat(70));

const topicTests = [
  { gen: 'ELECTROSTATICS', act: 'ELECTROSTATICS' },
  { gen: 'Electrostatics', act: 'ELECTROSTATICS' },
  { gen: 'OPTICS', act: 'Optics' },
  { gen: 'Current Electricity', act: 'CURRENT ELECTRICITY' }
];

console.log('\nTesting topic string comparisons:');
for (const test of topicTests) {
  const match = test.gen === test.act;
  console.log(`\n  "${test.gen}" === "${test.act}"`);
  console.log(`  Result: ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
}

console.log('\n\n💡 Recommendation:');
console.log('   Topic matching may be case-sensitive or have formatting differences.');
console.log('   Consider normalizing topics (uppercase, trim whitespace) for comparison.');

console.log('\n✅ Diagnostic complete\n');
