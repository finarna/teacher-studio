import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); 

async function copySolutions() {
  console.log('🔄 Bulk copying solutions to empty duplicates...');
  
  const { data: solved } = await supabase.from('questions').select('text, solution_steps, mastery_material, exam_tip, study_tip, pitfalls').not('solution_steps', 'is', null);
  
  if (!solved) return;
  console.log(`Initial solved pool: ${solved.length}`);

  const solutionMap = new Map();
  solved.forEach(q => {
     if (q.text && q.solution_steps && Array.isArray(q.solution_steps) && q.solution_steps.length > 0) {
        solutionMap.set(q.text.trim(), q);
     }
  });

  console.log(`Unique solved texts: ${solutionMap.size}`);
  
  const scanId = 'a4fd0914-2d16-4e07-bed0-9e62b0eb290c'; // The p1 scan
  const { data: empty } = await supabase.from('questions').select('id, text').eq('scan_id', scanId);
  
  if (!empty) return;
  console.log(`Empty questions for our scan: ${empty.length}`);

  let updated = 0;
  for (const q of empty) {
     const match = solutionMap.get(q.text?.trim());
     if (match) {
        console.log(`✅ Copying solution for: "${q.text?.substring(0, 30)}..."`);
        await supabase.from('questions')
          .update({
             solution_steps: match.solution_steps,
             mastery_material: match.mastery_material,
             exam_tip: match.exam_tip,
             study_tip: match.study_tip,
             pitfalls: match.pitfalls
          })
          .eq('id', q.id);
        updated++;
     } else {
        console.log(`❌ No reference found for: "${q.text?.substring(0, 30)}..."`);
     }
  }

  console.log(`Done! Updated ${updated} questions.`);
}

copySolutions();
