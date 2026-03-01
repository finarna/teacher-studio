#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═'.repeat(80));
console.log('Delete Latest Scan - Non-Interactive');
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

console.log('📄 Deleting Scan:');
console.log(`   Name: ${scan.name}`);
console.log(`   ID: ${scan.id}`);
console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}`);
console.log();

// Count questions
const { count } = await supabase
  .from('questions')
  .select('*', { count: 'exact', head: true })
  .eq('scan_id', scan.id);

console.log(`📊 Questions to delete: ${count || 0}`);
console.log();
console.log('🗑️  Deleting...');
console.log();

// Delete questions first (foreign key constraint)
const { error: deleteQuestionsError } = await supabase
  .from('questions')
  .delete()
  .eq('scan_id', scan.id);

if (deleteQuestionsError) {
  console.error('❌ Error deleting questions:', deleteQuestionsError.message);
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
  process.exit(1);
}

console.log('✅ Deleted scan');
console.log();
console.log('═'.repeat(80));
console.log('🎉 Scan deleted successfully!');
console.log('═'.repeat(80));
console.log();
console.log('📤 You can now re-upload the PDF');
console.log('   All LaTeX issues will be fixed automatically');
console.log();
