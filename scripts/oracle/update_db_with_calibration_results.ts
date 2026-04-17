import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Update Database with Calibration Results
 *
 * Updates exam_historical_patterns table with:
 * - Calibrated identity vectors from actual paper analysis
 * - Board signatures from calibration
 * - Evolution notes
 * - IDS actual values
 */

interface CalibrationData {
  year: number;
  identityVector: Record<string, number>;
  idsActual: number;
  boardSignature: string;
  evolutionNote: string;
  scanId: string;
}

async function updateDatabaseWithCalibration() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  UPDATING DATABASE WITH CALIBRATION RESULTS                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const EXAM = 'KCET';
  const SUBJECT = 'Math';

  // Load identity bank to get valid IDs
  const identityBank = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'lib/oracle/identities/kcet_math.json'), 'utf8')
  );

  console.log(`📚 Loaded Identity Bank: ${identityBank.identities.length} identities\n`);

  // Calibration data from our 2021-2025 analysis
  // These are the actual identity distributions and metrics from actual papers
  const calibrationData: CalibrationData[] = [
    {
      year: 2021,
      scanId: 'eba5ed94-dde7-4171-80ff-aecbf0c969f7',
      idsActual: 0.740, // Baseline from calibration
      boardSignature: 'ANCHOR',
      evolutionNote: 'Baseline year - Standard syllabus-aligned blueprint with balanced difficulty distribution.',
      identityVector: await extractIdentityVectorFromActual(EXAM, SUBJECT, 2021, 'eba5ed94-dde7-4171-80ff-aecbf0c969f7', identityBank.identities)
    },
    {
      year: 2022,
      scanId: '0899f3e1-9980-48f4-9caa-91c65de53830',
      idsActual: 0.740, // From calibration actual
      boardSignature: 'SYNTHESIZER',
      evolutionNote: 'Introduction of property-based shortcuts. Increased focus on Matrices (MAT-016) and synthesis questions.',
      identityVector: await extractIdentityVectorFromActual(EXAM, SUBJECT, 2022, '0899f3e1-9980-48f4-9caa-91c65de53830', identityBank.identities)
    },
    {
      year: 2023,
      scanId: 'eeed39eb-6ffe-4aaa-b752-b3139b311e6d',
      idsActual: 0.760, // From calibration actual
      boardSignature: 'SYNTHESIZER',
      evolutionNote: 'Continued synthesis emphasis. Shift toward statement-based verification questions requiring multi-property fusion.',
      identityVector: await extractIdentityVectorFromActual(EXAM, SUBJECT, 2023, 'eeed39eb-6ffe-4aaa-b752-b3139b311e6d', identityBank.identities)
    },
    {
      year: 2024,
      scanId: '7019df69-f2e2-4464-afbb-cc56698cb8e9',
      idsActual: 0.680, // From calibration actual
      boardSignature: 'LOGICIAN',
      evolutionNote: 'Cross-chapter conceptual fusion. Increased logical reasoning and multi-step derivation questions.',
      identityVector: await extractIdentityVectorFromActual(EXAM, SUBJECT, 2024, '7019df69-f2e2-4464-afbb-cc56698cb8e9', identityBank.identities)
    },
    {
      year: 2025,
      scanId: 'c202f81d-cc53-40b1-a473-8f621faac5ba',
      idsActual: 0.790, // From calibration actual
      boardSignature: 'SYNTHESIZER',
      evolutionNote: 'Peak synthesis complexity. Emphasis on Matrix properties (MAT-016) and Probability logic (MAT-014) with property-level fusion.',
      identityVector: await extractIdentityVectorFromActual(EXAM, SUBJECT, 2025, 'c202f81d-cc53-40b1-a473-8f621faac5ba', identityBank.identities)
    }
  ];

  console.log('📊 Updating database records...\n');

  for (const data of calibrationData) {
    console.log(`🔄 Year ${data.year}:`);
    console.log(`   Scan ID: ${data.scanId}`);
    console.log(`   IDS Actual: ${data.idsActual}`);
    console.log(`   Board Signature: ${data.boardSignature}`);
    console.log(`   Identity Vector: ${Object.keys(data.identityVector).length} identities`);

    const { error } = await supabase
      .from('exam_historical_patterns')
      .upsert({
        exam_context: EXAM,
        subject: SUBJECT,
        year: data.year,
        ids_actual: data.idsActual,
        board_signature: data.boardSignature,
        evolution_note: data.evolutionNote,
        intent_signature: {
          synthesis: data.year === 2021 ? 0.5 : (data.year === 2024 ? 0.6 : 0.8),
          trapDensity: data.year === 2021 ? 0.5 : 0.7,
          linguisticLoad: 0.5,
          speedRequirement: data.year === 2021 ? 0.7 : 0.9,
          identityVector: data.identityVector
        },
        total_marks: 60
      }, {
        onConflict: 'exam_context,subject,year'
      });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Updated successfully`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('✅ DATABASE UPDATE COMPLETE\n');
  console.log('Updated exam_historical_patterns for KCET Math 2021-2025:');
  console.log('  • Identity vectors with actual distributions');
  console.log('  • IDS actual values from calibration');
  console.log('  • Board signatures (ANCHOR, SYNTHESIZER, LOGICIAN)');
  console.log('  • Evolution notes for year-over-year trends');
  console.log('  • Intent signatures (synthesis, trap density, etc.)');
  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

/**
 * Extract identity vector from actual paper questions
 */
async function extractIdentityVectorFromActual(
  exam: string,
  subject: string,
  year: number,
  scanId: string,
  identities: any[]
): Promise<Record<string, number>> {
  console.log(`   📥 Extracting identity vector from actual ${year} paper...`);

  // Fetch questions for this year
  const { data: questions, error } = await supabase
    .from('questions')
    .select('topic, difficulty, text')
    .eq('scan_id', scanId);

  if (error || !questions) {
    console.log(`   ⚠️  Could not fetch questions: ${error?.message || 'No data'}`);
    return {};
  }

  console.log(`   📝 Analyzing ${questions.length} questions...`);

  // Map questions to identities based on topic
  const identityCount: Record<string, number> = {};

  questions.forEach(q => {
    // Find matching identity by topic
    const matchingIdentities = identities.filter(
      id => id.topic.toLowerCase() === q.topic.toLowerCase()
    );

    if (matchingIdentities.length > 0) {
      // Use highest confidence identity for this topic
      const sorted = matchingIdentities.sort((a, b) => b.confidence - a.confidence);
      const identityId = sorted[0].id.replace(/-/g, ''); // Remove dashes for DB format
      identityCount[identityId] = (identityCount[identityId] || 0) + 1;
    }
  });

  console.log(`   ✓ Mapped to ${Object.keys(identityCount).length} identities`);
  return identityCount;
}

updateDatabaseWithCalibration().catch(console.error);
