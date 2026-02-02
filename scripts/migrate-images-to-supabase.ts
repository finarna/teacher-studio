/**
 * Image Migration Script: Redis Base64 → Supabase Storage
 *
 * This script migrates all base64 images from Redis to Supabase Storage (CDN-backed).
 * It handles:
 * - Extracted PDF images (question.extractedImages[])
 * - Question sketches (question.sketchSvg)
 * - Topic-based flipbooks (topicBasedSketches[topic].pages[])
 *
 * Migration Process:
 * 1. Fetch all scan:* keys from Redis
 * 2. Extract base64 images from scan data
 * 3. Upload to Supabase Storage in batches (5 concurrent, 1s delay)
 * 4. Replace base64 with public URLs
 * 5. Update Redis with new format
 * 6. Generate migration summary
 *
 * Usage:
 *   npm run migrate:images
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';
import { uploadBase64ImagesBatch, isValidBase64Image } from '../lib/imageStorage.js';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

// Redis configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || '106.51.142.79',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'redis123!',
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Migration statistics
interface MigrationStats {
  totalScans: number;
  processedScans: number;
  totalImages: number;
  uploadedImages: number;
  failedImages: number;
  skippedImages: number;
  extractedPdfImages: number;
  sketchImages: number;
  topicFlipbookImages: number;
  errors: Array<{ scanId: string; error: string }>;
  startTime: Date;
  endTime?: Date;
  duration?: string;
}

const stats: MigrationStats = {
  totalScans: 0,
  processedScans: 0,
  totalImages: 0,
  uploadedImages: 0,
  failedImages: 0,
  skippedImages: 0,
  extractedPdfImages: 0,
  sketchImages: 0,
  topicFlipbookImages: 0,
  errors: [],
  startTime: new Date(),
};

/**
 * Main migration function
 */
async function migrateImages() {
  console.log('\n' + '='.repeat(60));
  console.log('📦 Image Migration: Redis → Supabase Storage');
  console.log('='.repeat(60) + '\n');

  try {
    // Check Redis connection
    if (redis.status !== 'ready') {
      await new Promise((resolve) => redis.once('ready', resolve));
    }
    console.log('✅ Connected to Redis\n');

    // Fetch all scan keys
    console.log('🔍 Fetching all scan keys from Redis...');
    const scanKeys = await redis.keys('scan:*');
    stats.totalScans = scanKeys.length;
    console.log(`Found ${stats.totalScans} scans\n`);

    if (scanKeys.length === 0) {
      console.log('⚠️  No scans found in Redis. Nothing to migrate.');
      return;
    }

    // Process each scan
    for (let i = 0; i < scanKeys.length; i++) {
      const key = scanKeys[i];
      const scanId = key.replace('scan:', '');

      console.log(`\n[${i + 1}/${scanKeys.length}] Processing scan: ${scanId}`);
      console.log('-'.repeat(60));

      try {
        // Fetch scan data
        const scanData = await redis.get(key);
        if (!scanData) {
          console.log('⚠️  Scan data not found, skipping');
          continue;
        }

        const scan = JSON.parse(scanData);

        // Extract images from scan
        const imagesToUpload = await extractImagesFromScan(scan, scanId);
        stats.totalImages += imagesToUpload.length;

        if (imagesToUpload.length === 0) {
          console.log('  No images to migrate');
          stats.processedScans++;
          continue;
        }

        console.log(`  Found ${imagesToUpload.length} images to migrate`);

        // Upload images in batches
        const uploadResults = await uploadBase64ImagesBatch(imagesToUpload, 5, 1000);

        // Update scan data with URLs
        const updatedScan = updateScanWithUrls(scan, uploadResults);

        // Save updated scan back to Redis
        await redis.set(key, JSON.stringify(updatedScan));

        // Update statistics
        const successful = uploadResults.filter((r) => !r.error);
        const failed = uploadResults.filter((r) => r.error);

        stats.uploadedImages += successful.length;
        stats.failedImages += failed.length;

        console.log(`  ✅ Uploaded: ${successful.length}`);
        if (failed.length > 0) {
          console.log(`  ❌ Failed: ${failed.length}`);
          failed.forEach((f) => {
            console.log(`     Error: ${f.error}`);
          });
        }

        stats.processedScans++;
      } catch (err: any) {
        console.error(`  ❌ Error processing scan ${scanId}:`, err.message);
        stats.errors.push({ scanId, error: err.message });
      }
    }

    // Finalize statistics
    stats.endTime = new Date();
    const durationMs = stats.endTime.getTime() - stats.startTime.getTime();
    stats.duration = formatDuration(durationMs);

    // Display summary
    displaySummary();

    // Save summary to file
    saveSummary();

    console.log('\n✅ Migration complete!\n');
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message);
    throw err;
  } finally {
    await redis.quit();
  }
}

