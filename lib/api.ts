/**
 * API Configuration
 * Centralized API URL management for frontend API calls
 */

// Use environment variable or empty string (relative URLs work via vite proxy)
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Helper function to make authenticated API calls
 */
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return response;
}

/**
 * Helper to get API URL for a specific endpoint
 */
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}
