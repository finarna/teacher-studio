/**
 * Check all available NEET data across all subjects
 * Directly queries questions table to find actual data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Known NEET scan IDs
const KNOWN_SCANS = {
  2023: 'e3767338-1664-4e03-b0f6-1fab41ff5838',
  2024: '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5',
  2025: '4f682118-d0ce-4f6f-95c7-6141e496579f',
};

async function checkAllNEETData() {
  console.log('\n📊 CHECKING ALL NEET DATA ACROSS SUBJECTS\n');
  console.log('='.repeat(70));

  const results: Record<string, any> = {};

  for (const [year, scanId] of Object.entries(KNOWN_SCANS)) {
    console.log(`\n📅 NEET ${year} (${scanId.substring(0, 8)}...)`);
    console.log('-'.repeat(70));

    // Get all questions for this scan grouped by subject
    const { data: questions, error } = await supabase
      .from('questions')
      .select('subject, topic, difficulty')
      .eq('scan_id', scanId);

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      continue;
    }

    if (!questions || questions.length === 0) {
      console.log('   ⚠️  No questions found');
      continue;
    }

    // Group by subject
    const bySubject: Record<string, any[]> = {};
    questions.forEach(q => {
      const subject = q.subject || 'Unknown';
      if (!bySubject[subject]) {
        bySubject[subject] = [];
      }
      bySubject[subject].push(q);
    });

    // Display results
    for (const [subject, subjectQuestions] of Object.entries(bySubject)) {
      const topics = new Set(subjectQuestions.map(q => q.topic).filter(Boolean));
      console.log(`   ${subject}: ${subjectQuestions.length} questions, ${topics.size} unique topics`);

      if (!results[subject]) {
        results[subject] = {};
      }
      results[subject][year] = {
        count: subjectQuestions.length,
        topics: Array.from(topics),
        scanId
      };
    }
  }

  // Summary
  console.log('\n📈 OVERALL SUMMARY:');
  console.log('='.repeat(70));

  for (const [subject, yearData] of Object.entries(results)) {
    const years = Object.keys(yearData).sort();
    const totalQuestions = Object.values(yearData).reduce((sum: number, y: any) => sum + y.count, 0);
    console.log(`\n${subject}:`);
    console.log(`   Years: ${years.join(', ')}`);
    console.log(`   Total: ${totalQuestions} questions across ${years.length} years`);

    years.forEach(year => {
      const data = yearData[year];
      console.log(`      ${year}: ${data.count} questions, ${data.topics.length} topics`);
    });
  }

  return results;
}

checkAllNEETData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
