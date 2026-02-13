/**
 * Topic Seeding Script
 *
 * Populates the topics table from subjects configuration
 * Run this once after database migration to initialize topics
 */

import { createClient } from '@supabase/supabase-js';
import { SUBJECT_CONFIGS } from '../config/subjects';
import type { Subject, ExamContext } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Topic definitions per subject-domain
// In production, this would be much more comprehensive
const TOPIC_DEFINITIONS: Record<Subject, Record<string, {
  topics: Array<{
    name: string;
    description: string;
    difficulty: 'Easy' | 'Moderate' | 'Hard';
    estimatedHours: number;
    keyConcepts: string[];
    examWeightage: Partial<Record<ExamContext, number>>;
    prerequisites?: string[];
  }>;
}>> = {
  'Math': {
    'Algebra': {
      topics: [
        {
          name: 'Linear Equations',
          description: 'Solving equations with one or more variables in first degree',
          difficulty: 'Easy',
          estimatedHours: 3,
          keyConcepts: ['Variables', 'Constants', 'Solving methods', 'Word problems'],
          examWeightage: { KCET: 4, JEE: 3, CBSE: 5 }
        },
        {
          name: 'Quadratic Equations',
          description: 'Second degree polynomial equations and their solutions',
          difficulty: 'Moderate',
          estimatedHours: 5,
          keyConcepts: ['Standard form', 'Discriminant', 'Roots', 'Factorization', 'Quadratic formula'],
          examWeightage: { KCET: 5, JEE: 6, CBSE: 6 },
          prerequisites: ['Linear Equations']
        },
        {
          name: 'Polynomials',
          description: 'Operations and properties of polynomial expressions',
          difficulty: 'Moderate',
          estimatedHours: 4,
          keyConcepts: ['Degree', 'Coefficients', 'Factorization', 'Remainder theorem', 'Factor theorem'],
          examWeightage: { KCET: 4, JEE: 5, CBSE: 5 }
        }
      ]
    },
    'Calculus': {
      topics: [
        {
          name: 'Limits and Continuity',
          description: 'Understanding limits and continuous functions',
          difficulty: 'Moderate',
          estimatedHours: 6,
          keyConcepts: ['Limit definition', 'Left/right limits', 'Continuity', 'Intermediate value theorem'],
          examWeightage: { KCET: 5, JEE: 7, CBSE: 6 }
        },
        {
          name: 'Differentiation',
          description: 'Derivatives and rules of differentiation',
          difficulty: 'Moderate',
          estimatedHours: 8,
          keyConcepts: ['Derivative definition', 'Product rule', 'Chain rule', 'Implicit differentiation'],
          examWeightage: { KCET: 7, JEE: 8, CBSE: 7 },
          prerequisites: ['Limits and Continuity']
        },
        {
          name: 'Integration',
          description: 'Antiderivatives and integration techniques',
          difficulty: 'Hard',
          estimatedHours: 8,
          keyConcepts: ['Indefinite integrals', 'Definite integrals', 'Substitution', 'Integration by parts'],
          examWeightage: { KCET: 7, JEE: 9, CBSE: 7 },
          prerequisites: ['Differentiation']
        }
      ]
    },
    'Trigonometry': {
      topics: [
        {
          name: 'Trigonometric Ratios',
          description: 'Basic trigonometric functions and ratios',
          difficulty: 'Easy',
          estimatedHours: 4,
          keyConcepts: ['Sin, Cos, Tan', 'Special angles', 'Trigonometric identities'],
          examWeightage: { KCET: 4, JEE: 4, CBSE: 5 }
        },
        {
          name: 'Trigonometric Equations',
          description: 'Solving equations involving trigonometric functions',
          difficulty: 'Moderate',
          estimatedHours: 5,
          keyConcepts: ['General solutions', 'Principal values', 'Multiple angles'],
          examWeightage: { KCET: 5, JEE: 6, CBSE: 5 },
          prerequisites: ['Trigonometric Ratios']
        }
      ]
    }
  },
  'Physics': {
    'Mechanics': {
      topics: [
        {
          name: 'Kinematics',
          description: 'Motion in one and two dimensions',
          difficulty: 'Easy',
          estimatedHours: 5,
          keyConcepts: ['Displacement', 'Velocity', 'Acceleration', 'Equations of motion', 'Projectile motion'],
          examWeightage: { KCET: 6, NEET: 5, JEE: 6, CBSE: 6 }
        },
        {
          name: 'Newton\'s Laws of Motion',
          description: 'Force, mass, and acceleration relationships',
          difficulty: 'Moderate',
          estimatedHours: 6,
          keyConcepts: ['Inertia', 'Force', 'Action-reaction', 'Free body diagrams', 'Friction'],
          examWeightage: { KCET: 7, NEET: 6, JEE: 8, CBSE: 7 },
          prerequisites: ['Kinematics']
        },
        {
          name: 'Work, Energy and Power',
          description: 'Conservation of energy and work-energy theorem',
          difficulty: 'Moderate',
          estimatedHours: 5,
          keyConcepts: ['Work', 'Kinetic energy', 'Potential energy', 'Conservation', 'Power'],
          examWeightage: { KCET: 6, NEET: 5, JEE: 7, CBSE: 6 },
          prerequisites: ['Newton\'s Laws of Motion']
        }
      ]
    },
    'Electromagnetism': {
      topics: [
        {
          name: 'Electric Field and Potential',
          description: 'Electrostatic forces and electric potential',
          difficulty: 'Moderate',
          estimatedHours: 6,
          keyConcepts: ['Coulomb\'s law', 'Electric field', 'Electric potential', 'Gauss\'s law'],
          examWeightage: { KCET: 6, NEET: 5, JEE: 7, CBSE: 6 }
        },
        {
          name: 'Current Electricity',
          description: 'Electric current, resistance, and circuits',
          difficulty: 'Moderate',
          estimatedHours: 6,
          keyConcepts: ['Ohm\'s law', 'Resistivity', 'Series/parallel circuits', 'Kirchhoff\'s laws'],
          examWeightage: { KCET: 7, NEET: 6, JEE: 8, CBSE: 7 }
        },
        {
          name: 'Magnetic Effects of Current',
          description: 'Magnetic fields produced by electric currents',
          difficulty: 'Hard',
          estimatedHours: 7,
          keyConcepts: ['Biot-Savart law', 'Ampere\'s law', 'Lorentz force', 'Magnetic field'],
          examWeightage: { KCET: 6, NEET: 5, JEE: 8, CBSE: 6 },
          prerequisites: ['Current Electricity']
        }
      ]
    },
    'Optics': {
      topics: [
        {
          name: 'Ray Optics',
          description: 'Reflection and refraction of light',
          difficulty: 'Easy',
          estimatedHours: 5,
          keyConcepts: ['Reflection', 'Refraction', 'Mirrors', 'Lenses', 'Snell\'s law'],
          examWeightage: { KCET: 5, NEET: 6, JEE: 5, CBSE: 6 }
        },
        {
          name: 'Wave Optics',
          description: 'Interference, diffraction, and polarization',
          difficulty: 'Hard',
          estimatedHours: 6,
          keyConcepts: ['Interference', 'Diffraction', 'Polarization', 'Young\'s experiment'],
          examWeightage: { KCET: 5, NEET: 4, JEE: 7, CBSE: 5 },
          prerequisites: ['Ray Optics']
        }
      ]
    }
  },
  'Chemistry': {
    'Organic Chemistry': {
      topics: [
        {
          name: 'Hydrocarbons',
          description: 'Alkanes, alkenes, and alkynes',
          difficulty: 'Moderate',
          estimatedHours: 6,
          keyConcepts: ['Nomenclature', 'Isomerism', 'Reactions', 'Properties'],
          examWeightage: { KCET: 6, NEET: 7, JEE: 6, CBSE: 6 }
        },
        {
          name: 'Organic Compounds with Functional Groups',
          description: 'Alcohols, phenols, ethers, aldehydes, ketones',
          difficulty: 'Moderate',
          estimatedHours: 8,
          keyConcepts: ['Functional groups', 'Nomenclature', 'Preparation', 'Reactions'],
          examWeightage: { KCET: 7, NEET: 8, JEE: 7, CBSE: 7 },
          prerequisites: ['Hydrocarbons']
        },
        {
          name: 'Biomolecules',
          description: 'Carbohydrates, proteins, nucleic acids',
          difficulty: 'Easy',
          estimatedHours: 5,
          keyConcepts: ['Carbohydrates', 'Proteins', 'Nucleic acids', 'Enzymes'],
          examWeightage: { KCET: 5, NEET: 7, JEE: 4, CBSE: 6 }
        }
      ]
    },
    'Physical Chemistry': {
      topics: [
        {
          name: 'Chemical Kinetics',
          description: 'Rates of chemical reactions',
          difficulty: 'Moderate',
          estimatedHours: 6,
          keyConcepts: ['Rate law', 'Order of reaction', 'Activation energy', 'Arrhenius equation'],
          examWeightage: { KCET: 6, NEET: 5, JEE: 7, CBSE: 6 }
        },
        {
          name: 'Thermodynamics',
          description: 'Energy changes in chemical reactions',
          difficulty: 'Hard',
          estimatedHours: 7,
          keyConcepts: ['First law', 'Enthalpy', 'Entropy', 'Gibbs energy', 'Spontaneity'],
          examWeightage: { KCET: 7, NEET: 6, JEE: 8, CBSE: 7 }
        },
        {
          name: 'Electrochemistry',
          description: 'Chemical reactions and electricity',
          difficulty: 'Moderate',
          estimatedHours: 6,
          keyConcepts: ['Electrochemical cells', 'Nernst equation', 'Conductance', 'Electrolysis'],
          examWeightage: { KCET: 6, NEET: 5, JEE: 7, CBSE: 6 }
        }
      ]
    },
    'Inorganic Chemistry': {
      topics: [
        {
          name: 'Periodic Table and Periodicity',
          description: 'Periodic properties of elements',
          difficulty: 'Easy',
          estimatedHours: 4,
          keyConcepts: ['Periodic trends', 'Atomic radius', 'Ionization energy', 'Electronegativity'],
          examWeightage: { KCET: 5, NEET: 6, JEE: 5, CBSE: 6 }
        },
        {
          name: 'Chemical Bonding',
          description: 'Ionic, covalent, and metallic bonding',
          difficulty: 'Moderate',
          estimatedHours: 6,
          keyConcepts: ['Lewis structures', 'VSEPR theory', 'Hybridization', 'Molecular orbital theory'],
          examWeightage: { KCET: 6, NEET: 6, JEE: 7, CBSE: 6 }
        },
        {
          name: 'd-Block Elements',
          description: 'Transition metals and coordination compounds',
          difficulty: 'Hard',
          estimatedHours: 7,
          keyConcepts: ['Coordination compounds', 'Crystal field theory', 'Isomerism', 'Color'],
          examWeightage: { KCET: 6, NEET: 7, JEE: 6, CBSE: 6 }
        }
      ]
    }
  },
  'Biology': {
    'Cell Biology': {
      topics: [
        {
          name: 'Cell Structure and Function',
          description: 'Prokaryotic and eukaryotic cells',
          difficulty: 'Easy',
          estimatedHours: 5,
          keyConcepts: ['Cell membrane', 'Organelles', 'Cell division', 'Cell cycle'],
          examWeightage: { KCET: 6, NEET: 7, CBSE: 6 }
        },
        {
          name: 'Biomolecules',
          description: 'Proteins, carbohydrates, lipids, nucleic acids',
          difficulty: 'Moderate',
          estimatedHours: 6,
          keyConcepts: ['Proteins', 'Carbohydrates', 'Lipids', 'Nucleic acids', 'Enzymes'],
          examWeightage: { KCET: 6, NEET: 8, CBSE: 7 }
        }
      ]
    },
    'Genetics': {
      topics: [
        {
          name: 'Mendelian Genetics',
          description: 'Principles of inheritance',
          difficulty: 'Moderate',
          estimatedHours: 6,
          keyConcepts: ['Mendel\'s laws', 'Monohybrid cross', 'Dihybrid cross', 'Pedigree analysis'],
          examWeightage: { KCET: 7, NEET: 8, CBSE: 7 }
        },
        {
          name: 'Molecular Basis of Inheritance',
          description: 'DNA structure, replication, and gene expression',
          difficulty: 'Hard',
          estimatedHours: 8,
          keyConcepts: ['DNA structure', 'Replication', 'Transcription', 'Translation', 'Gene regulation'],
          examWeightage: { KCET: 7, NEET: 9, CBSE: 8 },
          prerequisites: ['Mendelian Genetics']
        }
      ]
    },
    'Human Physiology': {
      topics: [
        {
          name: 'Digestive System',
          description: 'Digestion and absorption of nutrients',
          difficulty: 'Easy',
          estimatedHours: 5,
          keyConcepts: ['Alimentary canal', 'Digestive glands', 'Enzymes', 'Absorption'],
          examWeightage: { KCET: 5, NEET: 6, CBSE: 6 }
        },
        {
          name: 'Circulatory System',
          description: 'Heart, blood vessels, and blood circulation',
          difficulty: 'Moderate',
          estimatedHours: 6,
          keyConcepts: ['Heart structure', 'Cardiac cycle', 'Blood vessels', 'Blood composition'],
          examWeightage: { KCET: 6, NEET: 7, CBSE: 6 }
        },
        {
          name: 'Nervous System',
          description: 'Neural coordination and sense organs',
          difficulty: 'Hard',
          estimatedHours: 7,
          keyConcepts: ['Neurons', 'Synapse', 'Brain', 'Spinal cord', 'Reflex action'],
          examWeightage: { KCET: 7, NEET: 8, CBSE: 7 }
        }
      ]
    },
    'Ecology': {
      topics: [
        {
          name: 'Ecosystem',
          description: 'Ecosystem structure and function',
          difficulty: 'Easy',
          estimatedHours: 5,
          keyConcepts: ['Food chain', 'Energy flow', 'Nutrient cycling', 'Ecological pyramids'],
          examWeightage: { KCET: 5, NEET: 6, CBSE: 6 }
        },
        {
          name: 'Biodiversity and Conservation',
          description: 'Conservation of biological diversity',
          difficulty: 'Moderate',
          estimatedHours: 5,
          keyConcepts: ['Biodiversity', 'Threats', 'Conservation strategies', 'Protected areas'],
          examWeightage: { KCET: 5, NEET: 6, CBSE: 5 }
        }
      ]
    }
  }
};

