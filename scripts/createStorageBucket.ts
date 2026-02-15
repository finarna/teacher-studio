/**
 * Create Supabase Storage bucket for topic images
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

async function createBucket() {
  console.log('🪣 Creating Supabase Storage bucket...\n');

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return false;
    }

    const bucketExists = buckets?.some(b => b.name === 'public-assets');

    if (bucketExists) {
      console.log('✅ Bucket "public-assets" already exists!\n');
      return true;
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('public-assets', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    });

    if (error) {
      console.error('❌ Error creating bucket:', error);
      return false;
    }

    console.log('✅ Successfully created bucket "public-assets"!\n');
    console.log('Bucket configuration:');
    console.log('  - Name: public-assets');
    console.log('  - Public: Yes');
    console.log('  - Max file size: 5MB');
    console.log('  - Allowed types: PNG, JPEG, JPG, WebP\n');

    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

createBucket().then(success => {
  if (success) {
    console.log('✨ Storage bucket is ready for topic images!');
    process.exit(0);
  } else {
    console.log('⚠️  Failed to create/verify storage bucket');
    process.exit(1);
  }
});
