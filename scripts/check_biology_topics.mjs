import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: topics } = await supabase
  .from('topics')
  .select('id, name, subject, exam_weightage')
  .eq('subject', 'Biology')
  .order('name');

console.log(`Total Biology topics in database: ${topics?.length || 0}\n`);

if (topics) {
  topics.forEach(t => {
    const kcetWeight = t.exam_weightage?.KCET || 0;
    const neetWeight = t.exam_weightage?.NEET || 0;
    console.log(`- ${t.name}`);
    console.log(`    KCET: ${kcetWeight}%, NEET: ${neetWeight}%`);
  });
}

const expectedTopics = [
  'Sexual Reproduction in Flowering Plants',
  'Principles of Inheritance and Variation',
  'Molecular Basis of Inheritance',
  'Biotechnology Principles and Processes',
  'Biotechnology and its Applications',
  'Organisms and Populations',
  'Ecosystem',
  'Biodiversity and Conservation',
  'Human Reproduction',
  'Reproductive Health',
  'Human Health and Disease',
  'Evolution'
];

console.log(`\n\nExpected topics (official syllabus): ${expectedTopics.length}`);
console.log(`Actual topics (in database): ${topics?.length || 0}`);
console.log(`Missing topics: ${expectedTopics.length - (topics?.length || 0)}\n`);

const existing = new Set((topics || []).map(t => t.name));
const missing = expectedTopics.filter(t => !existing.has(t));
if (missing.length > 0) {
  console.log('❌ Missing from database:');
  missing.forEach(t => console.log(`  - ${t}`));
}
