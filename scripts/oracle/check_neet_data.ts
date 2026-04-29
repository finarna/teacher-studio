import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkNEETData() {
  console.log('\n📊 CHECKING NEET DATA AVAILABILITY\n');
  console.log('='.repeat(70));

  // Get all NEET papers from published scans
  const { data: scans, error: scansError } = await supabase
    .from('published_paper_scans')
    .select('id, display_name, year, subject, exam')
    .eq('exam', 'NEET')
    .order('year', { ascending: true });

  if (scansError) {
    console.error('❌ Error fetching scans:', scansError);
    return;
  }

  console.log(`\n✅ Found ${scans?.length || 0} NEET scans\n`);

  // Group by subject and year
  const bySubject: Record<string, any[]> = {};

  for (const scan of scans || []) {
    if (!bySubject[scan.subject]) {
      bySubject[scan.subject] = [];
    }

    // Get question count
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('scan_id', scan.id);

    bySubject[scan.subject].push({
      year: scan.year,
      scan_id: scan.id,
      name: scan.display_name,
      questions: count || 0
    });
  }

  // Display results
  for (const [subject, papers] of Object.entries(bySubject)) {
    console.log(`\n📚 ${subject.toUpperCase()}`);
    console.log('-'.repeat(70));
    papers.forEach(p => {
      console.log(`   ${p.year}: ${p.questions} questions (${p.scan_id.substring(0, 8)}...)`);
    });
  }

  // Summary
  console.log('\n📈 SUMMARY:');
  console.log('-'.repeat(70));
  for (const [subject, papers] of Object.entries(bySubject)) {
    const totalQ = papers.reduce((sum, p) => sum + p.questions, 0);
    const years = papers.map(p => p.year).join(', ');
    console.log(`   ${subject}: ${papers.length} papers (${years}) - ${totalQ} total questions`);
  }
}

checkNEETData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
