/**
 * OFFICIAL SYLLABUS TOPICS (Class 12)
 *
 * Based on official 2026 syllabi from:
 * - NEET (NTA, Jan 8, 2026)
 * - JEE Main (NTA, 2026)
 * - KCET (KEA, Jan 29, 2026)
 * - Karnataka PUC II (KSEAB, 2025-26)
 *
 * CRITICAL: These topic names MUST match the "topics" table in database.
 * Reference: scripts/seedRealTopics.ts
 * Documentation: syllabi/*.md
 *
 * USE ONLY THESE NAMES when extracting questions from scans.
 */

/**
 * Official Physics Topics (Class 12) - 14 Total
 *
 * Source: NEET/JEE/KCET Physics Class 12 Syllabus
 */
export const OFFICIAL_PHYSICS_TOPICS = [
  'Electric Charges and Fields',
  'Electrostatic Potential and Capacitance',
  'Current Electricity',
  'Moving Charges and Magnetism',
  'Magnetism and Matter',
  'Electromagnetic Induction',
  'Alternating Current',
  'Electromagnetic Waves',
  'Ray Optics and Optical Instruments',
  'Wave Optics',
  'Dual Nature of Radiation and Matter',
  'Atoms',
  'Nuclei',
  'Semiconductor Electronics'
] as const;

/**
 * Official Chemistry Topics (Class 12) - 14 Total
 *
 * Source: NEET/JEE/KCET Chemistry Class 12 Syllabus
 * Note: KCET/PUC II have deleted: Solid State, Polymers, Chemistry in Everyday Life
 */
export const OFFICIAL_CHEMISTRY_TOPICS = [
  'Solutions',
  'Electrochemistry',
  'Chemical Kinetics',
  'Surface Chemistry',
  'General Principles and Processes of Isolation of Elements',
  'p-Block Elements',
  'd and f Block Elements',
  'Coordination Compounds',
  'Haloalkanes and Haloarenes',
  'Alcohols Phenols and Ethers',
  'Aldehydes Ketones and Carboxylic Acids',
  'Amines',
  'Biomolecules',
  'Chemistry in Everyday Life'
] as const;

/**
 * Official Biology Topics (Class 12) - 12 Total
 *
 * Source: NEET/KCET Biology Class 12 Syllabus
 */
export const OFFICIAL_BIOLOGY_TOPICS = [
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
] as const;

/**
 * Official Mathematics Topics (Class 12) - 13 Total
 *
 * Source: JEE Main/KCET Mathematics Class 12 Syllabus
 */
export const OFFICIAL_MATH_TOPICS = [
  'Relations and Functions',
  'Inverse Trigonometric Functions',
  'Matrices',
  'Determinants',
  'Continuity and Differentiability',
  'Applications of Derivatives',
  'Integrals',
  'Applications of Integrals',
  'Differential Equations',
  'Vectors',
  'Three Dimensional Geometry',
  'Linear Programming',
  'Probability'
] as const;

/**
 * All official topics combined
 */
export const ALL_OFFICIAL_TOPICS = [
  ...OFFICIAL_PHYSICS_TOPICS,
  ...OFFICIAL_CHEMISTRY_TOPICS,
  ...OFFICIAL_BIOLOGY_TOPICS,
  ...OFFICIAL_MATH_TOPICS
] as const;

/**
 * Get official topics for a subject
 */
export function getOfficialTopics(subject: string): readonly string[] {
  const normalized = subject.toLowerCase().trim();

  if (normalized === 'physics') return OFFICIAL_PHYSICS_TOPICS;
  if (normalized === 'chemistry') return OFFICIAL_CHEMISTRY_TOPICS;
  if (normalized === 'biology') return OFFICIAL_BIOLOGY_TOPICS;
  if (normalized === 'math' || normalized === 'mathematics') return OFFICIAL_MATH_TOPICS;

  throw new Error(`Unknown subject: ${subject}. Must be Physics, Chemistry, Biology, or Math.`);
}

/**
 * Check if a topic is official
 */
export function isOfficialTopic(topic: string, subject: string): boolean {
  const officialTopics = getOfficialTopics(subject);
  return officialTopics.includes(topic as any);
}

/**
 * Find closest official topic using mapping hints and fuzzy matching
 * Returns the official topic name or null if no match
 */