/**
 * Extract images from a scan object
 */
async function extractImagesFromScan(
  scan: any,
  scanId: string
): Promise<Array<{ base64: string; path: string; contentType?: string }>> {
  const images: Array<{ base64: string; path: string; contentType?: string }> = [];

  if (!scan.analysisData) {
    return images;
  }

  // 1. Extract images from questions
  if (scan.analysisData.questions) {
    for (let qIndex = 0; qIndex < scan.analysisData.questions.length; qIndex++) {
      const question = scan.analysisData.questions[qIndex];
      const qId = question.id || `q${qIndex}`;

      // Extracted PDF images
      if (question.extractedImages && Array.isArray(question.extractedImages)) {
        for (let imgIndex = 0; imgIndex < question.extractedImages.length; imgIndex++) {
          const base64 = question.extractedImages[imgIndex];

          if (isValidBase64Image(base64)) {
            images.push({
              base64,
              path: `extracted-pdf/${scanId}/${qId}_${imgIndex}.png`,
              contentType: 'image/png',
            });
            stats.extractedPdfImages++;
          } else {
            stats.skippedImages++;
          }
        }
      }

      // Question sketch SVG
      if (question.sketchSvg && typeof question.sketchSvg === 'string') {
        // Check if it's base64 (PNG) or raw SVG
        if (question.sketchSvg.startsWith('data:image')) {
          images.push({
            base64: question.sketchSvg,
            path: `question-sketches/${scanId}/${qId}.png`,
            contentType: 'image/png',
          });
          stats.sketchImages++;
        } else if (question.sketchSvg.startsWith('<svg')) {
          // Convert SVG to base64 data URI
          const svgBase64 = Buffer.from(question.sketchSvg).toString('base64');
          images.push({
            base64: `data:image/svg+xml;base64,${svgBase64}`,
            path: `question-sketches/${scanId}/${qId}.svg`,
            contentType: 'image/svg+xml',
          });
          stats.sketchImages++;
        }
      }
    }
  }

  // 2. Extract topic-based flipbook images
  if (scan.analysisData.topicBasedSketches) {
    const topics = Object.keys(scan.analysisData.topicBasedSketches);

    for (const topic of topics) {
      const sketch = scan.analysisData.topicBasedSketches[topic];

      if (sketch.pages && Array.isArray(sketch.pages)) {
        for (let pageIndex = 0; pageIndex < sketch.pages.length; pageIndex++) {
          const page = sketch.pages[pageIndex];

          if (page.base64 && isValidBase64Image(page.base64)) {
            const topicSlug = topic.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            images.push({
              base64: page.base64,
              path: `topic-flipbooks/${scanId}/${topicSlug}_${pageIndex}.png`,
              contentType: 'image/png',
            });
            stats.topicFlipbookImages++;
          } else if (page.imageUrl && page.imageUrl.startsWith('data:image')) {
            // Alternative field name
            const topicSlug = topic.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            images.push({
              base64: page.imageUrl,
              path: `topic-flipbooks/${scanId}/${topicSlug}_${pageIndex}.png`,
              contentType: 'image/png',
            });
            stats.topicFlipbookImages++;
          } else {
            stats.skippedImages++;
          }
        }
      }
    }
  }

  return images;
}

/**
 * Update scan object with uploaded image URLs
 */
