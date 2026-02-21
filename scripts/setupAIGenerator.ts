/**
 * Setup AI Question Generator
 * Creates tables and populates with initial data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupTables() {
  console.log('📦 Setting up AI Generator tables...\n');

  // Check if tables exist by trying to query them
  const { error: configError } = await supabase.from('exam_configurations').select('id').limit(1);

  if (!configError) {
    console.log('✅ Tables already exist\n');
    return true;
  }

  console.log('⚠️  Tables need to be created via Supabase Dashboard SQL Editor');
  console.log('📝 Copy and run the SQL from: database/ai_generator_schema.sql\n');
  return false;
}

async function seedSampleData() {
  console.log('🌱 Seeding sample data...\n');

  // Add KCET Math topics
  const topics = [
    {
      topic_id: 'calculus',
      topic_name: 'Calculus',
      subject: 'Math',
      exam_context: 'KCET',
      syllabus: 'Limits, Continuity, Differentiation, Integration, Applications of Derivatives and Integrals, Differential Equations',
      blooms_levels: ['Understand', 'Apply', 'Analyze'],
      estimated_difficulty: 7,
      prerequisites: ['algebra', 'functions']
    },
    {
      topic_id: 'algebra',
      topic_name: 'Algebra',
      subject: 'Math',
      exam_context: 'KCET',
      syllabus: 'Complex Numbers, Quadratic Equations, Sequences and Series, Binomial Theorem, Permutations and Combinations',
      blooms_levels: ['Remember', 'Understand', 'Apply'],
      estimated_difficulty: 5,
      prerequisites: []
    },
    {
      topic_id: 'coordinate_geometry',
      topic_name: 'Coordinate Geometry',
      subject: 'Math',
      exam_context: 'KCET',
      syllabus: 'Straight Lines, Circles, Parabola, Ellipse, Hyperbola, Conic Sections',
      blooms_levels: ['Understand', 'Apply'],
      estimated_difficulty: 6,
      prerequisites: ['algebra']
    },
    {
      topic_id: 'vectors_3d',
      topic_name: 'Vectors and 3D Geometry',
      subject: 'Math',
      exam_context: 'KCET',
      syllabus: 'Vectors, Three Dimensional Geometry, Direction Cosines and Ratios, Planes and Lines',
      blooms_levels: ['Understand', 'Apply', 'Analyze'],
      estimated_difficulty: 7,
      prerequisites: ['coordinate_geometry']
    },
    {
      topic_id: 'matrices',
      topic_name: 'Matrices and Determinants',
      subject: 'Math',
      exam_context: 'KCET',
      syllabus: 'Matrices, Types of Matrices, Operations, Determinants, Adjoint, Inverse, System of Linear Equations',
      blooms_levels: ['Remember', 'Understand', 'Apply'],
      estimated_difficulty: 5,
      prerequisites: []
    },
    {
      topic_id: 'trigonometry',
      topic_name: 'Trigonometry',
      subject: 'Math',
      exam_context: 'KCET',
      syllabus: 'Trigonometric Functions, Identities, Equations, Inverse Trigonometric Functions, Heights and Distances',
      blooms_levels: ['Remember', 'Understand', 'Apply'],
      estimated_difficulty: 6,
      prerequisites: []
    },
    {
      topic_id: 'probability_statistics',
      topic_name: 'Probability and Statistics',
      subject: 'Math',
      exam_context: 'KCET',
      syllabus: 'Probability, Conditional Probability, Bayes Theorem, Random Variables, Distributions, Mean, Variance',
      blooms_levels: ['Understand', 'Apply', 'Analyze'],
      estimated_difficulty: 6,
      prerequisites: []
    }
  ];

  try {
    const { data, error } = await supabase
      .from('topic_metadata')
      .upsert(topics, { onConflict: 'topic_id' });

    if (error) throw error;
    console.log(`✅ Added ${topics.length} topics for KCET Math\n`);
  } catch (error: any) {
    console.error('❌ Error adding topics:', error.message);
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('⚠️  Please create tables first using the SQL schema\n');
      return false;
    }
  }

  // Add historical patterns (KCET 2020-2024)
  console.log('📊 Adding historical exam patterns...\n');

  const patterns = [
    {
      year: 2024,
      exam_context: 'KCET',
      subject: 'Math',
      total_marks: 60,
      difficulty_easy_pct: 40,
      difficulty_moderate_pct: 45,
      difficulty_hard_pct: 15
    },
    {
      year: 2023,
      exam_context: 'KCET',
      subject: 'Math',
      total_marks: 60,
      difficulty_easy_pct: 42,
      difficulty_moderate_pct: 43,
      difficulty_hard_pct: 15
    },
    {
      year: 2022,
      exam_context: 'KCET',
      subject: 'Math',
      total_marks: 60,
      difficulty_easy_pct: 38,
      difficulty_moderate_pct: 47,
      difficulty_hard_pct: 15
    },
    {
      year: 2021,
      exam_context: 'KCET',
      subject: 'Math',
      total_marks: 60,
      difficulty_easy_pct: 40,
      difficulty_moderate_pct: 45,
      difficulty_hard_pct: 15
    },
    {
      year: 2020,
      exam_context: 'KCET',
      subject: 'Math',
      total_marks: 60,
      difficulty_easy_pct: 45,
      difficulty_moderate_pct: 42,
      difficulty_hard_pct: 13
    }
  ];

  try {
    for (const pattern of patterns) {
      const { data: inserted, error } = await supabase
        .from('exam_historical_patterns')
        .upsert(pattern, { onConflict: 'year,exam_context,subject' })
        .select()
        .single();

      if (error) throw error;

      // Add topic distributions for this year
      const distributions = getTopicDistributionForYear(pattern.year);

      for (const dist of distributions) {
        await supabase
          .from('exam_topic_distributions')
          .upsert({
            historical_pattern_id: inserted.id,
            ...dist
          });
      }

      console.log(`✅ Added pattern for ${pattern.year}`);
    }

    console.log('\n✅ Historical patterns added successfully\n');
  } catch (error: any) {
    console.error('❌ Error adding patterns:', error.message);
  }

  return true;
}

function getTopicDistributionForYear(year: number) {
  // Simulated historical data showing Calculus increasing trend
  const distributions: Record<number, any[]> = {
    2020: [
      { topic_id: 'calculus', question_count: 11, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 5, difficulty_hard_count: 2 },
      { topic_id: 'algebra', question_count: 12, average_marks: 1, difficulty_easy_count: 5, difficulty_moderate_count: 5, difficulty_hard_count: 2 },
      { topic_id: 'coordinate_geometry', question_count: 10, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 5, difficulty_hard_count: 1 },
      { topic_id: 'vectors_3d', question_count: 9, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 4, difficulty_hard_count: 1 },
      { topic_id: 'matrices', question_count: 10, average_marks: 1, difficulty_easy_count: 5, difficulty_moderate_count: 4, difficulty_hard_count: 1 },
      { topic_id: 'trigonometry', question_count: 5, average_marks: 1, difficulty_easy_count: 2, difficulty_moderate_count: 2, difficulty_hard_count: 1 },
      { topic_id: 'probability_statistics', question_count: 3, average_marks: 1, difficulty_easy_count: 1, difficulty_moderate_count: 2, difficulty_hard_count: 0 }
    ],
    2021: [
      { topic_id: 'calculus', question_count: 13, average_marks: 1, difficulty_easy_count: 5, difficulty_moderate_count: 6, difficulty_hard_count: 2 },
      { topic_id: 'algebra', question_count: 11, average_marks: 1, difficulty_easy_count: 5, difficulty_moderate_count: 5, difficulty_hard_count: 1 },
      { topic_id: 'coordinate_geometry', question_count: 10, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 5, difficulty_hard_count: 1 },
      { topic_id: 'vectors_3d', question_count: 8, average_marks: 1, difficulty_easy_count: 3, difficulty_moderate_count: 4, difficulty_hard_count: 1 },
      { topic_id: 'matrices', question_count: 10, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 5, difficulty_hard_count: 1 },
      { topic_id: 'trigonometry', question_count: 5, average_marks: 1, difficulty_easy_count: 2, difficulty_moderate_count: 2, difficulty_hard_count: 1 },
      { topic_id: 'probability_statistics', question_count: 3, average_marks: 1, difficulty_easy_count: 1, difficulty_moderate_count: 2, difficulty_hard_count: 0 }
    ],
    2022: [
      { topic_id: 'calculus', question_count: 14, average_marks: 1, difficulty_easy_count: 5, difficulty_moderate_count: 7, difficulty_hard_count: 2 },
      { topic_id: 'algebra', question_count: 11, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 6, difficulty_hard_count: 1 },
      { topic_id: 'coordinate_geometry', question_count: 9, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 4, difficulty_hard_count: 1 },
      { topic_id: 'vectors_3d', question_count: 8, average_marks: 1, difficulty_easy_count: 3, difficulty_moderate_count: 4, difficulty_hard_count: 1 },
      { topic_id: 'matrices', question_count: 10, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 5, difficulty_hard_count: 1 },
      { topic_id: 'trigonometry', question_count: 5, average_marks: 1, difficulty_easy_count: 2, difficulty_moderate_count: 2, difficulty_hard_count: 1 },
      { topic_id: 'probability_statistics', question_count: 3, average_marks: 1, difficulty_easy_count: 2, difficulty_moderate_count: 1, difficulty_hard_count: 0 }
    ],
    2023: [
      { topic_id: 'calculus', question_count: 15, average_marks: 1, difficulty_easy_count: 6, difficulty_moderate_count: 7, difficulty_hard_count: 2 },
      { topic_id: 'algebra', question_count: 11, average_marks: 1, difficulty_easy_count: 5, difficulty_moderate_count: 5, difficulty_hard_count: 1 },
      { topic_id: 'coordinate_geometry', question_count: 9, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 4, difficulty_hard_count: 1 },
      { topic_id: 'vectors_3d', question_count: 7, average_marks: 1, difficulty_easy_count: 3, difficulty_moderate_count: 3, difficulty_hard_count: 1 },
      { topic_id: 'matrices', question_count: 10, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 5, difficulty_hard_count: 1 },
      { topic_id: 'trigonometry', question_count: 5, average_marks: 1, difficulty_easy_count: 2, difficulty_moderate_count: 2, difficulty_hard_count: 1 },
      { topic_id: 'probability_statistics', question_count: 3, average_marks: 1, difficulty_easy_count: 2, difficulty_moderate_count: 1, difficulty_hard_count: 0 }
    ],
    2024: [
      { topic_id: 'calculus', question_count: 15, average_marks: 1, difficulty_easy_count: 6, difficulty_moderate_count: 7, difficulty_hard_count: 2 },
      { topic_id: 'algebra', question_count: 12, average_marks: 1, difficulty_easy_count: 5, difficulty_moderate_count: 6, difficulty_hard_count: 1 },
      { topic_id: 'coordinate_geometry', question_count: 9, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 4, difficulty_hard_count: 1 },
      { topic_id: 'vectors_3d', question_count: 7, average_marks: 1, difficulty_easy_count: 3, difficulty_moderate_count: 3, difficulty_hard_count: 1 },
      { topic_id: 'matrices', question_count: 10, average_marks: 1, difficulty_easy_count: 4, difficulty_moderate_count: 5, difficulty_hard_count: 1 },
      { topic_id: 'trigonometry', question_count: 5, average_marks: 1, difficulty_easy_count: 2, difficulty_moderate_count: 2, difficulty_hard_count: 1 },
      { topic_id: 'probability_statistics', question_count: 2, average_marks: 1, difficulty_easy_count: 1, difficulty_moderate_count: 1, difficulty_hard_count: 0 }
    ]
  };

  return distributions[year] || distributions[2024];
}

async function main() {
  console.log('🚀 AI Question Generator Setup\n');
  console.log('================================\n');

  const tablesReady = await setupTables();

  if (tablesReady) {
    await seedSampleData();
    console.log('✅ Setup complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Test generation: npm run test-ai-generator');
    console.log('   2. Integrate with API endpoint\n');
  } else {
    console.log('\n📋 Manual Steps Required:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy SQL from: database/ai_generator_schema.sql');
    console.log('   3. Execute the SQL');
    console.log('   4. Run this script again: npx tsx scripts/setupAIGenerator.ts\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
