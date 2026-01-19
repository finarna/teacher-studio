
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
            localStorage.setItem(
                `${CACHE_PREFIX}${key}`,
                JSON.stringify(entry)
            );
        } catch (e) {
            console.warn('Cache save failed (Storage full?):', e);
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
    }
};
