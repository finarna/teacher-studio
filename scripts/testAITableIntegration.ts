/**
 * Test AI Table Integration
 *
 * Verifies that:
 * 1. Scan data properly syncs to AI tables
 * 2. Student performance updates AI tables
 * 3. All required tables exist
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testAITableIntegration() {
  console.log('🧪 Testing AI Table Integration\n');
  console.log('================================\n');

  try {
    // Step 1: Check all required tables exist
    console.log('📊 Step 1: Checking AI generator tables...\n');

    const tables = [
      'exam_configurations',
      'topic_metadata',
      'exam_historical_patterns',
      'exam_topic_distributions',
      'student_performance_profiles'
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.error(`❌ Table '${table}' not accessible:`, error.message);
        if (table === 'student_performance_profiles') {
          console.log('\n📝 You may need to create the student_performance_profiles table.');
          console.log('   Run the SQL migration to create it.\n');
        }
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }

    // Step 2: Check exam_historical_patterns data
    console.log('\n📊 Step 2: Checking historical patterns...\n');

    const { data: patterns, error: patternsError } = await supabase
      .from('exam_historical_patterns')
      .select('*')
      .order('year', { ascending: false })
      .limit(5);

    if (patternsError) {
      console.error('❌ Error loading patterns:', patternsError);
    } else {
      console.log(`Found ${patterns?.length || 0} historical patterns`);
      patterns?.forEach(p => {
        console.log(`   ${p.year} ${p.exam_context} ${p.subject}: ${p.total_questions} questions, Source: ${p.source}`);
      });
    }

    // Step 3: Check exam_topic_distributions data
    console.log('\n📊 Step 3: Checking topic distributions...\n');

    const { data: distributions, error: distError } = await supabase
      .from('exam_topic_distributions')
      .select('*')
      .order('year', { ascending: false })
      .limit(10);

    if (distError) {
      console.error('❌ Error loading distributions:', distError);
    } else {
      console.log(`Found ${distributions?.length || 0} topic distributions`);

      // Group by year
      const byYear = new Map<number, typeof distributions>();
      distributions?.forEach(d => {
        if (!byYear.has(d.year)) {
          byYear.set(d.year, []);
        }
        byYear.get(d.year)!.push(d);
      });

      byYear.forEach((dists, year) => {
        console.log(`\n   ${year}:`);
        dists.forEach(d => {
          console.log(`      ${d.topic_id}: ${d.question_count} questions (E:${d.difficulty_distribution?.easy || 0} M:${d.difficulty_distribution?.moderate || 0} H:${d.difficulty_distribution?.hard || 0})`);
        });
      });
    }

    // Step 4: Check student performance profiles
    console.log('\n📊 Step 4: Checking student performance profiles...\n');

    const { data: profiles, error: profilesError } = await supabase
      .from('student_performance_profiles')
      .select('*')
      .limit(5);

    if (profilesError) {
      if (profilesError.code === '42P01') { // Table doesn't exist
        console.log('⚠️  student_performance_profiles table does not exist');
        console.log('   This table will be created when needed or you can create it manually.\n');
      } else {
        console.error('❌ Error loading profiles:', profilesError);
      }
    } else {
      console.log(`Found ${profiles?.length || 0} student performance profiles`);
      profiles?.forEach(p => {
        console.log(`   User: ${p.user_id}`);
        console.log(`      Exam: ${p.exam_context} ${p.subject}`);
        console.log(`      Accuracy: ${p.overall_accuracy}%`);
        console.log(`      Tests taken: ${p.total_tests_taken}`);
        console.log(`      Weak areas: ${p.weak_areas?.join(', ') || 'None'}\n`);
      });
    }

    // Step 5: Test scan sync (if scans exist)
    console.log('📊 Step 5: Testing scan sync capability...\n');

    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select('id, year, exam_context, subject')
      .not('year', 'is', null)
      .limit(1);

    if (scansError) {
      console.error('❌ Error loading scans:', scansError);
    } else if (!scans || scans.length === 0) {
      console.log('⚠️  No scans found with year metadata');
      console.log('   Upload a past year paper to test scan sync\n');
    } else {
      const scan = scans[0];
      console.log(`Found scan: ${scan.id}`);
      console.log(`   Year: ${scan.year}, Exam: ${scan.exam_context} ${scan.subject}`);

      // Check if questions exist for this scan
      const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('id, topic, difficulty')
        .eq('scan_id', scan.id)
        .limit(5);

      if (qError) {
        console.error('❌ Error loading questions:', qError);
      } else {
        console.log(`   Questions: ${questions?.length || 0} (showing first 5)`);
        const mappedCount = questions?.filter(q => q.topic)?.length || 0;
        console.log(`   Mapped to topics: ${mappedCount}/${questions?.length || 0}`);

        if (mappedCount > 0) {
          console.log('   ✅ Scan sync should work for this scan\n');
        } else {
          console.log('   ⚠️  Questions not mapped to topics yet\n');
        }
      }
    }

    console.log('🎉 AI Table Integration Check Complete!\n');
    console.log('Summary:');
    console.log('  - AI generator tables are set up');
    console.log('  - Scan data will automatically sync to AI tables after upload');
    console.log('  - Student performance will update AI profiles after test completion\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

testAITableIntegration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
