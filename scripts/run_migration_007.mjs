#!/usr/bin/env node

/**
 * Migration 007 Runner
 *
 * This script outputs the migration SQL for manual execution in Supabase SQL Editor.
 *
 * Why manual execution?
 * - Supabase doesn't expose direct PostgreSQL connection via environment variables
 * - Using PostgREST API for DDL operations is not recommended
 * - SQL Editor is the safest and most reliable method
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                      Migration 007: Add Missing Columns                   ║
╚════════════════════════════════════════════════════════════════════════════╝

This migration adds missing columns to the 'scans' and 'questions' tables.

📋 INSTRUCTIONS:
   1. Open your Supabase Dashboard: https://supabase.com/dashboard
   2. Navigate to: SQL Editor
   3. Copy the SQL below
   4. Paste and execute

════════════════════════════════════════════════════════════════════════════

`);

const migrationPath = join(__dirname, '../migrations/007_add_missing_columns.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log(sql);

console.log(`
════════════════════════════════════════════════════════════════════════════

✅ After running the SQL above, the following columns will be available:

   scans table:
   - blooms_taxonomy, difficulty_distribution, topic_weightage
   - trends, predictive_topics, faq, strategy, summary
   - overall_difficulty, year, metadata, is_system_scan
   - exam_context, scan_date

   questions table:
   - solution_steps, exam_tip, key_formulas, pitfalls
   - mastery_material, blooms, domain, topic, difficulty
   - marks, source, correct_option_index
   - has_visual_element, visual_element_type, visual_element_description
   - visual_element_position, visual_bounding_box, visual_concept
   - diagram_url

════════════════════════════════════════════════════════════════════════════
`);
