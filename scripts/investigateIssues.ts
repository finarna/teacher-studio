/**
 * INVESTIGATE TEST FAILURES
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
  console.log('\n🔍 INVESTIGATING TEST FAILURES\n');

  // Issue 1: Topic count (54 vs 53)
  console.log('═'.repeat(80));
  console.log('ISSUE 1: Topic Count (Found 54, Expected 53)');
  console.log('═'.repeat(80));

  const { data: allTopics } = await supabase
    .from('topics')
    .select('subject, name')
    .order('subject, name');

  const bySubject: any = {};
  allTopics?.forEach(t => {
    if (!bySubject[t.subject]) bySubject[t.subject] = [];
    bySubject[t.subject].push(t.name);
  });

  console.log('\nTopic Count by Subject:');
  Object.entries(bySubject).forEach(([subject, topics]: [string, any]) => {
    console.log(`  ${subject}: ${topics.length} topics`);
  });

  console.log(`\nTotal: ${allTopics?.length} topics`);

  // Check for duplicates
  const names = allTopics?.map(t => t.name) || [];
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicates.length > 0) {
    console.log('\n⚠️  DUPLICATES FOUND:', duplicates);
  }

  // List all Biology topics to see which is the extra one
  console.log('\n📚 All Biology Topics:');
  bySubject.Biology?.forEach((name: string, i: number) => {
    console.log(`  ${i + 1}. ${name}`);
  });

  // Issue 2: KCET vs PUCII weightage mismatch
  console.log('\n' + '═'.repeat(80));
  console.log('ISSUE 2: KCET vs PUCII Weightage Mismatch');
  console.log('═'.repeat(80));

  const { data: mismatches } = await supabase
    .from('topics')
    .select('subject, name, exam_weightage');

  const mismatchedTopics = mismatches?.filter(t => {
    const w: any = t.exam_weightage;
    return w.KCET !== w.PUCII;
  });

  console.log(`\n${mismatchedTopics?.length} topics with KCET ≠ PUCII:\n`);

  const bySubj: any = {};
  mismatchedTopics?.forEach(t => {
    if (!bySubj[t.subject]) bySubj[t.subject] = [];
    bySubj[t.subject].push(t);
  });

  Object.entries(bySubj).forEach(([subject, topics]: [string, any]) => {
    console.log(`\n${subject} (${topics.length} mismatches):`);
    topics.forEach((t: any) => {
      const w = t.exam_weightage;
      console.log(`  "${t.name}"`);
      console.log(`    KCET=${w.KCET}, PUCII=${w.PUCII || 'undefined'}`);
    });
  });

  // Issue 3: Biology topics showing only 1 for KCET
  console.log('\n' + '═'.repeat(80));
  console.log('ISSUE 3: KCET Biology Topics Count');
  console.log('═'.repeat(80));

  const { data: bioTopics } = await supabase
    .from('topics')
    .select('name, exam_weightage')
    .eq('subject', 'Biology');

  const kcetBioTopics = bioTopics?.filter(t => {
    const w: any = t.exam_weightage;
    return w.KCET > 0;
  });

  console.log(`\nBiology topics with KCET > 0: ${kcetBioTopics?.length}`);
  console.log('\nList:');
  kcetBioTopics?.forEach((t, i) => {
    const w: any = t.exam_weightage;
    console.log(`  ${i + 1}. ${t.name} (KCET=${w.KCET})`);
  });

  // Show topics with KCET = 0
  const nonKcetBioTopics = bioTopics?.filter(t => {
    const w: any = t.exam_weightage;
    return w.KCET === 0;
  });

  if (nonKcetBioTopics && nonKcetBioTopics.length > 0) {
    console.log(`\nBiology topics with KCET = 0: ${nonKcetBioTopics.length}`);
    nonKcetBioTopics.forEach(t => {
      const w: any = t.exam_weightage;
      console.log(`  - ${t.name} (KCET=${w.KCET})`);
    });
  }

  // Show topics with KCET undefined
  const undefinedKcetBioTopics = bioTopics?.filter(t => {
    const w: any = t.exam_weightage;
    return w.KCET === undefined;
  });

  if (undefinedKcetBioTopics && undefinedKcetBioTopics.length > 0) {
    console.log(`\n⚠️  Biology topics with undefined KCET: ${undefinedKcetBioTopics.length}`);
    undefinedKcetBioTopics.forEach(t => {
      console.log(`  - ${t.name}`);
    });
  }

  console.log('\n' + '═'.repeat(80));
  console.log('INVESTIGATION COMPLETE');
  console.log('═'.repeat(80) + '\n');
}

investigate().catch(console.error);
