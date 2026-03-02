import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.7,
  }
});

async function testGeneration() {
  console.log('\n🧪 TESTING AI QUESTION GENERATION WITH NEW PROMPTS\n');
  console.log('Generating 1 sample question for Relations and Functions (KCET MATHS)...\n');

  const topicNames = 'Relations and Functions';
  const examContext = 'KCET';
  const subject = 'MATHS';

  const prompt = `You are a World-Class Question Architect for the ${examContext} entrance exam in ${subject}.
Your mission is to generate 1 ULTIMATE-RIGOR MCQ questions.

STRATEGY: PREDICTIVE MOCK (Focus 100% on real exam pattern probability)

KCET FOCUS: Trickiness, speed-accuracy challenges, and syllabus-edge cases.

QUALITY MANDATE:
1. ZERO "Definition" questions. Every question must be a Scenario or Application problem.
2. Focus on "The Prediction Gap": Create questions that pre-empt how real exams evolve each year.
3. MANDATORY SOLUTIONS: Every single question MUST include detailed "solutionSteps", "examTip", "keyFormulas", and "pitfalls". NEVER leave these empty.
4. MANDATORY INSIGHTS: Every question MUST include "masteryMaterial" object with "aiReasoning", "whyItMatters", "historicalPattern", "predictiveInsight", and "keyConcepts" array.
5. STRUCTURE: 4 options, exactly 1 correct.
6. Topic(s): "${topicNames}"
7. Difficulty: Moderate.
8. Use PROPER LaTeX for all expressions.

Return ONLY a valid JSON array:
[
  {
    "id": "q1",
    "text": "The rigorous question with $Proper \\\\LaTeX$...",
    "options": ["...", "...", "...", "..."],
    "correctOptionIndex": 0,
    "solutionSteps": ["Step 1: Concept ::: Detailed explanation with LaTeX", "Step 2: Apply ::: Working with calculations"],
    "examTip": "Strategic insight for exam success - how to solve this type quickly",
    "keyFormulas": ["$formula1$", "$formula2$"],
    "pitfalls": ["Common mistake students make and why it happens"],
    "masteryMaterial": {
      "aiReasoning": "This ${topicNames} question tests [specific skill/concept] frequently seen in ${examContext} papers",
      "whyItMatters": "Mastering this concept unlocks [related topics] and is crucial because [exam relevance]",
      "historicalPattern": "Appears in X% of recent ${examContext} exams, particularly testing [specific aspect]",
      "predictiveInsight": "High probability (70-85%) of similar pattern in upcoming ${examContext} based on syllabus trends",
      "keyConcepts": [
        {"name": "Core Concept 1", "explanation": "Clear explanation with real examples and context"},
        {"name": "Core Concept 2", "explanation": "Clear explanation with real examples and context"}
      ]
    },
    "topic": "${topicNames}",
    "difficulty": "Moderate"
  }
]`;

  try {
    console.log('⏳ Calling Gemini AI...\n');
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    console.log('📥 RAW RESPONSE (first 500 chars):\n');
    console.log(raw.substring(0, 500) + '...\n');

    // With responseMimeType: 'application/json', response is already JSON
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.length > 0) {
      const question = parsed[0];

      console.log('='.repeat(80));
      console.log('✅ GENERATED QUESTION ANALYSIS');
      console.log('='.repeat(80));
      console.log(`\nQuestion ID: ${question.id}`);
      console.log(`Topic: ${question.topic}`);
      console.log(`Difficulty: ${question.difficulty}`);
      console.log(`\nQuestion Text:\n${question.text}\n`);

      console.log('📝 OPTIONS:');
      question.options.forEach((opt, idx) => {
        const marker = idx === question.correctOptionIndex ? '✅' : '  ';
        console.log(`${marker} ${String.fromCharCode(65 + idx)}. ${opt}`);
      });
      console.log('');

      console.log('💡 SOLUTION DATA:');
      console.log(`  solutionSteps: ${question.solutionSteps ? question.solutionSteps.length : 0} steps`);
      console.log(`  keyFormulas: ${question.keyFormulas ? question.keyFormulas.length : 0} formulas`);
      console.log(`  pitfalls: ${question.pitfalls ? question.pitfalls.length : 0} pitfalls`);
      console.log(`  examTip: ${question.examTip ? 'YES' : 'NO'}`);
      console.log('');

      console.log('🧠 MASTERY MATERIAL:');
      if (question.masteryMaterial) {
        console.log(`  ✅ EXISTS`);
        console.log(`  aiReasoning: ${question.masteryMaterial.aiReasoning ? 'YES' : 'NO'}`);
        console.log(`  whyItMatters: ${question.masteryMaterial.whyItMatters ? 'YES' : 'NO'}`);
        console.log(`  historicalPattern: ${question.masteryMaterial.historicalPattern ? 'YES' : 'NO'}`);
        console.log(`  predictiveInsight: ${question.masteryMaterial.predictiveInsight ? 'YES' : 'NO'}`);
        console.log(`  keyConcepts: ${question.masteryMaterial.keyConcepts ? question.masteryMaterial.keyConcepts.length : 0} concepts`);
      } else {
        console.log(`  ❌ MISSING`);
      }
      console.log('');

      console.log('='.repeat(80));
      console.log('📊 DETAILED CONTENT');
      console.log('='.repeat(80));

      if (question.solutionSteps && question.solutionSteps.length > 0) {
        console.log('\n📝 SOLUTION STEPS:');
        question.solutionSteps.forEach((step, idx) => {
          const [title, content] = step.includes(':::') ? step.split(':::') : ['', step];
          console.log(`\n${idx + 1}. ${title.trim()}`);
          console.log(`   ${content.trim()}`);
        });
      }

      if (question.keyFormulas && question.keyFormulas.length > 0) {
        console.log('\n\n⚡ KEY FORMULAS:');
        question.keyFormulas.forEach((formula, idx) => {
          console.log(`  ${idx + 1}. ${formula}`);
        });
      }

      if (question.pitfalls && question.pitfalls.length > 0) {
        console.log('\n\n⚠️  COMMON PITFALLS:');
        question.pitfalls.forEach((pitfall, idx) => {
          console.log(`  ${idx + 1}. ${pitfall}`);
        });
      }

      if (question.examTip) {
        console.log(`\n\n💡 EXAM TIP:\n   ${question.examTip}`);
      }

      if (question.masteryMaterial) {
        console.log('\n\n🧠 AI INSIGHTS:');
        console.log(`\n📊 THE CORE INSIGHT:`);
        console.log(`   ${question.masteryMaterial.aiReasoning}`);

        console.log(`\n✨ WHY IT MATTERS:`);
        console.log(`   ${question.masteryMaterial.whyItMatters}`);

        console.log(`\n🕐 HISTORICAL PATTERN:`);
        console.log(`   ${question.masteryMaterial.historicalPattern}`);

        console.log(`\n📈 PREDICTIVE INSIGHT:`);
        console.log(`   ${question.masteryMaterial.predictiveInsight}`);

        if (question.masteryMaterial.keyConcepts && question.masteryMaterial.keyConcepts.length > 0) {
          console.log(`\n📚 KEY CONCEPTS:`);
          question.masteryMaterial.keyConcepts.forEach((concept, idx) => {
            console.log(`\n   ${idx + 1}. ${concept.name}`);
            console.log(`      ${concept.explanation}`);
          });
        }
      }

      console.log('\n\n' + '='.repeat(80));
      console.log('✅ TEST COMPLETED SUCCESSFULLY');
      console.log('='.repeat(80));

      // Validation summary
      console.log('\n📋 VALIDATION SUMMARY:\n');
      const checks = [
        { name: 'Solution Steps', pass: question.solutionSteps && question.solutionSteps.length > 0 },
        { name: 'Key Formulas', pass: question.keyFormulas && question.keyFormulas.length > 0 },
        { name: 'Pitfalls', pass: question.pitfalls && question.pitfalls.length > 0 },
        { name: 'Exam Tip', pass: !!question.examTip },
        { name: 'Mastery Material', pass: !!question.masteryMaterial },
        { name: 'AI Reasoning', pass: question.masteryMaterial?.aiReasoning },
        { name: 'Why It Matters', pass: question.masteryMaterial?.whyItMatters },
        { name: 'Historical Pattern', pass: question.masteryMaterial?.historicalPattern },
        { name: 'Predictive Insight', pass: question.masteryMaterial?.predictiveInsight },
        { name: 'Key Concepts', pass: question.masteryMaterial?.keyConcepts?.length > 0 }
      ];

      checks.forEach(check => {
        console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
      });

      const allPassed = checks.every(c => c.pass);
      console.log(`\n${allPassed ? '🎉 ALL CHECKS PASSED!' : '⚠️  SOME CHECKS FAILED'}\n`);

    } else {
      console.log('❌ Failed to parse AI response as array\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testGeneration().catch(console.error);
