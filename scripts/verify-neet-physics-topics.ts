/**
 * Verify NEET Physics Syllabus Topics in Database
 *
 * This script queries the database to:
 * 1. Get all unique topic values from questions where exam_context='NEET' and subject='Physics'
 * 2. Compare with official NCERT Class 11 & 12 Physics chapter names
 * 3. Identify any non-NCERT topics or contamination from other subjects
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Official NCERT Physics Chapters (Class 11 & 12)
const OFFICIAL_NCERT_PHYSICS_TOPICS = {
  class11: [
    "Physical World",
    "Units and Measurements",
    "Motion in a Straight Line",
    "Motion in a Plane",
    "Laws of Motion",
    "Work, Energy and Power",
    "System of Particles and Rotational Motion",
    "Gravitation",
    "Mechanical Properties of Solids",
    "Mechanical Properties of Fluids",
    "Thermal Properties of Matter",
    "Thermodynamics",
    "Kinetic Theory",
    "Oscillations",
    "Waves"
  ],
  class12: [
    "Electric Charges and Fields",
    "Electrostatic Potential and Capacitance",
    "Current Electricity",
    "Moving Charges and Magnetism",
    "Magnetism and Matter",
    "Electromagnetic Induction",
    "Alternating Current",
    "Electromagnetic Waves",
    "Ray Optics and Optical Instruments",
    "Wave Optics",
    "Dual Nature of Radiation and Matter",
    "Atoms",
    "Nuclei",
    "Semiconductor Electronics: Materials, Devices and Simple Circuits"
  ]
};

const ALL_NCERT_TOPICS = [
  ...OFFICIAL_NCERT_PHYSICS_TOPICS.class11,
  ...OFFICIAL_NCERT_PHYSICS_TOPICS.class12
];

async function verifyNEETPhysicsTopics() {
  console.log('='.repeat(80));
  console.log('NEET PHYSICS SYLLABUS VERIFICATION');
  console.log('='.repeat(80));
  console.log();

  // Query 1: Get all unique topics from NEET Physics questions
  console.log('📊 Querying database for NEET Physics topics...');
  const { data: questions, error } = await supabase
    .from('questions')
    .select('topic, subject, exam_context, id')
    .eq('exam_context', 'NEET')
    .eq('subject', 'Physics');

  if (error) {
    console.error('❌ Error querying database:', error);
    return;
  }

  console.log(`✅ Found ${questions?.length || 0} NEET Physics questions\n`);

  // Extract unique topics
  const uniqueTopics = [...new Set(questions?.map(q => q.topic).filter(Boolean))].sort();

  console.log('📋 UNIQUE TOPICS IN DATABASE:');
  console.log('─'.repeat(80));
  uniqueTopics.forEach((topic, idx) => {
    console.log(`${(idx + 1).toString().padStart(3, ' ')}. ${topic}`);
  });
  console.log();

  // Categorize topics
  const ncertMatches: string[] = [];
  const nonNcertTopics: string[] = [];
  const suspiciousTopics: string[] = [];

  // Common Chemistry/Biology keywords to detect contamination
  const chemistryKeywords = ['chemical', 'compound', 'solution', 'reaction', 'organic', 'inorganic', 'coordination'];
  const biologyKeywords = ['cell', 'organism', 'evolution', 'ecology', 'genetics', 'biotechnology', 'plant', 'animal'];

  uniqueTopics.forEach(topic => {
    const topicLower = topic.toLowerCase();

    // Check for Chemistry contamination
    if (chemistryKeywords.some(keyword => topicLower.includes(keyword))) {
      suspiciousTopics.push(`${topic} [CHEMISTRY CONTAMINATION]`);
      return;
    }

    // Check for Biology contamination
    if (biologyKeywords.some(keyword => topicLower.includes(keyword))) {
      suspiciousTopics.push(`${topic} [BIOLOGY CONTAMINATION]`);
      return;
    }

    // Check if it matches NCERT topics
    if (ALL_NCERT_TOPICS.includes(topic)) {
      ncertMatches.push(topic);
    } else {
      nonNcertTopics.push(topic);
    }
  });

  // Report NCERT matches
  console.log('✅ TOPICS MATCHING NCERT SYLLABUS:');
  console.log('─'.repeat(80));
  console.log(`Found ${ncertMatches.length} out of ${ALL_NCERT_TOPICS.length} NCERT topics in database\n`);

  ncertMatches.forEach((topic, idx) => {
    const class11 = OFFICIAL_NCERT_PHYSICS_TOPICS.class11.includes(topic);
    console.log(`${(idx + 1).toString().padStart(3, ' ')}. ${topic} [Class ${class11 ? '11' : '12'}]`);
  });
  console.log();

  // Report missing NCERT topics
  const missingTopics = ALL_NCERT_TOPICS.filter(t => !ncertMatches.includes(t));
  if (missingTopics.length > 0) {
    console.log('⚠️  MISSING NCERT TOPICS (Not found in database):');
    console.log('─'.repeat(80));
    missingTopics.forEach((topic, idx) => {
      const class11 = OFFICIAL_NCERT_PHYSICS_TOPICS.class11.includes(topic);
      console.log(`${(idx + 1).toString().padStart(3, ' ')}. ${topic} [Class ${class11 ? '11' : '12'}]`);
    });
    console.log();
  }

  // Report non-NCERT topics
  if (nonNcertTopics.length > 0) {
    console.log('⚠️  NON-NCERT TOPICS (Not in official syllabus):');
    console.log('─'.repeat(80));
    nonNcertTopics.forEach((topic, idx) => {
      console.log(`${(idx + 1).toString().padStart(3, ' ')}. ${topic}`);
    });
    console.log();
  }

  // Report suspicious topics (contamination)
  if (suspiciousTopics.length > 0) {
    console.log('🚨 SUSPICIOUS TOPICS (Possible Chemistry/Biology Contamination):');
    console.log('─'.repeat(80));
    suspiciousTopics.forEach((topic, idx) => {
      console.log(`${(idx + 1).toString().padStart(3, ' ')}. ${topic}`);
    });
    console.log();

    // Get sample questions for suspicious topics
    console.log('📝 SAMPLE QUESTIONS FROM SUSPICIOUS TOPICS:');
    console.log('─'.repeat(80));
    for (const suspiciousTopic of suspiciousTopics) {
      const cleanTopic = suspiciousTopic.split('[')[0].trim();
      const sampleQuestions = questions?.filter(q => q.topic === cleanTopic).slice(0, 3);

      console.log(`\n🔍 Topic: ${suspiciousTopic}`);
      sampleQuestions?.forEach((q, idx) => {
        console.log(`   ${idx + 1}. Question ID: ${q.id}`);
      });
    }
    console.log();
  }

  // Summary statistics
  console.log('='.repeat(80));
  console.log('SUMMARY STATISTICS');
  console.log('='.repeat(80));
  console.log(`Total NEET Physics Questions: ${questions?.length || 0}`);
  console.log(`Unique Topics Found: ${uniqueTopics.length}`);
  console.log(`NCERT Matches: ${ncertMatches.length} / ${ALL_NCERT_TOPICS.length} (${((ncertMatches.length / ALL_NCERT_TOPICS.length) * 100).toFixed(1)}%)`);
  console.log(`Non-NCERT Topics: ${nonNcertTopics.length}`);
  console.log(`Suspicious Topics (Contamination): ${suspiciousTopics.length}`);
  console.log('='.repeat(80));

  // Distribution by topic
  console.log('\n📊 QUESTION DISTRIBUTION BY TOPIC:');
  console.log('─'.repeat(80));
  const topicCounts: Record<string, number> = {};
  questions?.forEach(q => {
    if (q.topic) {
      topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
    }
  });

  const sortedTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20); // Top 20

  sortedTopics.forEach(([topic, count], idx) => {
    const percentage = ((count / (questions?.length || 1)) * 100).toFixed(1);
    const isNCERT = ALL_NCERT_TOPICS.includes(topic) ? '✓' : '✗';
    console.log(`${(idx + 1).toString().padStart(3, ' ')}. [${isNCERT}] ${topic.padEnd(50, ' ')} ${count.toString().padStart(4, ' ')} (${percentage}%)`);
  });
  console.log();

  // Verification result
  console.log('='.repeat(80));
  if (suspiciousTopics.length === 0 && nonNcertTopics.length === 0) {
    console.log('✅ VERIFICATION PASSED: All topics match NCERT syllabus');
  } else {
    console.log('⚠️  VERIFICATION FAILED: Found issues with topic mapping');
    console.log(`   - ${suspiciousTopics.length} topics show contamination from other subjects`);
    console.log(`   - ${nonNcertTopics.length} topics don't match NCERT chapter names`);
  }
  console.log('='.repeat(80));
}

verifyNEETPhysicsTopics()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