async function seedTopics() {
  console.log('🌱 Starting topic seeding...\n');

  let totalTopicsCreated = 0;
  const errors: string[] = [];

  for (const [subject, domains] of Object.entries(TOPIC_DEFINITIONS)) {
    console.log(`📚 Processing ${subject}...`);

    for (const [domain, domainData] of Object.entries(domains)) {
      console.log(`  📂 Domain: ${domain}`);

      for (const topicDef of domainData.topics) {
        try {
          const { data, error } = await supabase
            .from('topics')
            .insert({
              subject,
              domain,
              name: topicDef.name,
              description: topicDef.description,
              difficulty_level: topicDef.difficulty,
              estimated_study_hours: topicDef.estimatedHours,
              exam_weightage: topicDef.examWeightage,
              key_concepts: topicDef.keyConcepts,
              prerequisite_topics: [] // Will be updated in second pass
            })
            .select()
            .single();

          if (error) {
            if (error.code === '23505') {
              // Duplicate - skip
              console.log(`    ⚠️  ${topicDef.name} already exists, skipping`);
            } else {
              throw error;
            }
          } else {
            console.log(`    ✅ Created: ${topicDef.name}`);
            totalTopicsCreated++;
          }
        } catch (err) {
          const errorMsg = `Failed to create ${subject} > ${domain} > ${topicDef.name}: ${err}`;
          console.error(`    ❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }
    console.log('');
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`✅ Successfully created: ${totalTopicsCreated} topics`);
  console.log(`❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Error Details:');
    errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log('\n✨ Topic seeding complete!\n');
}

// Run seeding
seedTopics()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error during seeding:', error);
    process.exit(1);
  });
