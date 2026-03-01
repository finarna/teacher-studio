#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log('═'.repeat(80));
console.log('Delete Latest Scan');
console.log('═'.repeat(80));
console.log();

// Get latest scan
const { data: scans, error: scanError } = await supabase
  .from('scans')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1);

if (scanError) {
  console.error('❌ Error fetching scans:', scanError.message);
  process.exit(1);
}

if (!scans || scans.length === 0) {
  console.log('⚠️  No scans found');
  process.exit(0);
}

const scan = scans[0];

console.log('📄 Latest Scan:');
console.log(`   Name: ${scan.name}`);
console.log(`   ID: ${scan.id}`);
console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}`);
console.log(`   Subject: ${scan.subject || 'N/A'}`);
console.log(`   Exam: ${scan.exam_context || 'N/A'}`);
console.log();

// Count questions
const { count, error: countError } = await supabase
  .from('questions')
  .select('*', { count: 'exact', head: true })
  .eq('scan_id', scan.id);

if (countError) {
  console.error('❌ Error counting questions:', countError.message);
}

console.log(`📊 Questions: ${count || 0}`);
console.log();

const answer = await question('⚠️  Delete this scan and all its questions? (yes/no): ');

if (answer.toLowerCase() !== 'yes') {
  console.log('\n❌ Cancelled');
  rl.close();
  process.exit(0);
}

console.log('\n🗑️  Deleting...');

// Delete questions first (foreign key constraint)
const { error: deleteQuestionsError } = await supabase
  .from('questions')
  .delete()
  .eq('scan_id', scan.id);

if (deleteQuestionsError) {
  console.error('❌ Error deleting questions:', deleteQuestionsError.message);
  rl.close();
  process.exit(1);
}

console.log(`✅ Deleted ${count} questions`);

// Delete scan
const { error: deleteScanError } = await supabase
  .from('scans')
  .delete()
  .eq('id', scan.id);

if (deleteScanError) {
  console.error('❌ Error deleting scan:', deleteScanError.message);
  rl.close();
  process.exit(1);
}

console.log('✅ Deleted scan');
console.log();
console.log('═'.repeat(80));
console.log('🎉 Scan deleted successfully!');
console.log('═'.repeat(80));
console.log();
console.log('📤 You can now re-upload the PDF to test the LaTeX fixes');
console.log();

rl.close();
