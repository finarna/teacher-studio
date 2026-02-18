#!/usr/bin/env node

/**
 * Backfill Year Metadata for Questions
 *
 * Extracts year information from scan filenames and updates questions
 * with year and exam_context metadata.
 *
 * Usage:
 *   node scripts/backfillYearMetadata.mjs           # Dry run (preview only)
 *   node scripts/backfillYearMetadata.mjs --apply   # Apply changes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Check if --apply flag is present
const isDryRun = !process.argv.includes('--apply');

/**
 * Extract year from scan name using multiple patterns
 */
function extractYearFromName(scanName) {
  // Common patterns:
  // - "KCET 2023 Math"
  // - "2024-NEET-Physics"
  // - "Math-2022-Board"
  // - "JEE_Main_2021"
  // - "20-05-2023" (date format)

  const patterns = [
    /\b(20\d{2})\b/,           // 4-digit year (2000-2099)
    /\b(\d{2})-(\d{2})-(20\d{2})\b/,  // DD-MM-YYYY
    /\b(20\d{2})-(\d{2})-(\d{2})\b/,  // YYYY-MM-DD
  ];

  for (const pattern of patterns) {
    const match = scanName.match(pattern);
    if (match) {
      // Extract year from match
      const year = match[1].length === 4 ? match[1] : match[3];
      const yearNum = parseInt(year);

      // Validate year is reasonable (2010-2030)
      if (yearNum >= 2010 && yearNum <= 2030) {
        return year;
      }
    }
  }

  return null;
}

/**
 * Infer exam context from scan metadata
 */
function inferExamContext(scan) {
  // Priority 1: Use scan's exam_context if already set
  if (scan.exam_context) {
    return scan.exam_context;
  }

  // Priority 2: Extract from scan name
  const name = scan.name.toUpperCase();
  if (name.includes('NEET')) return 'NEET';
  if (name.includes('JEE')) return 'JEE';
  if (name.includes('KCET')) return 'KCET';
  if (name.includes('CBSE') || name.includes('BOARD')) return 'CBSE';

  // Priority 3: Default based on subject
  if (scan.subject === 'Biology') return 'NEET';
  return 'KCET'; // Default for Math/Physics/Chemistry
}

/**
 * Main backfill function
 */
async function backfillYearMetadata() {
  console.log('\n' + '='.repeat(70));
  console.log('📅 Year Metadata Backfill Tool');
  console.log('='.repeat(70));

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('   Use --apply flag to actually update the database\n');
  } else {
    console.log('⚠️  APPLY MODE - Changes will be written to database\n');
  }

  // Step 1: Fetch all scans
  console.log('1️⃣  Fetching all scans...');
  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, created_at, is_system_scan')
    .order('created_at', { ascending: false });

  if (scansError) {
    console.error('❌ Error fetching scans:', scansError.message);
    process.exit(1);
  }

  console.log(`   ✅ Found ${scans.length} scans\n`);

  // Step 2: Process each scan
  console.log('2️⃣  Analyzing scans for year metadata...\n');

  const updates = [];
  const skipped = [];

  for (const scan of scans) {
    const year = extractYearFromName(scan.name);
    const examContext = inferExamContext(scan);

    if (year) {
      // Get question count for this scan
      const { count: questionCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('scan_id', scan.id);

      if (questionCount > 0) {
        updates.push({
          scanId: scan.id,
          scanName: scan.name,
          year,
          examContext,
          questionCount,
          isSystemScan: scan.is_system_scan
        });

        console.log(`   ✅ ${scan.name}`);
        console.log(`      Year: ${year} | Exam: ${examContext} | Questions: ${questionCount} | System: ${scan.is_system_scan ? 'Yes' : 'No'}`);
      } else {
        skipped.push({ scan: scan.name, reason: 'No questions found' });
      }
    } else {
      skipped.push({ scan: scan.name, reason: 'No year found in name' });
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 Summary');
  console.log('='.repeat(70));
  console.log(`Total scans analyzed:     ${scans.length}`);
  console.log(`Scans with year data:     ${updates.length}`);
  console.log(`Scans skipped:            ${skipped.length}`);
  console.log('='.repeat(70) + '\n');

  if (skipped.length > 0) {
    console.log('⚠️  Skipped Scans:');
    skipped.forEach(({ scan, reason }) => {
      console.log(`   - ${scan}: ${reason}`);
    });
    console.log('');
  }

  if (updates.length === 0) {
    console.log('ℹ️  No scans to update. Exiting.\n');
    return;
  }

  // Step 3: Apply updates (if not dry run)
  if (isDryRun) {
    console.log('🔍 DRY RUN - No changes applied');
    console.log('   Run with --apply flag to update the database\n');

    console.log('📋 Preview of changes:');
    console.log('   The following questions will be updated:\n');

    let totalQuestions = 0;
    updates.forEach(({ scanName, year, examContext, questionCount }) => {
      console.log(`   ${scanName}`);
      console.log(`   → ${questionCount} questions will be updated with:`);
      console.log(`     - year: "${year}"`);
      console.log(`     - exam_context: "${examContext}"\n`);
      totalQuestions += questionCount;
    });

    console.log(`   Total questions to update: ${totalQuestions}\n`);
  } else {
    console.log('3️⃣  Applying updates to database...\n');

    let totalUpdated = 0;
    let errors = 0;

    for (const update of updates) {
      try {
        const { error } = await supabase
          .from('questions')
          .update({
            year: update.year,
            exam_context: update.examContext
          })
          .eq('scan_id', update.scanId);

        if (error) throw error;

        totalUpdated += update.questionCount;
        console.log(`   ✅ Updated ${update.questionCount} questions for: ${update.scanName}`);
      } catch (err) {
        errors++;
        console.error(`   ❌ Error updating ${update.scanName}:`, err.message);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Update Complete');
    console.log('='.repeat(70));
    console.log(`Total questions updated:  ${totalUpdated}`);
    console.log(`Errors:                   ${errors}`);
    console.log('='.repeat(70) + '\n');

    if (totalUpdated > 0) {
      console.log('🎉 Year metadata successfully backfilled!\n');
      console.log('Next steps:');
      console.log('  1. Restart your backend server');
      console.log('  2. Navigate to Learning Journey → Past Year Exams');
      console.log('  3. You should now see questions grouped by year\n');
    }
  }
}

// Run the script
backfillYearMetadata().catch(console.error);
