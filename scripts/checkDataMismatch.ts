/**
 * Check data mismatch between scans and historical patterns
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkMismatch() {
  console.log('🔍 Checking data mismatch between scans and historical patterns...\n');
  console.log('='.repeat(70));

  // Check scans table
  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select('id, name, year, exam_context, subject')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .not('year', 'is', null)
    .order('year', { ascending: true });

  console.log('\n📄 SCANS TABLE (Actual Papers Uploaded):\n');
  if (scansError) {
    console.error('Error:', scansError);
  } else if (!scans || scans.length === 0) {
    console.log('   ❌ No scans found with year field');
  } else {
    console.log(`   ✅ Found ${scans.length} scans:\n`);
    scans.forEach(scan => {
      console.log(`      ${scan.year} - ${scan.name}`);
    });
    console.log(`\n   Years: ${[...new Set(scans.map(s => s.year))].sort().join(', ')}`);
  }

  // Check historical patterns table
  const { data: patterns, error: patternsError } = await supabase
    .from('exam_historical_patterns')
    .select('id, year, exam_context, subject, total_marks')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .order('year', { ascending: true });

  console.log('\n📊 HISTORICAL PATTERNS TABLE (AI Analysis Data):\n');
  if (patternsError) {
    console.error('Error:', patternsError);
  } else if (!patterns || patterns.length === 0) {
    console.log('   ❌ No historical patterns found');
  } else {
    console.log(`   ✅ Found ${patterns.length} patterns:\n`);
    patterns.forEach(pattern => {
      console.log(`      ${pattern.year} - ${pattern.total_marks}M total`);
    });
    console.log(`\n   Years: ${patterns.map(p => p.year).sort().join(', ')}`);
  }

  // Find mismatches
  if (scans && patterns) {
    const scanYears = new Set(scans.map(s => parseInt(s.year)));
    const patternYears = new Set(patterns.map(p => p.year));

    const patternsWithoutScans = [...patternYears].filter(year => !scanYears.has(year));
    const scansWithoutPatterns = [...scanYears].filter(year => !patternYears.has(year));

    console.log('\n' + '='.repeat(70));
    console.log('\n🔍 MISMATCH ANALYSIS:\n');

    if (patternsWithoutScans.length > 0) {
      console.log(`   ⚠️  Historical patterns WITHOUT scans (${patternsWithoutScans.length} years):`);
      console.log(`      Years: ${patternsWithoutScans.sort().join(', ')}`);
      console.log(`      Impact: Trends show these years, but no papers available to practice`);
    }

    if (scansWithoutPatterns.length > 0) {
      console.log(`\n   ⚠️  Scans WITHOUT historical patterns (${scansWithoutPatterns.length} years):`);
      console.log(`      Years: ${scansWithoutPatterns.sort().join(', ')}`);
      console.log(`      Impact: Papers available but not included in trends analysis`);
    }

    if (patternsWithoutScans.length === 0 && scansWithoutPatterns.length === 0) {
      console.log('   ✅ Perfect alignment! All scans have patterns and vice versa.');
    }
  }

  // Get questions grouped by year
  const { data: questions } = await supabase
    .from('questions')
    .select('year, scan_id')
    .not('year', 'is', null);

  if (questions && questions.length > 0) {
    const yearCounts: Record<string, number> = {};
    questions.forEach(q => {
      if (q.year) {
        yearCounts[q.year] = (yearCounts[q.year] || 0) + 1;
      }
    });

    console.log('\n📝 QUESTIONS TABLE (Actual Questions from Scans):\n');
    Object.entries(yearCounts)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([year, count]) => {
        console.log(`      ${year} - ${count} questions`);
      });
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n💡 RECOMMENDATION:\n');

  if (scans && patterns) {
    const scanYears = new Set(scans.map(s => parseInt(s.year)));
    const patternYears = new Set(patterns.map(p => p.year));
    const patternsWithoutScans = [...patternYears].filter(year => !scanYears.has(year));

    if (patternsWithoutScans.length > 0) {
      console.log('   The historical patterns table has data for years without actual scans.');
      console.log('   This likely happened because:');
      console.log('   1. Data was seeded using setupAIGenerator.ts script');
      console.log('   2. Scans were deleted but patterns remain\n');
      console.log('   OPTIONS:\n');
      console.log('   A. Upload actual scans for years:', patternsWithoutScans.sort().join(', '));
      console.log('   B. Delete orphaned patterns (keep only years with actual scans)');
      console.log('   C. Add UI note that some years are projected/seeded data\n');
      console.log('   For production, option A (upload real scans) is recommended.');
    }
  }

  console.log('');
}

checkMismatch()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
