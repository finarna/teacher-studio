/**
 * FIX TOPICS FOR KCET/PUC II
 *
 * Issues to fix:
 * 1. Mark Chemistry "Chemistry in Everyday Life" as NOT in KCET/PUC II
 * 2. Mark Chemistry "Surface Chemistry" as NOT in KCET/PUC II
 * 3. Add missing Biology topic "Strategies for Enhancement in Food Production"
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Check .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTopics() {
  console.log('🔧 FIXING TOPICS FOR KCET/PUC II ALIGNMENT\n');
  console.log('='.repeat(60));

  // Fix 1: Update "Chemistry in Everyday Life" - NOT in KCET/PUC II
  console.log('\n📌 Fix 1: Updating "Chemistry in Everyday Life"...');
  const { data: chemEveryday, error: error1 } = await supabase
    .from('topics')
    .update({
      exam_weightage: {
        NEET: 2,
        JEE: 2,
        KCET: 0,     // NOT in KCET
        PUCII: 0,    // NOT in PUC II
        CBSE: 2
      }
    })
    .eq('name', 'Chemistry in Everyday Life')
    .select();

  if (error1) {
    console.error('  ❌ Error:', error1.message);
  } else if (chemEveryday && chemEveryday.length > 0) {
    console.log('  ✅ Updated: Set KCET=0, PUCII=0 (NEET/JEE only)');
  } else {
    console.log('  ⚠️  Topic not found in database');
  }

  // Fix 2: Update "Surface Chemistry" - DELETED in KCET/PUC II
  console.log('\n📌 Fix 2: Updating "Surface Chemistry"...');
  const { data: surfaceChem, error: error2 } = await supabase
    .from('topics')
    .update({
      exam_weightage: {
        NEET: 3,
        JEE: 3,
        KCET: 0,     // DELETED
        PUCII: 0,    // DELETED
        CBSE: 3
      }
    })
    .eq('name', 'Surface Chemistry')
    .select();

  if (error2) {
    console.error('  ❌ Error:', error2.message);
  } else if (surfaceChem && surfaceChem.length > 0) {
    console.log('  ✅ Updated: Set KCET=0, PUCII=0 (deleted in Karnataka)');
  } else {
    console.log('  ⚠️  Topic not found in database');
  }

  // Fix 3: Add missing Biology topic
  console.log('\n📌 Fix 3: Adding "Strategies for Enhancement in Food Production"...');
  const { data: newTopic, error: error3 } = await supabase
    .from('topics')
    .insert({
      subject: 'Biology',
      domain: 'Food Production',
      name: 'Strategies for Enhancement in Food Production',
      description: 'Animal husbandry, plant breeding, tissue culture, single cell protein',
      difficulty_level: 'Moderate',
      estimated_study_hours: 6,
      exam_weightage: {
        NEET: 3,
        KCET: 3,
        PUCII: 3,
        CBSE: 3
      },
      key_concepts: [
        'Animal Husbandry',
        'Plant Breeding',
        'Tissue Culture',
        'Single Cell Protein',
        'Biofortification'
      ]
    })
    .select();

  if (error3) {
    if (error3.message.includes('duplicate')) {
      console.log('  ⚠️  Topic already exists');
    } else {
      console.error('  ❌ Error:', error3.message);
    }
  } else if (newTopic && newTopic.length > 0) {
    console.log('  ✅ Created: Biology topic for KCET/PUC II');
  }

  // Verify changes
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION\n');

  // Check Chemistry topics for KCET
  const { data: chemTopics } = await supabase
    .from('topics')
    .select('name, exam_weightage')
    .eq('subject', 'Chemistry')
    .order('name');

  console.log('Chemistry Topics for KCET/PUC II:');
  let kcetChemCount = 0;
  chemTopics?.forEach(t => {
    const weightage = t.exam_weightage as any;
    const inKCET = weightage.KCET > 0;
    if (inKCET) {
      kcetChemCount++;
      console.log(`  ✅ ${t.name}`);
    } else {
      console.log(`  ❌ ${t.name} (NOT in KCET/PUC II)`);
    }
  });
  console.log(`\nTotal Chemistry topics for KCET: ${kcetChemCount}/14`);

  // Check Biology topics count
  const { data: bioTopics } = await supabase
    .from('topics')
    .select('name')
    .eq('subject', 'Biology')
    .order('name');

  console.log(`\nBiology Topics: ${bioTopics?.length || 0} total`);
  bioTopics?.forEach(t => {
    console.log(`  ✅ ${t.name}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ FIX COMPLETE!');
  console.log('\nSummary:');
  console.log('  - Chemistry: 2 topics marked as NEET/JEE only');
  console.log('  - Biology: 1 topic added for KCET/PUC II');
  console.log(`  - KCET Chemistry topics: ${kcetChemCount} (should be 12)`);
  console.log(`  - Total Biology topics: ${bioTopics?.length || 0} (should be 13)`);
  console.log('='.repeat(60));
}

// Run fixes
fixTopics().catch(console.error);
