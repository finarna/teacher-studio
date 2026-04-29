/**
 * BUILD NEET PHYSICS IDENTITY BANK
 *
 * Analyzes all 250 NEET Physics questions (2021-2025) to extract ~30 core identities.
 * This must be done BEFORE running iterative calibration.
 *
 * Process:
 * 1. Fetch all 250 Physics questions from 2021-2025
 * 2. Use AI to analyze and cluster into ~30 recurring patterns/identities
 * 3. Generate identity bank with id, name, logic, confidence
 * 4. Save to lib/oracle/identities/neet_physics.json
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

const SCAN_IDS = {
  2021: 'ca38a537-5516-469a-abd4-967a76b32028',
  2022: 'b19037fb-980a-41e1-89a0-d28a5e1c0033',
  2023: 'e3767338-1664-4e03-b0f6-1fab41ff5838',
  2024: '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5',
  2025: '4f682118-d0ce-4f6f-95c7-6141e496579f'
};

async function buildIdentities() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔬 BUILDING NEET PHYSICS IDENTITY BANK');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Step 1: Fetch all 250 Physics questions
  console.log('📊 Step 1: Fetching all NEET Physics questions (2021-2025)...\n');

  const allQuestions: any[] = [];

  for (const [year, scanId] of Object.entries(SCAN_IDS)) {
    const { data: questions } = await supabase
      .from('questions')
      .select('text, topic, difficulty, year, subject')
      .eq('scan_id', scanId)
      .eq('subject', 'Physics');

    if (questions) {
      console.log(`   ✓ ${year}: ${questions.length} Physics questions`);
      allQuestions.push(...questions);
    }
  }

  console.log(`\n   ✅ Total: ${allQuestions.length} questions\n`);

  if (allQuestions.length < 200) {
    throw new Error(`Insufficient data: only ${allQuestions.length} questions found`);
  }

  // Step 2: Prepare question sample for AI analysis
  console.log('🤖 Step 2: Analyzing questions with AI to extract identities...\n');

  // Group questions by topic for better analysis
  const topicGroups: Record<string, string[]> = {};
  for (const q of allQuestions) {
    const topic = q.topic || 'General';
    if (!topicGroups[topic]) topicGroups[topic] = [];
    topicGroups[topic].push(q.text);
  }

  console.log(`   Found ${Object.keys(topicGroups).length} unique topics\n`);
  console.log('   Top topics:');
  const topicCounts = Object.entries(topicGroups)
    .map(([topic, questions]) => ({ topic, count: questions.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  for (const { topic, count } of topicCounts) {
    console.log(`      ${topic}: ${count} questions`);
  }

  // Step 3: AI analysis to extract identities
  console.log('\n   🔮 Calling AI to extract core identities...\n');

  const prompt = `You are analyzing NEET Physics questions from 2021-2025 to extract core "IDENTITIES" (recurring patterns/concepts).

CONTEXT:
- Total Questions: ${allQuestions.length}
- Years: 2021-2025 (NEET Combined Papers)
- Subject: Physics

TOPICS FOUND (with question counts):
${topicCounts.map(t => `- ${t.topic}: ${t.count} questions`).join('\n')}

SAMPLE QUESTIONS (first 3 from top topics):
${topicCounts.slice(0, 5).map(({ topic }) => {
  const samples = topicGroups[topic].slice(0, 3);
  return `\n${topic}:\n${samples.map((q, i) => `  ${i + 1}. ${q.substring(0, 150)}...`).join('\n')}`;
}).join('\n')}

TASK:
Extract exactly 30 core IDENTITIES that represent the recurring patterns in NEET Physics.

An IDENTITY is NOT just a topic, but a specific PATTERN or TRAP that appears repeatedly:
- Example: "Dimensional Homogeneity Traps" (not just "Units and Dimensions")
- Example: "Sign Convention in Optics" (not just "Optics")
- Example: "Work-Energy Theorem in Variable Force" (not just "Work and Energy")

For each identity provide:
1. id: Format "ID-NP-XXX" (NP = NEET Physics, XXX = 001-030)
2. name: Concise pattern name (4-8 words)
3. logic: Detailed explanation of the pattern (1-2 sentences)
4. high_yield: true/false (is this a frequently tested pattern?)
5. confidence: 0.7-1.0 (based on frequency across years)

Return ONLY valid JSON:
{
  "version": "17.0",
  "subject": "Physics",
  "exam": "NEET",
  "identities": [
    {
      "id": "ID-NP-001",
      "name": "Pattern Name",
      "logic": "Detailed explanation",
      "high_yield": true,
      "confidence": 0.95
    }
  ],
  "traps": [
    {
      "name": "Common Mistake Name",
      "description": "What students typically get wrong"
    }
  ]
}`;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Parse JSON response
  const cleaned = responseText.replace(/```json|```/g, '').trim();
  const identityBank = JSON.parse(cleaned);

  console.log(`   ✅ Extracted ${identityBank.identities.length} identities\n`);

  // Step 4: Display extracted identities
  console.log('📋 Extracted Identities:\n');
  for (const identity of identityBank.identities.slice(0, 10)) {
    console.log(`   ${identity.id}: ${identity.name}`);
    console.log(`      ${identity.logic.substring(0, 80)}...`);
    console.log(`      High-yield: ${identity.high_yield ? '✓' : '✗'}, Confidence: ${identity.confidence}\n`);
  }

  if (identityBank.identities.length > 10) {
    console.log(`   ... and ${identityBank.identities.length - 10} more identities\n`);
  }

  // Step 5: Save to file
  const outputPath = path.join(__dirname, '../../lib/oracle/identities/neet_physics.json');
  fs.writeFileSync(outputPath, JSON.stringify(identityBank, null, 2));

  console.log(`✅ Identity bank saved to: ${outputPath}\n`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎯 NEXT STEP: Run neet_physics_iterative_calibration_2021_2025.ts');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

buildIdentities().catch(console.error);
