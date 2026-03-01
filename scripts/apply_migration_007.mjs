import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// Build connection string from Supabase URL
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extract project ref from Supabase URL (e.g., https://ozrkewbrwgtcunoerzka.supabase.co)
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('❌ Missing SUPABASE_DB_PASSWORD in .env.local');
  console.log('\nPlease add to .env.local:');
  console.log('SUPABASE_DB_PASSWORD=your_database_password');
  console.log('\nFind it in: Supabase Dashboard > Project Settings > Database > Connection String');
  process.exit(1);
}

const connectionString = `postgresql://postgres.${projectRef}:${DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`;

console.log('🔌 Connecting to Supabase PostgreSQL...\n');

const client = new Client({ connectionString });

try {
  await client.connect();
  console.log('✅ Connected!\n');

  // Read migration SQL
  const sql = fs.readFileSync('migrations/007_add_missing_columns.sql', 'utf8');

  // Extract ALTER TABLE statements
  const statements = sql
    .split('\n')
    .filter(line => line.trim().startsWith('ALTER TABLE') || line.trim().startsWith('NOTIFY'))
    .map(line => line.trim());

  console.log(`📋 Executing ${statements.length} statements...\n`);

  for (const stmt of statements) {
    try {
      await client.query(stmt);
      console.log(`✅ ${stmt.substring(0, 70)}...`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`⏭️  ${stmt.substring(0, 70)}... (already exists)`);
      } else {
        console.error(`❌ ${stmt.substring(0, 70)}...`);
        console.error(`   Error: ${err.message}`);
      }
    }
  }

  console.log('\n✅ Migration 007 completed!');
  await client.end();

} catch (err) {
  console.error('❌ Connection error:', err.message);
  console.log('\nTroubleshooting:');
  console.log('1. Check SUPABASE_DB_PASSWORD in .env.local');
  console.log('2. Find password in: Supabase Dashboard > Project Settings > Database');
  console.log('3. Make sure you have IPv6 enabled or use the pooler connection');
  await client.end().catch(() => {});
  process.exit(1);
}
