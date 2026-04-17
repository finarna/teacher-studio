import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function exportChemistryFlagship() {
  console.log('🧪 GENERATING KCET CHEMISTRY 2026 FLAGSHIP PAPER');
  console.log('═══════════════════════════════════════════════════════\n');

  // Get the most recent 120 Chemistry KCET AI-generated questions
  const { data: allQuestions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('subject', 'Chemistry')
    .eq('exam_context', 'KCET')
    .like('source', 'AI-Generated%')
    .order('created_at', { ascending: false })
    .limit(120);

  if (error || !allQuestions) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`✅ Found ${allQuestions.length} recent Chemistry questions\n`);

  if (allQuestions.length < 60) {
    console.error(`⚠️  Not enough questions found (need 120, got ${allQuestions.length})`);
    return;
  }

  // Split into two sets (most recent 60 = SET_B, next 60 = SET_A based on generation order)
  const setB = allQuestions.slice(0, 60);
  const setA = allQuestions.slice(60, 120);

  const sets = [
    { name: 'SET_A', questions: setA, file: 'flagship_chemistry_final.json' },
    { name: 'SET_B', questions: setB, file: 'flagship_chemistry_final_b.json' }
  ];

  for (const { name, questions, file } of sets) {
    console.log(`📝 ${name}:`);
    console.log(`   Questions: ${questions.length}`);

    if (questions.length > 0) {
      console.log(`   First question created: ${questions[0]?.created_at}`);
      console.log(`   Last question created: ${questions[questions.length - 1]?.created_at}`);
    }

    // Analyze difficulty distribution
    const difficulties = questions.reduce((acc: any, q: any) => {
      acc[q.difficulty || 'unknown'] = (acc[q.difficulty || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    console.log(`   Difficulty: E=${difficulties.easy || 0} M=${difficulties.moderate || 0} H=${difficulties.hard || 0}`);

    // Analyze question type distribution (if available in metadata)
    const questionTypes: Record<string, number> = {};
    questions.forEach((q: any) => {
      const qType = q.metadata?.questionType || 'unknown';
      questionTypes[qType] = (questionTypes[qType] || 0) + 1;
    });

    console.log(`   Question Types:`, questionTypes);

    // Export to file
    const exportData = {
      meta: {
        version: 'REI v17.0',
        subject: 'Chemistry',
        exam: 'KCET',
        targetYear: 2026,
        setName: name,
        generatedAt: questions[0]?.created_at || new Date().toISOString(),
        questionCount: questions.length,
        calibration: {
          idsTarget: 0.724,
          idsRange: { min: 0.680, max: 0.760 },
          rigorDriftMultiplier: 1.607,
          boardSignature: 'CONCEPT_PROPERTY_REACTION',
          questionTypeProfile: {
            theory_conceptual: 34,
            property_based: 25,
            reaction_based: 24,
            calculation: 8,
            structure_based: 7,
            application: 1,
            nomenclature: 1
          },
          difficultyProfile: {
            easy: 60,
            moderate: 39,
            hard: 2
          },
          identityDistribution: {
            totalIdentities: 30,
            highConfidence: 14, // ≥75%
            mediumConfidence: 10,
            lowConfidence: 6
          },
          calibrationMetrics: {
            averageMatchRate: 54.8,
            identityHitRate: 59.3,
            systemConfidence: 50.1,
            totalIterations: 11,
            yearsCalibratedCount: 4
          },
          topHighYieldIdentities: [
            'CHM-007: States of Matter (99%)',
            'CHM-009: Equilibrium (99%)',
            'CHM-016: Electrochemistry (99%)',
            'CHM-027: Polymers (99%)',
            'CHM-005: Chemical Bonding (96%)',
            'CHM-014: Solid State (96%)',
            'CHM-015: Solutions (96%)',
            'CHM-017: Chemical Kinetics (96%)',
            'CHM-018: Surface Chemistry (96%)',
            'CHM-019: p-Block Elements (96%)'
          ],
          status: 'CALIBRATED_2021_2025_REI_V17'
        },
        topicDistribution: {
          high_priority: [
            'Solutions (8.3%)',
            'Aldehydes, Ketones & Carboxylic Acids (8.3%)',
            'Electrochemistry (6.7%)',
            'Biomolecules (6.7%)',
            'Coordination Compounds (6.7%)',
            'd & f Block Elements (6.7%)',
            'Chemical Kinetics (6.7%)',
            'Haloalkanes & Haloarenes (6.7%)'
          ],
          medium_priority: [
            'Alcohols, Phenols & Ethers (5.0%)',
            'Amines (3.3%)',
            'Chemical Equilibrium (3.3%)',
            'Thermodynamics (3.3%)',
            'Organic Chemistry Basics (3.3%)'
          ]
        },
        forensicMarkers: {
          evolution_2021_2025: 'Transition from direct recall to multi-statement verification',
          question_format_trend: 'Increased Match List and Statement-I/II formats',
          complexity_shift: 'Laboratory-integrated theory with reagent-specific logic',
          organic_pattern: 'Multi-step synthesis paths (A→B→C chains)',
          physical_pattern: 'Graphical interpretation and conceptual stability'
        }
      },
      questions: questions.map((q, idx) => ({
        questionNumber: idx + 1,
        id: q.id,
        text: q.text,
        options: q.options,
        correctOptionIndex: q.correct_option_index,
        marks: q.marks || 1,
        difficulty: q.difficulty,
        topic: q.topic,
        blooms: q.blooms,
        identityId: q.metadata?.identityId,
        questionType: q.metadata?.questionType,
        solutionSteps: q.solution_steps,
        examTip: q.exam_tip,
        keyFormulas: q.key_formulas,
        pitfalls: q.pitfalls,
        masteryMaterial: q.mastery_material,
        source: q.source,
        year: q.metadata?.year
      }))
    };

    fs.writeFileSync(file, JSON.stringify(exportData, null, 2));
    console.log(`   ✅ Exported to ${file}\n`);
  }

  console.log('🎉 CHEMISTRY FLAGSHIP EXPORT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📊 Files created:');
  console.log('   - flagship_chemistry_final.json (SET_A)');
  console.log('   - flagship_chemistry_final_b.json (SET_B)');
  console.log('\n📈 REI v17 Chemistry Profile:');
  console.log('   - IDS Target: 0.724 (Range: 0.68-0.76)');
  console.log('   - Question Types: Theory 34%, Property 25%, Reaction 24%');
  console.log('   - Difficulty: Easy 60%, Moderate 39%, Hard 2%');
  console.log('   - High-Confidence Identities: 14/30 (≥75%)');
  console.log('   - Calibration: 54.8% match rate across 4 years\n');
}

exportChemistryFlagship().catch(console.error);
