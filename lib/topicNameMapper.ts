/**
 * Topic Name Mapper
 *
 * Maps informal/extracted topic names to official topic names
 * This ensures questions from scans match the official topics in the database
 */

export type Subject = 'Physics' | 'Chemistry' | 'Math' | 'Biology';

// Mapping: [subject][extractedName] = officialName
const topicNameMappings: Record<Subject, Record<string, string>> = {
  Math: {
    // Exact matches (case-insensitive fallback)
    'Applications of Derivatives': 'Applications of Derivatives',
    'Applications of Integrals': 'Applications of Integrals',
    'Continuity and Differentiability': 'Continuity and Differentiability',
    'Determinants': 'Determinants',
    'Differential Equations': 'Differential Equations',
    'Integrals': 'Integrals',
    'Inverse Trigonometric Functions': 'Inverse Trigonometric Functions',
    'Linear Programming': 'Linear Programming',
    'Matrices': 'Matrices',
    'Probability': 'Probability',
    'Relations and Functions': 'Relations and Functions',
    'Three Dimensional Geometry': 'Three Dimensional Geometry',
    'Vectors': 'Vectors',

    // Common variations/mismatches
    '3D Geometry': 'Three Dimensional Geometry',
    '3d Geometry': 'Three Dimensional Geometry',
    'Three-Dimensional Geometry': 'Three Dimensional Geometry',
    'Application of Derivatives': 'Applications of Derivatives',
    'Application of Integrals': 'Applications of Integrals',
    'Differential Equation': 'Differential Equations',
    'Linear Programming Problem': 'Linear Programming',
    'LPP': 'Linear Programming',
    'Inverse Trigonometric Function': 'Inverse Trigonometric Functions',
    'Inverse Trig Functions': 'Inverse Trigonometric Functions',
    'Vector': 'Vectors',
    'Vector Algebra': 'Vectors',
    'Matrix': 'Matrices',
    'Determinant': 'Determinants',
    'Continuity': 'Continuity and Differentiability',
    'Differentiability': 'Continuity and Differentiability',
    'Relations': 'Relations and Functions',
    'Functions': 'Relations and Functions',
    'Function': 'Relations and Functions',
    'Relation and Function': 'Relations and Functions',

    // Generic/unclear mappings - these should be reviewed manually
    'General': null, // Needs manual topic assignment
    'Mathematics': null, // Too generic
    'Algebra': null, // Too broad - which algebra topic?
    'Calculus': null, // Too broad - which calculus topic?
  },

  Physics: {
    // TODO: Add Physics topic mappings
  },

  Chemistry: {
    // TODO: Add Chemistry topic mappings
  },

  Biology: {
    // TODO: Add Biology topic mappings
  }
};

/**
 * Maps an extracted topic name to its official topic name
 *
 * @param extractedName - The topic name from the scan/extraction
 * @param subject - The subject (Math, Physics, etc.)
 * @returns Official topic name, or null if no mapping exists
 */
export function mapTopicName(extractedName: string, subject: Subject): string | null {
  if (!extractedName) return null;

  const subjectMappings = topicNameMappings[subject];
  if (!subjectMappings) return null;

  // Direct lookup (case-sensitive first)
  if (subjectMappings[extractedName]) {
    return subjectMappings[extractedName];
  }

  // Case-insensitive lookup
  const lowerExtracted = extractedName.toLowerCase();
  for (const [key, value] of Object.entries(subjectMappings)) {
    if (key.toLowerCase() === lowerExtracted) {
      return value;
    }
  }

  // No mapping found - return original name
  // The aggregator will try to match it directly
  return extractedName;
}

/**
 * Maps an array of topic names
 */
export function mapTopicNames(extractedNames: string[], subject: Subject): string[] {
  return extractedNames
    .map(name => mapTopicName(name, subject))
    .filter((name): name is string => name !== null);
}

/**
 * Gets all possible variations of a topic name for matching
 * Useful for finding questions that might have slight variations
 */
export function getTopicVariations(officialName: string, subject: Subject): string[] {
  const subjectMappings = topicNameMappings[subject];
  if (!subjectMappings) return [officialName];

  const variations = [officialName];

  for (const [extracted, official] of Object.entries(subjectMappings)) {
    if (official === officialName) {
      variations.push(extracted);
    }
  }

  return variations;
}

/**
 * Debug utility: Shows what a topic name maps to
 */
export function debugTopicMapping(extractedName: string, subject: Subject): void {
  const mapped = mapTopicName(extractedName, subject);
  console.log(`[Topic Mapper] "${extractedName}" (${subject}) → "${mapped || 'NO MAPPING'}"`);
}
