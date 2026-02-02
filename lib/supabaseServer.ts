/**
 * Supabase Client - Server-Side (Node.js)
 *
 * This client is used in the Express server and migration scripts.
 * Uses the SERVICE_ROLE key which BYPASSES Row Level Security (RLS).
 *
 * ⚠️ WARNING: Never expose this client or service_role key to the frontend!
 *
 * Features:
 * - Full database access (bypasses RLS)
 * - Storage management (upload, delete, get URLs)
 * - User management
 * - Admin operations
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase server configuration!');
  console.error('Required environment variables:');
  console.error('  - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (server-side only)');
  console.error('\nPlease check your .env or .env.local file.');
  console.error('Follow SUPABASE_SETUP_GUIDE.md for setup instructions.');

  // Don't throw in production - allow graceful degradation
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('Supabase server configuration missing');
  }
}

/**
 * Server-side Supabase client (bypasses RLS)
 */
export const supabaseAdmin = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-client-info': 'edujourney-vault-server',
      },
    },
  }
);

/**
 * Database Helper Functions
 */

/**
 * Get all scans for a user
 */
export async function getUserScans(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scans:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Get a single scan by ID
 */
export async function getScan(scanId: string, userId?: string) {
  let query = supabaseAdmin
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  // Optionally filter by user_id for additional security
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching scan:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Create a new scan
 */
export async function createScan(userId: string, scanData: any) {
  const { data, error } = await supabaseAdmin
    .from('scans')
    .insert({
      id: scanData.id, // Use provided ID instead of auto-generating
      user_id: userId,
      name: scanData.name,
      grade: scanData.grade,
      subject: scanData.subject,
      status: scanData.status || 'Processing',
      summary: scanData.summary,
      overall_difficulty: scanData.overall_difficulty,
      analysis_data: scanData.analysis_data,
      difficulty_distribution: scanData.difficulty_distribution,
      blooms_taxonomy: scanData.blooms_taxonomy,
      topic_weightage: scanData.topic_weightage,
      trends: scanData.trends,
      predictive_topics: scanData.predictive_topics,
      faq: scanData.faq,
      strategy: scanData.strategy,
      scan_date: scanData.scan_date || new Date().toISOString(),
      metadata: scanData.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating scan:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Update an existing scan
 */
export async function updateScan(scanId: string, userId: string, updates: any) {
  const { data, error } = await supabaseAdmin
    .from('scans')
    .update(updates)
    .eq('id', scanId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating scan:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Delete a scan (cascades to questions, images, etc.)
 */
export async function deleteScan(scanId: string, userId: string) {
  const { error } = await supabaseAdmin
    .from('scans')
    .delete()
    .eq('id', scanId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting scan:', error);
    return { error };
  }

  return { error: null };
}

/**
 * Get questions for a scan
 */
export async function getScanQuestions(scanId: string) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('scan_id', scanId)
    .order('question_order', { ascending: true });

  if (error) {
    console.error('Error fetching questions:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Create questions for a scan
 */
export async function createQuestions(scanId: string, questions: any[]) {
  // Normalize difficulty values to match DB constraint
  const normalizeDifficulty = (diff: string | undefined): string => {
    if (!diff) return 'Moderate'; // Default
    const normalized = diff.trim();
    // Map variations to allowed values: 'Easy', 'Moderate', 'Hard'
    const lower = normalized.toLowerCase();
    if (lower === 'easy') return 'Easy';
    if (lower === 'medium' || lower === 'moderate') return 'Moderate';
    if (lower === 'hard' || lower === 'difficult') return 'Hard';
    // If already capitalized correctly
    if (['Easy', 'Moderate', 'Hard'].includes(normalized)) return normalized;
    return 'Moderate'; // Safe default
  };

  const questionsData = questions.map((q, index) => ({
    scan_id: scanId,
    text: q.text,
    marks: q.marks || 0,
    difficulty: normalizeDifficulty(q.difficulty),
    topic: q.topic,
    blooms: q.blooms,
    options: q.options,
    correct_option_index: q.correctOptionIndex,
    solution_steps: q.solutionSteps || [],
    exam_tip: q.examTip,
    visual_concept: q.visualConcept,
    key_formulas: q.keyFormulas || [],
    pitfalls: q.pitfalls || [],
    mastery_material: q.masteryMaterial,
    has_visual_element: q.hasVisualElement || false,
    visual_element_type: q.visualElementType,
    visual_element_description: q.visualElementDescription,
    visual_element_position: q.visualElementPosition,
    visual_bounding_box: q.visualBoundingBox,
    diagram_url: q.diagramUrl,
    sketch_svg_url: q.sketchSvgUrl,
    source: q.source,
    question_order: index,
    metadata: q.metadata || {},
  }));

  const { data, error } = await supabaseAdmin
    .from('questions')
    .insert(questionsData)
    .select();

  if (error) {
    console.error('Error creating questions:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Get images for an entity (question, scan, topic)
 */
export async function getEntityImages(entityType: string, entityId: string) {
  const { data, error } = await supabaseAdmin
    .from('images')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('image_order', { ascending: true });

  if (error) {
    console.error('Error fetching images:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Create image record
 */
export async function createImage(imageData: {
  entity_type: string;
  entity_id: string;
  storage_path: string;
  public_url: string;
  filename: string;
  mime_type?: string;
  file_size?: number;
  width?: number;
  height?: number;
  image_type: string;
  image_order?: number;
  alt_text?: string;
  metadata?: any;
}) {
  const { data, error } = await supabaseAdmin
    .from('images')
    .insert(imageData)
    .select()
    .single();

  if (error) {
    console.error('Error creating image record:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Cache Helper Functions
 */

/**
 * Get cached question bank
 */
export async function getQuestionBank(cacheKey: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('question_banks')
    .select('*')
    .eq('cache_key', cacheKey)
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found
    console.error('Error fetching question bank:', error);
    return { data: null, error };
  }

  // Update access count
  if (data) {
    await supabaseAdmin
      .from('question_banks')
      .update({
        last_accessed: new Date().toISOString(),
        access_count: data.access_count + 1,
      })
      .eq('id', data.id);
  }

  return { data, error: null };
}

/**
 * Save question bank to cache
 */
export async function saveQuestionBank(
  userId: string,
  cacheKey: string,
  scanId: string,
  data: any
) {
  const { data: result, error } = await supabaseAdmin
    .from('question_banks')
    .upsert({
      user_id: userId,
      cache_key: cacheKey,
      scan_id: scanId,
      data,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving question bank:', error);
    return { data: null, error };
  }

  return { data: result, error: null };
}

/**
 * Get cached flashcards
 */
export async function getFlashcards(cacheKey: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('flashcards')
    .select('*')
    .eq('cache_key', cacheKey)
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching flashcards:', error);
    return { data: null, error };
  }

  // Update access count
  if (data) {
    await supabaseAdmin
      .from('flashcards')
      .update({
        last_accessed: new Date().toISOString(),
        access_count: data.access_count + 1,
      })
      .eq('id', data.id);
  }

  return { data, error: null };
}

/**
 * Save flashcards to cache
 */
export async function saveFlashcards(
  userId: string,
  cacheKey: string,
  scanId: string,
  data: any
) {
  const { data: result, error } = await supabaseAdmin
    .from('flashcards')
    .upsert({
      user_id: userId,
      cache_key: cacheKey,
      scan_id: scanId,
      data,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving flashcards:', error);
    return { data: null, error };
  }

  return { data: result, error: null };
}

/**
 * Health check
 */
export async function checkDatabaseConnection() {
  try {
    const { data, error } = await supabaseAdmin.from('users').select('count').limit(1);

    if (error) {
      return { healthy: false, error: error.message };
    }

    return { healthy: true, error: null };
  } catch (err: any) {
    return { healthy: false, error: err.message };
  }
}

export default supabaseAdmin;
