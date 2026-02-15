/**
 * Generate SVG images from symbols and upload to Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import { generateSymbolSVG, svgToBuffer } from '../utils/svgImageGenerator';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function uploadSVGImage(
  topicId: string,
  svg: string
): Promise<string | null> {
  try {
    const buffer = svgToBuffer(svg);
    const filename = `topic-${topicId}.svg`;
    const filepath = `topic-images/${filename}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('public-assets')
      .upload(filepath, buffer, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (error) {
      console.error(`  ❌ Upload error:`, error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(filepath);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`  ❌ Upload failed:`, error);
    return null;
  }
}

async function generateAllImages() {
  console.log('🎨 Generating SVG images for all topics...\n');

  try {
    // Get all topics with symbols
    const { data: topics, error } = await supabase
      .from('topics')
      .select('id, name, subject, representative_symbol, symbol_type')
      .not('representative_symbol', 'is', null);

    if (error) throw error;

    console.log(`Found ${topics.length} topics with symbols\n`);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      console.log(`[${i + 1}/${topics.length}] ${topic.name}`);

      try {
        // Generate SVG image
        const svg = generateSymbolSVG(
          topic.representative_symbol,
          topic.symbol_type as 'math' | 'emoji' | 'text',
          topic.subject
        );

        console.log(`  📐 Generated SVG`);

        // Upload to storage
        const imageUrl = await uploadSVGImage(topic.id, svg);

        if (imageUrl) {
          // Update topic with image URL
          const { error: updateError } = await supabase
            .from('topics')
            .update({ representative_image_url: imageUrl })
            .eq('id', topic.id);

          if (updateError) {
            console.log(`  ❌ Database update failed`);
            failureCount++;
          } else {
            console.log(`  ✅ Image uploaded and saved`);
            successCount++;
          }
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error:`, error);
        failureCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`Total topics: ${topics.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

generateAllImages()
  .then(() => {
    console.log('\n✨ Image generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
