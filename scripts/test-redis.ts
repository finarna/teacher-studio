import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || '106.51.142.79',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'redis123!',
  connectTimeout: 10000,
  retryStrategy: () => null, // Don't retry
});

redis.on('connect', async () => {
  console.log('✅ Redis connected!');
  const keys = await redis.keys('scan:*');
  console.log(`📦 Found ${keys.length} scans in Redis`);
  await redis.quit();
  process.exit(0);
});

redis.on('error', (err) => {
  console.error('❌ Redis connection failed:', err.message);
  console.log('\n⚠️  This is expected if:');
  console.log('   1. Redis server is not running');
  console.log('   2. Redis is on a different network');
  console.log('   3. There is no Redis data to migrate');
  console.log('\nℹ️  You can skip image migration if you have no existing Redis data.');
  console.log('   The new system will work without migrating old data.\n');
  process.exit(1);
});

setTimeout(() => {
  console.error('⏱️  Redis connection timeout');
  process.exit(1);
}, 15000);
