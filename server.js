import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';

const app = express();
const port = process.env.PORT || 9001;

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
app.use(express.json({ limit: '500mb' })); // Increased for large image payloads
app.use(express.urlencoded({ limit: '500mb', extended: true }));

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

// Clear ALL caches endpoint (NUCLEAR - clears everything including scans)
app.post('/api/cache/clear', async (req, res) => {
    try {
        let clearedCount = 0;

        // Clear Redis
        if (redis.status === 'ready') {
            const patterns = ['scan:*', 'questionbank:*', 'flashcards:*'];
            for (const pattern of patterns) {
                const keys = await redis.keys(pattern);
                if (keys.length > 0) {
                    await redis.del(...keys);
                    clearedCount += keys.length;
                }
            }
        }

        // Clear in-memory scan cache
        const memoryCount = inMemoryCache.size;
        inMemoryCache.clear();

        res.json({
            status: 'success',
            redis_cleared: clearedCount,
            memory_cleared: memoryCount,
            message: '✅ All caches cleared! You need to re-upload your scans.'
        });
    } catch (err) {
        console.error('Failed to clear caches:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Clear only solution data (keeps scans intact)
app.post('/api/cache/clear-solutions', async (req, res) => {
    try {
        let clearedCount = 0;

        // Get all scans and clear only their solution fields
        if (redis.status === 'ready') {
            const scanKeys = await redis.keys('scan:*');
            for (const key of scanKeys) {
                const scanData = await redis.get(key);
                if (scanData) {
                    const scan = JSON.parse(scanData);
                    if (scan.analysisData && scan.analysisData.questions) {
                        // Clear solution data from each question
                        scan.analysisData.questions = scan.analysisData.questions.map(q => ({
                            id: q.id,
                            text: q.text,
                            type: q.type,
                            difficulty: q.difficulty,
                            // Remove solution fields
                            solutionSteps: undefined,
                            masteryMaterial: undefined
                        }));
                        await redis.set(key, JSON.stringify(scan));
                        clearedCount++;
                    }
                }
            }

            // Also clear in-memory cache to force reload
            inMemoryCache.clear();
        }

        res.json({
            status: 'success',
            scans_cleaned: clearedCount,
            message: '✅ Solutions cleared! Your scans are intact. Click "Sync All" to regenerate.'
        });
    } catch (err) {
        console.error('Failed to clear solutions:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

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

// Question Bank caching endpoints
let questionBankCache = new Map();

// GET question bank for a specific key (scanId or subject_grade)
app.get('/api/questionbank/:key', async (req, res) => {
    try {
        const { key } = req.params;

        // Try Redis first
        if (redis.status === 'ready') {
            const cached = await redis.get(`questionbank:${key}`);
            if (cached) {
                const questions = JSON.parse(cached);
                questionBankCache.set(key, questions);
                return res.json({ questions, cached: true });
            }
        }

        // Fallback to memory cache
        if (questionBankCache.has(key)) {
            return res.json({ questions: questionBankCache.get(key), cached: true });
        }

        // No cached questions found
        res.json({ questions: null, cached: false });
    } catch (err) {
        console.error('Failed to fetch question bank:', err);
        res.json({ questions: questionBankCache.get(req.params.key) || null, cached: false });
    }
});

// POST question bank for a specific key
app.post('/api/questionbank', async (req, res) => {
    try {
        const { key, questions } = req.body;
        if (!key || !questions) {
            return res.status(400).json({ error: 'Invalid question bank data' });
        }

        // Always update memory cache
        questionBankCache.set(key, questions);

        // Attempt Redis sync with 30-day TTL
        if (redis.status === 'ready') {
            await redis.set(
                `questionbank:${key}`,
                JSON.stringify(questions),
                'EX',
                60 * 60 * 24 * 30 // 30 days
            );
        }

        res.json({ status: 'success', synced: redis.status === 'ready' });
    } catch (err) {
        console.error('Failed to save question bank:', err);
        res.json({ status: 'success', synced: false });
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
