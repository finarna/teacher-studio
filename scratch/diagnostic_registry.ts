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
  Chemistry: [
    "Solutions", "Electrochemistry", "Chemical Kinetics",
    "The d and f Block Elements", "Coordination Compounds",
    "Haloalkanes and Haloarenes", "Alcohols, Phenols and Ethers",
    "Aldehydes, Ketones and Carboxylic Acids", "Amines",
    "Biomolecules"
  ]
};

async function diagnostic() {
  console.log('🔍 Running Registry Diagnostic...');

  for (const [subject, chapters] of Object.entries(OFFICIAL_SYLLABUS)) {
    console.log(`\n📋 Subject: ${subject}`);
    const { data: topics } = await supabase
      .from('topics')
      .select('name, exam_weightage')
      .eq('subject', subject);
    
    const active = topics?.filter(t => t.exam_weightage?.KCET > 0) || [];
    console.log(`   - Active in DB: ${active.length}`);
    
    const missing = chapters.filter(c => !active.some(a => a.name.toLowerCase().includes(c.toLowerCase())));
    
    if (missing.length > 0) {
      console.log(`   ❌ MISSING/INACTIVE CHAPTERS:`);
      missing.forEach(m => console.log(`     - ${m}`));
    } else {
      console.log(`   ✅ ALL CHAPTERS ACTIVE`);
    }
  }
}

diagnostic();
