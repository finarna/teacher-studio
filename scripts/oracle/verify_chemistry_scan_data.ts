import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_MAP: Record<number, string> = {
  2021: "5bfcb13b-9ed6-48c9-ad2f-ee995d9d9a72",
  2022: "6c77a7a3-fd6b-40ef-9f42-f092905bcd5d",
  2023: "709486c9-317a-4fd0-8921-e8f123595648",
  2024: "ed2ba125-4215-4a12-a148-97bc52a1cee3",
  2025: "61b7d6a9-d68d-4bb3-9f75-a481d59226d0"
};

async function verifyChemistryData() {
  console.log('🔍 VERIFYING CHEMISTRY SCAN DATA (2021-2025)\n');
  console.log('=' .repeat(70));

  let allYearsValid = true;

  for (const year of [2021, 2022, 2023, 2024, 2025]) {
    const scanId = SCAN_MAP[year];

    console.log(`\n📅 Year ${year}:`);
    console.log(`   Scan ID: ${scanId}`);

    // Check questions for this scan
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, text, difficulty, topic, year')
      .eq('scan_id', scanId);

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      allYearsValid = false;
      continue;
    }

    if (!questions || questions.length === 0) {
      console.log(`   ❌ No questions found`);
      allYearsValid = false;
      continue;
    }

    console.log(`   ✅ Questions: ${questions.length}`);

    // Check difficulty distribution
    const difficulties = questions.reduce((acc: any, q: any) => {
      acc[q.difficulty || 'unknown'] = (acc[q.difficulty || 'unknown'] || 0) + 1;
      return acc;
    }, {});

    console.log(`   Difficulty: E=${difficulties.Easy || 0} M=${difficulties.Moderate || 0} H=${difficulties.Hard || 0}`);

    // Check topics
    const topics = [...new Set(questions.map(q => q.topic).filter(Boolean))];
    console.log(`   Topics: ${topics.length} unique topics`);
  }

  console.log('\n' + '='.repeat(70));

  if (allYearsValid) {
    console.log('\n✅ ALL 5 YEARS OF CHEMISTRY DATA VERIFIED!');
    console.log('   Ready for REI v17 calibration');
  } else {
    console.log('\n⚠️  Some years have missing data');
  }
}

verifyChemistryData().catch(console.error);
