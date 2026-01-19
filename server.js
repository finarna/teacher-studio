import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';

const app = express();
const port = process.env.PORT || 11001;

// Redis Configuration
const redis = new Redis({
    host: '106.51.142.79',
    port: 6379,
    password: 'redis123!',
    retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
    }
});

redis.on('error', (err) => {
    console.error('Redis Connection Error:', err);
});

redis.on('connect', () => {
    console.log('Connected to Redis at 106.51.142.79:6379');
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    res.setHeader('X-Vault-Server', 'active');
    next();
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', redis: redis.status });
});

// Redis and In-Memory Fallback
let inMemoryCache = new Map();

// GET all scans
app.get('/api/scans', async (req, res) => {
    try {
        if (redis.status === 'ready') {
            const keys = await redis.keys('scan:*');
            if (keys.length > 0) {
                const scans = await redis.mget(...keys);
                const parsedScans = scans.map(s => JSON.parse(s));
                // Sync memory cache with Redis
                parsedScans.forEach(s => inMemoryCache.set(s.id, s));
            }
        }

        const allScans = Array.from(inMemoryCache.values()).sort((a, b) => b.timestamp - a.timestamp);
        res.json(allScans);
    } catch (err) {
        console.error('Failed to fetch scans, serving from memory:', err);
        const allScans = Array.from(inMemoryCache.values()).sort((a, b) => b.timestamp - a.timestamp);
        res.json(allScans);
    }
});

// POST single scan
app.post('/api/scans', async (req, res) => {
    try {
        const scan = req.body;
        if (!scan || !scan.id) {
            return res.status(400).json({ error: 'Invalid scan data' });
        }

        // Always update memory cache
        inMemoryCache.set(scan.id, scan);

        // Attempt Redis sync if ready
        if (redis.status === 'ready') {
            await redis.set(`scan:${scan.id}`, JSON.stringify(scan));
        }

        res.json({ status: 'success', synced: redis.status === 'ready' });
    } catch (err) {
        console.error('Failed to save scan to Redis, saved to memory only:', err);
        res.json({ status: 'success', synced: false });
    }
});

// DELETE single scan (optional but good for management)
app.delete('/api/scans/:id', async (req, res) => {
    try {
        await redis.del(`scan:${req.params.id}`);
        inMemoryCache.delete(req.params.id);
        res.json({ status: 'success' });
    } catch (err) {
        console.error('Failed to delete scan:', err);
        res.status(500).json({ error: 'Failed to delete scan' });
    }
});

// Flashcard caching endpoints
let flashcardCache = new Map();

// GET flashcards for a specific scan
app.get('/api/flashcards/:scanId', async (req, res) => {
    try {
        const { scanId } = req.params;

        // Try Redis first
        if (redis.status === 'ready') {
            const cached = await redis.get(`flashcards:${scanId}`);
            if (cached) {
                const cards = JSON.parse(cached);
                flashcardCache.set(scanId, cards);
                return res.json({ cards, cached: true });
            }
        }

        // Fallback to memory cache
        if (flashcardCache.has(scanId)) {
            return res.json({ cards: flashcardCache.get(scanId), cached: true });
        }

        // No cached cards found
        res.json({ cards: null, cached: false });
    } catch (err) {
        console.error('Failed to fetch flashcards:', err);
        res.json({ cards: flashcardCache.get(req.params.scanId) || null, cached: false });
    }
});

// POST flashcards for a specific scan
app.post('/api/flashcards', async (req, res) => {
    try {
        const { scanId, cards } = req.body;
        if (!scanId || !cards) {
            return res.status(400).json({ error: 'Invalid flashcard data' });
        }

        // Always update memory cache
        flashcardCache.set(scanId, cards);

        // Attempt Redis sync with 30-day TTL
        if (redis.status === 'ready') {
            await redis.set(
                `flashcards:${scanId}`,
                JSON.stringify(cards),
                'EX',
                60 * 60 * 24 * 30 // 30 days
            );
        }

        res.json({ status: 'success', synced: redis.status === 'ready' });
    } catch (err) {
        console.error('Failed to save flashcards:', err);
        res.json({ status: 'success', synced: false });
    }
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Vault API: Route not found', path: req.url });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Vault Server running at http://0.0.0.0:${port}`);
});
