import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const OFFICIAL_SYLLABUS = {
  Biology: [
    "Sexual Reproduction in Flowering Plants", "Principles of Inheritance and Variation",
    "Molecular Basis of Inheritance", "Biotechnology: Principles and Processes",
    "Biotechnology and its Applications", "Organisms and Populations",
    "Ecosystem", "Biodiversity and Conservation",
    "Human Reproduction", "Reproductive Health",
    "Human Health and Disease", "Microbes in Human Welfare",
    "Evolution"
  ],
  Physics: [
    "Electric Charges and Fields", "Electrostatic Potential and Capacitance",
    "Current Electricity", "Moving Charges and Magnetism",
    "Magnetism and Matter", "Electromagnetic Induction",
    "Alternating Current", "Electromagnetic Waves",
    "Ray Optics and Optical Instruments", "Wave Optics",
    "Dual Nature of Radiation and Matter", "Atoms",
    "Nuclei", "Semiconductor Electronics"
  ],
  Chemistry: [
    "Solutions", "Electrochemistry", "Chemical Kinetics",
    "The d and f Block Elements", "Coordination Compounds",
    "Haloalkanes and Haloarenes", "Alcohols, Phenols and Ethers",
    "Aldehydes, Ketones and Carboxylic Acids", "Amines",
    "Biomolecules"
  ],
  Mathematics: [
    "Relations and Functions", "Inverse Trigonometric Functions",
    "Matrices", "Determinants", "Continuity and Differentiability",
    "Applications of Derivatives", "Integrals", "Applications of Integrals",
    "Differential Equations", "Vectors", "Three Dimensional Geometry",
    "Linear Programming", "Probability"
  ]
};

async function alignRegistryToOfficialSyllabus() {
  console.log('🏁 Starting Official Syllabus Alignment (KCET 2026)...');

  for (const [subject, chapters] of Object.entries(OFFICIAL_SYLLABUS)) {
    console.log(`\n📦 Aligning ${subject}...`);
    
    // 1. Reset all weightages to 0 for this subject first (to remove 'massive' extra topics)
    await supabase
      .from('topics')
      .update({ exam_weightage: { KCET: 0 } })
      .eq('subject', subject);

    // 2. Map official chapters to DB entries
    for (const chapter of chapters) {
      // Find topic by name (fuzzy match)
      const { data: existing } = await supabase
        .from('topics')
        .select('id, name, exam_weightage')
        .eq('subject', subject)
        .ilike('name', `%${chapter}%`);

      if (existing && existing.length > 0) {
        // Update the best match
        const topic = existing[0];
        const weightage = topic.exam_weightage || {};
        weightage.KCET = 2; // Default valid weightage
        
        await supabase
          .from('topics')
          .update({ name: chapter, exam_weightage: weightage }) // Normalize name to official
          .eq('id', topic.id);
        
        console.log(`  ✅ Synced: ${chapter}`);
      } else {
        // Create missing official topic
        await supabase
          .from('topics')
          .insert({
            name: chapter,
            subject: subject,
            exam_weightage: { KCET: 2 },
            representative_symbol: 'book',
            symbol_type: 'lucide'
          });
        console.log(`  ➕ Added Missing: ${chapter}`);
      }
    }
  }

  console.log('\n🌟 Alignment Complete! Your Learning Journey now matches the Official KCET 2026 Syllabus.');
}

alignRegistryToOfficialSyllabus();
