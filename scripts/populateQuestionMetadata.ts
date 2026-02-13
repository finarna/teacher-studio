/**
 * Populate missing metadata for existing questions
 * Extracts year from scan names and assigns domain/pedagogy
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Domain mapping from topic names
const DOMAIN_MAPPING: Record<string, string> = {
  // Math domains
  'Functions': 'Functions',
  'Trigonometry': 'Trigonometry',
  'Calculus': 'Calculus',
  'Algebra': 'Algebra',
  'Coordinate Geometry': 'Coordinate Geometry',
  'Vector': 'Vectors',
  'Probability': 'Probability & Statistics',
  'Statistics': 'Probability & Statistics',
  'Matrices': 'Matrices & Determinants',
  'Determinants': 'Matrices & Determinants',
  'Differential': 'Calculus',
  'Integration': 'Calculus',
  'Limits': 'Calculus',
  'Sequences': 'Sequences & Series',
  'Series': 'Sequences & Series',
  'Complex': 'Complex Numbers',
  'Binomial': 'Binomial Theorem',
  'Permutation': 'Permutations & Combinations',
  'Combination': 'Permutations & Combinations',

  // Physics domains
  'Mechanics': 'Mechanics',
  'Kinematics': 'Mechanics',
  'Properties of Solids': 'Mechanics',
  'Gravitation': 'Mechanics',
  'Thermodynamics': 'Thermodynamics',
  'Heat': 'Thermodynamics',
  'Optics': 'Optics',
  'Light': 'Optics',
  'Electricity': 'Electricity & Magnetism',
  'Magnetism': 'Electricity & Magnetism',
  'Current': 'Electricity & Magnetism',
  'Electrostatics': 'Electricity & Magnetism',
  'Wave': 'Waves & Oscillations',
  'Oscillation': 'Waves & Oscillations',
  'Sound': 'Waves & Oscillations',
  'Modern Physics': 'Modern Physics',
  'Atomic': 'Modern Physics',
  'Nuclear': 'Modern Physics',
};

function extractDomainFromTopic(topic: string): string | null {
  for (const [keyword, domain] of Object.entries(DOMAIN_MAPPING)) {
    if (topic.includes(keyword)) {
      return domain;
    }
  }
  return null;
}

function extractYearFromScanName(scanName: string): string | null {
  const yearMatch = scanName.match(/(\d{4})/);
  return yearMatch ? yearMatch[1] : null;
}

function assignPedagogy(marks: number): string {
  if (marks === 1) return 'Conceptual';
  if (marks === 2) return 'Analytical';
  if (marks >= 3) return 'Problem-Solving';
  return 'Conceptual';
}

async function main() {
  console.log('🔄 Populating question metadata...\n');

  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, exam_context, subject');

  console.log(`📊 Found ${scans?.length || 0} scans\n`);

  let totalUpdated = 0;

  for (const scan of scans || []) {
    const year = extractYearFromScanName(scan.name);
    console.log(`📄 ${scan.name} → Year: ${year || 'N/A'}`);

    const { data: questions } = await supabase
      .from('questions')
      .select('id, topic, marks')
      .eq('scan_id', scan.id);

    for (const q of questions || []) {
      const updates: any = {
        exam_context: scan.exam_context,
        subject: scan.subject
      };

      if (year) updates.year = year;

      const domain = extractDomainFromTopic(q.topic);
      if (domain) updates.domain = domain;

      updates.pedagogy = assignPedagogy(q.marks);

      await supabase
        .from('questions')
        .update(updates)
        .eq('id', q.id);

      totalUpdated++;
    }
    console.log(`   ✅ ${questions?.length || 0} questions`);
  }

  console.log(`\n✨ Updated ${totalUpdated} questions!`);
}

main().catch(console.error);
