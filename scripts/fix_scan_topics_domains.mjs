import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Topic normalization (extracted → official)
const TOPIC_FIXES = {
  '3D Geometry': 'Three Dimensional Geometry',
  'Application of Derivatives': 'Applications of Derivatives',
  'Limits and Derivatives': null, // Split into Continuity and Differentiability (need manual review)
  'Complex Numbers': null, // Not in KCET
  'Permutations and Combinations': null, // Not in KCET
  'Sequences and Series': null, // Not in KCET
  'Statistics': 'Probability', // KCET only has Probability
  'General': null // Needs manual categorization
};

// Domain normalization
const DOMAIN_FIXES = {
  'ALGEBRA': 'Algebra',
  'CALCULUS': 'Calculus',
  'VECTORS & 3D GEOMETRY': null, // Needs split: Vector Algebra or Coordinate Geometry
  'LINEAR PROGRAMMING': 'Optimization',
  'PROBABILITY': 'Statistics and Probability',
  'NO_DOMAIN': null
};

// Topic → Domain mapping (for fixing split cases)
const TOPIC_TO_DOMAIN = {
  'Vectors': 'Vector Algebra',
  'Three Dimensional Geometry': 'Coordinate Geometry',
  'Relations and Functions': 'Algebra',
  'Matrices': 'Algebra',
  'Determinants': 'Algebra',
  'Inverse Trigonometric Functions': 'Trigonometry',
  'Continuity and Differentiability': 'Calculus',
  'Applications of Derivatives': 'Calculus',
  'Integrals': 'Calculus',
  'Applications of Integrals': 'Calculus',
  'Differential Equations': 'Calculus',
  'Linear Programming': 'Optimization',
  'Probability': 'Statistics and Probability'
};

async function fixScans() {
  console.log('\n🔧 FIXING SCAN TOPICS & DOMAINS\n');
  console.log('='.repeat(70));

  // Get all Math scans
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, subject, analysis_data')
    .eq('subject', 'Math')
    .eq('status', 'Complete');

  if (!scans || scans.length === 0) {
    console.log('❌ No Math scans found');
    return;
  }

  console.log(`\n📄 Found ${scans.length} Math scans\n`);

  let totalFixed = 0;
  let totalQuestions = 0;
  let totalSkipped = 0;

  for (const scan of scans) {
    const questions = scan.analysis_data?.questions || [];
    if (questions.length === 0) continue;

    console.log(`\n📋 Processing: ${scan.name} (${questions.length} questions)`);

    let modified = false;
    let scanFixed = 0;
    let scanSkipped = 0;

    questions.forEach((q, idx) => {
      totalQuestions++;
      let changes = [];

      // Fix topic name
      if (q.topic && TOPIC_FIXES[q.topic] !== undefined) {
        const newTopic = TOPIC_FIXES[q.topic];
        if (newTopic) {
          changes.push(`topic: "${q.topic}" → "${newTopic}"`);
          q.topic = newTopic;
          modified = true;
        } else {
          changes.push(`topic: "${q.topic}" → ⚠️ NEEDS MANUAL REVIEW`);
          scanSkipped++;
          totalSkipped++;
        }
      }

      // Fix domain - handle split cases first
      if (q.domain === 'VECTORS & 3D GEOMETRY') {
        // Determine correct domain from topic
        const correctDomain = TOPIC_TO_DOMAIN[q.topic];
        if (correctDomain) {
          changes.push(`domain: "${q.domain}" → "${correctDomain}"`);
          q.domain = correctDomain;
          modified = true;
        }
      } else if (q.domain && DOMAIN_FIXES[q.domain] !== undefined) {
        const newDomain = DOMAIN_FIXES[q.domain];
        if (newDomain) {
          changes.push(`domain: "${q.domain}" → "${newDomain}"`);
          q.domain = newDomain;
          modified = true;
        } else {
          // Use topic-based domain lookup
          const correctDomain = TOPIC_TO_DOMAIN[q.topic];
          if (correctDomain) {
            changes.push(`domain: "${q.domain}" → "${correctDomain}" (via topic)`);
            q.domain = correctDomain;
            modified = true;
          }
        }
      }

      if (changes.length > 0) {
        scanFixed++;
        totalFixed++;
        console.log(`   Q${idx + 1}: ${changes.join(', ')}`);
      }
    });

    // Update scan if modified
    if (modified) {
      const { error } = await supabase
        .from('scans')
        .update({ analysis_data: scan.analysis_data })
        .eq('id', scan.id);

      if (error) {
        console.log(`   ❌ Error updating scan: ${error.message}`);
      } else {
        console.log(`   ✅ Fixed ${scanFixed} questions, ${scanSkipped} need manual review`);
      }
    } else {
      console.log(`   ✅ No fixes needed`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY:\n');
  console.log(`   Total Questions: ${totalQuestions}`);
  console.log(`   Fixed: ${totalFixed}`);
  console.log(`   Need Manual Review: ${totalSkipped}`);
  console.log('\n✅ DONE\n');

  if (totalSkipped > 0) {
    console.log('⚠️  MANUAL REVIEW NEEDED FOR:');
    console.log('   - Questions with topic "General" (no specific categorization)');
    console.log('   - Questions with "Limits and Derivatives" (split topic)');
    console.log('   - Questions with topics not in KCET syllabus');
    console.log('\n   Run show_latest_scan_structure.mjs to see details\n');
  }
}

fixScans().catch(console.error);
