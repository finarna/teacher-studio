import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_ID = 'ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9';

async function checkEcosystemQuestion() {
  console.log('🔍 Checking Ecosystem Question...\n');

  // Search for the detritus ecosystem question
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology')
    .ilike('text', '%detritus-based ecosystem%');

  if (!questions || questions.length === 0) {
    console.log('❌ This question is NOT from our Biology Flagship papers.');
    console.log('   It might be from PYQ or a different source.\n');

    // Check if it's a PYQ
    const { data: pyqCheck } = await supabase
      .from('questions')
      .select('*')
      .eq('subject', 'Biology')
      .ilike('text', '%detritus-based ecosystem%')
      .limit(5);

    if (pyqCheck && pyqCheck.length > 0) {
      console.log(`✅ Found in database (not in flagship scan):`);
      pyqCheck.forEach(q => {
        console.log(`   ID: ${q.id}`);
        console.log(`   Scan ID: ${q.scan_id}`);
        console.log(`   Source: ${q.source}`);
        console.log(`   Year: ${q.year}`);
        console.log(`   Difficulty: ${q.difficulty}`);
        console.log(`   Created: ${new Date(q.created_at).toLocaleString()}\n`);
      });
    }
    return;
  }

  console.log(`✅ Found ${questions.length} matching question(s):\n`);

  questions.forEach((q, idx) => {
    console.log(`Question ${idx + 1}:`);
    console.log(`   ID: ${q.id}`);
    console.log(`   Created: ${new Date(q.created_at).toLocaleString()}`);
    console.log(`   Topic: ${q.topic}`);
    console.log(`   Difficulty: ${q.difficulty}`);
    console.log(`   Type: ${q.metadata?.questionType || 'N/A'}`);
    console.log(`   Identity: ${q.metadata?.identityId || 'N/A'}`);
    console.log(`   Text: ${q.text.substring(0, 150)}...\n`);
  });

  // Check if it's in our latest 120
  const { data: latest120 } = await supabase
    .from('questions')
    .select('id, created_at, difficulty')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology')
    .order('created_at', { ascending: false })
    .limit(120);

  if (latest120) {
    const found = questions.find(q => latest120.some(l => l.id === q.id));

    if (found) {
      console.log('✅ This question IS in the latest 120 questions!\n');

      // Check difficulty distribution
      const hardCount = latest120.filter(q => q.difficulty === 'Hard').length;
      console.log(`⚠️  WARNING: Found ${hardCount} HARD questions in latest 120`);
      console.log(`   Expected: 0 Hard questions (target: 90% Easy, 10% Moderate)\n`);

      if (hardCount > 0) {
        console.log('❌ ISSUE: Latest generation has Hard questions when it should have 0%');
        console.log('   This suggests the questions may not be from our final corrected generation.\n');
      }
    } else {
      console.log('❌ This question is NOT in the latest 120 questions.\n');
    }
  }
}

checkEcosystemQuestion().catch(console.error);
