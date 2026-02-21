/**
 * Image Storage Utilities
 *
 * Functions for uploading, retrieving, and managing images in Supabase Storage.
 * Handles base64 → Blob conversion, batch uploads, and CDN URL generation.
 */

import { supabaseAdmin } from './supabaseServer.ts';
import { createImage } from './supabaseServer.ts';

const STORAGE_BUCKET = 'edujourney-images';

/**
 * Upload a base64 image to Supabase Storage
 *
 * @param base64Data Base64 image string (with or without data URI prefix)
 * @param path Storage path (e.g., 'extracted-pdf/scan123/image1.png')
 * @param options Upload options
 * @returns { publicUrl, storagePath, error }
 */
export async function uploadBase64Image(
  base64Data: string,
  path: string,
  options: {
    contentType?: string;
    cacheControl?: string;
  } = {}
) {
  try {
    // Remove data URI prefix if present (e.g., 'data:image/png;base64,')
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');

    // Convert base64 to Buffer
    const buffer = Buffer.from(base64Clean, 'base64');

    // Default content type to PNG if not specified
    const contentType = options.contentType || 'image/png';

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType,
        cacheControl: options.cacheControl || '3600', // 1 hour cache
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error('Upload error:', error);
      return { publicUrl: null, storagePath: null, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return {
      publicUrl: urlData.publicUrl,
      storagePath: data.path,
      error: null,
    };
  } catch (err: any) {
    console.error('Failed to upload image:', err);
    return { publicUrl: null, storagePath: null, error: err.message };
  }
}

/**
 * Upload multiple base64 images in batches
 *
 * @param images Array of {base64, path} objects
 * @param batchSize Number of concurrent uploads (default: 5)
 * @param delayMs Delay between batches in ms (default: 1000)
 * @returns Array of upload results
 */
export async function uploadBase64ImagesBatch(
  images: Array<{ base64: string; path: string; contentType?: string }>,
  batchSize: number = 5,
  delayMs: number = 1000
) {
  const results: Array<{
    path: string;
    publicUrl: string | null;
    storagePath: string | null;
    error: string | null;
  }> = [];

  // Process in batches
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);

    console.log(`Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(images.length / batchSize)}`);

    // Upload batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (img) => {
        const result = await uploadBase64Image(img.base64, img.path, {
          contentType: img.contentType,
        });

        return {
          path: img.path,
          publicUrl: result.publicUrl,
          storagePath: result.storagePath,
          error: result.error,
        };
      })
    );

    results.push(...batchResults);

    // Delay between batches to avoid rate limiting
    if (i + batchSize < images.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Upload SVG string to Storage (convert to PNG for better compatibility)
 *
 * @param svgString SVG markup
 * @param path Storage path
 * @returns { publicUrl, storagePath, error }
 */
export async function uploadSvgAsPng(svgString: string, path: string) {
  try {
    // For now, store SVG as-is (browser can render)
    // In production, you might want to convert to PNG server-side using a library like sharp
    const buffer = Buffer.from(svgString, 'utf-8');

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(path.replace('.png', '.svg'), buffer, {
        contentType: 'image/svg+xml',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('SVG upload error:', error);
      return { publicUrl: null, storagePath: null, error: error.message };
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return {
      publicUrl: urlData.publicUrl,
      storagePath: data.path,
      error: null,
    };
  } catch (err: any) {
    console.error('Failed to upload SVG:', err);
    return { publicUrl: null, storagePath: null, error: err.message };
  }
}

/**
 * Delete an image from Storage
 *
 * @param storagePath Path in storage bucket
 * @returns { error }
 */
export async function deleteImage(storagePath: string) {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error('Delete error:', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Delete multiple images from Storage
 *
 * @param storagePaths Array of storage paths
 * @returns { error }
 */
export async function deleteImages(storagePaths: string[]) {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove(storagePaths);

  if (error) {
    console.error('Batch delete error:', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Get public URL for a storage path
 *
 * @param storagePath Path in storage bucket
 * @returns Public URL
 */
export function getPublicUrl(storagePath: string): string {
  const { data } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Upload and create image record
 *
 * @param imageData Image upload data
 * @returns { imageRecord, error }
 */
export async function uploadAndCreateImageRecord(imageData: {
  base64: string;
  entityType: 'question' | 'topic' | 'scan';
  entityId: string;
  imageType: 'extracted' | 'sketch' | 'topic_flipbook';
  filename: string;
  imageOrder?: number;
  altText?: string;
  metadata?: any;
}) {
  // Generate storage path
  const timestamp = Date.now();
  const storagePath = `${imageData.imageType === 'extracted' ? 'extracted-pdf' : imageData.imageType === 'sketch' ? 'question-sketches' : 'topic-flipbooks'}/${imageData.entityId}/${timestamp}-${imageData.filename}`;

  // Upload to storage
  const { publicUrl, storagePath: uploadedPath, error: uploadError } = await uploadBase64Image(
    imageData.base64,
    storagePath
  );

  if (uploadError || !publicUrl || !uploadedPath) {
    return { imageRecord: null, error: uploadError || 'Upload failed' };
  }

  // Get image size (rough estimate from base64 length)
  const base64Clean = imageData.base64.replace(/^data:image\/\w+;base64,/, '');
  const fileSize = Math.floor((base64Clean.length * 3) / 4);

  // Create database record
  const { data: imageRecord, error: dbError } = await createImage({
    entity_type: imageData.entityType,
    entity_id: imageData.entityId,
    storage_path: uploadedPath,
    public_url: publicUrl,
    filename: imageData.filename,
    mime_type: 'image/png',
    file_size: fileSize,
    image_type: imageData.imageType,
    image_order: imageData.imageOrder || 0,
    alt_text: imageData.altText,
    metadata: imageData.metadata || {},
  });

  if (dbError) {
    // Cleanup: delete uploaded file if DB insert fails
    await deleteImage(uploadedPath);
    return { imageRecord: null, error: dbError.message };
  }

  return { imageRecord, error: null };
}

/**
 * Helper: Extract image dimensions from base64 (requires sharp or similar library)
 * For now, returns null (can be implemented later with sharp package)
 */
export async function getImageDimensions(base64Data: string): Promise<{
  width: number | null;
  height: number | null;
}> {
  // TODO: Implement with sharp library if needed
  // For now, return null (not critical for MVP)
  return { width: null, height: null };
}

/**
 * Helper: Generate unique filename
 */
export function generateImageFilename(prefix: string, extension: string = 'png'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}.${extension}`;
}

/**
 * Helper: Check if base64 string is valid
 */
export function isValidBase64Image(base64Data: string): boolean {
  try {
    // Check if it starts with data URI or is plain base64
    const base64Pattern = /^(?:data:image\/[a-z]+;base64,)?[A-Za-z0-9+/]+=*$/;
    const clean = base64Data.replace(/\s/g, '');
    return base64Pattern.test(clean) && clean.length > 100; // At least 100 chars for valid image
  } catch {
    return false;
  }
}

/**
 * Helper: Get MIME type from base64 data URI
 */
export function getMimeTypeFromBase64(base64Data: string): string {
  const match = base64Data.match(/^data:(image\/[a-z]+);base64,/);
  return match ? match[1] : 'image/png';
}

/**
 * Export constants
 */
export const IMAGE_TYPES = {
  EXTRACTED: 'extracted',
  SKETCH: 'sketch',
  TOPIC_FLIPBOOK: 'topic_flipbook',
} as const;

export const ENTITY_TYPES = {
  QUESTION: 'question',
  TOPIC: 'topic',
  SCAN: 'scan',
} as const;

export const STORAGE_FOLDERS = {
  EXTRACTED_PDF: 'extracted-pdf',
  QUESTION_SKETCHES: 'question-sketches',
  TOPIC_FLIPBOOKS: 'topic-flipbooks',
} as const;

export default {
  uploadBase64Image,
  uploadBase64ImagesBatch,
  uploadSvgAsPng,
  deleteImage,
  deleteImages,
  getPublicUrl,
  uploadAndCreateImageRecord,
  generateImageFilename,
  isValidBase64Image,
  getMimeTypeFromBase64,
  IMAGE_TYPES,
  ENTITY_TYPES,
  STORAGE_FOLDERS,
};
