#!/usr/bin/env ts-node
/**
 * Update database with cleaned LaTeX from flagship files
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateFile(filePath: string) {
  console.log(`\n📖 Reading ${path.basename(filePath)}...`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found, skipping: ${filePath}`);
    return { updated: 0, errors: 0 };
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const questions = data.questions || data.test_config?.questions;

  if (!questions || !Array.isArray(questions)) {
    console.log(`⚠️  No questions array found in ${path.basename(filePath)}, skipping.`);
    return { updated: 0, errors: 0 };
  }

  console.log(`🔧 Updating ${questions.length} questions in database...\n`);

  let updated = 0;
  let errors = 0;

  for (const q of questions) {
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          text: q.text,
          options: q.options,
          solution_steps: q.solutionSteps,
          exam_tip: q.examTip,
          study_tip: q.studyTip,
          mastery_material: q.masteryMaterial,
          key_formulas: q.keyFormulas,
        })
        .eq('id', q.id);

      if (error) {
        console.error(`❌ Error updating ${q.id}:`, error.message);
        errors++;
      } else {
        updated++;
        if (updated % 10 === 0) {
          console.log(`   ✓ Updated ${updated}/${questions.length}...`);
        }
      }
    } catch (err: any) {
      console.error(`❌ Exception updating ${q.id}:`, err.message);
      errors++;
    }
  }

  return { updated, errors };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   UPDATE DATABASE WITH CLEANED FLAGSHIP DATA               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const rootDir = path.join(__dirname, '..');
  const files = [
    path.join(rootDir, 'flagship_neet_physics_2026_set_a.json'),
    path.join(rootDir, 'flagship_neet_physics_2026_set_b.json'),
  ];

  let totalUpdated = 0;
  let totalErrors = 0;

  for (const file of files) {
    const { updated, errors } = await updateFile(file);
    totalUpdated += updated;
    totalErrors += errors;
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   SUMMARY                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`   ✅ Total updated: ${totalUpdated}`);
  if (totalErrors > 0) {
    console.log(`   ❌ Total errors: ${totalErrors}`);
  } else {
    console.log('   🎉 No errors!');
  }
  console.log('\n✨ Database updated successfully!');
  console.log('👉 Start a NEW test session to see the fixes');
}

main().catch(console.error);
