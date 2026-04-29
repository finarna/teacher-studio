/**
 * Quick test to verify identity ID normalization
 */

import {
  compareAtClusterLevel,
  findClusterForIdentity,
  getClusterStats
} from '../../lib/oracle/clusterMatcher';

console.log('Testing Identity ID Normalization\n');
console.log('='.repeat(60));

// Test normalization with different ID formats
const testCases = [
  {
    name: 'IDNP028 format (concatenated)',
    genId: 'IDNP028',
    actId: 'ID-NP-020',
    expected: 'Should find clusters for both IDs'
  },
  {
    name: 'Both hyphenated format',
    genId: 'ID-NP-028',
    actId: 'ID-NP-020',
    expected: 'Should find clusters for both IDs'
  },
  {
    name: 'Mixed formats - should still match if same ID',
    genId: 'IDNP008',
    actId: 'ID-NP-008',
    expected: 'Should be EXACT match after normalization'
  },
  {
    name: 'Same cluster - Mechanics',
    genId: 'IDNP028', // Circular Motion
    actId: 'ID-NP-020', // Collisions
    expected: 'Should be CLUSTER match (both in CLUSTER-MECHANICS)'
  },
  {
    name: 'Same cluster - Electricity',
    genId: 'IDNP002', // Current
    actId: 'ID-NP-011', // Electrostatics
    expected: 'Should be CLUSTER match (both in CLUSTER-ELECTRICITY)'
  }
];

console.log('\n📊 Test Results:\n');

testCases.forEach((test, idx) => {
  console.log(`Test ${idx + 1}: ${test.name}`);
  console.log(`  Generated ID: ${test.genId}`);
  console.log(`  Actual ID: ${test.actId}`);

  const genCluster = findClusterForIdentity(test.genId);
  const actCluster = findClusterForIdentity(test.actId);

  console.log(`  Gen Cluster: ${genCluster?.clusterId || 'NOT FOUND'}`);
  console.log(`  Act Cluster: ${actCluster?.clusterId || 'NOT FOUND'}`);

  const result = compareAtClusterLevel(
    test.genId,
    test.actId,
    undefined,
    undefined
  );

  console.log(`  Match Type: ${result.matchType.toUpperCase()}`);
  console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`  Expected: ${test.expected}`);

  if (result.matchType !== 'none') {
    console.log('  ✅ PASS - Match found');
  } else {
    console.log('  ❌ FAIL - No match');
  }

  console.log('');
});

// Show cluster statistics
const stats = getClusterStats();
console.log('\n📈 Cluster Statistics:');
console.log(`  Total Clusters: ${stats.totalClusters}`);
console.log(`  Total Identities: ${stats.totalIdentities}`);
console.log(`  Avg Identities/Cluster: ${stats.avgIdentitiesPerCluster}`);
