/**
 * EXPAND NEET PHYSICS IDENTITIES: 30 → 180+
 *
 * Analyzes all 250 NEET Physics questions (2021-2025) to expand the current
 * 30 broad identities into 120-180 granular, specific patterns.
 *
 * Goal: Increase Identity Hit Rate from 30% → 75%+ by making identities specific
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

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

const SCAN_IDS = {
  2021: 'ca38a537-5516-469a-abd4-967a76b32028',
  2022: 'b19037fb-980a-41e1-89a0-d28a5e1c0033',
  2023: 'e3767338-1664-4e03-b0f6-1fab41ff5838',
  2024: '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5',
  2025: '4f682118-d0ce-4f6f-95c7-6141e496579f'
};

interface Question {
  text: string;
  topic: string;
  difficulty: string;
  year: number;
  solution_steps?: string[];
}

async function expandIdentities() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║    EXPANDING NEET PHYSICS IDENTITIES: 30 → 180+ GRANULAR IDs    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Step 1: Load current 30 broad identities
  console.log('📚 Step 1: Loading current 30 broad identities...\n');
  const identityPath = path.join(__dirname, '../../lib/oracle/identities/neet_physics.json');
  const currentBank = JSON.parse(fs.readFileSync(identityPath, 'utf-8'));

  console.log(`   ✓ Loaded ${currentBank.identities.length} current identities`);
  console.log(`   ✓ Version: ${currentBank.version}`);
  console.log(`   ✓ Exam: ${currentBank.exam} ${currentBank.subject}\n`);

  // Step 2: Fetch all 250 questions from 2021-2025
  console.log('📊 Step 2: Fetching all NEET Physics questions (2021-2025)...\n');

  const allQuestions: Question[] = [];

  for (const [year, scanId] of Object.entries(SCAN_IDS)) {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('text, topic, difficulty, year, solution_steps')
      .eq('scan_id', scanId)
      .eq('subject', 'Physics');

    if (error) {
      console.error(`   ❌ Error fetching ${year}:`, error.message);
      continue;
    }

    if (questions) {
      console.log(`   ✓ ${year}: ${questions.length} questions`);
      allQuestions.push(...questions);
    }
  }

  console.log(`\n   ✅ Total: ${allQuestions.length} questions collected\n`);

  if (allQuestions.length < 200) {
    throw new Error(`Insufficient data: only ${allQuestions.length} questions found`);
  }

  // Step 3: Group questions by topic for analysis
  console.log('🔍 Step 3: Grouping questions by topic...\n');

  const topicGroups: Record<string, Question[]> = {};
  for (const q of allQuestions) {
    const topic = q.topic || 'General';
    if (!topicGroups[topic]) topicGroups[topic] = [];
    topicGroups[topic].push(q);
  }

  console.log(`   Found ${Object.keys(topicGroups).length} unique topics\n`);

  // Step 4: For each broad identity, extract granular sub-patterns
  console.log('🤖 Step 4: Expanding identities using AI pattern analysis...\n');
  console.log('   This will take 5-10 minutes...\n');

  const expandedIdentities: any[] = [];
  let idCounter = 1;

  // Process in batches to avoid overwhelming the AI
  const identityBatches = chunkArray(currentBank.identities, 5);

  for (let batchIdx = 0; batchIdx < identityBatches.length; batchIdx++) {
    const batch = identityBatches[batchIdx];

    console.log(`   📦 Processing batch ${batchIdx + 1}/${identityBatches.length} (${batch.length} identities)...\n`);

    for (const broadIdentity of batch) {
      console.log(`   🔬 Analyzing: ${broadIdentity.name}`);
      console.log(`      Topic: ${broadIdentity.topic}`);

      // Find questions matching this topic
      const matchingQuestions = allQuestions.filter(q => {
        const normalizedQTopic = q.topic.toLowerCase().trim();
        const normalizedIdTopic = (broadIdentity.topic || '').toLowerCase().trim();
        return normalizedQTopic.includes(normalizedIdTopic) ||
               normalizedIdTopic.includes(normalizedQTopic);
      });

      console.log(`      Found ${matchingQuestions.length} matching questions`);

      if (matchingQuestions.length === 0) {
        // Keep the broad identity if no questions found
        expandedIdentities.push({
          ...broadIdentity,
          id: `ID-NP-${String(idCounter).padStart(3, '0')}`
        });
        idCounter++;
        console.log(`      ⚠️  No matches - keeping broad identity\n`);
        continue;
      }

      // Prepare sample questions for AI
      const samples = matchingQuestions.slice(0, 15).map(q => ({
        text: q.text.substring(0, 300),
        year: q.year,
        difficulty: q.difficulty
      }));

      // AI prompt to extract granular patterns
      const prompt = `You are analyzing NEET Physics questions to extract SPECIFIC, GRANULAR identities.

BROAD IDENTITY TO SPLIT:
- ID: ${broadIdentity.id}
- Name: ${broadIdentity.name}
- Topic: ${broadIdentity.topic}
- Logic: ${broadIdentity.logic}

ACTUAL NEET QUESTIONS (${matchingQuestions.length} total, showing 15 samples):
${samples.map((s, i) => `
${i + 1}. [${s.year}, ${s.difficulty}]
${s.text}
`).join('\n')}

TASK:
Split this BROAD identity into 4-6 SPECIFIC, GRANULAR sub-identities based on the actual question patterns.

Each sub-identity should represent ONE specific pattern/concept that appears in these questions.

EXAMPLES of good granularity:
❌ BAD (too broad): "Circuit Analysis"
✅ GOOD (specific):
  - "Kirchhoff's Current Law - Node Equations"
  - "Kirchhoff's Voltage Law - Mesh Analysis"
  - "Wheatstone Bridge - Balance Condition"
  - "Potentiometer - EMF Measurement"

For each sub-identity provide:
1. name: Very specific pattern name (4-10 words)
2. logic: What makes this pattern unique (1-2 sentences, include specific formulas/concepts)
3. high_yield: true if seen in 2+ years, false otherwise
4. confidence: 0.7-1.0 based on frequency
5. topic: "${broadIdentity.topic}" (keep same NTA official topic name)

Return ONLY valid JSON array (4-6 sub-identities):
[
  {
    "name": "Specific Pattern Name",
    "logic": "Detailed logic with formulas/concepts",
    "topic": "${broadIdentity.topic}",
    "high_yield": true,
    "confidence": 0.95
  }
]`;

      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON response
        const cleaned = responseText.replace(/```json|```/g, '').trim();
        const subIdentities = JSON.parse(cleaned);

        // Add IDs and append to expanded list
        for (const subId of subIdentities) {
          expandedIdentities.push({
            id: `ID-NP-${String(idCounter).padStart(3, '0')}`,
            ...subId
          });
          idCounter++;
        }

        console.log(`      ✅ Split into ${subIdentities.length} granular identities\n`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        console.error(`      ❌ AI Error: ${error.message}`);
        console.log(`      ⚠️  Keeping broad identity as fallback\n`);

        // Fallback: keep the broad identity
        expandedIdentities.push({
          ...broadIdentity,
          id: `ID-NP-${String(idCounter).padStart(3, '0')}`
        });
        idCounter++;
      }
    }
  }

  console.log(`\n   ✅ Expansion complete: ${expandedIdentities.length} total identities\n`);

  // Step 5: Create expanded identity bank
  console.log('💾 Step 5: Saving expanded identity bank...\n');

  const expandedBank = {
    version: '19.0',
    subject: 'Physics',
    exam: 'NEET',
    identities: expandedIdentities,
    traps: currentBank.traps || [],
    calibration: {
      status: 'PENDING_CALIBRATION',
      expanded_at: new Date().toISOString(),
      previous_count: currentBank.identities.length,
      current_count: expandedIdentities.length,
      expansion_ratio: (expandedIdentities.length / currentBank.identities.length).toFixed(2)
    }
  };

  // Backup current file
  const backupPath = identityPath.replace('.json', '_backup_v18.json');
  fs.writeFileSync(backupPath, JSON.stringify(currentBank, null, 2));
  console.log(`   ✓ Backed up v18 to: neet_physics_backup_v18.json`);

  // Save expanded bank
  fs.writeFileSync(identityPath, JSON.stringify(expandedBank, null, 2));
  console.log(`   ✓ Saved expanded bank (${expandedIdentities.length} identities)`);

  // Step 6: Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      EXPANSION SUMMARY                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`   📊 Identities: ${currentBank.identities.length} → ${expandedIdentities.length}`);
  console.log(`   📈 Expansion: ${expandedBank.calibration.expansion_ratio}x`);
  console.log(`   📁 Saved to: lib/oracle/identities/neet_physics.json`);
  console.log(`   💾 Backup: lib/oracle/identities/neet_physics_backup_v18.json\n`);

  // Show sample of expanded identities
  console.log('   📋 Sample expanded identities (first 20):\n');
  expandedIdentities.slice(0, 20).forEach(id => {
    console.log(`      ${id.id}: ${id.name}`);
    console.log(`         Topic: ${id.topic}`);
    console.log(`         Confidence: ${id.confidence}, High-yield: ${id.high_yield}\n`);
  });

  if (expandedIdentities.length > 20) {
    console.log(`      ... and ${expandedIdentities.length - 20} more identities\n`);
  }

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  🎯 NEXT STEP: Run neet_physics_iterative_calibration_2021_2025  ║');
  console.log('║     Expected Match Rate: 75-85%+ (vs current 58%)                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
}

// Helper function to chunk array
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

expandIdentities().catch(console.error);
