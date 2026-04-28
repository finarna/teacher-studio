import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const MISSING_FIX = {
  Biology: [
    "Biotechnology: Principles and Processes"
  ],
  Chemistry: [
    "The d and f Block Elements",
    "Alcohols, Phenols and Ethers",
    "Aldehydes, Ketones and Carboxylic Acids"
  ]
};

async function forceFixMissing() {
  console.log('🔨 Force-Fixing Missing Registry Chapters...');

  for (const [subject, chapters] of Object.entries(MISSING_FIX)) {
    for (const chapter of chapters) {
      // 1. Try a broader fuzzy search (e.g. just "Alcohols" for "Alcohols, Phenols and Ethers")
      const searchKey = chapter.split(',')[0].split(':')[0].trim();
      
      const { data: existing } = await supabase
        .from('topics')
        .select('id, name')
        .eq('subject', subject)
        .ilike('name', `%${searchKey}%`);

      if (existing && existing.length > 0) {
        const topic = existing[0];
        console.log(`  Updating Existing [${topic.name}] -> [${chapter}]`);
        await supabase
          .from('topics')
          .update({ name: chapter, exam_weightage: { KCET: 2 } })
          .eq('id', topic.id);
      } else {
        console.log(`  Inserting New [${chapter}]`);
        await supabase
          .from('topics')
          .insert({
            name: chapter,
            subject: subject,
            exam_weightage: { KCET: 2 },
            representative_symbol: 'book',
            symbol_type: 'lucide'
          });
      }
    }
  }

  console.log('✅ Force-Fix Complete! Refreshing your dashboard now should show 13 Bio and 10 Chem.');
}

forceFixMissing();
