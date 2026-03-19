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

// Helper to get environment variables across Vite and Node.js
const getEnv = (name: string) => {
  // Check Vite import.meta.env
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[name]) return metaEnv[name];
  } catch (e) {
    // import.meta might not be available
  }
  // Check Node.js process.env
  if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env) {
    if ((globalThis as any).process.env[name]) return (globalThis as any).process.env[name];
  }
  return undefined;
};

// Environment variables
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  // If we're on the server, we might be using the service role client instead for some tasks
  if (typeof window === 'undefined') {
    console.warn('⚠️ Client-side Supabase config missing. Server-side parts should use supabaseAdmin where possible.');
  } else {
    console.error('Missing Supabase configuration. Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    throw new Error('Supabase configuration missing.');
  }
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
 * Sign in with Google OAuth
 * @param redirectTo Optional redirect URL after successful auth
 * @returns { data, error }
 */
export async function signInWithGoogle(redirectTo?: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Google OAuth error:', error);
    return { data: null, error };
  }

  return { data, error: null };
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

  // Clear landing page flag so user can see it again after logout
  localStorage.removeItem('edujourney_landing_seen');

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
