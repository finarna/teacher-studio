/**
 * Update Supabase Storage bucket to allow SVG files
 */

import { createClient } from '@supabase/supabase-js';
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

async function updateBucket() {
  console.log('🔧 Updating bucket configuration to allow SVG files...\n');

  try {
    // Update bucket to allow SVG
    const { data, error } = await supabase.storage.updateBucket('public-assets', {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/svg+xml'  // Add SVG support
      ]
    });

    if (error) {
      console.error('❌ Error updating bucket:', error);
      return false;
    }

    console.log('✅ Successfully updated bucket configuration!\n');
    console.log('Bucket now allows:');
    console.log('  - PNG, JPEG, JPG, WebP');
    console.log('  - SVG+XML\n');

    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

updateBucket().then(success => {
  if (success) {
    console.log('✨ Bucket is ready for SVG images!');
    process.exit(0);
  } else {
    console.log('⚠️  Failed to update bucket');
    process.exit(1);
  }
});
