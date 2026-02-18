import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 Adding KCET weightage to Math topics...\n');

// Get all Math topics
const { data: mathTopics, error: fetchError } = await supabase
  .from('topics')
  .select('*')
  .eq('subject', 'Math');

if (fetchError) {
  console.error('Error fetching topics:', fetchError);
  process.exit(1);
}

console.log(`Found ${mathTopics.length} Math topics\n`);

// Update each topic to include KCET weightage
for (const topic of mathTopics) {
  const currentWeightage = topic.exam_weightage || {};

  // KCET Math weightage based on actual exam pattern
  const kcetWeightage = {
    'Relations and Functions': 4,
    'Inverse Trigonometric Functions': 3,
    'Matrices': 4,
    'Determinants': 4,
    'Continuity and Differentiability': 6,
    'Applications of Derivatives': 6,
    'Integrals': 7,
    'Applications of Integrals': 4,
    'Differential Equations': 5,
    'Vectors': 4,
    'Three Dimensional Geometry': 5,
    'Linear Programming': 3,
    'Probability': 5
  };

  const updatedWeightage = {
    ...currentWeightage,
    KCET: kcetWeightage[topic.name] || 4 // Default to 4 if not specified
  };

  const { error: updateError } = await supabase
    .from('topics')
    .update({ exam_weightage: updatedWeightage })
    .eq('id', topic.id);

  if (updateError) {
    console.error(`Error updating ${topic.name}:`, updateError);
  } else {
    console.log(`✅ Updated ${topic.name} - KCET weightage: ${updatedWeightage.KCET}`);
  }
}

console.log('\n✨ All Math topics updated with KCET weightage!');
