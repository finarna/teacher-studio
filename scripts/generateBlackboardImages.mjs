#!/usr/bin/env node

/**
 * Generate Subject-Specific Blackboard Background Images
 * Using Gemini API to create realistic chalk-on-blackboard illustrations
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Missing VITE_GEMINI_API_KEY in .env.local');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Subject-specific prompts for blackboard images
const subjects = {
  physics: {
    name: 'Physics',
    prompt: `Create a realistic dark green/black chalkboard texture background image with white chalk handwriting showing:
- Years written diagonally: "2024", "2023", "2022", "2021" in decreasing sizes
- Physics formulas in neat handwriting: "F = ma", "E = mc²", "V = IR", "P = F/A"
- Small physics symbols: lightning bolt, battery symbol, magnet
- A small graph with sine wave curve on bottom left
- Scattered checkmarks (✓)
- Chalk dust texture and slight smudges
- Natural hand-drawn appearance with slight imperfections
- Leave plenty of empty space for text overlay
- Dark background (RGB 30, 40, 45) with subtle texture
Style: Photorealistic classroom blackboard, chalk on slate, educational setting`,
    color: 'blue'
  },

  chemistry: {
    name: 'Chemistry',
    prompt: `Create a realistic dark green/black chalkboard texture background image with white chalk handwriting showing:
- Years written diagonally: "2024", "2023", "2022", "2021" in decreasing sizes
- Chemistry formulas in neat handwriting: "H₂O", "NaCl", "CH₄", "CO₂"
- Small sketches: beaker, test tube, molecular structure (H-O-H)
- Periodic table elements: "Na", "Cl", "O", "C"
- Scattered checkmarks (✓)
- Chalk dust texture and slight smudges
- Natural hand-drawn appearance with slight imperfections
- Leave plenty of empty space for text overlay
- Dark background (RGB 30, 40, 45) with subtle texture
Style: Photorealistic chemistry lab blackboard, chalk on slate, educational setting`,
    color: 'green'
  },

  math: {
    name: 'Math',
    prompt: `Create a realistic dark green/black chalkboard texture background image with white chalk handwriting showing:
- Years written diagonally: "2024", "2023", "2022", "2021" in decreasing sizes
- Math formulas in neat handwriting: "∫x²dx = x³/3 + C", "π = 3.14", "a² + b² = c²", "Σ(n=1 to ∞)"
- Mathematical symbols: ∑, ∫, √, ∞
- Small graph with parabola curve on bottom left
- Scattered checkmarks (✓)
- Chalk dust texture and slight smudges
- Natural hand-drawn appearance with slight imperfections
- Leave plenty of empty space for text overlay
- Dark background (RGB 30, 40, 45) with subtle texture
Style: Photorealistic mathematics classroom blackboard, chalk on slate, educational setting`,
    color: 'purple'
  },

  biology: {
    name: 'Biology',
    prompt: `Create a realistic dark green/black chalkboard texture background image with white chalk handwriting showing:
- Years written diagonally: "2024", "2023", "2022", "2021" in decreasing sizes
- Biology terms in neat handwriting: "DNA", "ATP", "RNA", "Photosynthesis"
- Small sketches: DNA double helix, plant cell, microscope
- Chemical formulas: "C₆H₁₂O₆", "H₂O"
- Scattered checkmarks (✓)
- Chalk dust texture and slight smudges
- Natural hand-drawn appearance with slight imperfections
- Leave plenty of empty space for text overlay
- Dark background (RGB 30, 40, 45) with subtle texture
Style: Photorealistic biology lab blackboard, chalk on slate, educational setting`,
    color: 'green'
  }
};

async function generateImage(subject, subjectData) {
  console.log(`\n🎨 Generating ${subjectData.name} blackboard image...`);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      subjectData.prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: '' // We're asking for image generation
        }
      }
    ]);

    // Note: Gemini Flash doesn't directly generate images via text prompts
    // We need to use imagen or another image generation model
    console.log('⚠️  Gemini Flash cannot generate images directly.');
    console.log('💡 Using CSS-based approach instead with realistic textures');

    return null;

  } catch (error) {
    console.error(`❌ Error generating ${subjectData.name} image:`, error.message);
    return null;
  }
}

async function generateAllImages() {
  console.log('🚀 Starting Blackboard Image Generation');
  console.log('━'.repeat(60));

  // Create assets directory
  const assetsDir = join(__dirname, '..', 'public', 'assets', 'blackboards');
  try {
    mkdirSync(assetsDir, { recursive: true });
    console.log('✅ Created assets directory:', assetsDir);
  } catch (error) {
    console.error('❌ Failed to create directory:', error.message);
  }

  console.log('\n💡 Note: Gemini API does not support direct image generation.');
  console.log('📝 Alternative approach: Use enhanced CSS gradients and textures');
  console.log('\nGenerating configuration file for CSS-based blackboards...\n');

  // Create a config file with detailed styling instructions
  const config = {
    subjects: Object.entries(subjects).map(([key, data]) => ({
      key,
      name: data.name,
      color: data.color,
      description: data.prompt,
      cssConfig: {
        background: 'radial-gradient(circle at 30% 40%, rgba(45, 55, 60, 0.9) 0%, rgba(20, 30, 35, 0.95) 100%)',
        texture: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px)',
        overlay: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 50%, rgba(255, 255, 255, 0.02) 100%)',
        chalkDust: 'radial-gradient(ellipse at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 30%)'
      }
    }))
  };

  const configPath = join(assetsDir, 'blackboard-config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✅ Generated blackboard config:', configPath);

  console.log('\n' + '━'.repeat(60));
  console.log('✅ Configuration complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Update SubjectMenuPage.tsx to use enhanced CSS textures');
  console.log('   2. Apply realistic blackboard gradients and overlays');
  console.log('   3. Consider using external tools like DALL-E or Midjourney for actual images');
}

generateAllImages().catch(console.error);
