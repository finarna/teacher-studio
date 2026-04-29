import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function finalFix() {
  console.log('\n🔧 Final Fix for NEET 2023');
  console.log('='.repeat(60));

  // Fix Q50: should be Chemistry
  const { error: e1 } = await supabase
    .from('questions')
    .update({ subject: 'Chemistry' })
    .eq('scan_id', 'e3767338-1664-4e03-b0f6-1fab41ff5838')
    .eq('question_order', 50);

  if (!e1) {
    console.log('\n✅ Fixed Q50: Physics → Chemistry');
  }

  // Check Q150-Q199 for non-Zoology
  const { data: rangeCheck } = await supabase
    .from('questions')
    .select('id, question_order, subject, topic')
    .eq('scan_id', 'e3767338-1664-4e03-b0f6-1fab41ff5838')
    .gte('question_order', 150)
    .lte('question_order', 199)
    .order('question_order', { ascending: true });

  if (rangeCheck) {
    const wrong = rangeCheck.filter(q => q.subject !== 'Zoology');
    if (wrong.length > 0) {
      console.log('\n⚠️  Found non-Zoology in Q150-Q199:');
      for (const q of wrong) {
        console.log(`   Q${q.question_order}: ${q.subject} → Zoology (${q.topic})`);
        await supabase
          .from('questions')
          .update({ subject: 'Zoology' })
          .eq('id', q.id);
      }
      console.log(`✅ Fixed ${wrong.length} questions in Zoology range`);
    }
  }

  // Final verification
  const { data: all } = await supabase
    .from('questions')
    .select('subject')
    .eq('scan_id', 'e3767338-1664-4e03-b0f6-1fab41ff5838');

  if (all) {
    const counts = {
      Physics: all.filter(q => q.subject === 'Physics').length,
      Chemistry: all.filter(q => q.subject === 'Chemistry').length,
      Botany: all.filter(q => q.subject === 'Botany').length,
      Zoology: all.filter(q => q.subject === 'Zoology').length,
    };

    console.log('\n📊 Final Subject Distribution:');
    console.log(`   Physics:   ${counts.Physics} ${counts.Physics === 50 ? '✅' : '❌'}`);
    console.log(`   Chemistry: ${counts.Chemistry} ${counts.Chemistry === 50 ? '✅' : '❌'}`);
    console.log(`   Botany:    ${counts.Botany} ${counts.Botany === 50 ? '✅' : '❌'}`);
    console.log(`   Zoology:   ${counts.Zoology} ${counts.Zoology === 50 ? '✅' : '❌'}`);

    if (counts.Physics === 50 && counts.Chemistry === 50 && counts.Botany === 50 && counts.Zoology === 50) {
      console.log('\n✅ PERFECT! All 200 questions correctly classified.\n');
    }
  }

  console.log('='.repeat(60));
}

finalFix().catch(console.error);
