#!/usr/bin/env node
// Run all pending migrations on the new Supabase project via Management API
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envText = readFileSync(resolve(__dirname, '.env'), 'utf8');
const env = Object.fromEntries(
  envText.split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => l.split('=').map((v, i) => i === 0 ? v.trim() : l.slice(l.indexOf('=') + 1).trim()))
    .filter(([k]) => k)
);

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!PROJECT_REF || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

console.log(`\n🚀 Running migrations on project: ${PROJECT_REF}`);
console.log(`📡 Supabase URL: ${SUPABASE_URL}\n`);

async function runSQL(sql, label) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    // Try direct postgres REST API instead
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });
    if (!res2.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return await res2.json();
  }
  return await res.json();
}

// Targeted fixes for missing columns/tables
const migrations = [
  {
    label: 'Add currency column to payments (if missing)',
    sql: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'INR';`
  },
  {
    label: 'Add method column to payments (if missing)',
    sql: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS method VARCHAR(50);`
  },
  {
    label: 'Add invoice_url column to payments (if missing)',
    sql: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_url TEXT;`
  },
  {
    label: 'Add error_code column to payments (if missing)',
    sql: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS error_code VARCHAR(100);`
  },
  {
    label: 'Add error_description column to payments (if missing)',
    sql: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS error_description TEXT;`
  },
  {
    label: 'Add metadata column to payments (if missing)',
    sql: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`
  },
  {
    label: 'Add receipt column to payments (if missing)',
    sql: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt VARCHAR(100);`
  },
];

// Check what we can access
async function checkTableExists(tableName) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${tableName}?select=id&limit=1`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  // Check if payments table exists
  const paymentsExists = await checkTableExists('payments');
  console.log(`payments table exists: ${paymentsExists}`);

  if (!paymentsExists) {
    console.log('\n❌ payments table does not exist! Run migrations from the Supabase SQL editor.\n');
    console.log('👉 Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
    console.log('👉 Run the contents of: migrations/005_payment_subscription.sql');
    process.exit(1);
  }

  // Try to run ALTER TABLE migrations
  for (const { label, sql } of migrations) {
    process.stdout.write(`  • ${label}... `);
    try {
      await runSQL(sql, label);
      console.log('✅');
    } catch (err) {
      console.log(`⚠️  (may need manual run: ${err.message.slice(0, 80)})`);
    }
  }

  console.log('\n✅ Done! Restart the server to apply changes.\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
