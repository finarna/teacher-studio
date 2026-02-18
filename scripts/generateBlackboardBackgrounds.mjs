#!/usr/bin/env node

/**
 * Generate Realistic Blackboard Background Images for Subject Learning Options
 * Uses Gemini 3 Pro Image model (same as sketch generation)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
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

// Sleep utility for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Subject-specific blackboard configurations
const subjects = {
  Physics: {
    formulas: ['F = ma', 'E = mc²', 'V = IR', 'P = F/A'],
    symbols: ['⚡', '🔋', '🧲'],
    years: ['2024', '2023', '2022', '2021'],
    prompt: `Create a photorealistic dark green chalkboard/blackboard background image with white chalk handwriting:

LAYOUT:
- Dark green-black chalkboard texture (realistic classroom board)
- Chalk dust and smudge marks for authenticity
- Subtle wood frame visible at edges

CONTENT (written in casual teacher handwriting with white chalk):

TOP LEFT CORNER:
- Years stacked diagonally, getting smaller: "2024", "2023", "2022", "2021"

TOP RIGHT AREA:
- Physics formulas in neat but natural handwriting:
  • F = ma
  • E = mc²
  • V = IR
  • P = F/A

BOTTOM LEFT:
- Small graph sketch with axes and a sine/parabola curve

SCATTERED ELEMENTS:
- Lightning bolt symbol (⚡)
- Atom symbol (simple circles with electron paths)
- A few checkmarks (✓)
- Chalk dust spots and eraser smudges

STYLE:
- Realistic classroom blackboard texture
- Natural chalk opacity variations (some strokes lighter, some bolder)
- Slight imperfections in handwriting for authenticity
- Leave 60% of board empty (center area) for text overlay
- Subtle highlights where chalk catches light
- Aged board with slight wear patterns

IMPORTANT: The image should be usable as a background - don't fill entire board, leave plenty of negative space!`
  },

  Chemistry: {
    formulas: ['H₂O', 'NaCl', 'CH₄', 'CO₂'],
    symbols: ['⚗️', '🧪', '⚛️'],
    years: ['2024', '2023', '2022', '2021'],
    prompt: `Create a photorealistic dark green chalkboard/blackboard background image with white chalk handwriting:

LAYOUT:
- Dark green-black chalkboard texture (realistic classroom board)
- Chalk dust and smudge marks for authenticity
- Subtle wood frame visible at edges

CONTENT (written in casual teacher handwriting with white chalk):

TOP LEFT CORNER:
- Years stacked diagonally, getting smaller: "2024", "2023", "2022", "2021"

TOP RIGHT AREA:
- Chemistry formulas in neat but natural handwriting:
  • H₂O (with small molecular structure sketch)
  • NaCl
  • CH₄
  • CO₂

BOTTOM LEFT:
- Small beaker or test tube sketch
- Simple molecular diagram (circles connected with lines)

SCATTERED ELEMENTS:
- Periodic table elements in boxes: "Na", "Cl", "O", "C"
- Small benzene ring sketch
- A few checkmarks (✓)
- Chalk dust spots and eraser smudges

STYLE:
- Realistic classroom blackboard texture
- Natural chalk opacity variations (some strokes lighter, some bolder)
- Slight imperfections in handwriting for authenticity
- Leave 60% of board empty (center area) for text overlay
- Subtle highlights where chalk catches light
- Aged board with slight wear patterns

IMPORTANT: The image should be usable as a background - don't fill entire board, leave plenty of negative space!`
  },

  Math: {
    formulas: ['∫x²dx = x³/3+C', 'π = 3.14', 'a² + b² = c²', 'Σ(n=1 to ∞)'],
    symbols: ['∑', '∫', '√', '∞'],
    years: ['2024', '2023', '2022', '2021'],
    prompt: `Create a photorealistic dark green chalkboard/blackboard background image with white chalk handwriting:

LAYOUT:
- Dark green-black chalkboard texture (realistic classroom board)
- Chalk dust and smudge marks for authenticity
- Subtle wood frame visible at edges

CONTENT (written in casual teacher handwriting with white chalk):

TOP LEFT CORNER:
- Years stacked diagonally, getting smaller: "2024", "2023", "2022", "2021"

TOP RIGHT AREA:
- Math formulas in neat but natural handwriting:
  • ∫x²dx = x³/3 + C
  • π = 3.14
  • a² + b² = c²
  • Σ(n=1 to ∞)

BOTTOM LEFT:
- Small graph with coordinate axes
- Parabola or sine curve sketch

SCATTERED ELEMENTS:
- Mathematical symbols: ∑, ∫, √, ∞
- Right triangle diagram
- A few checkmarks (✓)
- Chalk dust spots and eraser smudges

STYLE:
- Realistic classroom blackboard texture
- Natural chalk opacity variations (some strokes lighter, some bolder)
- Slight imperfections in handwriting for authenticity
- Leave 60% of board empty (center area) for text overlay
- Subtle highlights where chalk catches light
- Aged board with slight wear patterns

IMPORTANT: The image should be usable as a background - don't fill entire board, leave plenty of negative space!`
  },

  Biology: {
    formulas: ['DNA', 'ATP', 'RNA', 'C₆H₁₂O₆'],
    symbols: ['🧬', '🦠', '🌱'],
    years: ['2024', '2023', '2022', '2021'],
    prompt: `Create a photorealistic dark green chalkboard/blackboard background image with white chalk handwriting:

LAYOUT:
- Dark green-black chalkboard texture (realistic classroom board)
- Chalk dust and smudge marks for authenticity
- Subtle wood frame visible at edges

CONTENT (written in casual teacher handwriting with white chalk):

TOP LEFT CORNER:
- Years stacked diagonally, getting smaller: "2024", "2023", "2022", "2021"

TOP RIGHT AREA:
- Biology terms and formulas in neat but natural handwriting:
  • DNA (with double helix symbol)
  • ATP
  • RNA
  • C₆H₁₂O₆ (Glucose)

BOTTOM LEFT:
- Simple DNA double helix sketch
- Plant cell diagram (circle with nucleus)

SCATTERED ELEMENTS:
- Small leaf sketch
- Microscope icon
- Cell division diagram (simple circles)
- A few checkmarks (✓)
- Chalk dust spots and eraser smudges

STYLE:
- Realistic classroom blackboard texture
- Natural chalk opacity variations (some strokes lighter, some bolder)
- Slight imperfections in handwriting for authenticity
- Leave 60% of board empty (center area) for text overlay
- Subtle highlights where chalk catches light
- Aged board with slight wear patterns

IMPORTANT: The image should be usable as a background - don't fill entire board, leave plenty of negative space!`
  }
};

async function generateBlackboardImage(subjectName, config) {
  console.log(`\n🎨 Generating ${subjectName} blackboard image...`);

  try {
    const imageModel = genAI.getGenerativeModel({
      model: "gemini-3-pro-image-preview"
    });

    console.log('   📝 Sending prompt to Gemini 3 Pro Image...');
    const result = await imageModel.generateContent(config.prompt);

    const response = await result.response;

    // Extract image data from response
    if (response.candidates && response.candidates[0].content.parts) {
      const imagePart = response.candidates[0].content.parts.find(
        part => part.inlineData && part.inlineData.mimeType.startsWith('image/')
      );

      if (imagePart && imagePart.inlineData) {
        const imageData = imagePart.inlineData.data;
        console.log(`   ✅ Image generated successfully!`);
        return imageData; // Base64 encoded PNG
      }
    }

    throw new Error('No image data in response');

  } catch (error) {
    console.error(`   ❌ Error generating ${subjectName} image:`, error.message);
    throw error;
  }
}

async function saveImage(subjectName, base64Data) {
  const assetsDir = join(__dirname, '..', 'public', 'assets', 'blackboards');
  mkdirSync(assetsDir, { recursive: true });

  const filename = `${subjectName.toLowerCase()}-blackboard.png`;
  const filepath = join(assetsDir, filename);

  // Convert base64 to buffer and save
  const buffer = Buffer.from(base64Data, 'base64');
  writeFileSync(filepath, buffer);

  console.log(`   💾 Saved: ${filename}`);
  return `/assets/blackboards/${filename}`;
}

async function generateAllBlackboards() {
  console.log('🚀 Starting Blackboard Background Generation');
  console.log('📐 Using Gemini 3 Pro Image (same as sketch generation)');
  console.log('━'.repeat(60));

  const results = {};
  const subjectNames = Object.keys(subjects);

  for (let i = 0; i < subjectNames.length; i++) {
    const subjectName = subjectNames[i];
    const config = subjects[subjectName];

    try {
      // Check if image already exists
      const assetsDir = join(__dirname, '..', 'public', 'assets', 'blackboards');
      const filename = `${subjectName.toLowerCase()}-blackboard.png`;
      const filepath = join(assetsDir, filename);

      if (existsSync(filepath)) {
        console.log(`\n✅ ${subjectName} blackboard already exists, skipping...`);
        results[subjectName] = `/assets/blackboards/${filename}`;
        continue;
      }

      // Generate new image
      const imageData = await generateBlackboardImage(subjectName, config);
      const imagePath = await saveImage(subjectName, imageData);
      results[subjectName] = imagePath;

      // Rate limiting - wait 3 seconds between requests
      if (i < subjectNames.length - 1) {
        console.log('   ⏳ Waiting 3s to avoid rate limits...');
        await sleep(3000);
      }

    } catch (error) {
      console.error(`\n❌ Failed to generate ${subjectName} blackboard:`, error.message);
      results[subjectName] = null;
    }
  }

  // Save manifest file
  const manifestPath = join(__dirname, '..', 'public', 'assets', 'blackboards', 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Generated manifest: ${manifestPath}`);

  console.log('\n' + '━'.repeat(60));
  console.log('✅ Blackboard generation complete!');
  console.log('\n📁 Images saved to: public/assets/blackboards/');
  console.log('\n💡 Next steps:');
  console.log('   1. Update SubjectMenuPage.tsx to use these images');
  console.log('   2. Add <img> or CSS background-image to render them');
  console.log('\n📊 Results:');
  Object.entries(results).forEach(([subject, path]) => {
    console.log(`   ${path ? '✅' : '❌'} ${subject}: ${path || 'Failed'}`);
  });
}

generateAllBlackboards().catch(console.error);
