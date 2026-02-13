const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeDomainInconsistencies() {
  console.log('\n=== DOMAIN/CHAPTER ANALYSIS ===\n');

  // Get all scans
  const { data: scans } = await supabase
    .from('scans')
    .select('id, analysis_data')
    .not('analysis_data', 'is', null);

  // Map official topics to their current domains in scans
  const officialTopicDomains = new Map();

  scans.forEach(scan => {
    const questions = scan.analysis_data?.questions || [];
    questions.forEach(q => {
      const topic = q.topic;
      const domain = q.domain || q.chapter || 'none';

      if (!officialTopicDomains.has(topic)) {
        officialTopicDomains.set(topic, new Set());
      }
      officialTopicDomains.get(topic).add(domain);
    });
  });

  // Check for inconsistent domain assignments
  console.log('TOPICS WITH MULTIPLE DOMAINS (Inconsistencies):\n');
  let count = 0;
  officialTopicDomains.forEach((domains, topic) => {
    if (domains.size > 1) {
      count++;
      console.log(`${topic}:`);
      domains.forEach(d => console.log(`  - ${d}`));
      console.log();
    }
  });

  console.log(`Total topics with inconsistent domains: ${count}\n`);

  // Show official topics that should be in topics table
  const officialMathTopics = [
    'Relations and Functions', 'Inverse Trigonometric Functions', 'Matrices',
    'Determinants', 'Continuity and Differentiability', 'Applications of Derivatives',
    'Integrals', 'Applications of Integrals', 'Differential Equations', 'Vectors',
    'Three Dimensional Geometry', 'Linear Programming', 'Probability'
  ];

  const officialPhysicsTopics = [
    'Electric Charges and Fields', 'Electrostatic Potential and Capacitance',
    'Current Electricity', 'Moving Charges and Magnetism', 'Magnetism and Matter',
    'Electromagnetic Induction', 'Alternating Current', 'Electromagnetic Waves',
    'Ray Optics and Optical Instruments', 'Wave Optics',
    'Dual Nature of Radiation and Matter', 'Atoms', 'Nuclei', 'Semiconductor Electronics'
  ];

  console.log('\n=== OFFICIAL TOPIC DOMAIN MAPPING (from scans) ===\n');

  console.log('MATH TOPICS:');
  officialMathTopics.forEach(topic => {
    const domains = officialTopicDomains.get(topic);
    if (domains && domains.size > 0) {
      console.log(`${topic}: ${[...domains].join(', ')}`);
    } else {
      console.log(`${topic}: NOT FOUND IN SCANS`);
    }
  });

  console.log('\nPHYSICS TOPICS:');
  officialPhysicsTopics.forEach(topic => {
    const domains = officialTopicDomains.get(topic);
    if (domains && domains.size > 0) {
      console.log(`${topic}: ${[...domains].join(', ')}`);
    } else {
      console.log(`${topic}: NOT FOUND IN SCANS`);
    }
  });
}

analyzeDomainInconsistencies().catch(console.error);
