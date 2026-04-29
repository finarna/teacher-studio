import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function check2023Questions() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 DETAILED CHECK: 2023 NEET QUESTIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const SCAN_ID = 'e3767338-e3fa-420c-9c78-1a9e31856b35'; // 2023 system scan

  console.log(`Checking scan: ${SCAN_ID}\n`);

  // Get ALL questions from this scan with all relevant fields
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, subject, topic, metadata, difficulty')
    .eq('scan_id', SCAN_ID)
    .limit(10); // Just first 10 for sampling

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${questions?.length || 0} questions (showing first 10)\n`);

  if (!questions || questions.length === 0) {
    console.log('❌ NO QUESTIONS FOUND for this scan!');
    return;
  }

  // Analyze fields
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`\n📝 Question ${i + 1}:`);
    console.log(`   ID: ${q.id.substring(0, 8)}...`);
    console.log(`   Subject: ${q.subject || 'NULL'}`);
    console.log(`   Topic: ${q.topic || 'NULL'}`);
    console.log(`   Difficulty: ${q.difficulty || 'NULL'}`);
    console.log(`   Text preview: ${q.text.substring(0, 100)}...`);

    if (q.metadata) {
      console.log(`   Metadata keys: ${Object.keys(q.metadata).join(', ')}`);
      if (q.metadata.subject) {
        console.log(`   Metadata.subject: ${q.metadata.subject}`);
      }
    }
  }

  // Get subject distribution for ALL questions in this scan
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('subject, metadata')
    .eq('scan_id', SCAN_ID);

  console.log(`\n\n📊 SUBJECT DISTRIBUTION (all ${allQuestions?.length || 0} questions):\n`);

  const subjectCounts: Record<string, number> = {};
  const metadataSubjectCounts: Record<string, number> = {};

  for (const q of allQuestions || []) {
    const subject = q.subject || 'NULL';
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;

    if (q.metadata?.subject) {
      const metaSubj = q.metadata.subject;
      metadataSubjectCounts[metaSubj] = (metadataSubjectCounts[metaSubj] || 0) + 1;
    }
  }

  console.log('By "subject" field:');
  for (const [subj, count] of Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${subj}: ${count}`);
  }

  console.log('\nBy "metadata.subject" field:');
  if (Object.keys(metadataSubjectCounts).length === 0) {
    console.log('   (No metadata.subject found)');
  } else {
    for (const [subj, count] of Object.entries(metadataSubjectCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${subj}: ${count}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📍 CONCLUSION:\n');

  const hasSubject = Object.keys(subjectCounts).some(s => s !== 'NULL' && s !== 'Combined' && s !== 'Unknown');
  const hasMetadataSubject = Object.keys(metadataSubjectCounts).length > 0;

  if (!hasSubject && !hasMetadataSubject) {
    console.log('❌ Questions are NOT tagged with subject information');
    console.log('   → Need to classify and tag these 200 questions');
    console.log('   → Split into: 50 Physics, 50 Chemistry, 50 Botany, 50 Zoology\n');
  } else if (hasMetadataSubject) {
    console.log('✅ Subject information is in metadata.subject field');
    console.log('   → UI might be using metadata.subject instead of subject field');
    console.log('   → Consider copying metadata.subject → subject field for easier querying\n');
  } else {
    console.log('✅ Questions are tagged in subject field');
    console.log(`   → But distribution: ${JSON.stringify(subjectCounts)}\n`);
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

check2023Questions().catch(console.error);
