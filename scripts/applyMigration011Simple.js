/**
 * Apply Migration 011: Fix Topic Resource Foreign Key
 *
 * Simple script to apply the migration via Supabase SQL Editor
 */

const fs = require('fs');
const path = require('path');

console.log('📋 Migration 011: Fix Topic Resource Foreign Key\n');
console.log('─'.repeat(70));

// Read the migration file
const migrationPath = path.join(__dirname, '../migrations/011_fix_topic_resource_fk.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('\n📝 Migration SQL to execute:\n');
console.log('─'.repeat(70));
console.log(migrationSQL);
console.log('─'.repeat(70));

console.log('\n✅ Migration script ready!\n');
console.log('📌 TO APPLY THIS MIGRATION:');
console.log('   1. Go to Supabase Dashboard: https://supabase.com/dashboard');
console.log('   2. Select your project: nsxjwjinxkehsubzesml');
console.log('   3. Navigate to: SQL Editor');
console.log('   4. Copy the SQL above and paste it');
console.log('   5. Click "Run" to execute\n');
console.log('🎯 OR: Copy this file path and run in SQL Editor:');
console.log(`   ${migrationPath}\n`);
console.log('─'.repeat(70));
console.log('\n💡 After migration, the Check Answer button will work correctly!\n');
