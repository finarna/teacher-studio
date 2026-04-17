import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { auditPaperHistoricalContext } from '../../lib/aiPaperAuditor';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

async function testIdentityMapping() {
  // Load identity bank
  const bankPath = path.join(process.cwd(), 'lib/oracle/identities/kcet_math.json');
  const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));

  console.log(`✅ Loaded ${bank.identities.length} identities\n`);

  // Fetch 2022 paper
  const { data: questions } = await supabase
    .from('questions')
    .select('text, topic, difficulty')
    .eq('scan_id', '0899f3e1-9980-48f4-9caa-91c65de53830')
    .limit(5);

  console.log(`✅ Fetched ${questions?.length} sample questions from 2022\n`);

  // Run audit
  const paperText = questions!.map(q => q.text).join('\n\n');
  const audit = await auditPaperHistoricalContext(
    paperText,
    'KCET',
    'Math',
    2022,
    GEMINI_API_KEY!,
    bank.identities
  );

  console.log('📊 Audit Results:');
  console.log('Identity Vector:', JSON.stringify(audit?.identityVector, null, 2));
  console.log('Identity Vector Keys:', Object.keys(audit?.identityVector || {}));
  console.log('IDS Actual:', audit?.idsActual);
  console.log('\n📝 Sample Questions:');

  questions?.forEach((q, idx) => {
    console.log(`\nQ${idx + 1}: ${q.text.substring(0, 80)}...`);
    console.log(`Topic: ${q.topic}`);
    console.log(`Difficulty: ${q.difficulty}`);

    // Try to find matching identity
    const matchingIdentity = bank.identities.find(
      (id: any) => id.topic.toLowerCase() === q.topic.toLowerCase()
    );
    console.log(`Matching Identity: ${matchingIdentity?.id} (${matchingIdentity?.name})`);
  });
}

testIdentityMapping().catch(console.error);
