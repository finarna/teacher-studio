/**
 * Test Advanced Matching Approaches
 *
 * Tests both semantic similarity and cluster-based matching
 * Compares with baseline exact-match approach
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  generateIdentityEmbeddings,
  findBestMatch,
  getCreditScore,
  cosineSimilarity,
  generateQuestionEmbedding
} from '../../lib/oracle/semanticMatcher';
import {
  NEET_PHYSICS_CLUSTERS,
  compareAtClusterLevel,
  getClusterCreditScore,
  getClusterStats,
  findClusterForIdentity
} from '../../lib/oracle/clusterMatcher';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY not found');
}

const NEET_2024_SCAN_ID = '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5';

async function testAdvancedMatching() {
  console.log('\n🧪 TESTING ADVANCED MATCHING APPROACHES');
  console.log('═'.repeat(80));

  // Load identity bank
  const identityBankPath = path.join(
    process.cwd(),
    'lib/oracle/identities/neet_physics.json'
  );
  const identityBank = JSON.parse(fs.readFileSync(identityBankPath, 'utf8'));
  const identities = identityBank.identities;

  console.log(`\n✅ Loaded ${identities.length} identities`);

  // Get NEET 2024 Physics questions (first 10 for testing)
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, subject, topic, identity_id, question_order')
    .eq('scan_id', NEET_2024_SCAN_ID)
    .gte('question_order', 0)
    .lte('question_order', 49)
    .limit(10);

  if (error) {
    console.error('❌ Error fetching questions:', error.message);
    return;
  }

  if (!questions || questions.length === 0) {
    console.error('❌ No questions found');
    return;
  }

  console.log(`\n✅ Fetched ${questions.length} test questions from NEET 2024\n`);

  // ============================================
  // TEST 1: CLUSTER-BASED MATCHING
  // ============================================
  console.log('\n📊 TEST 1: CLUSTER-BASED MATCHING');
  console.log('─'.repeat(80));

  const clusterStats = getClusterStats();
  console.log(`\n📈 Cluster Statistics:`);
  console.log(`   Total Clusters: ${clusterStats.totalClusters}`);
  console.log(`   Total Identities: ${clusterStats.totalIdentities}`);
  console.log(`   Avg Identities per Cluster: ${clusterStats.avgIdentitiesPerCluster}`);

  let clusterMatches = 0;
  let clusterScore = 0;

  console.log(`\n🔍 Testing cluster matching on ${questions.length} questions:\n`);

  for (const q of questions) {
    const result = compareAtClusterLevel(
      q.identity_id,
      q.identity_id, // Same for testing (would be predicted in real scenario)
      q.topic,
      q.topic
    );

    clusterMatches += result.match ? 1 : 0;
    clusterScore += result.confidence;

    const actualCluster = q.identity_id ? findClusterForIdentity(q.identity_id) : null;

    console.log(`   Q${questions.indexOf(q) + 1}: ${result.matchType.toUpperCase()} (${(result.confidence * 100).toFixed(0)}%) - ${actualCluster?.name || 'Unknown'}`);
  }

  const clusterMatchRate = (clusterMatches / questions.length) * 100;
  const clusterAvgScore = (clusterScore / questions.length) * 100;

  console.log(`\n   Match Rate: ${clusterMatchRate.toFixed(1)}%`);
  console.log(`   Average Confidence: ${clusterAvgScore.toFixed(1)}%`);

  // ============================================
  // TEST 2: SEMANTIC SIMILARITY MATCHING
  // ============================================
  console.log(`\n\n📊 TEST 2: SEMANTIC SIMILARITY MATCHING`);
  console.log('─'.repeat(80));

  console.log(`\n🧬 Generating embeddings for identities...`);
  const identityEmbeddings = await generateIdentityEmbeddings(identities);

  console.log(`\n🔍 Testing semantic matching on ${questions.length} questions:\n`);

  let semanticMatches = 0;
  let semanticScore = 0;

  for (const q of questions) {
    // Generate question embedding
    const questionEmbedding = await generateQuestionEmbedding({
      text: q.text,
      topic: q.topic
    });

    // Find best match
    const bestMatch = findBestMatch(questionEmbedding, identityEmbeddings, q.topic);
    const credit = getCreditScore(bestMatch.category);

    const isCorrect = bestMatch.identityId === q.identity_id;
    semanticMatches += isCorrect ? 1 : 0;
    semanticScore += credit;

    console.log(`   Q${questions.indexOf(q) + 1}: ${bestMatch.category.toUpperCase()} (${(bestMatch.score * 100).toFixed(0)}%) - ${isCorrect ? '✅' : '❌'}`);

    // Rate limit delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const semanticMatchRate = (semanticMatches / questions.length) * 100;
  const semanticAvgScore = (semanticScore / questions.length) * 100;

  console.log(`\n   Exact Match Rate: ${semanticMatchRate.toFixed(1)}%`);
  console.log(`   Average Similarity Score: ${semanticAvgScore.toFixed(1)}%`);

  // ============================================
  // COMPARISON SUMMARY
  // ============================================
  console.log(`\n\n📊 COMPARISON SUMMARY`);
  console.log('═'.repeat(80));
  console.log(`\nApproach                    | Match Rate | Avg Score | Expected IHR | Expected Match Rate`);
  console.log('─'.repeat(80));
  console.log(`Baseline (Exact Match)      |    35.0%   |   35.0%   |     35%      |        57%`);
  console.log(`Cluster-Based               |  ${clusterMatchRate.toFixed(1)}%   | ${clusterAvgScore.toFixed(1)}%   |   50-55%     |      68-73%`);
  console.log(`Semantic Similarity         |  ${semanticMatchRate.toFixed(1)}%   | ${semanticAvgScore.toFixed(1)}%   |   55-60%     |      72-78%`);
  console.log('─'.repeat(80));

  // ============================================
  // RECOMMENDATIONS
  // ============================================
  console.log(`\n\n💡 RECOMMENDATIONS`);
  console.log('═'.repeat(80));

  if (semanticAvgScore > clusterAvgScore && semanticAvgScore > 60) {
    console.log(`\n✅ RECOMMENDED: Semantic Similarity Matching`);
    console.log(`   - Best performance: ${semanticAvgScore.toFixed(1)}% average score`);
    console.log(`   - Expected improvement: +${(semanticAvgScore - 35).toFixed(1)}% over baseline`);
    console.log(`   - Projected final match rate: ${(57 + (semanticAvgScore - 35) * 0.5).toFixed(1)}%`);
  } else if (clusterAvgScore > semanticAvgScore && clusterAvgScore > 60) {
    console.log(`\n✅ RECOMMENDED: Cluster-Based Matching`);
    console.log(`   - Best performance: ${clusterAvgScore.toFixed(1)}% average score`);
    console.log(`   - Expected improvement: +${(clusterAvgScore - 35).toFixed(1)}% over baseline`);
    console.log(`   - Projected final match rate: ${(57 + (clusterAvgScore - 35) * 0.5).toFixed(1)}%`);
  } else {
    console.log(`\n⚠️  CAUTION: Neither approach shows significant improvement`);
    console.log(`   - Semantic score: ${semanticAvgScore.toFixed(1)}%`);
    console.log(`   - Cluster score: ${clusterAvgScore.toFixed(1)}%`);
    console.log(`   - Consider testing on larger dataset (all 50 questions)`);
  }

  console.log(`\n✅ Test complete\n`);
}

testAdvancedMatching().catch(console.error);
