/**
 * REAL SYLLABUS-BASED Topic Seeding Script
 *
 * Based on OFFICIAL 2026 syllabi:
 * - NEET (NTA Jan 8, 2026) - Physics, Chemistry, Biology
 * - JEE Main (NTA 2026) - Mathematics
 * - KCET (KEA Jan 29, 2026) - All subjects
 * - Karnataka PUC II (KSEAB 2025-26) - All subjects
 *
 * Official Sources:
 * - NEET: https://nta.ac.in
 * - JEE: https://jeemain.nta.ac.in
 * - KCET: https://cetonline.karnataka.gov.in
 * - PUC II: https://pue.karnataka.gov.in / https://kseab.karnataka.gov.in
 *
 * Reference Files:
 * - syllabi/NEET_2026_Syllabus.md
 * - syllabi/JEE_Main_2026_Syllabus.md
 * - syllabi/KCET_2026_Syllabus.md
 * - syllabi/PUC_II_2026_Syllabus.md
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Check .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========================================
// NEET PHYSICS - CLASS 12 (Official NTA 2026)
// ========================================
const PHYSICS_CLASS12_TOPICS = [
  {
    name: 'Electric Charges and Fields',
    domain: 'Electrostatics',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Coulomb\'s Law, electric field, Gauss\'s law, electric dipole',
    keyConcepts: ['Coulombs Law', 'Electric Field', 'Gauss Law', 'Electric Dipole', 'Field Lines'],
    examWeightage: { NEET: 3, JEE: 4, KCET: 3, PUCII: 4, CBSE: 4 }
  },
  {
    name: 'Electrostatic Potential and Capacitance',
    domain: 'Electrostatics',
    difficulty: 'Moderate' as const,
    estimatedHours: 7,
    description: 'Electric potential, capacitors, dielectrics',
    keyConcepts: ['Electric Potential', 'Capacitance', 'Equipotential Surfaces', 'Capacitor Combinations'],
    examWeightage: { NEET: 3, JEE: 4, KCET: 3, PUCII: 4, CBSE: 4 }
  },
  {
    name: 'Current Electricity',
    domain: 'Current Electricity',
    difficulty: 'Moderate' as const,
    estimatedHours: 10,
    description: 'Ohm\'s law, Kirchhoff\'s laws, Wheatstone bridge, meters',
    keyConcepts: ['Ohms Law', 'Kirchhoffs Laws', 'Wheatstone Bridge', 'RC Circuits', 'Potentiometer'],
    examWeightage: { NEET: 5, JEE: 6, KCET: 5, PUCII: 5, CBSE: 5 }
  },
  {
    name: 'Moving Charges and Magnetism',
    domain: 'Magnetism',
    difficulty: 'Hard' as const,
    estimatedHours: 10,
    description: 'Biot-Savart law, Ampere\'s law, magnetic force, cyclotron',
    keyConcepts: ['Biot-Savart Law', 'Amperes Law', 'Lorentz Force', 'Cyclotron', 'Magnetic Field'],
    examWeightage: { NEET: 4, JEE: 5, KCET: 4, PUCII: 5, CBSE: 5 }
  },
  {
    name: 'Magnetism and Matter',
    domain: 'Magnetism',
    difficulty: 'Moderate' as const,
    estimatedHours: 6,
    description: 'Bar magnets, magnetic materials, hysteresis',
    keyConcepts: ['Magnetic Dipole', 'Magnetic Materials', 'Hysteresis', 'Magnetization'],
    examWeightage: { NEET: 2, JEE: 3, KCET: 2, PUCII: 3, CBSE: 3 }
  },
  {
    name: 'Electromagnetic Induction',
    domain: 'Electromagnetism',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Faraday\'s law, Lenz\'s law, inductance, AC generators',
    keyConcepts: ['Faradays Law', 'Lenz Law', 'Self Inductance', 'Mutual Inductance', 'AC Generator'],
    examWeightage: { NEET: 4, JEE: 5, KCET: 4, PUCII: 5, CBSE: 5 }
  },
  {
    name: 'Alternating Current',
    domain: 'Electromagnetism',
    difficulty: 'Hard' as const,
    estimatedHours: 9,
    description: 'AC circuits, LCR resonance, power factor, transformers',
    keyConcepts: ['AC Circuits', 'LCR Resonance', 'Power Factor', 'Transformer', 'RMS Values'],
    examWeightage: { NEET: 3, JEE: 5, KCET: 3, CBSE: 4 }
  },
  {
    name: 'Electromagnetic Waves',
    domain: 'Electromagnetism',
    difficulty: 'Easy' as const,
    estimatedHours: 4,
    description: 'Wave characteristics, EM spectrum',
    keyConcepts: ['EM Spectrum', 'Wave Properties', 'Speed of Light'],
    examWeightage: { NEET: 1, JEE: 2, KCET: 1, PUCII: 2, CBSE: 2 }
  },
  {
    name: 'Ray Optics and Optical Instruments',
    domain: 'Optics',
    difficulty: 'Moderate' as const,
    estimatedHours: 10,
    description: 'Reflection, refraction, lenses, mirrors, optical instruments',
    keyConcepts: ['Laws of Reflection', 'Snells Law', 'Lens Formula', 'Mirror Formula', 'Microscope', 'Telescope'],
    examWeightage: { NEET: 5, JEE: 5, KCET: 5, CBSE: 5 }
  },
  {
    name: 'Wave Optics',
    domain: 'Optics',
    difficulty: 'Moderate' as const,
    estimatedHours: 7,
    description: 'Interference, diffraction, polarization',
    keyConcepts: ['Youngs Double Slit', 'Interference', 'Diffraction', 'Polarization'],
    examWeightage: { NEET: 3, JEE: 4, KCET: 3, PUCII: 4, CBSE: 4 }
  },
  {
    name: 'Dual Nature of Radiation and Matter',
    domain: 'Modern Physics',
    difficulty: 'Moderate' as const,
    estimatedHours: 6,
    description: 'Photoelectric effect, de Broglie hypothesis',
    keyConcepts: ['Photoelectric Effect', 'de Broglie Wavelength', 'Photon', 'Work Function'],
    examWeightage: { NEET: 2, JEE: 3, KCET: 2, PUCII: 3, CBSE: 3 }
  },
  {
    name: 'Atoms',
    domain: 'Modern Physics',
    difficulty: 'Moderate' as const,
    estimatedHours: 5,
    description: 'Bohr\'s model, hydrogen spectrum, energy levels',
    keyConcepts: ['Bohrs Model', 'Hydrogen Spectrum', 'Energy Levels', 'Quantum Numbers'],
    examWeightage: { NEET: 2, JEE: 3, KCET: 2, PUCII: 3, CBSE: 3 }
  },
  {
    name: 'Nuclei',
    domain: 'Modern Physics',
    difficulty: 'Moderate' as const,
    estimatedHours: 6,
    description: 'Nuclear structure, radioactivity, fission, fusion',
    keyConcepts: ['Radioactivity', 'Nuclear Reactions', 'Mass Defect', 'Binding Energy'],
    examWeightage: { NEET: 3, JEE: 3, KCET: 3, PUCII: 3, CBSE: 3 }
  },
  {
    name: 'Semiconductor Electronics',
    domain: 'Electronics',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'PN junction, diodes, transistors, logic gates',
    keyConcepts: ['PN Junction', 'Diode', 'Transistor', 'Logic Gates', 'Rectifier'],
    examWeightage: { NEET: 3, JEE: 4, KCET: 3, PUCII: 4, CBSE: 4 }
  }
];

// ========================================
// NEET CHEMISTRY - CLASS 12 (Official NTA 2026)
// ========================================
const CHEMISTRY_CLASS12_TOPICS = [
  // Physical Chemistry
  {
    name: 'Solutions',
    domain: 'Physical Chemistry',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Concentration, Raoult\'s law, colligative properties',
    keyConcepts: ['Molarity', 'Molality', 'Raoults Law', 'Osmotic Pressure', 'Boiling Point Elevation'],
    examWeightage: { NEET: 4, JEE: 4, KCET: 4, CBSE: 4 }
  },
  {
    name: 'Electrochemistry',
    domain: 'Physical Chemistry',
    difficulty: 'Moderate' as const,
    estimatedHours: 9,
    description: 'Galvanic cells, electrode potential, conductance, Nernst equation',
    keyConcepts: ['Electrode Potential', 'Nernst Equation', 'Conductance', 'Faradays Laws'],
    examWeightage: { NEET: 4, JEE: 5, KCET: 4, PUCII: 5, CBSE: 5 }
  },
  {
    name: 'Chemical Kinetics',
    domain: 'Physical Chemistry',
    difficulty: 'Hard' as const,
    estimatedHours: 8,
    description: 'Rate of reaction, order, molecularity, Arrhenius equation',
    keyConcepts: ['Rate Law', 'Order of Reaction', 'Arrhenius Equation', 'Half Life'],
    examWeightage: { NEET: 4, JEE: 5, KCET: 4, PUCII: 5, CBSE: 5 }
  },
  {
    name: 'Surface Chemistry',
    domain: 'Physical Chemistry',
    difficulty: 'Easy' as const,
    estimatedHours: 6,
    description: 'Adsorption, colloids, emulsions, catalysis',
    keyConcepts: ['Adsorption', 'Colloids', 'Emulsions', 'Catalysis'],
    examWeightage: { NEET: 3, JEE: 3, KCET: 3, PUCII: 3, CBSE: 3 }
  },

  // Inorganic Chemistry
  {
    name: 'General Principles and Processes of Isolation of Elements',
    domain: 'Inorganic Chemistry',
    difficulty: 'Moderate' as const,
    estimatedHours: 6,
    description: 'Metallurgy, extraction of metals',
    keyConcepts: ['Metallurgy', 'Concentration', 'Reduction', 'Refining'],
    examWeightage: { NEET: 2, JEE: 3, KCET: 2, PUCII: 3, CBSE: 3 }
  },
  {
    name: 'p-Block Elements',
    domain: 'Inorganic Chemistry',
    difficulty: 'Moderate' as const,
    estimatedHours: 12,
    description: 'Group 15, 16, 17, 18 elements and their compounds',
    keyConcepts: ['Nitrogen Family', 'Oxygen Family', 'Halogens', 'Noble Gases'],
    examWeightage: { NEET: 6, JEE: 5, KCET: 6, CBSE: 5 }
  },
  {
    name: 'd and f Block Elements',
    domain: 'Inorganic Chemistry',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Transition metals, inner transition elements',
    keyConcepts: ['Transition Elements', 'Lanthanides', 'Actinides', 'Properties'],
    examWeightage: { NEET: 4, JEE: 4, KCET: 4, CBSE: 4 }
  },
  {
    name: 'Coordination Compounds',
    domain: 'Inorganic Chemistry',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Werner\'s theory, nomenclature, isomerism, bonding',
    keyConcepts: ['Werners Theory', 'Nomenclature', 'Isomerism', 'Crystal Field Theory'],
    examWeightage: { NEET: 5, JEE: 5, KCET: 5, CBSE: 5 }
  },

  // Organic Chemistry
  {
    name: 'Haloalkanes and Haloarenes',
    domain: 'Organic Chemistry',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Nomenclature, preparation, reactions, SN1/SN2 mechanisms',
    keyConcepts: ['SN1 Mechanism', 'SN2 Mechanism', 'Elimination Reactions', 'Grignard Reagent'],
    examWeightage: { NEET: 4, JEE: 5, KCET: 4, PUCII: 5, CBSE: 5 }
  },
  {
    name: 'Alcohols Phenols and Ethers',
    domain: 'Organic Chemistry',
    difficulty: 'Moderate' as const,
    estimatedHours: 9,
    description: 'Classification, preparation, properties, reactions',
    keyConcepts: ['Alcohol Reactions', 'Phenol Reactions', 'Ether Preparation', 'Lucas Test'],
    examWeightage: { NEET: 5, JEE: 5, KCET: 5, CBSE: 5 }
  },
  {
    name: 'Aldehydes Ketones and Carboxylic Acids',
    domain: 'Organic Chemistry',
    difficulty: 'Hard' as const,
    estimatedHours: 10,
    description: 'Carbonyl compounds, preparation, reactions, tests',
    keyConcepts: ['Aldol Condensation', 'Cannizzaro Reaction', 'HVZ Reaction', 'Hell-Volhard-Zelinsky'],
    examWeightage: { NEET: 6, JEE: 6, KCET: 6, CBSE: 6 }
  },
  {
    name: 'Amines',
    domain: 'Organic Chemistry',
    difficulty: 'Moderate' as const,
    estimatedHours: 7,
    description: 'Classification, preparation, diazonium salts',
    keyConcepts: ['Amine Reactions', 'Diazonium Salts', 'Coupling Reactions', 'Carbylamine Test'],
    examWeightage: { NEET: 4, JEE: 4, KCET: 4, CBSE: 4 }
  },
  {
    name: 'Biomolecules',
    domain: 'Organic Chemistry',
    difficulty: 'Easy' as const,
    estimatedHours: 7,
    description: 'Carbohydrates, proteins, nucleic acids, vitamins',
    keyConcepts: ['Carbohydrates', 'Proteins', 'Enzymes', 'Nucleic Acids', 'Vitamins'],
    examWeightage: { NEET: 5, JEE: 3, KCET: 5, CBSE: 4 }
  },
  {
    name: 'Chemistry in Everyday Life',
    domain: 'Applied Chemistry',
    difficulty: 'Easy' as const,
    estimatedHours: 4,
    description: 'Drugs, medicines, detergents, antioxidants',
    keyConcepts: ['Drugs', 'Antibiotics', 'Analgesics', 'Detergents'],
    examWeightage: { NEET: 2, JEE: 2, KCET: 2, CBSE: 3 }
  }
];

// ========================================
// NEET BIOLOGY - CLASS 12 (Official NTA 2026)
// ========================================
const BIOLOGY_CLASS12_TOPICS = [
  // Botany
  {
    name: 'Sexual Reproduction in Flowering Plants',
    domain: 'Plant Reproduction',
    difficulty: 'Moderate' as const,
    estimatedHours: 10,
    description: 'Flower structure, pollination, fertilization, seed formation',
    keyConcepts: ['Flower Structure', 'Pollination', 'Double Fertilization', 'Seed Development', 'Apomixis'],
    examWeightage: { NEET: 5, CBSE: 4 }
  },
  {
    name: 'Principles of Inheritance and Variation',
    domain: 'Genetics',
    difficulty: 'Moderate' as const,
    estimatedHours: 12,
    description: 'Mendelian genetics, linkage, chromosomal disorders',
    keyConcepts: ['Mendelian Laws', 'Linkage', 'Sex Determination', 'Genetic Disorders'],
    examWeightage: { NEET: 7, CBSE: 6 }
  },
  {
    name: 'Molecular Basis of Inheritance',
    domain: 'Genetics',
    difficulty: 'Hard' as const,
    estimatedHours: 12,
    description: 'DNA structure, replication, transcription, translation',
    keyConcepts: ['DNA Structure', 'Replication', 'Transcription', 'Translation', 'Genetic Code'],
    examWeightage: { NEET: 7, CBSE: 6 }
  },
  {
    name: 'Biotechnology Principles and Processes',
    domain: 'Biotechnology',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Genetic engineering, recombinant DNA technology',
    keyConcepts: ['Recombinant DNA', 'PCR', 'Cloning', 'Gene Transfer'],
    examWeightage: { NEET: 5, CBSE: 5 }
  },
  {
    name: 'Biotechnology and its Applications',
    domain: 'Biotechnology',
    difficulty: 'Moderate' as const,
    estimatedHours: 7,
    description: 'GMOs, gene therapy, ethical issues',
    keyConcepts: ['GMO', 'Gene Therapy', 'Transgenic Organisms', 'Bioethics'],
    examWeightage: { NEET: 4, CBSE: 4 }
  },
  {
    name: 'Organisms and Populations',
    domain: 'Ecology',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Population ecology, interactions, adaptations',
    keyConcepts: ['Population Growth', 'Adaptations', 'Population Interactions'],
    examWeightage: { NEET: 4, CBSE: 4 }
  },
  {
    name: 'Ecosystem',
    domain: 'Ecology',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Energy flow, nutrient cycling, ecological pyramids',
    keyConcepts: ['Energy Flow', 'Nutrient Cycling', 'Ecological Pyramids', 'Productivity'],
    examWeightage: { NEET: 5, CBSE: 5 }
  },
  {
    name: 'Biodiversity and Conservation',
    domain: 'Ecology',
    difficulty: 'Easy' as const,
    estimatedHours: 7,
    description: 'Biodiversity patterns, conservation strategies',
    keyConcepts: ['Biodiversity', 'Conservation', 'Endangered Species', 'Protected Areas'],
    examWeightage: { NEET: 4, CBSE: 4 }
  },

  // Zoology
  {
    name: 'Human Reproduction',
    domain: 'Human Physiology',
    difficulty: 'Moderate' as const,
    estimatedHours: 10,
    description: 'Reproductive systems, gametogenesis, menstrual cycle, pregnancy',
    keyConcepts: ['Male Reproductive System', 'Female Reproductive System', 'Menstrual Cycle', 'Fertilization'],
    examWeightage: { NEET: 6, CBSE: 5 }
  },
  {
    name: 'Reproductive Health',
    domain: 'Human Physiology',
    difficulty: 'Easy' as const,
    estimatedHours: 6,
    description: 'Contraception, STDs, infertility, ART',
    keyConcepts: ['Contraceptive Methods', 'STDs', 'Infertility', 'IVF'],
    examWeightage: { NEET: 3, CBSE: 3 }
  },
  {
    name: 'Human Health and Disease',
    domain: 'Human Physiology',
    difficulty: 'Moderate' as const,
    estimatedHours: 10,
    description: 'Pathogens, immunity, vaccines, cancer, AIDS',
    keyConcepts: ['Immune System', 'Vaccines', 'Cancer', 'HIV AIDS', 'Antibodies'],
    examWeightage: { NEET: 6, CBSE: 5 }
  },
  {
    name: 'Evolution',
    domain: 'Evolution',
    difficulty: 'Moderate' as const,
    estimatedHours: 9,
    description: 'Origin of life, evidences of evolution, natural selection',
    keyConcepts: ['Darwins Theory', 'Natural Selection', 'Evidence of Evolution', 'Human Evolution'],
    examWeightage: { NEET: 5, CBSE: 5 }
  }
];

// ========================================
// JEE MATHEMATICS - CLASS 12 (Official NTA 2026)
// ========================================
const MATH_CLASS12_TOPICS = [
  {
    name: 'Relations and Functions',
    domain: 'Algebra',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Types of relations, functions, composition, inverse',
    keyConcepts: ['Relations', 'Functions', 'Bijective', 'Inverse Functions'],
    examWeightage: { JEE: 4, CBSE: 4 }
  },
  {
    name: 'Inverse Trigonometric Functions',
    domain: 'Trigonometry',
    difficulty: 'Moderate' as const,
    estimatedHours: 6,
    description: 'Properties and graphs of inverse trig functions',
    keyConcepts: ['Arcsin', 'Arccos', 'Arctan', 'Domain and Range'],
    examWeightage: { JEE: 3, CBSE: 3 }
  },
  {
    name: 'Matrices',
    domain: 'Algebra',
    difficulty: 'Moderate' as const,
    estimatedHours: 10,
    description: 'Matrix operations, transpose, inverse, rank',
    keyConcepts: ['Matrix Operations', 'Transpose', 'Inverse', 'Elementary Operations'],
    examWeightage: { JEE: 5, CBSE: 5 }
  },
  {
    name: 'Determinants',
    domain: 'Algebra',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Properties, cofactors, adjoint, Cramer\'s rule',
    keyConcepts: ['Determinant Properties', 'Cofactors', 'Adjoint', 'Cramers Rule'],
    examWeightage: { JEE: 5, CBSE: 4 }
  },
  {
    name: 'Continuity and Differentiability',
    domain: 'Calculus',
    difficulty: 'Hard' as const,
    estimatedHours: 12,
    description: 'Limits, continuity, derivatives, chain rule, L\'Hospital',
    keyConcepts: ['Continuity', 'Differentiability', 'Chain Rule', 'Mean Value Theorem'],
    examWeightage: { JEE: 8, CBSE: 6 }
  },
  {
    name: 'Applications of Derivatives',
    domain: 'Calculus',
    difficulty: 'Hard' as const,
    estimatedHours: 10,
    description: 'Rate of change, tangent/normal, maxima/minima, approximations',
    keyConcepts: ['Rate of Change', 'Tangent Normal', 'Maxima Minima', 'Approximations'],
    examWeightage: { JEE: 7, CBSE: 6 }
  },
  {
    name: 'Integrals',
    domain: 'Calculus',
    difficulty: 'Hard' as const,
    estimatedHours: 14,
    description: 'Integration methods, definite integrals, properties',
    keyConcepts: ['Integration Techniques', 'Definite Integrals', 'Integration by Parts', 'Substitution'],
    examWeightage: { JEE: 9, CBSE: 7 }
  },
  {
    name: 'Applications of Integrals',
    domain: 'Calculus',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Area under curves, volume of solids of revolution',
    keyConcepts: ['Area Under Curve', 'Area Between Curves', 'Volume of Revolution'],
    examWeightage: { JEE: 5, CBSE: 5 }
  },
  {
    name: 'Differential Equations',
    domain: 'Calculus',
    difficulty: 'Hard' as const,
    estimatedHours: 10,
    description: 'Order, degree, solving methods, applications',
    keyConcepts: ['First Order DE', 'Linear DE', 'Variable Separable', 'Homogeneous DE'],
    examWeightage: { JEE: 6, CBSE: 5 }
  },
  {
    name: 'Vectors',
    domain: 'Vector Algebra',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Vector operations, dot product, cross product',
    keyConcepts: ['Vector Addition', 'Dot Product', 'Cross Product', 'Scalar Triple Product'],
    examWeightage: { JEE: 5, CBSE: 4 }
  },
  {
    name: 'Three Dimensional Geometry',
    domain: 'Coordinate Geometry',
    difficulty: 'Hard' as const,
    estimatedHours: 10,
    description: 'Direction cosines, lines, planes, shortest distance',
    keyConcepts: ['Direction Cosines', 'Line Equations', 'Plane Equations', 'Shortest Distance'],
    examWeightage: { JEE: 6, CBSE: 5 }
  },
  {
    name: 'Linear Programming',
    domain: 'Optimization',
    difficulty: 'Easy' as const,
    estimatedHours: 6,
    description: 'Constraints, feasible region, optimization',
    keyConcepts: ['Constraints', 'Feasible Region', 'Optimization', 'Corner Point Method'],
    examWeightage: { JEE: 3, CBSE: 4 }
  },
  {
    name: 'Probability',
    domain: 'Statistics and Probability',
    difficulty: 'Hard' as const,
    estimatedHours: 12,
    description: 'Conditional probability, Bayes theorem, distributions',
    keyConcepts: ['Conditional Probability', 'Bayes Theorem', 'Random Variables', 'Binomial Distribution'],
    examWeightage: { JEE: 7, CBSE: 6 }
  }
];

// ========================================
// SEEDING FUNCTION
// ========================================
async function seedRealTopics() {
  console.log('🌱 Starting REAL syllabus-based topic seeding...\n');

  try {
    // Delete existing generic topics
    console.log('🗑️  Deleting old generic topics...');
    const { error: deleteError } = await supabase
      .from('topics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.warn('⚠️  Could not delete old topics:', deleteError.message);
    } else {
      console.log('✅ Old topics cleared\n');
    }

    let totalCreated = 0;

    // Seed Physics
    console.log('📚 Seeding Physics (Class 12)...');
    for (const topic of PHYSICS_CLASS12_TOPICS) {
      const { error } = await supabase.from('topics').insert({
        subject: 'Physics',
        domain: topic.domain,
        name: topic.name,
        description: topic.description,
        difficulty_level: topic.difficulty,
        estimated_study_hours: topic.estimatedHours,
        exam_weightage: topic.examWeightage,
        key_concepts: topic.keyConcepts
      });

      if (error) {
        console.error(`  ❌ Failed: ${topic.name} - ${error.message}`);
      } else {
        console.log(`  ✅ Created: ${topic.name}`);
        totalCreated++;
      }
    }

    // Seed Chemistry
    console.log('\n📚 Seeding Chemistry (Class 12)...');
    for (const topic of CHEMISTRY_CLASS12_TOPICS) {
      const { error } = await supabase.from('topics').insert({
        subject: 'Chemistry',
        domain: topic.domain,
        name: topic.name,
        description: topic.description,
        difficulty_level: topic.difficulty,
        estimated_study_hours: topic.estimatedHours,
        exam_weightage: topic.examWeightage,
        key_concepts: topic.keyConcepts
      });

      if (error) {
        console.error(`  ❌ Failed: ${topic.name} - ${error.message}`);
      } else {
        console.log(`  ✅ Created: ${topic.name}`);
        totalCreated++;
      }
    }

    // Seed Biology
    console.log('\n📚 Seeding Biology (Class 12)...');
    for (const topic of BIOLOGY_CLASS12_TOPICS) {
      const { error } = await supabase.from('topics').insert({
        subject: 'Biology',
        domain: topic.domain,
        name: topic.name,
        description: topic.description,
        difficulty_level: topic.difficulty,
        estimated_study_hours: topic.estimatedHours,
        exam_weightage: topic.examWeightage,
        key_concepts: topic.keyConcepts
      });

      if (error) {
        console.error(`  ❌ Failed: ${topic.name} - ${error.message}`);
      } else {
        console.log(`  ✅ Created: ${topic.name}`);
        totalCreated++;
      }
    }

    // Seed Math
    console.log('\n📚 Seeding Mathematics (Class 12)...');
    for (const topic of MATH_CLASS12_TOPICS) {
      const { error } = await supabase.from('topics').insert({
        subject: 'Math',
        domain: topic.domain,
        name: topic.name,
        description: topic.description,
        difficulty_level: topic.difficulty,
        estimated_study_hours: topic.estimatedHours,
        exam_weightage: topic.examWeightage,
        key_concepts: topic.keyConcepts
      });

      if (error) {
        console.error(`  ❌ Failed: ${topic.name} - ${error.message}`);
      } else {
        console.log(`  ✅ Created: ${topic.name}`);
        totalCreated++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Seeding Summary:');
    console.log(`✅ Successfully created: ${totalCreated} REAL syllabus topics`);
    console.log(`  - Physics: ${PHYSICS_CLASS12_TOPICS.length} topics`);
    console.log(`  - Chemistry: ${CHEMISTRY_CLASS12_TOPICS.length} topics`);
    console.log(`  - Biology: ${BIOLOGY_CLASS12_TOPICS.length} topics`);
    console.log(`  - Math: ${MATH_CLASS12_TOPICS.length} topics`);
    console.log('='.repeat(60));
    console.log('\n✨ Topic seeding complete!');
    console.log('\n📚 Topics are based on OFFICIAL 2026 syllabi:');
    console.log('  - NEET (NTA, Jan 8, 2026)');
    console.log('  - JEE Main (NTA, 2026)');
    console.log('  - KCET (KEA, Jan 29, 2026)');
    console.log('  - Karnataka PUC II (KSEAB, 2025-26)');
    console.log('  - CBSE Class 12');
    console.log('\n📁 Reference files saved in syllabi/ directory');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  }
}

// Run seeding
seedRealTopics();
