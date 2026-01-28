#!/usr/bin/env node

/**
 * Manual script to restore a backup file directly to Redis
 * Usage: node restore-from-backup.js /path/to/backup.json
 */

const fs = require('fs');
const Redis = require('ioredis');

// Redis Configuration (from server.js)
const redis = new Redis({
  host: '106.51.142.79',
  port: 6379,
  password: 'redis123!',
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

redis.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err);
  process.exit(1);
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis at 106.51.142.79:6379\n');
});

async function restoreBackup(backupPath) {
  console.log('🔄 Starting backup restoration...\n');

  try {
    // Read backup file
    console.log(`📂 Reading backup file: ${backupPath}`);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    const fileStats = fs.statSync(backupPath);
    console.log(`📊 File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    const backupData = fs.readFileSync(backupPath, 'utf8');
    const backup = JSON.parse(backupData);

    console.log(`📅 Backup date: ${backup.exportDate}`);

    if (!backup.scan) {
      throw new Error('Invalid backup format: missing scan data');
    }

    const scan = backup.scan;
    const questions = scan.analysisData?.questions || [];
    const imagesCount = questions.filter(q => q.sketchSvg).length;

    console.log(`\n📊 Scan Details:`);
    console.log(`   ID: ${scan.id}`);
    console.log(`   Name: ${scan.name}`);
    console.log(`   Subject: ${scan.subject}`);
    console.log(`   Total Questions: ${questions.length}`);
    console.log(`   Questions with Images: ${imagesCount}`);

    // Calculate total size
    let totalImageSize = 0;
    questions.forEach(q => {
      if (q.sketchSvg) {
        totalImageSize += q.sketchSvg.length;
      }
    });

    console.log(`   Total Image Data: ${(totalImageSize / 1024 / 1024).toFixed(2)} MB\n`);

    // Push to Redis
    console.log(`🔄 Pushing to Redis...`);
    const redisKey = `scan:${scan.id}`;

    await redis.set(redisKey, JSON.stringify(scan));

    console.log(`✅ Successfully stored in Redis with key: ${redisKey}\n`);

    // Verify
    console.log(`🔍 Verifying...`);
    const stored = await redis.get(redisKey);

    if (!stored) {
      throw new Error('Verification failed: Data not found in Redis');
    }

    const storedScan = JSON.parse(stored);
    const storedImagesCount = (storedScan.analysisData?.questions || [])
      .filter(q => q.sketchSvg).length;

    console.log(`✅ Verification passed:`);
    console.log(`   Stored ${storedImagesCount} images`);
    console.log(`   Match: ${storedImagesCount === imagesCount ? '✅ YES' : '❌ NO'}\n`);

    // List all scans in Redis
    console.log(`📋 All scans in Redis:`);
    const keys = await redis.keys('scan:*');

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const s = JSON.parse(data);
        const imgCount = (s.analysisData?.questions || []).filter(q => q.sketchSvg).length;
        console.log(`   - ${s.name} (${s.id}): ${imgCount} images`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Backup restoration completed successfully!');
    console.log('='.repeat(80));

  } catch (err) {
    console.error('\n❌ Restoration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    redis.disconnect();
  }
}

// Get backup file path from command line
const backupPath = process.argv[2];

if (!backupPath) {
  console.error('❌ Usage: node restore-from-backup.js /path/to/backup.json');
  console.error('\nExample:');
  console.error('  node restore-from-backup.js ~/Downloads/backup_bulk-1768931620994_1768962816444.json');
  process.exit(1);
}

restoreBackup(backupPath);
