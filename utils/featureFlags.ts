/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FEATURE FLAGS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Simple feature flag system for A/B testing and gradual rollouts
 */

export interface FeatureFlags {
  useVidyaV3: boolean; // Use VidyaV3 (clean AI-first) instead of VidyaV2
  useMultiSubjectContext: boolean; // Enable multi-subject/exam context system
}

/**
 * Get feature flags from localStorage or defaults
 */
export function getFeatureFlags(): FeatureFlags {
  const stored = localStorage.getItem('edujourney_feature_flags');

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse feature flags:', e);
    }
  }

  // Default flags
  return {
    useVidyaV3: true, // Default to V3 (clean architecture)
    useMultiSubjectContext: true, // Enable multi-subject by default
  };
}

/**
 * Update a specific feature flag
 */
export function setFeatureFlag(flag: keyof FeatureFlags, value: boolean): void {
  const flags = getFeatureFlags();
  flags[flag] = value;
  localStorage.setItem('edujourney_feature_flags', JSON.stringify(flags));

  // Reload to apply changes
  window.location.reload();
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[flag];
}