export function matchToOfficialTopic(userTopic: string, subject: string): string | null {
  const officialTopics = getOfficialTopics(subject);
  const normalized = userTopic.toLowerCase().trim();
  const subjectKey = subject.toLowerCase();

  // Exact match (case-insensitive)
  const exactMatch = officialTopics.find(t => t.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;

  // Check mapping hints first (informal → official)
  const hints = TOPIC_MAPPING_HINTS[subjectKey] || {};
  for (const [informal, official] of Object.entries(hints)) {
    if (informal.toLowerCase() === normalized) {
      return official;
    }
  }

  // Partial match (user topic contains official topic or vice versa)
  const partialMatch = officialTopics.find(t =>
    normalized.includes(t.toLowerCase()) || t.toLowerCase().includes(normalized)
  );
  if (partialMatch) return partialMatch;

  // Fuzzy word-based matching (any word overlap)
  const userWords = normalized.split(/\s+/);
  const bestMatch = officialTopics.find(t => {
    const topicWords = t.toLowerCase().split(/\s+/);
    // Check if any significant word matches (length > 4 to avoid common words)
    return userWords.some(uw =>
      uw.length > 4 && topicWords.some(tw => tw.includes(uw) || uw.includes(tw))
    );
  });
  if (bestMatch) return bestMatch;

  return null;
}

/**
 * Topic mapping hints for common abbreviated names
 *
 * This helps AI understand informal names used in scans
 */
export const TOPIC_MAPPING_HINTS: Record<string, Record<string, string>> = {
  physics: {
    'Electrostatics': 'Electric Charges and Fields',
    'Coulombs Law': 'Electric Charges and Fields',
    'Electric Field': 'Electric Charges and Fields',
    'Capacitors': 'Electrostatic Potential and Capacitance',
    'Current': 'Current Electricity',
    'Ohms Law': 'Current Electricity',
    'Kirchhoffs Laws': 'Current Electricity',
    'Magnetism': 'Moving Charges and Magnetism',
    'Magnetic Force': 'Moving Charges and Magnetism',
    'EM Induction': 'Electromagnetic Induction',
    'Faradays Law': 'Electromagnetic Induction',
    'AC Circuits': 'Alternating Current',
    'Optics': 'Ray Optics and Optical Instruments',
    'Refraction': 'Ray Optics and Optical Instruments',
    'Interference': 'Wave Optics',
    'Diffraction': 'Wave Optics',
    'Photoelectric Effect': 'Dual Nature of Radiation and Matter',
    'Bohrs Model': 'Atoms',
    'Radioactivity': 'Nuclei',
    'Diodes': 'Semiconductor Electronics',
    'Transistors': 'Semiconductor Electronics'
  },
  chemistry: {
    'Raoults Law': 'Solutions',
    'Colligative Properties': 'Solutions',
    'Electrochemical Cells': 'Electrochemistry',
    'Nernst Equation': 'Electrochemistry',
    'Rate of Reaction': 'Chemical Kinetics',
    'Arrhenius Equation': 'Chemical Kinetics',
    'Adsorption': 'Surface Chemistry',
    'Colloids': 'Surface Chemistry',
    'Metallurgy': 'General Principles and Processes of Isolation of Elements',
    'p-Block': 'p-Block Elements',
    'Transition Elements': 'd and f Block Elements',
    'd-Block': 'd and f Block Elements',
    'Coordination Chemistry': 'Coordination Compounds',
    'Haloalkanes': 'Haloalkanes and Haloarenes',
    'Alcohols': 'Alcohols Phenols and Ethers',
    'Phenols': 'Alcohols Phenols and Ethers',
    'Aldehydes': 'Aldehydes Ketones and Carboxylic Acids',
    'Ketones': 'Aldehydes Ketones and Carboxylic Acids',
    'Carboxylic Acids': 'Aldehydes Ketones and Carboxylic Acids',
    'Amines': 'Amines',
    'Carbohydrates': 'Biomolecules',
    'Proteins': 'Biomolecules',
    'Polymers': 'Chemistry in Everyday Life'
  },
  biology: {
    'Reproduction in Plants': 'Sexual Reproduction in Flowering Plants',
    'Pollination': 'Sexual Reproduction in Flowering Plants',
    'Genetics': 'Principles of Inheritance and Variation',
    'Mendels Laws': 'Principles of Inheritance and Variation',
    'DNA': 'Molecular Basis of Inheritance',
    'RNA': 'Molecular Basis of Inheritance',
    'Genetic Engineering': 'Biotechnology Principles and Processes',
    'PCR': 'Biotechnology Principles and Processes',
    'GM Crops': 'Biotechnology and its Applications',
    'Population Ecology': 'Organisms and Populations',
    'Food Chain': 'Ecosystem',
    'Energy Flow': 'Ecosystem',
    'Conservation': 'Biodiversity and Conservation',
    'Gametogenesis': 'Human Reproduction',
    'Fertilization': 'Human Reproduction',
    'Birth Control': 'Reproductive Health',
    'Immunity': 'Human Health and Disease',
    'Vaccines': 'Human Health and Disease',
    'Natural Selection': 'Evolution',
    'Human Evolution': 'Evolution'
  },
  math: {
    'Functions': 'Relations and Functions',
    'Relation': 'Relations and Functions',
    'Function': 'Relations and Functions',
    'Inverse Trig': 'Inverse Trigonometric Functions',
    'Inverse Trigonometric Function': 'Inverse Trigonometric Functions',
    'Matrix': 'Matrices',
    'Determinant': 'Determinants',
    'Limits': 'Continuity and Differentiability',
    'Limits and Derivatives': 'Continuity and Differentiability',
    'Derivatives': 'Continuity and Differentiability',
    'Differentiation': 'Continuity and Differentiability',
    'Continuity': 'Continuity and Differentiability',
    'Differentiability': 'Continuity and Differentiability',
    'Application of Derivatives': 'Applications of Derivatives',
    'Application of Derivative': 'Applications of Derivatives',
    'Maxima Minima': 'Applications of Derivatives',
    'Integration': 'Integrals',
    'Definite Integrals': 'Integrals',
    'Integral': 'Integrals',
    'Application of Integrals': 'Applications of Integrals',
    'Application of Integral': 'Applications of Integrals',
    'Area Under Curve': 'Applications of Integrals',
    'Differential Equations': 'Differential Equations',
    'Differential Equation': 'Differential Equations',
    'Vector Algebra': 'Vectors',
    'Vector': 'Vectors',
    '3D Geometry': 'Three Dimensional Geometry',
    'Three-Dimensional Geometry': 'Three Dimensional Geometry',
    '3d Geometry': 'Three Dimensional Geometry',
    'LPP': 'Linear Programming',
    'Probability Distribution': 'Probability',
    'Statistics': 'Probability',
    'Permutations and Combinations': null,
    'Permutation': null,
    'Combination': null,
    'Sequences and Series': null,
    'Sequence': null,
    'Series': null,
    'Complex Numbers': null,
    'Complex Number': null,
    'General': null,
    'Mathematics': null,
    'Math': null
  }
};

/**
 * Generate AI instruction text for topic selection
 */
export function generateTopicInstruction(subject: string): string {
  const topics = getOfficialTopics(subject);
  const hints = TOPIC_MAPPING_HINTS[subject.toLowerCase()] || {};

  return `## OFFICIAL TOPIC ASSIGNMENT (CRITICAL)

⚠️ IMPORTANT: You MUST use ONLY the official ${subject} Class 12 topic names listed below.
These topics are from the official ${subject === 'Math' ? 'JEE Main' : 'NEET/JEE/KCET'} 2026 syllabus.

### Official ${subject} Topics (Class 12):

${topics.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

### Topic Selection Rules:

1. **USE EXACT NAMES**: Copy the official topic name EXACTLY as written above (including capitalization)
2. **NO INFORMAL NAMES**: Do NOT use shortened names like "Electrostatics", "Current", "Optics"
3. **NO GENERIC NAMES**: NEVER use "General", "Physics", "Mathematics", or empty string
4. **MATCH CONTENT**: Analyze the question content to determine which official topic it belongs to

### Common Mapping (for reference):

${Object.entries(hints).slice(0, 10).map(([informal, official]) =>
  `- If question is about "${informal}" → Use "${official}"`
).join('\n')}

### Examples:

❌ WRONG: "topic": "Electrostatics"
✅ RIGHT: "topic": "Electric Charges and Fields"

❌ WRONG: "topic": "Current"
✅ RIGHT: "topic": "Current Electricity"

❌ WRONG: "topic": "Optics"
✅ RIGHT: "topic": "Ray Optics and Optical Instruments"

❌ WRONG: "topic": "General"
✅ RIGHT: "topic": [Choose the MOST SPECIFIC official topic from the list above]

If a question covers multiple topics, choose the PRIMARY topic.
If unsure, select the topic that covers the MAIN concept being tested.`;
}
