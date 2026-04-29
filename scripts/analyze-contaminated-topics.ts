/**
 * Analyze Contaminated Topics in NEET Physics
 *
 * This script examines the questions with Chemistry/Biology contamination
 * to understand how they ended up in the Physics dataset.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const CONTAMINATED_TOPICS = [
  'Animal Kingdom',
  'Chemical Bonding and Molecular Structure',
  'Chemical Equilibrium',
  'Photosynthesis in Higher Plants',
  'Plant Growth and Development',
  'Structural Organisation in Animals',
  'Alcohols Phenols and Ethers',
  'Aldehydes, Ketones and Carboxylic Acids',
  'Biomolecules',
  'Digestion and Absorption',
  'Excretory Products and their Elimination',
  'Haloalkanes and Haloarenes',
  'Hydrogen',
  'Some Basic Concepts of Chemistry',
  'States of Matter',
  'The d-and f-Block Elements',
  'd and f Block Elements'
];

async function analyzeContaminatedTopics() {
  console.log('='.repeat(80));
  console.log('ANALYZING CONTAMINATED TOPICS IN NEET PHYSICS');
  console.log('='.repeat(80));
  console.log();

  for (const topic of CONTAMINATED_TOPICS) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Topic: ${topic}`);
    console.log('='.repeat(80));

    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_context', 'NEET')
      .eq('subject', 'Physics')
      .eq('topic', topic)
      .limit(5);

    if (error) {
      console.error(`❌ Error querying topic "${topic}":`, error);
      continue;
    }

    console.log(`Found ${questions?.length || 0} questions\n`);

    questions?.forEach((q, idx) => {
      console.log(`Question ${idx + 1}:`);
      console.log(`  ID: ${q.id}`);
      console.log(`  Text: ${q.text?.substring(0, 150)}${q.text?.length > 150 ? '...' : ''}`);
      console.log(`  Subject: ${q.subject}`);
      console.log(`  Topic: ${q.topic}`);
      console.log(`  Exam Context: ${q.exam_context}`);
      console.log(`  Year: ${q.year || 'N/A'}`);
      console.log(`  Scan ID: ${q.scan_id || 'N/A'}`);
      console.log(`  Source: ${q.source || 'N/A'}`);
      console.log(`  Metadata: ${JSON.stringify(q.metadata || {})}`);
      console.log();
    });
  }

  // Summary of contamination
  console.log('\n' + '='.repeat(80));
  console.log('CONTAMINATION SUMMARY');
  console.log('='.repeat(80));

  const { data: allContaminated } = await supabase
    .from('questions')
    .select('id, topic, subject, exam_context')
    .eq('exam_context', 'NEET')
    .eq('subject', 'Physics')
    .in('topic', CONTAMINATED_TOPICS);

  const topicCounts: Record<string, number> = {};
  allContaminated?.forEach(q => {
    topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
  });

  console.log(`\nTotal contaminated questions: ${allContaminated?.length || 0}\n`);
  console.log('Breakdown by topic:');
  Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([topic, count]) => {
      const type = topic.toLowerCase().includes('chemical') ||
                   topic.toLowerCase().includes('alcohol') ||
                   topic.toLowerCase().includes('aldehyde') ||
                   topic.toLowerCase().includes('halo') ||
                   topic.toLowerCase().includes('hydrogen') ||
                   topic.toLowerCase().includes('block') ||
                   topic.toLowerCase().includes('chemistry') ||
                   topic.toLowerCase().includes('states of matter')
                   ? 'CHEMISTRY' : 'BIOLOGY';
      console.log(`  ${topic.padEnd(50, ' ')} ${count.toString().padStart(3, ' ')} [${type}]`);
    });

  // Check if these questions have the correct subject in other tables
  console.log('\n' + '='.repeat(80));
  console.log('CROSS-REFERENCE CHECK');
  console.log('='.repeat(80));

  const sampleIds = allContaminated?.slice(0, 10).map(q => q.id) || [];

  for (const id of sampleIds) {
    const { data: q } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    console.log(`\nQuestion ID: ${id}`);
    console.log(`  Current subject in DB: ${q?.subject}`);
    console.log(`  Current topic: ${q?.topic}`);
    console.log(`  Expected subject based on topic: ${
      q?.topic?.toLowerCase().includes('chemical') ||
      q?.topic?.toLowerCase().includes('alcohol') ||
      q?.topic?.toLowerCase().includes('aldehyde') ||
      q?.topic?.toLowerCase().includes('halo') ||
      q?.topic?.toLowerCase().includes('hydrogen') ||
      q?.topic?.toLowerCase().includes('block') ||
      q?.topic?.toLowerCase().includes('chemistry') ||
      q?.topic?.toLowerCase().includes('states of matter') ? 'Chemistry' :
      q?.topic?.toLowerCase().includes('animal') ||
      q?.topic?.toLowerCase().includes('plant') ||
      q?.topic?.toLowerCase().includes('photosynthesis') ||
      q?.topic?.toLowerCase().includes('digestion') ||
      q?.topic?.toLowerCase().includes('excretory') ||
      q?.topic?.toLowerCase().includes('biomolecule') ? 'Biology' : 'Unknown'
    }`);
  }

  console.log('\n' + '='.repeat(80));
}

analyzeContaminatedTopics()
  .then(() => {
    console.log('\n✅ Analysis complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
