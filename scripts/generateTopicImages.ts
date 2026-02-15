/**
 * Script to generate representative images for all topics
 * This should be run once to populate topic images for existing topics
 */

import { createClient } from '@supabase/supabase-js';
import { generateTopicVisuals } from '../utils/topicSymbolGenerator';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.VITE_GEMINI_API_KEY!;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload base64 image to Supabase Storage
 */
async function uploadTopicImage(
  topicId: string,
  imageBase64: string
): Promise<string | null> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(imageBase64, 'base64');

    // Generate unique filename
    const filename = `topic-${topicId}.png`;
    const filepath = `topic-images/${filename}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('public-assets')
      .upload(filepath, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error(`Error uploading image for topic ${topicId}:`, error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(filepath);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error uploading image for topic ${topicId}:`, error);
    return null;
  }
}

/**
 * Generate images for all topics
 */
async function generateAllTopicImages() {
  console.log('🎨 Starting topic image generation...\n');

  try {
    // Get all topics
    const { data: topics, error } = await supabase
      .from('topics')
      .select('id, name, subject, exam_weightage');

    if (error) throw error;

    if (!topics || topics.length === 0) {
      console.log('No topics found in database');
      return;
    }

    console.log(`Found ${topics.length} topics\n`);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      console.log(`[${i + 1}/${topics.length}] Processing: ${topic.name}`);

      try {
        // Determine exam context (use first available exam with weightage > 0)
        const examWeightage = topic.exam_weightage as any;
        const examContext = Object.keys(examWeightage || {}).find(
          exam => examWeightage[exam] > 0
        ) || 'KCET';

        // Generate visuals (symbol + image)
        console.log(`  Generating AI visuals...`);
        const visuals = await generateTopicVisuals(
          topic.name,
          topic.subject,
          examContext,
          geminiApiKey
        );

        console.log(`  Symbol: ${visuals.symbol} (${visuals.symbolType})`);

        // Upload image if generated
        let imageUrl: string | null = null;
        if (visuals.imageBase64) {
          console.log(`  Uploading image...`);
          imageUrl = await uploadTopicImage(topic.id, visuals.imageBase64);
          if (imageUrl) {
            console.log(`  ✅ Image uploaded: ${imageUrl}`);
          } else {
            console.log(`  ⚠️  Image upload failed`);
          }
        } else {
          console.log(`  ⚠️  No image generated`);
        }

        // Update topic in database
        const { error: updateError } = await supabase
          .from('topics')
          .update({
            representative_symbol: visuals.symbol,
            symbol_type: visuals.symbolType,
            representative_image_url: imageUrl
          })
          .eq('id', topic.id);

        if (updateError) {
          console.error(`  ❌ Database update failed:`, updateError);
          failureCount++;
        } else {
          console.log(`  ✅ Topic updated successfully`);
          successCount++;
        }

        // Rate limiting: wait 2 seconds between topics
        if (i < topics.length - 1) {
          console.log(`  Waiting 2s before next topic...\n`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`  ❌ Error processing topic:`, error);
        failureCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`Total topics: ${topics.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
generateAllTopicImages()
  .then(() => {
    console.log('\n✨ Topic image generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
