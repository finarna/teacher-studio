/**
 * Supabase Storage Setup Script
 *
 * This script initializes the Supabase Storage buckets and configures CORS policies.
 * Run this once after creating your Supabase project.
 *
 * Usage:
 *   npx tsx scripts/setup-supabase-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Required environment variables:');
  console.error('  - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env.local or .env file.');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Main setup function
 */
async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage...\n');

  try {
    // =====================================================
    // 1. CREATE MAIN BUCKET
    // =====================================================
    console.log('📦 Creating bucket: edujourney-images...');

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message);
      throw listError;
    }

    const bucketExists = buckets?.some((b) => b.name === 'edujourney-images');

    if (bucketExists) {
      console.log('✅ Bucket already exists: edujourney-images');
    } else {
      const { data, error } = await supabase.storage.createBucket('edujourney-images', {
        public: true, // Public access for CDN
        fileSizeLimit: 10485760, // 10MB limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'],
      });

      if (error) {
        console.error('❌ Failed to create bucket:', error.message);
        throw error;
      }

      console.log('✅ Bucket created successfully: edujourney-images');
    }

    // =====================================================
    // 2. CREATE FOLDER STRUCTURE
    // =====================================================
    console.log('\n📁 Creating folder structure...');

    const folders = [
      'extracted-pdf',
      'question-sketches',
      'topic-flipbooks',
      'test', // For testing uploads
    ];

    for (const folder of folders) {
      // Create a placeholder file to establish the folder
      const placeholderPath = `${folder}/.keep`;

      const { error } = await supabase.storage
        .from('edujourney-images')
        .upload(placeholderPath, new Blob([''], { type: 'text/plain' }), {
          upsert: true,
        });

      if (error && !error.message.includes('already exists')) {
        console.warn(`⚠️  Warning: Could not create folder ${folder}:`, error.message);
      } else {
        console.log(`  ✅ ${folder}/`);
      }
    }

    // =====================================================
    // 3. TEST UPLOAD
    // =====================================================
    console.log('\n🧪 Testing file upload...');

    const testImageData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const testPath = `test/test-image-${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('edujourney-images')
      .upload(testPath, testImageData, {
        contentType: 'image/png',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError.message);
      throw uploadError;
    }

    console.log('✅ Test upload successful:', testPath);

    // =====================================================
    // 4. GET PUBLIC URL
    // =====================================================
    console.log('\n🌐 Testing public URL access...');

    const { data: publicUrlData } = supabase.storage
      .from('edujourney-images')
      .getPublicUrl(testPath);

    console.log('✅ Public URL:', publicUrlData.publicUrl);

    // =====================================================
    // 5. CLEANUP TEST FILE
    // =====================================================
    console.log('\n🧹 Cleaning up test file...');

    const { error: deleteError } = await supabase.storage
      .from('edujourney-images')
      .remove([testPath]);

    if (deleteError) {
      console.warn('⚠️  Warning: Could not delete test file:', deleteError.message);
    } else {
      console.log('✅ Test file deleted');
    }

    // =====================================================
    // 6. SUMMARY
    // =====================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Supabase Storage setup complete!');
    console.log('='.repeat(60));
    console.log('\nBucket Details:');
    console.log('  Name: edujourney-images');
    console.log('  Access: Public (CDN-backed)');
    console.log('  File size limit: 10MB');
    console.log('  Allowed types: PNG, JPEG, JPG, GIF, SVG');
    console.log('\nFolder Structure:');
    folders.forEach((folder) => console.log(`  - ${folder}/`));
    console.log('\nNext Steps:');
    console.log('  1. ✅ Storage is ready for use');
    console.log('  2. Run image migration: npm run migrate:images');
    console.log('  3. Test with frontend: npm run dev');
    console.log('\n');
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nPlease check:');
    console.error('  1. Supabase credentials are correct');
    console.error('  2. Service role key has admin permissions');
    console.error('  3. Supabase project is fully initialized');
    process.exit(1);
  }
}

// =====================================================
// CORS CONFIGURATION (Manual - via Dashboard)
// =====================================================
console.log('\n📋 CORS Configuration (Manual Step):');
console.log('Go to Supabase Dashboard → Storage → edujourney-images → Settings');
console.log('Add CORS policy:');
console.log('  Allowed origins: *');
console.log('  Allowed methods: GET, POST, PUT, DELETE');
console.log('  Allowed headers: *');
console.log('  Max age: 3600');
console.log('\nOr run in Supabase SQL Editor:');
console.log(`
  -- Note: CORS is typically configured via Storage settings UI
  -- If you need to set it via SQL, contact Supabase support
`);
console.log('\n' + '='.repeat(60) + '\n');

// Run setup
setupStorage();