function updateScanWithUrls(
  scan: any,
  uploadResults: Array<{
    path: string;
    publicUrl: string | null;
    storagePath: string | null;
    error: string | null;
  }>
): any {
  const updatedScan = JSON.parse(JSON.stringify(scan)); // Deep clone

  if (!updatedScan.analysisData) {
    return updatedScan;
  }

  // Create URL lookup map
  const urlMap = new Map<string, string>();
  uploadResults.forEach((result) => {
    if (result.publicUrl) {
      urlMap.set(result.path, result.publicUrl);
    }
  });

  // Update questions
  if (updatedScan.analysisData.questions) {
    for (let qIndex = 0; qIndex < updatedScan.analysisData.questions.length; qIndex++) {
      const question = updatedScan.analysisData.questions[qIndex];
      const qId = question.id || `q${qIndex}`;

      // Replace extracted images with URLs
      if (question.extractedImages && Array.isArray(question.extractedImages)) {
        const urlArray: string[] = [];

        for (let imgIndex = 0; imgIndex < question.extractedImages.length; imgIndex++) {
          const expectedPath = `extracted-pdf/${scan.id}/${qId}_${imgIndex}.png`;
          const url = urlMap.get(expectedPath);

          if (url) {
            urlArray.push(url);
          }
        }

        // Replace base64 array with URL array
        if (urlArray.length > 0) {
          question.extractedImageUrls = urlArray;
          delete question.extractedImages; // Remove base64 data
        }
      }

      // Replace sketch SVG with URL
      if (question.sketchSvg) {
        const expectedPath = `question-sketches/${scan.id}/${qId}.png`;
        const expectedPathSvg = `question-sketches/${scan.id}/${qId}.svg`;
        const url = urlMap.get(expectedPath) || urlMap.get(expectedPathSvg);

        if (url) {
          question.sketchImageUrl = url;
          delete question.sketchSvg; // Remove base64/SVG data
        }
      }
    }
  }

  // Update topic-based sketches
  if (updatedScan.analysisData.topicBasedSketches) {
    const topics = Object.keys(updatedScan.analysisData.topicBasedSketches);

    for (const topic of topics) {
      const sketch = updatedScan.analysisData.topicBasedSketches[topic];

      if (sketch.pages && Array.isArray(sketch.pages)) {
        for (let pageIndex = 0; pageIndex < sketch.pages.length; pageIndex++) {
          const page = sketch.pages[pageIndex];
          const topicSlug = topic.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const expectedPath = `topic-flipbooks/${scan.id}/${topicSlug}_${pageIndex}.png`;
          const url = urlMap.get(expectedPath);

          if (url) {
            page.imageUrl = url;
            delete page.base64; // Remove base64 data
          }
        }
      }
    }
  }

  return updatedScan;
}

/**
 * Display migration summary
 */
function displaySummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`\n📁 Scans:`);
  console.log(`  Total: ${stats.totalScans}`);
  console.log(`  Processed: ${stats.processedScans}`);
  console.log(`\n🖼️  Images:`);
  console.log(`  Total found: ${stats.totalImages}`);
  console.log(`  Uploaded successfully: ${stats.uploadedImages}`);
  console.log(`  Failed: ${stats.failedImages}`);
  console.log(`  Skipped (invalid): ${stats.skippedImages}`);
  console.log(`\n📂 By Type:`);
  console.log(`  Extracted PDF images: ${stats.extractedPdfImages}`);
  console.log(`  Question sketches: ${stats.sketchImages}`);
  console.log(`  Topic flipbooks: ${stats.topicFlipbookImages}`);
  console.log(`\n⏱️  Duration: ${stats.duration}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors (${stats.errors.length}):`);
    stats.errors.forEach((e, i) => {
      console.log(`  ${i + 1}. Scan ${e.scanId}: ${e.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Save summary to file
 */
function saveSummary() {
  const summaryPath = './migration-summary.json';
  fs.writeFileSync(summaryPath, JSON.stringify(stats, null, 2));
  console.log(`\n💾 Summary saved to: ${summaryPath}`);
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// =====================================================
// RUN MIGRATION
// =====================================================
redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
  process.exit(1);
});

redis.on('ready', () => {
  migrateImages()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
});
