/**
 * Supabase Client - Frontend (Browser)
 *
 * This client is used in React components and runs in the browser.
 * Uses the ANON key which enforces Row Level Security (RLS) policies.
 *
 * Features:
 * - Authentication (signup, login, logout)
 * - Database queries (with RLS enforcement)
 * - Storage access (public URLs)
 * - Real-time subscriptions
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables (set in .env.local)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check .env.local file.');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');

  // Provide helpful error for development
  throw new Error(
    'Supabase configuration missing. Follow SUPABASE_SETUP_GUIDE.md to set up your project.'
  );
}

/**
 * Supabase client instance
 * Automatically handles:
 * - JWT token management
 * - Session persistence (localStorage)
 * - Auth state changes
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Auto-refresh tokens when they expire
    autoRefreshToken: true,

    // Persist session in localStorage
    persistSession: true,

    // Detect session from URL (e.g., after email confirmation)
    detectSessionInUrl: true,

    // Storage key (change if you need multiple apps on same domain)
    storageKey: 'edujourney-auth',
  },

  // Global settings
  global: {
    headers: {
      'x-client-info': 'edujourney-vault-frontend',
    },
  },
});

/**
 * Auth Helper Functions
 */

/**
 * Sign up a new user
 * @param email User's email
 * @param password User's password
 * @param fullName User's full name (optional)
 * @returns { user, session, error }
 */
export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName, // Stored in auth.users metadata
      },
    },
  });

  if (error) {
    console.error('Sign up error:', error);
    return { user: null, session: null, error };
  }

  // User profile will be automatically created by database trigger
  // See: migrations/003_auto_create_user_profile.sql

  return { user: data.user, session: data.session, error: null };
}

/**
 * Sign in with email and password
 * @param email User's email
 * @param password User's password
 * @returns { user, session, error }
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Sign in error:', error);
    return { user: null, session: null, error };
  }

  return { user: data.user, session: data.session, error: null };
}

/**
 * Sign out the current user
 * @returns { error }
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign out error:', error);
  }

  return { error };
}

/**
 * Get the current user's session
 * @returns { session, error }
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Get session error:', error);
    return { session: null, error };
  }

  return { session: data.session, error: null };
}

/**
 * Get the current user
 * @returns { user, error }
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Get user error:', error);
    return { user: null, error };
  }

  return { user: data.user, error: null };
}

/**
 * Listen to auth state changes
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);

  // Return unsubscribe function
  return () => subscription.unsubscribe();
}

/**
 * Storage Helper Functions
 */

/**
 * Get public URL for a file in storage
 * @param bucket Bucket name
 * @param path File path
 * @returns Public URL
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a file to storage
 * @param bucket Bucket name
 * @param path File path
 * @param file File data (File, Blob, or ArrayBuffer)
 * @param options Upload options
 * @returns { path, publicUrl, error }
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob | ArrayBuffer,
  options?: { contentType?: string; cacheControl?: string }
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: options?.contentType,
      cacheControl: options?.cacheControl || '3600', // 1 hour cache
      upsert: false, // Don't overwrite existing files
    });

  if (error) {
    console.error('Upload error:', error);
    return { path: null, publicUrl: null, error };
  }

  const publicUrl = getPublicUrl(bucket, data.path);

  return { path: data.path, publicUrl, error: null };
}

/**
 * Delete a file from storage
 * @param bucket Bucket name
 * @param path File path
 * @returns { error }
 */
export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error('Delete error:', error);
  }

  return { error };
}

/**
 * Database Helper Types
 */

export type DbScan = {
  id: string;
  user_id: string;
  name: string;
  grade: string;
  subject: string;
  status: 'Processing' | 'Complete' | 'Failed';
  summary?: string;
  overall_difficulty?: 'Easy' | 'Moderate' | 'Hard';
  analysis_data?: any;
  difficulty_distribution?: any;
  blooms_taxonomy?: any;
  topic_weightage?: any;
  trends?: any;
  predictive_topics?: any;
  faq?: any;
  strategy?: any;
  scan_date: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
};

export type DbQuestion = {
  id: string;
  scan_id: string;
  text: string;
  marks: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  topic: string;
  blooms?: string;
  options?: string[];
  correct_option_index?: number;
  solution_steps?: string[];
  exam_tip?: string;
  visual_concept?: string;
  key_formulas?: string[];
  pitfalls?: string[];
  mastery_material?: any;
  has_visual_element: boolean;
  visual_element_type?: string;
  visual_element_description?: string;
  visual_element_position?: 'above' | 'below' | 'inline' | 'side';
  visual_bounding_box?: any;
  diagram_url?: string;
  sketch_svg_url?: string;
  source?: string;
  question_order?: number;
  metadata?: any;
  created_at: string;
};

export type DbImage = {
  id: string;
  entity_type: 'question' | 'topic' | 'scan';
  entity_id: string;
  storage_path: string;
  public_url: string;
  filename: string;
  mime_type: string;
  file_size?: number;
  width?: number;
  height?: number;
  image_type: 'extracted' | 'sketch' | 'topic_flipbook';
  image_order: number;
  alt_text?: string;
  metadata?: any;
  created_at: string;
};

/**
 * Utility: Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * Utility: Get user ID from current session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// Export default client
export default supabase;
