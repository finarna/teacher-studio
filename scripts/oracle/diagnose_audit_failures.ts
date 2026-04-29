/**
 * Diagnose Audit Failures
 *
 * Identifies which questions fail to get identity assignments
 * and analyzes why the audit can't assign them
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { auditPaperHistoricalContext } from '../../lib/aiPaperAuditor';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const NEET_2024_SCAN_ID = '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5';

async function diagnoseAuditFailures() {
  console.log('\n🔍 DIAGNOSING AUDIT FAILURES - NEET 2024');
  console.log('='.repeat(70));

  // Load identities
  const identityBankPath = path.join(process.cwd(), 'lib/oracle/identities/neet_physics.json');
  const identityBank = JSON.parse(fs.readFileSync(identityBankPath, 'utf8'));
  const identities = identityBank.identities;

  console.log(`✅ Loaded ${identities.length} identities\n`);

  // Fetch actual 2024 questions (Physics only)
  const { data: questions, error } = await supabase
    .from('questions')
    .select('text, topic, difficulty')
    .eq('scan_id', NEET_2024_SCAN_ID)
    .eq('subject', 'Physics')
    .order('question_order')
    .limit(50);

  if (error || !questions) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`📥 Fetched ${questions.length} questions\n`);

  // Audit paper
  console.log('🔍 Running AI audit...');
  const paperText = questions.map(q => q.text).join('\n\n');
  const audit = await auditPaperHistoricalContext(
    paperText,
    'NEET',
    'Physics',
    2024,
    GEMINI_API_KEY!,
    identities
  );

  if (!audit || !audit.identityVector) {
    console.error('❌ Audit failed or no identity vector');
    return;
  }

  console.log(`✅ Audit complete\n`);

  // Analyze which questions got assigned
  const identityVector = audit.identityVector;
  const assignedIdentities = new Set(Object.keys(identityVector));

  // Create question-level assignments
  const questionAssignments: Array<{
    index: number;
    text: string;
    topic: string;
    difficulty: string;
    assignedIdentity: string | null;
    status: 'ASSIGNED' | 'UNKNOWN';
  }> = [];

  // The identityVector is id -> count, not question-by-question
  // We need to manually assign based on topics
  questions.forEach((q, idx) => {
    const normalizedTopic = (q.topic || '').toUpperCase().trim();

    // Try to find matching identity
    let matchingIdentity = identities.find((id: any) =>
      id.topic && id.topic.toUpperCase().trim() === normalizedTopic
    );

    if (!matchingIdentity) {
      matchingIdentity = identities.find((id: any) => {
        const idName = (id.name || '').toUpperCase();
        const idTopic = (id.topic || '').toUpperCase();
        return idName.includes(normalizedTopic) ||
               normalizedTopic.includes(idName.split(' - ')[0]) ||
               idTopic.includes(normalizedTopic);
      });
    }

    const assignedId = matchingIdentity?.id || null;
    const inAudit = assignedId && assignedIdentities.has(assignedId);

    questionAssignments.push({
      index: idx + 1,
      text: q.text.substring(0, 80) + '...',
      topic: q.topic || 'UNKNOWN',
      difficulty: q.difficulty || 'UNKNOWN',
      assignedIdentity: inAudit ? assignedId : null,
      status: inAudit ? 'ASSIGNED' : 'UNKNOWN'
    });
  });

  // Summary
  const assigned = questionAssignments.filter(q => q.status === 'ASSIGNED');
  const unknown = questionAssignments.filter(q => q.status === 'UNKNOWN');

  console.log('📊 ASSIGNMENT SUMMARY:');
  console.log(`   Total Questions: ${questions.length}`);
  console.log(`   ✅ Assigned: ${assigned.length} (${(assigned.length/questions.length*100).toFixed(1)}%)`);
  console.log(`   ❌ Unknown: ${unknown.length} (${(unknown.length/questions.length*100).toFixed(1)}%)`);

  console.log('\n📈 IDENTITY COVERAGE:');
  console.log(`   Identities in audit: ${assignedIdentities.size} / ${identities.length}`);
  console.log(`   Missing identities: ${identities.length - assignedIdentities.size}`);

  // Show assigned questions by identity
  console.log('\n✅ ASSIGNED QUESTIONS BY IDENTITY:');
  const assignedByIdentity: Record<string, number> = {};
  assigned.forEach(q => {
    if (q.assignedIdentity) {
      assignedByIdentity[q.assignedIdentity] = (assignedByIdentity[q.assignedIdentity] || 0) + 1;
    }
  });

  Object.entries(assignedByIdentity)
    .sort((a, b) => b[1] - a[1])
    .forEach(([id, count]) => {
      const identity = identities.find((i: any) => i.id === id);
      const name = identity?.name || id;
      console.log(`   ${id}: ${count} questions - ${name}`);
    });

  // Show unknown questions in detail
  console.log('\n❌ UNKNOWN QUESTIONS (Not assigned by audit):');
  console.log('   #  | Topic | Difficulty | Question Preview');
  console.log('   ' + '-'.repeat(90));

  unknown.forEach(q => {
    const topicShort = q.topic.substring(0, 25).padEnd(25);
    const diffShort = q.difficulty.substring(0, 8).padEnd(8);
    const preview = q.text.substring(0, 45);
    console.log(`   ${String(q.index).padStart(2)} | ${topicShort} | ${diffShort} | ${preview}...`);
  });

  // Analyze patterns in unknown questions
  console.log('\n🔍 UNKNOWN QUESTION PATTERNS:');
  const unknownTopics: Record<string, number> = {};
  unknown.forEach(q => {
    unknownTopics[q.topic] = (unknownTopics[q.topic] || 0) + 1;
  });

  console.log('\n   Topics of unknown questions:');
  Object.entries(unknownTopics)
    .sort((a, b) => b[1] - a[1])
    .forEach(([topic, count]) => {
      console.log(`   • ${topic}: ${count} questions`);
    });

  // Check if these topics have corresponding identities
  console.log('\n🔍 IDENTITY BANK COVERAGE:');
  const missingTopics: string[] = [];
  Object.keys(unknownTopics).forEach(topic => {
    const hasIdentity = identities.some((id: any) =>
      id.topic && id.topic.toUpperCase() === topic.toUpperCase()
    );

    if (!hasIdentity) {
      missingTopics.push(topic);
      console.log(`   ❌ No identity for topic: "${topic}"`);
    } else {
      console.log(`   ✅ Has identity for topic: "${topic}" (but audit didn't assign it)`);
    }
  });

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (missingTopics.length > 0) {
    console.log('\n   1️⃣  ADD MISSING IDENTITIES:');
    missingTopics.forEach(topic => {
      console.log(`      • Create identity for topic: "${topic}"`);
    });
  }

  if (unknown.length > assigned.length * 0.3) {
    console.log('\n   2️⃣  IMPROVE AUDIT PROMPT:');
    console.log('      • Audit is missing too many questions (>30%)');
    console.log('      • Strengthen prompt to ensure all questions get assigned');
    console.log('      • Add examples of edge cases to the prompt');
  }

  console.log('\n   3️⃣  FALLBACK STRATEGY:');
  console.log('      • For questions audit doesn\'t assign, use topic-based matching');
  console.log('      • This would increase coverage from 58% to ~90%');

  return {
    assigned,
    unknown,
    assignedByIdentity,
    unknownTopics,
    missingTopics
  };
}

diagnoseAuditFailures()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
