#!/usr/bin/env node

/**
 * Check specific scan for visual element data
 * Run: node check-visual-elements.js
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:9000/api/scans';
const SCAN_ID = 'scan-1769045190332';

async function checkVisualElements() {
  console.log('🔍 Checking Visual Element Detection for Scan:', SCAN_ID);
  console.log('='.repeat(80) + '\n');

  try {
    // Fetch all scans
    console.log(`📡 Fetching from: ${API_URL}`);
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const scans = await response.json();
    console.log(`✅ Retrieved ${scans.length} scans from Redis\n`);

    // Find the specific scan
    const targetScan = scans.find(s => s.id === SCAN_ID);

    if (!targetScan) {
      console.log(`❌ Scan ${SCAN_ID} not found in Redis`);
      console.log('\n📋 Available scans:');
      scans.forEach(s => console.log(`   - ${s.id}: ${s.name}`));
      return;
    }

    console.log('📦 SCAN FOUND:');
    console.log('─'.repeat(80));
    console.log(`Name: ${targetScan.name}`);
    console.log(`ID: ${targetScan.id}`);
    console.log(`Subject: ${targetScan.subject}`);
    console.log(`Grade: ${targetScan.grade}`);
    console.log(`Status: ${targetScan.status}`);
    console.log(`Date: ${targetScan.date}`);

    const questions = targetScan.analysisData?.questions || [];
    console.log(`\n📝 Total Questions: ${questions.length}`);

    if (questions.length === 0) {
      console.log('\n❌ No questions found in this scan!');
      return;
    }

    // Check for visual elements
    const questionsWithVisuals = questions.filter(q => q.hasVisualElement);
    console.log(`🖼️  Questions with Visual Elements: ${questionsWithVisuals.length}`);
    console.log('─'.repeat(80));

    if (questionsWithVisuals.length > 0) {
      console.log('\n✅ VISUAL ELEMENTS DETECTED!\n');

      questionsWithVisuals.forEach((q, idx) => {
        console.log(`${idx + 1}. Question ID: ${q.id}`);
        console.log(`   Text: ${q.text.substring(0, 80)}...`);
        console.log(`   Has Visual: ${q.hasVisualElement}`);
        console.log(`   Type: ${q.visualElementType || 'N/A'}`);
        console.log(`   Position: ${q.visualElementPosition || 'N/A'}`);
        console.log(`   Description: ${q.visualElementDescription?.substring(0, 100) || 'N/A'}...`);
        console.log('');
      });
    } else {
      console.log('\n❌ NO VISUAL ELEMENTS FOUND\n');
      console.log('🔍 Checking what fields ARE present in questions...\n');

      const sampleQuestion = questions[0];
      console.log('Sample Question Fields:');
      Object.keys(sampleQuestion).forEach(key => {
        const value = sampleQuestion[key];
        const type = Array.isArray(value) ? 'array' : typeof value;
        console.log(`   - ${key}: ${type}`);
      });

      console.log('\n📋 Sample Question:');
      console.log(JSON.stringify(sampleQuestion, null, 2));
    }

    console.log('\n' + '='.repeat(80));
    console.log('Analysis complete!');
    console.log('='.repeat(80));

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure server is running: npm run dev');
    console.error('2. Check if port 9000 is available');
    console.error('3. Verify Redis connection in server logs');
  }
}

// Run the check
checkVisualElements();
