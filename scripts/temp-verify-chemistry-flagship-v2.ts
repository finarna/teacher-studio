import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyChemistryFlagship() {
  console.log('🔍 VERIFYING CHEMISTRY FLAGSHIP v2 GENERATION\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
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

    console.log(`✅ Found ${allQuestions.length} recent Chemistry KCET AI-generated questions\n`);

    if (allQuestions.length < 60) {
      console.error(`⚠️  Not enough questions found (need 120, got ${allQuestions.length})`);
      return;
    }

    // Split into two sets (most recent 60 = SET_B, next 60 = SET_A based on generation order)
    const setB = allQuestions.slice(0, 60);
    const setA = allQuestions.slice(60, 120);

    const sets = [
      { name: 'SET_A', questions: setA },
      { name: 'SET_B', questions: setB }
    ];

    for (const { name, questions } of sets) {
      console.log(`\n📊 ${name}: KCET Chemistry 2026 Flagship`);
      console.log(`   Total Questions: ${questions.length}/60`);

      if (questions.length > 0) {
        console.log(`   First question created: ${questions[0]?.created_at}`);
        console.log(`   Last question created: ${questions[questions.length - 1]?.created_at}`);
      }
      console.log('   ─────────────────────────────────────────────────────');

      // Analyze difficulty distribution
      const difficultyCount = {
        Easy: 0,
        Moderate: 0,
        Hard: 0,
        unknown: 0
      };

      // Analyze question type distribution
      const questionTypeCount: Record<string, number> = {
        theory_conceptual: 0,
        property_based: 0,
        reaction_based: 0,
        calculation: 0,
        structure_based: 0,
        application: 0,
        untagged: 0
      };

      // Analyze identity assignments
      let identityAssigned = 0;

      questions.forEach(q => {
        // Count difficulty (lowercase comparison)
        const diff = (q.difficulty || 'unknown').toLowerCase();
        if (diff === 'easy') difficultyCount.Easy++;
        else if (diff === 'moderate') difficultyCount.Moderate++;
        else if (diff === 'hard') difficultyCount.Hard++;
        else difficultyCount.unknown++;

        // Count question type
        const metadata = q.metadata || {};
        if (metadata.questionType) {
          const qType = metadata.questionType;
          if (questionTypeCount[qType] !== undefined) {
            questionTypeCount[qType]++;
          }
        } else {
          questionTypeCount.untagged++;
        }

        // Count identity
        if (metadata.identityId) {
          identityAssigned++;
        }
      });

      // Report difficulty
      console.log('\n   🎯 DIFFICULTY DISTRIBUTION:');
      const totalQuestions = questions.length || 60;
      console.log(`      Easy: ${difficultyCount.Easy} (${((difficultyCount.Easy/totalQuestions)*100).toFixed(1)}%)`);
      console.log(`      Moderate: ${difficultyCount.Moderate} (${((difficultyCount.Moderate/totalQuestions)*100).toFixed(1)}%)`);
      console.log(`      Hard: ${difficultyCount.Hard} (${((difficultyCount.Hard/totalQuestions)*100).toFixed(1)}%)`);
      if (difficultyCount.unknown > 0) {
        console.log(`      Unknown: ${difficultyCount.unknown} ⚠️`);
      }

      const difficultyMatch = Math.abs(difficultyCount.Easy - 36) <= 2 &&
                             Math.abs(difficultyCount.Moderate - 23) <= 2;
      console.log(`      Status: ${difficultyMatch ? '✅ MATCH' : '⚠️ OFF TARGET'} (Target: 36/23/1)`);

      // Report question types
      console.log('\n   📋 QUESTION TYPE DISTRIBUTION:');
      const expectedTypes = {
        theory_conceptual: 20,
        property_based: 15,
        reaction_based: 14,
        calculation: 5,
        structure_based: 4,
        application: 1
      };

      let totalGap = 0;
      let perfectMatches = 0;

      Object.entries(expectedTypes).forEach(([type, expected]) => {
        const actual = questionTypeCount[type];
        const gap = actual - expected;
        const match = Math.abs(gap) <= 2;

        if (Math.abs(gap) === 0) perfectMatches++;
        totalGap += Math.abs(gap);

        const status = match ? '✅' : (gap > 0 ? '⚠️ OVER' : '⚠️ UNDER');
        console.log(`      ${type}: ${actual}/${expected} (${gap >= 0 ? '+' : ''}${gap}) ${status}`);
      });

      console.log(`      untagged: ${questionTypeCount.untagged} ${questionTypeCount.untagged === 0 ? '✅' : '⚠️'}`);

      const typeAccuracy = ((60 - totalGap) / 60) * 100;
      console.log(`\n      Overall Type Accuracy: ${typeAccuracy.toFixed(1)}%`);
      console.log(`      Perfect Matches: ${perfectMatches}/6 types`);
      console.log(`      Total Gap: ${totalGap} questions`);

      // Report identity assignment
      console.log('\n   🧬 IDENTITY ASSIGNMENT:');
      console.log(`      Assigned: ${identityAssigned}/${questions.length}`);
      console.log(`      Unassigned: ${questions.length - identityAssigned}`);
      console.log(`      Status: ${identityAssigned === questions.length ? '✅ COMPLETE' : (identityAssigned > 0 ? '⚠️ PARTIAL' : '❌ NONE')}`);

      // Sample question types for debugging
      if (questionTypeCount.untagged > 0) {
        console.log('\n   🔍 SAMPLE UNTAGGED QUESTIONS:');
        const untaggedSamples = questions.filter(q => !q.metadata?.questionType).slice(0, 3);
        untaggedSamples.forEach((q, idx) => {
          console.log(`      ${idx + 1}. ID: ${q.id}`);
          console.log(`         Topic: ${q.topic || 'N/A'}`);
          console.log(`         Text preview: ${(q.text || '').substring(0, 60)}...`);
        });
      }

      // Overall verdict
      console.log('\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const passMarks = {
        difficulty: difficultyMatch,
        questionTypes: typeAccuracy >= 85,
        identities: identityAssigned > 0
      };

      console.log(`   ✓ Difficulty Match: ${passMarks.difficulty ? '✅' : '❌'}`);
      console.log(`   ✓ Question Types (≥85%): ${passMarks.questionTypes ? '✅' : '❌'}`);
      console.log(`   ✓ Identity Assignment: ${passMarks.identities ? '✅' : '❌'}`);

      const overallPass = Object.values(passMarks).every(v => v);
      console.log(`\n   VERDICT: ${overallPass ? '✅ PASS' : '⚠️ NEEDS REVIEW'}`);
    }

    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('✅ VERIFICATION COMPLETE\n');

  } catch (error) {
    console.error('❌ Verification error:', error);
  }
}

verifyChemistryFlagship().catch(console.error);
