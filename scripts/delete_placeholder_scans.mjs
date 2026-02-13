import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deletePlaceholders() {
  console.log('\n🗑️  DELETING PLACEHOLDER SCANS\n');
  console.log('='.repeat(70));

  // Find all "AI Practice" scans with 0 questions
  const { data: placeholders } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, analysis_data, created_at')
    .ilike('name', 'AI Practice%');

  if (!placeholders || placeholders.length === 0) {
    console.log('\n✅ No placeholder scans found\n');
    return;
  }

  console.log(`\nFound ${placeholders.length} placeholder scans:\n`);

  for (const scan of placeholders) {
    const qCount = scan.analysis_data?.questions?.length || 0;
    console.log(`   🗑️  ${scan.name} (${scan.subject} ${scan.exam_context}) - ${qCount} questions`);
  }

  console.log('\n🔄 Deleting...\n');

  for (const scan of placeholders) {
    const { error } = await supabase
      .from('scans')
      .delete()
      .eq('id', scan.id);

    if (error) {
      console.log(`   ❌ Error deleting ${scan.name}: ${error.message}`);
    } else {
      console.log(`   ✅ Deleted: ${scan.name}`);
    }
  }

  console.log('\n='.repeat(70));
  console.log(`\n✅ Deleted ${placeholders.length} placeholder scans\n`);
}

deletePlaceholders().catch(console.error);
