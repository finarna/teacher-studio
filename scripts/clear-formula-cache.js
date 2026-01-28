// Connect to Redis and clear corrupted formula cache
import Redis from 'ioredis';

const redis = new Redis({
  host: '106.51.142.79',
  port: 6379,
  password: 'redis123!'
});

async function clearCache() {
  try {
    // Clear all cache types that might contain corrupted formulas
    const patterns = ['scan:*', 'questionbank:*', 'flashcards:*'];
    let totalCleared = 0;

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      console.log(`Found ${keys.length} keys matching ${pattern}`);

      if (keys.length > 0) {
        await redis.del(...keys);
        totalCleared += keys.length;
        console.log(`✅ Cleared ${keys.length} ${pattern} entries`);
      }
    }

    console.log(`\n✅ Total cleared: ${totalCleared} cache entries`);
    console.log('🔄 Refresh your app and regenerate content for clean formulas');

    await redis.quit();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearCache();
