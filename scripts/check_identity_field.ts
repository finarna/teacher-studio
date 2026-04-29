import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkIdentityField() {
  console.log('🔍 Checking identity_id field in NEET Physics questions...\n');

  const { data, error } = await supabase
    .from('questions')
    .select('id, text, topic, identity_id, year')
    .eq('subject', 'Physics')
    .eq('exam_context', 'NEET')
    .eq('year', 2022)
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${data?.length} questions\n`);

  let hasIdentityId = 0;
  let missingIdentityId = 0;

  data?.forEach((q, idx) => {
    if (q.identity_id) {
      hasIdentityId++;
      console.log(`✅ Q${idx + 1}: Has identity_id = ${q.identity_id}`);
    } else {
      missingIdentityId++;
      console.log(`❌ Q${idx + 1}: Missing identity_id (topic: ${q.topic})`);
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   With identity_id: ${hasIdentityId}`);
  console.log(`   Missing identity_id: ${missingIdentityId}`);

  if (missingIdentityId > 0) {
    console.log(`\n⚠️  PROBLEM: Database questions don't have identity_id populated!`);
    console.log(`   This is why identity match rate is low.`);
  }
}

checkIdentityField().catch(console.error);
