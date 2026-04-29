import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function checkNEETStructure() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 NEET COMBINED PAPER STRUCTURE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📋 NEET Format: COMBINED papers with all subjects tagged\n');
  console.log('Official Pattern per year:');
  console.log('   • Physics: 45 questions (tagged as "Physics")');
  console.log('   • Chemistry: 45 questions (tagged as "Chemistry")');
  console.log('   • Botany: 45 questions (tagged as "Botany")');
  console.log('   • Zoology: 45 questions (tagged as "Zoology")');
  console.log('   • TOTAL per paper: 180 questions\n');

  // Check ALL NEET questions by year and subject
  const { data: allQuestions, error } = await supabase
    .from('questions')
    .select('id, year, subject, exam_context, scan_id, metadata')
    .eq('exam_context', 'NEET')
    .order('year', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 DATABASE ANALYSIS:\n');

  // Analyze by year and subject
  const byYearSubject: Record<number | string, Record<string, number>> = {};
  const scanIds = new Set<string>();

  for (const q of allQuestions || []) {
    const year = q.year || 'null';
    const subject = q.subject || 'Unknown';

    if (!byYearSubject[year]) {
      byYearSubject[year] = {};
    }
    byYearSubject[year][subject] = (byYearSubject[year][subject] || 0) + 1;

    if (q.scan_id) {
      scanIds.add(q.scan_id);
    }
  }

  const years = [2025, 2024, 2023, 2022, 2021];

  for (const year of years) {
    const data = byYearSubject[year];
    if (!data) {
      console.log(`\n📅 Year ${year}: ❌ NO QUESTIONS FOUND`);
      continue;
    }

    const physics = data['Physics'] || 0;
    const chemistry = data['Chemistry'] || 0;
    const botany = data['Botany'] || 0;
    const zoology = data['Zoology'] || 0;
    const biology = data['Biology'] || 0; // In case tagged as Biology instead of split
    const total = physics + chemistry + botany + zoology + biology;

    console.log(`\n📅 Year ${year}: (${total} total questions)`);
    console.log(`   Physics:   ${physics} ${physics === 45 ? '✅' : physics > 45 ? '⚠️ (multiple sets?)' : '❌'} (Expected: 45 per set)`);
    console.log(`   Chemistry: ${chemistry} ${chemistry === 45 ? '✅' : chemistry > 45 ? '⚠️ (multiple sets?)' : '❌'}`);
    console.log(`   Botany:    ${botany} ${botany === 45 ? '✅' : botany > 45 ? '⚠️ (multiple sets?)' : '❌'}`);
    console.log(`   Zoology:   ${zoology} ${zoology === 45 ? '✅' : zoology > 45 ? '⚠️ (multiple sets?)' : '❌'}`);
    if (biology > 0) {
      console.log(`   Biology:   ${biology} ⚠️ (Should be split into Botany/Zoology)`);
    }

    // Check how many sets this might represent
    if (physics > 0) {
      const estimatedSets = Math.round(physics / 45);
      console.log(`   Estimated Sets: ~${estimatedSets} (based on Physics count)`);
    }
  }

  // Check scans
  console.log('\n\n📄 SCANS ANALYSIS:\n');
  const { data: scans } = await supabase
    .from('scans')
    .select('id, year, name, status, exam_context')
    .eq('exam_context', 'NEET')
    .order('year', { ascending: false });

  if (scans && scans.length > 0) {
    console.log(`Found ${scans.length} NEET scans:\n`);

    for (const scan of scans) {
      // Count questions by subject for this scan
      const { data: scanQs } = await supabase
        .from('questions')
        .select('id, subject')
        .eq('scan_id', scan.id);

      const subjectCounts: Record<string, number> = {};
      for (const q of scanQs || []) {
        const subj = q.subject || 'Unknown';
        subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
      }

      const totalQ = scanQs?.length || 0;
      console.log(`   📋 ${scan.year || 'Unknown'} - ${scan.name} (${scan.status})`);
      console.log(`      Scan ID: ${scan.id.substring(0, 8)}...`);
      console.log(`      Total Questions: ${totalQ}`);
      if (totalQ > 0) {
        for (const [subj, count] of Object.entries(subjectCounts)) {
          console.log(`         ${subj}: ${count}`);
        }
      }
    }
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY:\n');

  const totalBySubject: Record<string, number> = {};
  for (const yearData of Object.values(byYearSubject)) {
    for (const [subject, count] of Object.entries(yearData)) {
      totalBySubject[subject] = (totalBySubject[subject] || 0) + count;
    }
  }

  console.log('Total Questions by Subject (all years combined):');
  for (const [subject, count] of Object.entries(totalBySubject).sort((a, b) => b[1] - a[1])) {
    const expectedPerYear = subject === 'Physics' || subject === 'Chemistry' ? 45 :
                           subject === 'Botany' || subject === 'Zoology' ? 45 : 0;
    const expectedTotal = expectedPerYear * 5; // 5 years, single set each
    console.log(`   ${subject}: ${count} (Expected for 1 set × 5 years: ${expectedTotal})`);
  }

  console.log('\n📍 INTERPRETATION:\n');

  const physicsTotal = totalBySubject['Physics'] || 0;
  if (physicsTotal >= 200 && physicsTotal <= 250) {
    console.log('✅ We likely have ~1 set per year (5 years × 45 = 225 expected)');
    console.log('   The UI showing "200 questions" may be rounding or including variations\n');
  } else if (physicsTotal >= 800 && physicsTotal <= 1000) {
    console.log('⚠️  We likely have multiple sets per year (4-5 sets × 5 years × 45 = 900-1125)');
    console.log('   Need to verify if all sets are loaded\n');
  } else {
    console.log(`⚠️  Unexpected count: ${physicsTotal} Physics questions`);
    console.log('   May be missing data or have partial loading\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

checkNEETStructure().catch(console.error);
