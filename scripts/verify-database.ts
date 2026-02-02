/**
 * Verify Database Setup
 * Checks if migrations were applied successfully
 */

import { supabaseAdmin } from '../lib/supabaseServer.js';

async function verifyDatabase() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Verifying Database Setup');
  console.log('='.repeat(60) + '\n');

  const checks = [
    {
      name: 'Connection',
      test: async () => {
        const { error } = await supabaseAdmin.from('users').select('count').limit(1);
        return !error;
      },
    },
    {
      name: 'users table',
      test: async () => {
        const { error } = await supabaseAdmin.from('users').select('count').limit(0);
        return !error;
      },
    },
    {
      name: 'scans table',
      test: async () => {
        const { error } = await supabaseAdmin.from('scans').select('count').limit(0);
        return !error;
      },
    },
    {
      name: 'questions table',
      test: async () => {
        const { error } = await supabaseAdmin.from('questions').select('count').limit(0);
        return !error;
      },
    },
    {
      name: 'images table',
      test: async () => {
        const { error } = await supabaseAdmin.from('images').select('count').limit(0);
        return !error;
      },
    },
    {
      name: 'question_banks table',
      test: async () => {
        const { error } = await supabaseAdmin.from('question_banks').select('count').limit(0);
        return !error;
      },
    },
    {
      name: 'flashcards table',
      test: async () => {
        const { error } = await supabaseAdmin.from('flashcards').select('count').limit(0);
        return !error;
      },
    },
    {
      name: 'vidya_sessions table',
      test: async () => {
        const { error } = await supabaseAdmin.from('vidya_sessions').select('count').limit(0);
        return !error;
      },
    },
  ];

  let passedChecks = 0;
  let failedChecks = 0;

  for (const check of checks) {
    try {
      const result = await check.test();
      if (result) {
        console.log(`✅ ${check.name}`);
        passedChecks++;
      } else {
        console.log(`❌ ${check.name} - FAILED`);
        failedChecks++;
      }
    } catch (err: any) {
      console.log(`❌ ${check.name} - ERROR:`, err.message);
      failedChecks++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Results');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedChecks}/${checks.length}`);
  console.log(`❌ Failed: ${failedChecks}/${checks.length}`);

  if (failedChecks === 0) {
    console.log('\n🎉 Database is fully configured and ready!');
    console.log('\nNext steps:');
    console.log('  1. Run image migration: npm run migrate:images');
    console.log('  2. Test server: npm run server');
    console.log('  3. Test frontend: npm run dev:all\n');
    return true;
  } else {
    console.log('\n⚠️  Some checks failed. Please:');
    console.log('  1. Verify migrations were run in SQL Editor');
    console.log('  2. Check for errors in migration output');
    console.log('  3. Ensure Supabase credentials are correct\n');
    return false;
  }
}

verifyDatabase()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((err) => {
    console.error('\n❌ Verification failed:', err.message);
    process.exit(1);
  });
