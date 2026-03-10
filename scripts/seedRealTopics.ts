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
// NEET PHYSICS - CLASS 11 (Official NTA 2026)
// ========================================
const PHYSICS_CLASS11_TOPICS = [
  { name: 'Units and Measurements', domain: 'General Physics', difficulty: 'Easy' as const, estimatedHours: 4, description: 'SI units, dimensional analysis, errors', keyConcepts: ['SI Units', 'Dimensional Analysis', 'Significant Figures'], examWeightage: { NEET: 2, JEE: 2, KCET: 2, CBSE: 2 } },
  { name: 'Motion in a Straight Line', domain: 'Kinematics', difficulty: 'Easy' as const, estimatedHours: 6, description: 'Position, speed, velocity, acceleration', keyConcepts: ['Velocity', 'Acceleration', 'Kinematic Equations'], examWeightage: { NEET: 2, JEE: 2, KCET: 2, CBSE: 3 } },
  { name: 'Motion in a Plane', domain: 'Kinematics', difficulty: 'Moderate' as const, estimatedHours: 8, description: 'Vectors, projectile motion, circular motion', keyConcepts: ['Vectors', 'Projectile Motion', 'Circular Motion'], examWeightage: { NEET: 3, JEE: 3, KCET: 3, CBSE: 3 } },
  { name: 'Laws of Motion', domain: 'Mechanics', difficulty: 'Moderate' as const, estimatedHours: 10, description: 'Newtons laws, friction, dynamics', keyConcepts: ['Newtons Laws', 'Friction', 'Free Body Diagrams'], examWeightage: { NEET: 3, JEE: 4, KCET: 4, CBSE: 4 } },
  { name: 'Work, Energy and Power', domain: 'Mechanics', difficulty: 'Moderate' as const, estimatedHours: 8, description: 'Work-energy theorem, potential energy, collisions', keyConcepts: ['Work', 'Kinetic Energy', 'Potential Energy', 'Collisions'], examWeightage: { NEET: 4, JEE: 4, KCET: 4, CBSE: 4 } },
  { name: 'System of Particles and Rotational Motion', domain: 'Mechanics', difficulty: 'Hard' as const, estimatedHours: 12, description: 'Center of mass, torque, angular momentum', keyConcepts: ['Torque', 'Angular Momentum', 'Moment of Inertia'], examWeightage: { NEET: 3, JEE: 4, KCET: 3, CBSE: 4 } },
  { name: 'Gravitation', domain: 'Mechanics', difficulty: 'Moderate' as const, estimatedHours: 7, description: 'Keplers laws, universal law of gravitation', keyConcepts: ['Universal Gravitation', 'Gravitational Potential', 'Keplers Laws'], examWeightage: { NEET: 2, JEE: 3, KCET: 2, CBSE: 3 } },
  { name: 'Mechanical Properties of Solids', domain: 'Properties of Matter', difficulty: 'Easy' as const, estimatedHours: 5, description: 'Elasticity, stress, strain', keyConcepts: ['Stress', 'Strain', 'Hookes Law'], examWeightage: { NEET: 1, JEE: 2, KCET: 1, CBSE: 2 } },
  { name: 'Mechanical Properties of Fluids', domain: 'Properties of Matter', difficulty: 'Moderate' as const, estimatedHours: 8, description: 'Pressure, viscosity, surface tension', keyConcepts: ['Viscosity', 'Surface Tension', 'Bernoullis Principle'], examWeightage: { NEET: 2, JEE: 3, KCET: 2, CBSE: 3 } },
  { name: 'Thermal Properties of Matter', domain: 'Heat', difficulty: 'Moderate' as const, estimatedHours: 6, description: 'Specific heat, latent heat, heat transfer', keyConcepts: ['Specific Heat', 'Conduction', 'Radiation'], examWeightage: { NEET: 2, JEE: 2, KCET: 2, CBSE: 2 } },
  { name: 'Thermodynamics', domain: 'Heat', difficulty: 'Moderate' as const, estimatedHours: 9, description: 'Laws of thermodynamics, heat engines', keyConcepts: ['First Law', 'Entropy', 'Second Law'], examWeightage: { NEET: 3, JEE: 4, KCET: 3, CBSE: 3 } },
  { name: 'Kinetic Theory', domain: 'Heat', difficulty: 'Easy' as const, estimatedHours: 5, description: 'Ideal gases, mean free path', keyConcepts: ['Ideal Gas Law', 'RMS Velocity', 'Boltzman Constant'], examWeightage: { NEET: 2, JEE: 2, KCET: 2, CBSE: 2 } },
  { name: 'Oscillations', domain: 'Waves', difficulty: 'Moderate' as const, estimatedHours: 8, description: 'SHM, energy in SHM', keyConcepts: ['SHM', 'Frequency', 'Amplitude'], examWeightage: { NEET: 2, JEE: 3, KCET: 3, CBSE: 3 } },
  { name: 'Waves', domain: 'Waves', difficulty: 'Moderate' as const, estimatedHours: 9, description: 'Transverse, longitudinal, sound waves', keyConcepts: ['Wave Speed', 'Doppler Effect', 'Interference'], examWeightage: { NEET: 3, JEE: 3, KCET: 3, CBSE: 4 } },
  { name: 'General Physics', domain: 'General', difficulty: 'Moderate' as const, estimatedHours: 10, description: 'Miscellaneous concepts', keyConcepts: ['General Concepts'], examWeightage: { NEET: 1, JEE: 1, KCET: 1, CBSE: 1 } }
];

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
// NEET CHEMISTRY - CLASS 11 (Official NTA 2026)
// ========================================
const CHEMISTRY_CLASS11_TOPICS = [
  { name: 'Some Basic Concepts of Chemistry', domain: 'Physical Chemistry', difficulty: 'Easy' as const, estimatedHours: 6, description: 'Mole concept, stoichiometry', keyConcepts: ['Mole', 'Molarity', 'Stoichiometry'], examWeightage: { NEET: 2, JEE: 2, KCET: 2, CBSE: 3 } },
  { name: 'Structure of Atom', domain: 'Physical Chemistry', difficulty: 'Moderate' as const, estimatedHours: 10, description: 'Quantum numbers, orbital shapes', keyConcepts: ['Orbitals', 'Quantum Numbers', 'Photoelectric Effect'], examWeightage: { NEET: 3, JEE: 3, KCET: 3, CBSE: 4 } },
  { name: 'Classification of Elements and Periodicity in Properties', domain: 'Inorganic Chemistry', difficulty: 'Easy' as const, estimatedHours: 5, description: 'Periodic table, trends', keyConcepts: ['Atomic Radius', 'Electronegativity', 'Ionization Energy'], examWeightage: { NEET: 2, JEE: 2, KCET: 2, CBSE: 2 } },
  { name: 'Chemical Bonding and Molecular Structure', domain: 'Physical Chemistry', difficulty: 'Hard' as const, estimatedHours: 12, description: 'VSEPR, hybridization, MOT', keyConcepts: ['Hybridization', 'VSEPR', 'Molecular Orbitals'], examWeightage: { NEET: 4, JEE: 4, KCET: 4, CBSE: 5 } },
  { name: 'States of Matter', domain: 'Physical Chemistry', difficulty: 'Moderate' as const, estimatedHours: 7, description: 'Gas laws, Dalton\'s law', keyConcepts: ['Gas Laws', 'Liquefaction'], examWeightage: { NEET: 2, JEE: 3, KCET: 2, CBSE: 2 } },
  { name: 'Thermodynamics', domain: 'Physical Chemistry', difficulty: 'Hard' as const, estimatedHours: 10, description: 'Enthalpy, entropy, Gibbs energy', keyConcepts: ['Enthalpy', 'Gibbs Free Energy', 'Laws of Thermo'], examWeightage: { NEET: 4, JEE: 5, KCET: 4, CBSE: 4 } },
  { name: 'Equilibrium', domain: 'Physical Chemistry', difficulty: 'Hard' as const, estimatedHours: 14, description: 'Chemical and ionic equilibrium', keyConcepts: ['Le Chateliers Principle', 'pH', 'Buffer Solutions'], examWeightage: { NEET: 4, JEE: 4, KCET: 4, CBSE: 5 } },
  { name: 'Redox Reactions', domain: 'Physical Chemistry', difficulty: 'Easy' as const, estimatedHours: 6, description: 'Oxidation numbers, balancing', keyConcepts: ['Oxidation Number', 'Balancing Equations'], examWeightage: { NEET: 2, JEE: 2, KCET: 2, CBSE: 2 } },
  { name: 'Hydrogen', domain: 'Inorganic Chemistry', difficulty: 'Easy' as const, estimatedHours: 4, description: 'Isotopes, compounds of hydrogen', keyConcepts: ['Hydrides', 'Hardness of Water'], examWeightage: { NEET: 1, JEE: 1, KCET: 1, CBSE: 2 } },
  { name: 's-Block Elements', domain: 'Inorganic Chemistry', difficulty: 'Moderate' as const, estimatedHours: 8, description: 'Alkali and alkaline earth metals', keyConcepts: ['Reactivity', 'Solubility'], examWeightage: { NEET: 2, JEE: 2, KCET: 2, CBSE: 2 } },
  { name: 'Organic Chemistry: Some Basic Principles and Techniques', domain: 'Organic Chemistry', difficulty: 'Moderate' as const, estimatedHours: 12, description: 'IUPAC, purification, mechanisms', keyConcepts: ['Nomenclature', 'Inductive Effect', 'Resonance'], examWeightage: { NEET: 4, JEE: 4, KCET: 4, CBSE: 5 } },
  { name: 'Hydrocarbons', domain: 'Organic Chemistry', difficulty: 'Moderate' as const, estimatedHours: 10, description: 'Alkanes, alkenes, alkynes, aromatics', keyConcepts: ['Aromaticity', 'Addition Reactions', 'Alkyne Preparation'], examWeightage: { NEET: 4, JEE: 4, KCET: 4, CBSE: 5 } },
  { name: 'Environmental Chemistry', domain: 'Applied Chemistry', difficulty: 'Easy' as const, estimatedHours: 4, description: 'Pollution, types of pollutants', keyConcepts: ['Greenhouse Effect', 'Smog'], examWeightage: { NEET: 1, JEE: 1, KCET: 1, CBSE: 2 } },
  { name: 'General Chemistry', domain: 'General', difficulty: 'Moderate' as const, estimatedHours: 10, description: 'Miscellaneous concepts', keyConcepts: ['General Concepts'], examWeightage: { NEET: 1, JEE: 1, KCET: 1, CBSE: 1 } }
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
// NEET BIOLOGY - CLASS 11 (Official NTA 2026)
// ========================================
const BIOLOGY_CLASS11_TOPICS = [
  { name: 'The Living World', domain: 'Botany', difficulty: 'Easy' as const, estimatedHours: 4, description: 'Classification, taxonomy', keyConcepts: ['Binomial Nomenclature'], examWeightage: { NEET: 1, CBSE: 1 } },
  { name: 'Biological Classification', domain: 'Botany', difficulty: 'Moderate' as const, estimatedHours: 7, description: 'Five kingdom classification', keyConcepts: ['Monera', 'Protista', 'Fungi'], examWeightage: { NEET: 3, CBSE: 2 } },
  { name: 'Plant Kingdom', domain: 'Botany', difficulty: 'Moderate' as const, estimatedHours: 8, description: 'Algae, bryophyta, pteridophyta', keyConcepts: ['Gymnosperms', 'Angiosperms', 'Alternation of Generation'], examWeightage: { NEET: 3, CBSE: 3 } },
  { name: 'Animal Kingdom', domain: 'Zoology', difficulty: 'Moderate' as const, estimatedHours: 10, description: 'Classification of animals', keyConcepts: ['Chordata', 'Non-Chordata', 'Mammals'], examWeightage: { NEET: 4, CBSE: 4 } },
  { name: 'Morphology of Flowering Plants', domain: 'Botany', difficulty: 'Moderate' as const, estimatedHours: 7, description: 'Plant parts and types', keyConcepts: ['Root', 'Stem', 'Leaf', 'Inflorescence'], examWeightage: { NEET: 3, CBSE: 3 } },
  { name: 'Anatomy of Flowering Plants', domain: 'Botany', difficulty: 'Hard' as const, estimatedHours: 8, description: 'Tissues and structural detail', keyConcepts: ['Xylem', 'Phloem', 'Primary Growth'], examWeightage: { NEET: 3, CBSE: 3 } },
  { name: 'Structural Organisation in Animals', domain: 'Zoology', difficulty: 'Moderate' as const, estimatedHours: 7, description: 'Animal tissues', keyConcepts: ['Epithelium', 'Connective Tissue', 'Muscle'], examWeightage: { NEET: 2, CBSE: 2 } },
  { name: 'Cell: The Unit of Life', domain: 'Botany', difficulty: 'Moderate' as const, estimatedHours: 8, description: 'Cell structure and functions', keyConcepts: ['Prokaryote', 'Eukaryote', 'Organelles'], examWeightage: { NEET: 4, CBSE: 4 } },
  { name: 'Biomolecules', domain: 'Botany', difficulty: 'Hard' as const, estimatedHours: 10, description: 'Enzymes, proteins, carbs', keyConcepts: ['Enzymes', 'Amino Acids', 'Proteins'], examWeightage: { NEET: 4, CBSE: 4 } },
  { name: 'Cell Cycle and Cell Division', domain: 'Botany', difficulty: 'Moderate' as const, estimatedHours: 7, description: 'Mitosis and meiosis', keyConcepts: ['Mitosis', 'Meiosis', 'Cytokinesis'], examWeightage: { NEET: 3, CBSE: 3 } },
  { name: 'Transport in Plants', domain: 'Botany', difficulty: 'Hard' as const, estimatedHours: 8, description: 'Water and mineral transport', keyConcepts: ['Osmosis', 'Xylem Transport', 'Transpiration'], examWeightage: { NEET: 3, CBSE: 3 } },
  { name: 'Mineral Nutrition', domain: 'Botany', difficulty: 'Easy' as const, estimatedHours: 5, description: 'Nutrients for plant growth', keyConcepts: ['Nitrogen Cycle', 'Deficiency Symptoms'], examWeightage: { NEET: 2, CBSE: 2 } },
  { name: 'Photosynthesis in Higher Plants', domain: 'Botany', difficulty: 'Hard' as const, estimatedHours: 10, description: 'Light and dark reactions', keyConcepts: ['C3 Cycle', 'C4 Cycle', 'Chlorophyll'], examWeightage: { NEET: 4, CBSE: 4 } },
  { name: 'Respiration in Plants', domain: 'Botany', difficulty: 'Moderate' as const, estimatedHours: 8, description: 'Glycolysis, TCA cycle', keyConcepts: ['Glycolysis', 'Krebs Cycle', 'ETC'], examWeightage: { NEET: 3, CBSE: 3 } },
  { name: 'Plant Growth and Development', domain: 'Botany', difficulty: 'Moderate' as const, estimatedHours: 7, description: 'Phytohormones', keyConcepts: ['Auxin', 'Gibberellin', 'Cytokinin'], examWeightage: { NEET: 3, CBSE: 3 } },
  { name: 'Digestion and Absorption', domain: 'Zoology', difficulty: 'Moderate' as const, estimatedHours: 7, description: 'Human digestive system', keyConcepts: ['Stomach', 'Small Intestine', 'Enzymes'], examWeightage: { NEET: 3, CBSE: 3 } },
  { name: 'Breathing and Exchange of Gases', domain: 'Zoology', difficulty: 'Moderate' as const, estimatedHours: 6, description: 'Mechanism of breathing', keyConcepts: ['Alveoli', 'Hemoglobin', 'Respiratory Disorders'], examWeightage: { NEET: 2, CBSE: 2 } },
  { name: 'Body Fluids and Circulation', domain: 'Zoology', difficulty: 'Moderate' as const, estimatedHours: 8, description: 'Human heart and blood', keyConcepts: ['Blood Pressure', 'Cardiac Cycle', 'ECG'], examWeightage: { NEET: 3, CBSE: 3 } },
  { name: 'Excretory Products and Their Elimination', domain: 'Zoology', difficulty: 'Hard' as const, estimatedHours: 8, description: 'Kidney function', keyConcepts: ['Nephron', 'Urea Cycle', 'Micturition'], examWeightage: { NEET: 2, CBSE: 2 } },
  { name: 'Locomotion and Movement', domain: 'Zoology', difficulty: 'Moderate' as const, estimatedHours: 7, description: 'Muscles and skeletal system', keyConcepts: ['Sarcomere', 'Sliding Filament Theory'], examWeightage: { NEET: 2, CBSE: 2 } },
  { name: 'Neural Control and Coordination', domain: 'Zoology', difficulty: 'Hard' as const, estimatedHours: 10, description: 'Brain and nervous system', keyConcepts: ['Neuron', 'Synapse', 'Reflex Arc'], examWeightage: { NEET: 3, CBSE: 3 } },
  { name: 'Chemical Coordination and Integration', domain: 'Zoology', difficulty: 'Moderate' as const, estimatedHours: 8, description: 'Endocrine glands', keyConcepts: ['Hormones', 'Pituitary', 'Thyroid'], examWeightage: { NEET: 3, CBSE: 3 } },
  { name: 'General Biology', domain: 'General', difficulty: 'Moderate' as const, estimatedHours: 10, description: 'Miscellaneous concepts', keyConcepts: ['General Concepts'], examWeightage: { NEET: 1, CBSE: 1 } }
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
    name: 'Microbes in Human Welfare',
    domain: 'Human Physiology',
    difficulty: 'Easy' as const,
    estimatedHours: 6,
    description: 'Microbes in household products, industrial production, sewage treatment, biogas',
    keyConcepts: ['Fermentation', 'Antibiotics', 'Sewage Treatment', 'Biogas', 'Biofertilizers'],
    examWeightage: { KCET: 4, CBSE: 3 }
  },
  {
    name: 'Evolution',
    domain: 'Evolution',
    difficulty: 'Moderate' as const,
    estimatedHours: 9,
    description: 'Origin of life, evidences of evolution, natural selection',
    keyConcepts: ['Darwins Theory', 'Natural Selection', 'Evidence of Evolution', 'Human Evolution'],
    examWeightage: { NEET: 5, KCET: 4, CBSE: 5 }
  },
  {
    name: 'Environmental Issues',
    domain: 'Ecology',
    difficulty: 'Easy' as const,
    estimatedHours: 6,
    description: 'Air/Water pollution, global warming, ozone depletion',
    keyConcepts: ['Pollution', 'Ozone Layer', 'Global Warming', 'Greenhouse Effect', 'Dobson Unit'],
    examWeightage: { NEET: 3, CBSE: 3 }
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
    examWeightage: { JEE: 4, KCET: 4, CBSE: 4 }
  },
  {
    name: 'Inverse Trigonometric Functions',
    domain: 'Trigonometry',
    difficulty: 'Moderate' as const,
    estimatedHours: 6,
    description: 'Properties and graphs of inverse trig functions',
    keyConcepts: ['Arcsin', 'Arccos', 'Arctan', 'Domain and Range'],
    examWeightage: { JEE: 3, KCET: 3, CBSE: 3 }
  },
  {
    name: 'Matrices',
    domain: 'Algebra',
    difficulty: 'Moderate' as const,
    estimatedHours: 10,
    description: 'Matrix operations, transpose, inverse, rank',
    keyConcepts: ['Matrix Operations', 'Transpose', 'Inverse', 'Elementary Operations'],
    examWeightage: { JEE: 5, KCET: 5, CBSE: 5 }
  },
  {
    name: 'Determinants',
    domain: 'Algebra',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Properties, cofactors, adjoint, Cramer\'s rule',
    keyConcepts: ['Determinant Properties', 'Cofactors', 'Adjoint', 'Cramers Rule'],
    examWeightage: { JEE: 5, KCET: 5, CBSE: 4 }
  },
  {
    name: 'Continuity and Differentiability',
    domain: 'Calculus',
    difficulty: 'Hard' as const,
    estimatedHours: 12,
    description: 'Limits, continuity, derivatives, chain rule, L\'Hospital',
    keyConcepts: ['Continuity', 'Differentiability', 'Chain Rule', 'Mean Value Theorem'],
    examWeightage: { JEE: 8, KCET: 7, CBSE: 6 }
  },
  {
    name: 'Applications of Derivatives',
    domain: 'Calculus',
    difficulty: 'Hard' as const,
    estimatedHours: 10,
    description: 'Rate of change, tangent/normal, maxima/minima, approximations',
    keyConcepts: ['Rate of Change', 'Tangent Normal', 'Maxima Minima', 'Approximations'],
    examWeightage: { JEE: 7, KCET: 6, CBSE: 6 }
  },
  {
    name: 'Integrals',
    domain: 'Calculus',
    difficulty: 'Hard' as const,
    estimatedHours: 14,
    description: 'Integration methods, definite integrals, properties',
    keyConcepts: ['Integration Techniques', 'Definite Integrals', 'Integration by Parts', 'Substitution'],
    examWeightage: { JEE: 9, KCET: 8, CBSE: 7 }
  },
  {
    name: 'Applications of Integrals',
    domain: 'Calculus',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Area under curves, volume of solids of revolution',
    keyConcepts: ['Area Under Curve', 'Area Between Curves', 'Volume of Revolution'],
    examWeightage: { JEE: 5, KCET: 5, CBSE: 5 }
  },
  {
    name: 'Differential Equations',
    domain: 'Calculus',
    difficulty: 'Hard' as const,
    estimatedHours: 10,
    description: 'Order, degree, solving methods, applications',
    keyConcepts: ['First Order DE', 'Linear DE', 'Variable Separable', 'Homogeneous DE'],
    examWeightage: { JEE: 6, KCET: 5, CBSE: 5 }
  },
  {
    name: 'Vectors',
    domain: 'Vector Algebra',
    difficulty: 'Moderate' as const,
    estimatedHours: 8,
    description: 'Vector operations, dot product, cross product',
    keyConcepts: ['Vector Addition', 'Dot Product', 'Cross Product', 'Scalar Triple Product'],
    examWeightage: { JEE: 5, KCET: 5, CBSE: 4 }
  },
  {
    name: 'Three Dimensional Geometry',
    domain: 'Coordinate Geometry',
    difficulty: 'Hard' as const,
    estimatedHours: 10,
    description: 'Direction cosines, lines, planes, shortest distance',
    keyConcepts: ['Direction Cosines', 'Line Equations', 'Plane Equations', 'Shortest Distance'],
    examWeightage: { JEE: 6, KCET: 5, CBSE: 5 }
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
    examWeightage: { JEE: 7, KCET: 6, CBSE: 6 }
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
    console.log('📚 Seeding Physics (Class 11 + 12)...');
    const PHYSICS_TOPICS = [...PHYSICS_CLASS11_TOPICS, ...PHYSICS_CLASS12_TOPICS];
    for (const topic of PHYSICS_TOPICS) {
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
    console.log('\n📚 Seeding Chemistry (Class 11 + 12)...');
    const CHEMISTRY_TOPICS = [...CHEMISTRY_CLASS11_TOPICS, ...CHEMISTRY_CLASS12_TOPICS];
    for (const topic of CHEMISTRY_TOPICS) {
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
    console.log('\n📚 Seeding Biology (Class 11 + 12)...');
    const BIOLOGY_TOPICS = [...BIOLOGY_CLASS11_TOPICS, ...BIOLOGY_CLASS12_TOPICS];
    for (const topic of BIOLOGY_TOPICS) {
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

    // LISTS FOR BOTANY/ZOOLOGY SPLIT
    const BOTANY_TOPIC_NAMES = [
      'The Living World', 'Biological Classification', 'Plant Kingdom', 'Morphology of Flowering Plants',
      'Anatomy of Flowering Plants', 'Cell: The Unit of Life', 'Biomolecules', 'Cell Cycle and Cell Division',
      'Transport in Plants', 'Mineral Nutrition', 'Photosynthesis in Higher Plants', 'Respiration in Plants',
      'Plant Growth and Development', 'Sexual Reproduction in Flowering Plants', 'Principles of Inheritance and Variation',
      'Molecular Basis of Inheritance', 'Biotechnology Principles and Processes', 'Biotechnology and its Applications',
      'Organisms and Populations', 'Ecosystem', 'Biodiversity and Conservation', 'Environmental Issues', 'Microbes in Human Welfare'
    ];

    const ZOOLOGY_TOPIC_NAMES = [
      'Animal Kingdom', 'Structural Organisation in Animals', 'Digestion and Absorption', 'Breathing and Exchange of Gases',
      'Body Fluids and Circulation', 'Excretory Products and Their Elimination', 'Locomotion and Movement',
      'Neural Control and Coordination', 'Chemical Coordination and Integration', 'Human Reproduction',
      'Reproductive Health', 'Evolution', 'Human Health and Disease'
    ];

    // Seed Botany
    console.log('\n📚 Seeding Botany (NEET Split)...');
    const BOTANY_TOPICS = BIOLOGY_TOPICS.filter(t => BOTANY_TOPIC_NAMES.includes(t.name));
    for (const topic of BOTANY_TOPICS) {
      const { error } = await supabase.from('topics').insert({
        subject: 'Botany',
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

    // Seed Zoology
    console.log('\n📚 Seeding Zoology (NEET Split)...');
    const ZOOLOGY_TOPICS = BIOLOGY_TOPICS.filter(t => ZOOLOGY_TOPIC_NAMES.includes(t.name));
    for (const topic of ZOOLOGY_TOPICS) {
      const { error } = await supabase.from('topics').insert({
        subject: 'Zoology',
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
    console.log(`  - Physics: ${PHYSICS_CLASS12_TOPICS.length + PHYSICS_CLASS11_TOPICS.length} topics`);
    console.log(`  - Chemistry: ${CHEMISTRY_CLASS12_TOPICS.length + CHEMISTRY_CLASS11_TOPICS.length} topics`);
    console.log(`  - Biology: ${BIOLOGY_TOPICS.length} topics`);
    console.log(`  - Botany: ${BOTANY_TOPICS.length} topics`);
    console.log(`  - Zoology: ${ZOOLOGY_TOPICS.length} topics`);
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
