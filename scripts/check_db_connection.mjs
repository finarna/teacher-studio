import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Database Connection Diagnostic');
console.log('='.repeat(60));
console.log(`Supabase URL: ${supabaseUrl ? '✅ Found' : '❌ Missing'}`);
console.log(`Supabase Key: ${supabaseKey ? '✅ Found' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n📊 Checking scans table...');

// Try to count all scans
const { count, error } = await supabase
  .from('scans')
  .select('*', { count: 'exact', head: true });

if (error) {
  console.error('❌ Query error:', error.message);
} else {
  console.log(`✅ Total scans in database: ${count}`);
}

// Try to get recent scans with minimal data
const { data: recentScans, error: recentError } = await supabase
  .from('scans')
  .select('id, subject, created_at')
  .order('created_at', { ascending: false })
  .limit(10);

if (recentError) {
  console.error('❌ Recent scans error:', recentError.message);
} else {
  console.log(`\n📋 Recent scans (${recentScans?.length || 0}):`);
  recentScans?.forEach((scan, idx) => {
    console.log(`   ${idx + 1}. Subject: ${scan.subject} | Created: ${new Date(scan.created_at).toLocaleString()}`);
  });
}
