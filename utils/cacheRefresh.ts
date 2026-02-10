/**
 * Cache Refresh Utility
 * Clears outdated scan cache and forces reload from database
 */

export const clearScanCache = () => {
  const keys = Object.keys(localStorage);
  let cleared = 0;

  keys.forEach(key => {
    // Clear scan-related cache
    if (
      key.includes('scan') ||
      key.includes('vault') ||
      key.includes('cache_') ||
      key.startsWith('scan_')
    ) {
      localStorage.removeItem(key);
      cleared++;
    }
  });

  console.log(`✅ Cleared ${cleared} cache entries`);
  return cleared;
};

export const forceReloadScans = async () => {
  console.log('🔄 Forcing scan reload from database...');

  // Clear cache
  clearScanCache();

  // Reload page to fetch fresh data
  window.location.reload();
};

// Auto-run on version mismatch
const CURRENT_VERSION = '1.0.1'; // Increment this after migrations
const VERSION_KEY = 'app_version';

export const checkAndClearOldCache = () => {
  const storedVersion = localStorage.getItem(VERSION_KEY);

  if (storedVersion !== CURRENT_VERSION) {
    console.log(`🔄 Version changed: ${storedVersion} → ${CURRENT_VERSION}`);
    console.log('Clearing old cache...');

    clearScanCache();
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);

    console.log('✅ Cache cleared. Fresh data will be loaded from database.');
  }
};
