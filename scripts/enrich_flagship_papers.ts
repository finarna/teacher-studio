import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
  process.exit(1);
}

console.log(`🔑 API Key loaded: ${apiKey.substring(0, 10)}...`);

const genAI = new GoogleGenerativeAI(apiKey);
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
console.log(`🤖 Using model: ${modelName}\n`);

const model = genAI.getGenerativeModel({ model: modelName });

interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  difficulty: string;
  topic: string;
  solutionSteps?: string[];
  examTip?: string;
  aiReasoning?: string;
  historicalPattern?: string;
  marks?: number;
  masteryMaterial?: any;
  keyFormulas?: string[];
  thingsToRemember?: string[];
  commonMistakes?: any[];
  questionVariations?: string[];
  conceptVariations?: string[];
}

async function enrichQuestion(question: Question, questionNumber: number, totalQuestions: number): Promise<Question> {
  const correctAnswer = question.options[question.correctOptionIndex];

  const prompt = `You are an expert KCET Mathematics educator creating world-class learning materials for flagship prediction papers.

**Question #${questionNumber}/${totalQuestions}:**
Topic: ${question.topic}
Difficulty: ${question.difficulty}
Question: ${question.text}
Options: ${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join(', ')}
Correct Answer: ${String.fromCharCode(65 + question.correctOptionIndex)}) ${correctAnswer}

**Current Content (to be enhanced):**
${question.solutionSteps ? `Solution Steps: ${question.solutionSteps.join(' | ')}` : ''}
${question.examTip ? `Exam Tip: ${question.examTip}` : ''}
${question.aiReasoning ? `AI Reasoning: ${question.aiReasoning}` : ''}
${question.historicalPattern ? `Historical Pattern: ${question.historicalPattern}` : ''}

**Your Task:** Generate comprehensive enrichment content in JSON format with these exact fields:

{
  "solutionSteps": [
    "Step Title ::: Detailed explanation with reasoning (4-5 steps, use LaTeX $...$ for math)",
    "..."
  ],
  "examTip": "Strategic tip for exam day (2-3 sentences, practical and actionable, not generic)",
  "aiReasoning": "Strategic analysis: what this question tests, why it's placed here, board expectations, solving strategy (3-4 sentences with depth)",
  "historicalPattern": "Frequency in KCET (give % if possible), how it appears in past papers, variations seen, confidence level of prediction (2-3 sentences with data)",
  "masteryMaterial": {
    "coreConcept": "Deep conceptual explanation connecting theory to this question (3-4 sentences, build intuition)",
    "memoryTrigger": "Actual mnemonic, acronym, or memory trick that helps recall this concept instantly",
    "visualPrompt": "How to visualize or imagine this concept (metaphor, mental picture, diagram description)",
    "commonTrap": "What students typically confuse this with or get wrong (2 sentences)"
  },
  "keyFormulas": [
    "$formula_1$ with brief context",
    "$formula_2$ with when to use it",
    "2-4 essential formulas in LaTeX"
  ],
  "thingsToRemember": [
    "Critical point 1 that students must remember",
    "Critical point 2",
    "4-6 must-remember facts presented as checklist"
  ],
  "commonMistakes": [
    {
      "mistake": "Specific wrong approach students take",
      "why": "Psychological/conceptual reason this mistake happens",
      "howToAvoid": "Concrete strategy to avoid this mistake"
    },
    {
      "mistake": "Second common mistake",
      "why": "Why it happens",
      "howToAvoid": "How to avoid"
    }
  ],
  "questionVariations": [
    "Variation 1: How this could be twisted (with answer hint)",
    "Variation 2: Different angle on same concept",
    "Variation 3: Harder version",
    "Variation 4: Application scenario",
    "4-5 realistic KCET-style variations"
  ],
  "conceptVariations": [
    "Related concept 1 students should know",
    "Related concept 2",
    "3-5 connected concepts/theorems/applications"
  ]
}

**Guidelines:**
- Use LaTeX for ALL math: $...$ for inline, use proper LaTeX syntax
- Be specific to KCET patterns and Karnataka board style
- Make content RICH and VALUABLE - students should feel "wow, this is helpful!"
- Mnemonics should be memorable and clever
- Question variations should be realistic exam twists
- No generic content - everything must be contextual to THIS question
- For difficulty "${question.difficulty}": ${question.difficulty === 'Easy' ? 'Focus on building confidence, common traps for beginners' : question.difficulty === 'Hard' ? 'Advanced strategies, integration with multiple concepts' : 'Balance of concept and application'}

Return ONLY valid JSON, no markdown, no explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Clean the response - remove markdown code blocks if present
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.substring(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    cleanJson = cleanJson.trim();

    const enrichedContent = JSON.parse(cleanJson);

    // Merge with original question
    return {
      ...question,
      marks: question.marks || 1,
      ...enrichedContent
    };
  } catch (error) {
    console.error(`❌ Failed to enrich question ${questionNumber}:`, error);
    console.error('Response:', error);
    return question; // Return original on failure
  }
}

async function enrichFlagshipPaper(filePath: string) {
  console.log(`\n📄 Processing: ${path.basename(filePath)}`);

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const paperData = JSON.parse(fileContent);
  const questions = paperData.test_config.questions;

  console.log(`📊 Total questions: ${questions.length}\n`);

  const enrichedQuestions: Question[] = [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    console.log(`\n🔄 [${i + 1}/${questions.length}] Enriching: ${question.topic} (${question.difficulty})`);
    console.log(`   Question: ${question.text.substring(0, 80)}...`);

    const enriched = await enrichQuestion(question, i + 1, questions.length);
    enrichedQuestions.push(enriched);

    console.log(`✅ Enriched with ${Object.keys(enriched.masteryMaterial || {}).length} mastery fields`);

    // Rate limit: wait 2 seconds between requests
    if (i < questions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Update the paper data
  paperData.test_config.questions = enrichedQuestions;

  // Save to new file
  const backupPath = filePath.replace('.json', '_backup.json');
  const enrichedPath = filePath.replace('.json', '_enriched.json');

  // Backup original
  fs.writeFileSync(backupPath, fileContent);
  console.log(`\n💾 Backup saved: ${path.basename(backupPath)}`);

  // Save enriched version
  fs.writeFileSync(enrichedPath, JSON.stringify(paperData, null, 2));
  console.log(`✨ Enriched saved: ${path.basename(enrichedPath)}`);

  return enrichedPath;
}

async function main() {
  console.log('🚀 FLAGSHIP PAPER ENRICHMENT SYSTEM');
  console.log('=====================================\n');

  const setB = path.join(process.cwd(), 'flagship_final_b.json');
  const setA = path.join(process.cwd(), 'flagship_final.json');

  try {
    // Enrich Set-B
    await enrichFlagshipPaper(setB);

    console.log('\n\n⏸️  Cooling down (10 seconds before Set-A)...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Enrich Set-A
    await enrichFlagshipPaper(setA);

    console.log('\n\n🎉 ENRICHMENT COMPLETE!');
    console.log('======================================');
    console.log('✅ Both flagship papers enriched successfully');
    console.log('📁 Files created:');
    console.log('   - flagship_final_b_enriched.json');
    console.log('   - flagship_final_enriched.json');
    console.log('   - flagship_final_b_backup.json');
    console.log('   - flagship_final_backup.json');
    console.log('\n💡 Next: Review the enriched files and replace originals when satisfied');

  } catch (error) {
    console.error('\n❌ ENRICHMENT FAILED:', error);
    process.exit(1);
  }
}

main();
