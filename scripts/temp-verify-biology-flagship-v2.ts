import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyBiologyFlagship() {
  console.log('🔍 VERIFYING BIOLOGY FLAGSHIP v2 GENERATION\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Get the most recent 120 Biology KCET AI-generated questions
    const { data: allQuestions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('subject', 'Biology')
      .eq('exam_context', 'KCET')
      .like('source', 'AI-Generated%')
      .order('created_at', { ascending: false })
      .limit(120);

    if (error || !allQuestions) {
      console.error('❌ Error fetching questions:', error);
      return;
    }

    console.log(`✅ Found ${allQuestions.length} recent Biology KCET AI-generated questions\n`);

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
      console.log(`\n📊 ${name}: KCET Biology 2026 Flagship`);
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
        factual_conceptual: 0,
        diagram_based: 0,
        match_column: 0,
        statement_based: 0,
        reasoning: 0,
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
      console.log(`      Easy: ${difficultyCount.Easy} (${((difficultyCount.Easy/totalQuestions)*100).toFixed(1)}%) → Target: 52 (87%)`);
      console.log(`      Moderate: ${difficultyCount.Moderate} (${((difficultyCount.Moderate/totalQuestions)*100).toFixed(1)}%) → Target: 8 (13%)`);
      console.log(`      Hard: ${difficultyCount.Hard} (${((difficultyCount.Hard/totalQuestions)*100).toFixed(1)}%) → Target: 0 (0%)`);
      if (difficultyCount.unknown > 0) {
        console.log(`      Unknown: ${difficultyCount.unknown} ⚠️`);
      }

      const difficultyMatch = Math.abs(difficultyCount.Easy - 52) <= 2 &&
                             Math.abs(difficultyCount.Moderate - 8) <= 2;
      console.log(`      Status: ${difficultyMatch ? '✅ MATCH' : '⚠️ OFF TARGET'} (Target: 52/8/0)`);

      // Report question types
      console.log('\n   📋 QUESTION TYPE DISTRIBUTION:');
      const expectedTypes = {
        factual_conceptual: 37,
        diagram_based: 7,
        match_column: 5,
        statement_based: 5,
        reasoning: 4,
        application: 3
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
      console.log(`      Assigned: ${identityAssigned}/${questions.length} (${((identityAssigned/questions.length)*100).toFixed(1)}%)`);
      console.log(`      Unassigned: ${questions.length - identityAssigned}`);
      const identityStatus = identityAssigned >= 42 ? '✅ GOOD' : (identityAssigned >= 30 ? '⚠️ ACCEPTABLE' : '❌ LOW');
      console.log(`      Status: ${identityStatus} (Target: ≥70%)`);

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
        questionTypes: typeAccuracy >= 80,
        identities: identityAssigned >= 30
      };

      console.log(`   ✓ Difficulty Match: ${passMarks.difficulty ? '✅' : '❌'}`);
      console.log(`   ✓ Question Types (≥80%): ${passMarks.questionTypes ? '✅' : '❌'}`);
      console.log(`   ✓ Identity Assignment (≥50%): ${passMarks.identities ? '✅' : '❌'}`);

      const overallPass = Object.values(passMarks).every(v => v);
      console.log(`\n   VERDICT: ${overallPass ? '✅ PASS' : '⚠️ NEEDS REVIEW'}`);
    }

    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('✅ VERIFICATION COMPLETE\n');

  } catch (error) {
    console.error('❌ Verification error:', error);
  }
}

verifyBiologyFlagship().catch(console.error);
