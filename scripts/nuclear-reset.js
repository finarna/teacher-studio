import Redis from 'ioredis';

const redis = new Redis({
  host: '106.51.142.79',
  port: 6379,
  password: 'redis123!'
});

async function nuclearReset() {
  console.log('🔥 NUCLEAR RESET: Clearing ALL exam data...\n');

  try {
    // Get ALL keys (be careful - this is destructive!)
    const allKeys = await redis.keys('*');
    console.log(`Found ${allKeys.length} total keys in Redis`);

    // Filter for exam/scan related keys
    const examKeys = allKeys.filter(k =>
      k.includes('scan') ||
      k.includes('question') ||
      k.includes('exam') ||
      k.includes('analysis') ||
      k.includes('formula')
    );

    console.log(`Found ${examKeys.length} exam-related keys:\n`);
    examKeys.forEach(k => console.log(`  - ${k}`));

    if (examKeys.length > 0) {
      await redis.del(...examKeys);
      console.log(`\n✅ Deleted ${examKeys.length} exam keys`);
    }

    console.log('\n✅ NUCLEAR RESET COMPLETE');
    console.log('\n📋 Next steps:');
    console.log('1. Hard refresh browser (Cmd+Shift+R)');
    console.log('2. Clear localStorage in DevTools console:');
    console.log('   localStorage.clear(); location.reload();');
    console.log('3. Upload exam paper FRESH (don\'t use recent scans)');
    console.log('4. Formulas will be clean!\n');

    await redis.quit();
  } catch (error) {
    console.error('❌ Error:', error);
    await redis.quit();
    process.exit(1);
  }
}

nuclearReset();
