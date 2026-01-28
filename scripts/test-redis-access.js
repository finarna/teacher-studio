#!/usr/bin/env node

/**
 * Quick test script to verify Redis access and image retrieval
 * Run: node test-redis-access.js
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:9000/api/scans';

async function testRedisAccess() {
  console.log('🔍 Testing Redis Access...\n');

  try {
    // Fetch all scans
    console.log(`📡 Fetching from: ${API_URL}`);
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const scans = await response.json();
    console.log(`✅ Successfully retrieved ${scans.length} scans\n`);

    // Display scan summary
    console.log('📊 Scan Summary:');
    console.log('─'.repeat(80));

    scans.forEach((scan, idx) => {
      const questions = scan.analysisData?.questions || [];
      const imagesCount = questions.filter(q => q.sketchSvg).length;

      console.log(`${idx + 1}. ${scan.name}`);
      console.log(`   ID: ${scan.id}`);
      console.log(`   Subject: ${scan.subject} | Grade: ${scan.grade}`);
      console.log(`   Questions: ${questions.length} | Images: ${imagesCount}`);
      console.log('');
    });

    console.log('─'.repeat(80));

    // Show detailed info for scans with images
    const scansWithImages = scans.filter(s =>
      (s.analysisData?.questions || []).some(q => q.sketchSvg)
    );

    if (scansWithImages.length > 0) {
      console.log(`\n🖼️  Scans with Images (${scansWithImages.length}):\n`);

      scansWithImages.forEach(scan => {
        const images = scan.analysisData.questions.filter(q => q.sketchSvg);

        console.log(`📁 ${scan.name} (${scan.id})`);
        console.log(`   Total images: ${images.length}`);

        // Show first 3 images
        console.log('   First 3 images:');
        images.slice(0, 3).forEach((q, idx) => {
          const sizeKB = (q.sketchSvg.length / 1024).toFixed(2);
          const type = q.sketchSvg.startsWith('data:image/png') ? 'PNG' :
                       q.sketchSvg.startsWith('data:image/jpeg') ? 'JPG' :
                       q.sketchSvg.startsWith('<svg') ? 'SVG' : 'Unknown';

          console.log(`     ${idx + 1}. ${q.id} - ${q.topic} (${type}, ${sizeKB} KB)`);
        });

        if (images.length > 3) {
          console.log(`     ... and ${images.length - 3} more images`);
        }
        console.log('');
      });
    } else {
      console.log('\n⚠️  No scans with images found!');
    }

    // Test retrieving a specific image
    const scanWithMostImages = scans.reduce((max, scan) => {
      const count = (scan.analysisData?.questions || []).filter(q => q.sketchSvg).length;
      const maxCount = (max.analysisData?.questions || []).filter(q => q.sketchSvg).length;
      return count > maxCount ? scan : max;
    }, scans[0]);

    if (scanWithMostImages) {
      const imageQuestions = scanWithMostImages.analysisData.questions.filter(q => q.sketchSvg);

      if (imageQuestions.length > 0) {
        console.log('\n🔬 Sample Image Analysis:');
        console.log('─'.repeat(80));

        const sample = imageQuestions[0];
        console.log(`Question ID: ${sample.id}`);
        console.log(`Topic: ${sample.topic}`);
        console.log(`Visual Concept: ${sample.visualConcept || 'N/A'}`);
        console.log(`Image Data: ${sample.sketchSvg.substring(0, 50)}...`);
        console.log(`Image Size: ${(sample.sketchSvg.length / 1024).toFixed(2)} KB`);

        // Verify it's a valid data URL or SVG
        if (sample.sketchSvg.startsWith('data:image')) {
          console.log(`✅ Valid base64 image data URL`);
        } else if (sample.sketchSvg.startsWith('<svg')) {
          console.log(`✅ Valid SVG markup`);
        } else {
          console.log(`⚠️  Unknown image format`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Redis access test completed successfully!');
    console.log('='.repeat(80));

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure server is running: node server.js');
    console.error('2. Check if port 9000 is available');
    console.error('3. Verify Redis connection in server logs');
  }
}

// Run the test
testRedisAccess();
