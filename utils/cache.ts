
interface CacheEntry {
    key: string;
    data: any;
    timestamp: number;
    scanId: string;
    type: 'sketch' | 'flashcard' | 'question' | 'synthesis';
}

const CACHE_PREFIX = 'edujourney_v1_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export const cache = {
    save(key: string, data: any, scanId: string, type: CacheEntry['type']) {
        const entry: CacheEntry = {
            key,
            data,
            timestamp: Date.now(),
            scanId,
            type
        };

        try {
            const serialized = JSON.stringify(entry);
            const sizeInMB = new Blob([serialized]).size / (1024 * 1024);

            // Skip caching very large items (> 1MB) - they're likely images
            if (sizeInMB > 1) {
                console.warn(`Skipping cache for ${key} (${sizeInMB.toFixed(2)}MB) - too large for localStorage`);
                return;
            }

            localStorage.setItem(
                `${CACHE_PREFIX}${key}`,
                serialized
            );
        } catch (e: any) {
            if (e.name === 'QuotaExceededError') {
                console.warn('⚠️ localStorage quota exceeded. Attempting cleanup...');
                // Try to clean up old entries
                this.cleanup();
                // Try one more time after cleanup
                try {
                    const serialized = JSON.stringify(entry);
                    const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
                    if (sizeInMB <= 1) {
                        localStorage.setItem(`${CACHE_PREFIX}${key}`, serialized);
                        console.log('✓ Cache saved after cleanup');
                    }
                } catch (retryError) {
                    console.warn('Cache save failed even after cleanup. Consider clearing cache manually.');
                }
            } else {
                console.warn('Cache save failed:', e);
            }
        }
    },

    get(key: string): any | null {
        try {
            const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
            if (!item) return null;

            const entry: CacheEntry = JSON.parse(item);
            if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
                this.remove(key);
                return null;
            }

            return entry.data;
        } catch (e) {
            return null;
        }
    },

    remove(key: string) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    },

    clearAll() {
        Object.keys(localStorage)
            .filter(k => k.startsWith(CACHE_PREFIX))
            .forEach(k => localStorage.removeItem(k));
    },

    getByScan(scanId: string): CacheEntry[] {
        return Object.keys(localStorage)
            .filter(k => k.startsWith(CACHE_PREFIX))
            .map(k => {
                try {
                    return JSON.parse(localStorage.getItem(k)!) as CacheEntry;
                } catch {
                    return null as any;
                }
            })
            .filter(e => e && e.scanId === scanId);
    },

    /**
     * Clean up old and large cache entries
     */
    cleanup() {
        const now = Date.now();
        const entries: Array<{key: string, entry: CacheEntry, size: number}> = [];

        // Get all cache entries with their sizes
        Object.keys(localStorage)
            .filter(k => k.startsWith(CACHE_PREFIX))
            .forEach(k => {
                try {
                    const item = localStorage.getItem(k);
                    if (!item) return;

                    const entry = JSON.parse(item) as CacheEntry;
                    const size = new Blob([item]).size;

                    entries.push({ key: k, entry, size });
                } catch {
                    // Remove corrupted entries
                    localStorage.removeItem(k);
                }
            });

        // Remove expired entries
        const expiredCount = entries.filter(e => {
            if (now - e.entry.timestamp > CACHE_EXPIRY) {
                localStorage.removeItem(e.key);
                return true;
            }
            return false;
        }).length;

        if (expiredCount > 0) {
            console.log(`🧹 Cleaned up ${expiredCount} expired cache entries`);
        }

        // If still need more space, remove largest entries (likely images)
        const remaining = entries.filter(e => now - e.entry.timestamp <= CACHE_EXPIRY);
        if (remaining.length > 0) {
            // Sort by size (largest first)
            remaining.sort((a, b) => b.size - a.size);

            // Remove largest 25% of entries
            const toRemove = Math.ceil(remaining.length * 0.25);
            for (let i = 0; i < toRemove; i++) {
                localStorage.removeItem(remaining[i].key);
            }

            console.log(`🧹 Cleaned up ${toRemove} large cache entries`);
        }
    },

    /**
     * Get cache usage statistics
     */
    getStats(): {totalItems: number, totalSizeMB: number, oldestEntry: number} {
        let totalItems = 0;
        let totalSize = 0;
        let oldestEntry = Date.now();

        Object.keys(localStorage)
            .filter(k => k.startsWith(CACHE_PREFIX))
            .forEach(k => {
                try {
                    const item = localStorage.getItem(k);
                    if (!item) return;

                    totalItems++;
                    totalSize += new Blob([item]).size;

                    const entry = JSON.parse(item) as CacheEntry;
                    if (entry.timestamp < oldestEntry) {
                        oldestEntry = entry.timestamp;
                    }
                } catch {
                    // Ignore corrupted entries
                }
            });

        return {
            totalItems,
            totalSizeMB: totalSize / (1024 * 1024),
            oldestEntry
        };
    }
};
