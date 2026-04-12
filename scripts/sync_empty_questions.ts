import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); 

async function copySolutions() {
  const scanId = 'a4fd0914-2d16-4e07-bed0-9e62b0eb290c'; 
  const { data: empty } = await supabase.from('questions').select('id, text').eq('scan_id', scanId);
  
  if (!empty) return;
  console.log(`Searching for solutions for ${empty.length} questions...`);

  let updated = 0;
  for (const q of empty) {
     if (!q.text) continue;
     
     // Search for any other question with same text and solution_steps not empty
     const { data: matches } = await supabase.from('questions')
        .select('solution_steps, mastery_material, study_tip, pits:pitfalls')
        .eq('text', q.text.trim())
        .not('solution_steps', 'is', null)
        .neq('solution_steps', '[]' as any)
        .limit(1);

     if (matches && matches.length > 0) {
        const match = matches[0];
        console.log(`✅ MATCH FOUND for: "${q.text.substring(0, 30)}..."`);
        await supabase.from('questions')
          .update({
             solution_steps: match.solution_steps,
             mastery_material: match.mastery_material,
             study_tip: match.study_tip,
             pitfalls: match.pits
          })
          .eq('id', q.id);
        updated++;
     }
  }

  console.log(`Done! Synchronized ${updated} solutions from other scans.`);
}

copySolutions();
