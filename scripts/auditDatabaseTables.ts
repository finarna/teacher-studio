/**
 * Comprehensive Database Audit for AI Mock Test Generation
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function auditTables() {
  console.log('📊 DATABASE TABLES AUDIT FOR AI MOCK TEST GENERATION\n');
  console.log('='.repeat(70));

  const requiredTables = [
    { name: 'exam_configurations', purpose: 'Exam metadata (total questions, duration)', critical: true },
    { name: 'topic_metadata', purpose: 'Official topics with syllabus', critical: true },
    { name: 'exam_historical_patterns', purpose: 'Year-by-year exam patterns', critical: true },
    { name: 'exam_topic_distributions', purpose: 'Questions per topic per year', critical: true },
    { name: 'student_performance_profiles', purpose: 'Student weak/strong areas', critical: false },
    { name: 'questions', purpose: 'Actual questions from scans', critical: true },
    { name: 'scans', purpose: 'Uploaded past year papers', critical: true },
    { name: 'test_attempts', purpose: 'Student test records', critical: true },
    { name: 'test_responses', purpose: 'Student answers', critical: true }
  ];

  console.log('\n✅ REQUIRED TABLES FOR AI MOCK TEST GENERATION:\n');

  let allCriticalExist = true;

  for (const table of requiredTables) {
    const { error, count } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true });

    if (error) {
      const icon = table.critical ? '❌' : '⚠️ ';
      console.log(`${icon} ${table.name.padEnd(35)} - MISSING or INACCESSIBLE`);
      console.log(`   Purpose: ${table.purpose}`);
      console.log(`   Critical: ${table.critical ? 'YES - REQUIRED' : 'No - Optional'}`);
      console.log(`   Error: ${error.message}\n`);
      if (table.critical) allCriticalExist = false;
    } else {
      console.log(`✅ ${table.name.padEnd(35)} - EXISTS (${count || 0} rows)`);
      console.log(`   Purpose: ${table.purpose}\n`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📈 SAMPLE DATA CHECK:\n');

  // Check exam_historical_patterns
  const { data: patterns } = await supabase
    .from('exam_historical_patterns')
    .select('year, exam_context, subject')
    .order('year', { ascending: false })
    .limit(5);

  console.log('exam_historical_patterns (recent 5 years):');
  if (patterns && patterns.length > 0) {
    patterns.forEach(p => console.log(`   ${p.year} - ${p.exam_context} ${p.subject}`));
  } else {
    console.log('   ⚠️  NO DATA - Upload past year papers to populate');
  }

  // Check topic_metadata
  const { data: topics } = await supabase
    .from('topic_metadata')
    .select('topic_id, exam_context, subject');

  console.log('\ntopic_metadata:');
  if (topics && topics.length > 0) {
    const grouped = topics.reduce((acc: any, t) => {
      const key = `${t.exam_context} ${t.subject}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t.topic_id);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([key, topicIds]: [string, any]) => {
      console.log(`   ${key}: ${topicIds.length} topics`);
      console.log(`      ${topicIds.slice(0, 3).join(', ')}...`);
    });
  } else {
    console.log('   ⚠️  NO DATA - Run: npx tsx scripts/setupAIGenerator.ts');
  }

  // Check student_performance_profiles
  const { count: profileCount } = await supabase
    .from('student_performance_profiles')
    .select('*', { count: 'exact', head: true });

  console.log('\nstudent_performance_profiles:');
  console.log(`   ${profileCount || 0} student profiles`);
  if (profileCount === 0) {
    console.log('   ℹ️  Will be populated as students complete tests');
  }

  // Check scans
  const { data: scans } = await supabase
    .from('scans')
    .select('id, year, exam_context, subject')
    .not('year', 'is', null)
    .limit(3);

  console.log('\nscans (with year):');
  if (scans && scans.length > 0) {
    scans.forEach(s => console.log(`   ${s.year} - ${s.exam_context} ${s.subject} (${s.id.substring(0, 8)}...)`));
  } else {
    console.log('   ⚠️  NO SCANS with year - Upload past year papers');
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n🎯 VERDICT:\n');

  if (allCriticalExist) {
    console.log('✅ All critical tables exist!');
    console.log('✅ System is ready for AI mock test generation');

    if ((patterns?.length || 0) > 0 && (topics?.length || 0) > 0) {
      console.log('✅ Has historical data and topics');
      console.log('\n🚀 Ready to generate AI-powered mock tests!\n');
    } else {
      console.log('\n⚠️  ACTION REQUIRED:');
      if ((topics?.length || 0) === 0) {
        console.log('   1. Run: npx tsx scripts/setupAIGenerator.ts');
      }
      if ((patterns?.length || 0) === 0) {
        console.log('   2. Upload past year papers via UI\n');
      }
    }
  } else {
    console.log('❌ Missing critical tables!');
    console.log('\n📝 ACTION REQUIRED:');
    console.log('   Run migrations in supabase/migrations/\n');
  }
}

auditTables().then(() => process.exit(0)).catch(e => {
  console.error('❌ Audit failed:', e);
  process.exit(1);
});
