/**
 * Authentication Provider Component
 *
 * Manages authentication state throughout the application using Supabase Auth.
 * Features:
 * - Session persistence (localStorage)
 * - Automatic token refresh
 * - Auth state change listeners
 * - Loading states
 * - Error handling
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, onAuthStateChange, signIn, signUp, signOut, getCurrentUser } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// =====================================================
// TYPES
// =====================================================
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

// =====================================================
// CONTEXT
// =====================================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =====================================================
// PROVIDER COMPONENT
// =====================================================
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // Get current session from localStorage
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (mounted) {
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
          } else {
            setSession(null);
            setUser(null);
          }
        }
      } catch (err: any) {
        console.error('Failed to initialize auth:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((event, session) => {
      // Only log important auth events, not token refreshes
      if (event !== 'TOKEN_REFRESHED') {
        console.log('Auth state changed:', event, session ? 'session exists' : 'no session');
      }

      if (event === 'SIGNED_IN' && session) {
        // Only update if user ID actually changed to prevent unnecessary re-renders
        setUser(prevUser => {
          if (prevUser?.id === session.user.id) {
            return prevUser; // Keep same reference if ID unchanged
          }
          return session.user;
        });
        setSession(session);
        setError(null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Silently update session without triggering dependent effects
        // Don't update user object to prevent re-renders
        setSession(session);
      } else if (event === 'USER_UPDATED' && session) {
        setUser(session.user);
        setSession(session);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sign in handler
  const handleSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { user, session, error } = await signIn(email, password);

      if (error) {
        setError(error.message);
        return { error };
      }

      setUser(user);
      setSession(session);
      return { error: null };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in';
      setError(errorMessage);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign up handler
  const handleSignUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      setError(null);

      const { user, session, error } = await signUp(email, password, fullName);

      if (error) {
        setError(error.message);
        return { error };
      }

      setUser(user);
      setSession(session);
      return { error: null };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign up';
      setError(errorMessage);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
      setUser(null);
      setSession(null);
      setError(null);
    } catch (err: any) {
      console.error('Failed to sign out:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =====================================================
// HOOK
// =====================================================
/**
 * Hook to access auth context
 * @throws Error if used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// =====================================================
// LOADING COMPONENT
// =====================================================
/**
 * Loading screen shown while auth is initializing
 */
export function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
        <p className="text-gray-600">Loading authentication...</p>
      </div>
    </div>
  );
}

// =====================================================
// ERROR COMPONENT
// =====================================================
/**
 * Error display component
 */
interface AuthErrorProps {
  error: string;
  onDismiss?: () => void;
}

export function AuthError({ error, onDismiss }: AuthErrorProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className="inline-flex text-red-400 hover:text-red-600"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthProvider;
