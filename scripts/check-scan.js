import Redis from 'ioredis';

const redis = new Redis({
  host: '106.51.142.79',
  port: 6379,
  password: 'redis123!'
});

async function checkScan() {
  try {
    const keys = await redis.keys('scan:*');
    console.log(`\n🔍 Found ${keys.length} scan(s) in Redis\n`);

    for (const key of keys) {
      const data = await redis.get(key);
      const scan = JSON.parse(data);

      console.log(`📋 Scan: ${scan.name}`);
      console.log(`   Subject: ${scan.subject}`);
      console.log(`   Questions: ${scan.analysisData?.questions?.length || 0}`);

      // Check for corrupted formulas
      let corruptedCount = 0;
      if (scan.analysisData?.questions) {
        for (const q of scan.analysisData.questions) {
          if (q.solutionSteps) {
            const hasCorruption = q.solutionSteps.some(step =>
              /\brac\b|\bimes\b|\bheta\b|\bext\b/.test(step)
            );
            if (hasCorruption) corruptedCount++;
          }
        }
      }

      if (corruptedCount > 0) {
        console.log(`   ⚠️  CORRUPTED: ${corruptedCount} questions have broken formulas`);
        console.log(`   👉 Need to clear this scan and regenerate\n`);
      } else {
        console.log(`   ✅ Clean (no corruption detected)\n`);
      }
    }

    await redis.quit();
  } catch (error) {
    console.error('❌ Error:', error);
    await redis.quit();
    process.exit(1);
  }
}

checkScan();
