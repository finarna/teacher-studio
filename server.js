import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

// ============================================================================
// LEARNING JOURNEY API
// ============================================================================

/**
 * GET /api/learning-journey/topics
 * Aggregate topics for a user (uses SERVICE_ROLE_KEY on server)
 */
app.get('/api/learning-journey/topics', async (req, res) => {
    try {
        const { userId, subject, examContext } = req.query;

        // Validation
        if (!userId || !subject || !examContext) {
            return res.status(400).json({
                error: 'Missing required parameters: userId, subject, examContext'
            });
        }

        const validSubjects = ['Physics', 'Chemistry', 'Math', 'Biology'];
        const validExamContexts = ['NEET', 'JEE', 'KCET', 'CBSE'];

        if (!validSubjects.includes(subject)) {
            return res.status(400).json({
                error: `Invalid subject. Must be one of: ${validSubjects.join(', ')}`
            });
        }

        if (!validExamContexts.includes(examContext)) {
            return res.status(400).json({
                error: `Invalid examContext. Must be one of: ${validExamContexts.join(', ')}`
            });
        }

        // Dynamic import of TypeScript module
        const { aggregateTopicsForUser } = await import('./lib/topicAggregator.ts');

        // Call aggregator (uses SERVICE_ROLE_KEY on server)
        const topics = await aggregateTopicsForUser(userId, subject, examContext);

        res.json({
            success: true,
            data: topics,
            meta: {
                userId,
                subject,
                examContext,
                topicCount: topics.length,
                topicsWithQuestions: topics.filter(t => t.totalQuestions > 0).length,
                totalQuestions: topics.reduce((sum, t) => sum + t.totalQuestions, 0)
            }
        });

    } catch (error) {
        console.error('Error in /api/learning-journey/topics:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
});

/**
 * GET /api/learning-journey/subjects/:trajectory
 * Get all subjects with progress for a trajectory
 */
app.get('/api/learning-journey/subjects/:trajectory', async (req, res) => {
    try {
        const { trajectory } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId parameter' });
        }

        const validTrajectories = ['NEET', 'JEE', 'KCET', 'CBSE'];
        if (!validTrajectories.includes(trajectory)) {
            return res.status(400).json({
                error: `Invalid trajectory. Must be one of: ${validTrajectories.join(', ')}`
            });
        }

        const { aggregateTopicsForUser } = await import('./lib/topicAggregator.ts');

        const subjects = ['Physics', 'Chemistry', 'Math', 'Biology'];
        const subjectProgress = await Promise.all(
            subjects.map(async (subject) => {
                const topics = await aggregateTopicsForUser(userId, subject, trajectory);

                return {
                    subject,
                    totalTopics: topics.length,
                    topicsWithQuestions: topics.filter(t => t.totalQuestions > 0).length,
                    totalQuestions: topics.reduce((sum, t) => sum + t.totalQuestions, 0),
                    overallMastery: topics.length > 0
                        ? Math.round(topics.reduce((sum, t) => sum + t.masteryLevel, 0) / topics.length)
                        : 0
                };
            })
        );

        res.json({
            success: true,
            data: subjectProgress
        });

    } catch (error) {
        console.error('Error in /api/learning-journey/subjects/:trajectory:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
});

// ============================================================================
// SUBSCRIPTION & PRICING ENDPOINTS
// ============================================================================

/**
 * GET /api/pricing/plans
 * Get all active pricing plans
 */
app.get('/api/pricing/plans', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('pricing_plans')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error('Failed to fetch pricing plans:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/subscription/status
 * Get user's subscription status
 */
app.get('/api/subscription/status', async (req, res) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized - No token provided' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify token with Supabase
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized - Invalid token' });
        }

        const userId = user.id;

        // Get active subscription directly from subscriptions table
        const { data: subscription, error } = await supabaseAdmin
            .from('subscriptions')
            .select(`
                *,
                plan:pricing_plans(*)
            `)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 is "no rows returned", which is expected for users without subscription
            throw error;
        }

        // Return standardized response
        const hasActiveSubscription = !!subscription;
        res.json({
            hasActiveSubscription,
            subscription: subscription || null,
        });
    } catch (err) {
        console.error('Failed to fetch subscription status:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// Flashcards API
// ============================================================================

/**
 * POST /api/flashcards
 * Save generated flashcards to database
 */
app.post('/api/flashcards', async (req, res) => {
    try {
        const { scanId, cards } = req.body;

        if (!scanId || !cards || !Array.isArray(cards)) {
            return res.status(400).json({
                error: 'Missing required fields: scanId and cards array'
            });
        }

        console.log(`💾 Saving ${cards.length} flashcards for scan ${scanId}`);

        // Delete existing flashcards for this scan
        await supabaseAdmin
            .from('flashcards')
            .delete()
            .eq('scan_id', scanId);

        // Insert new flashcards
        const flashcardsToInsert = cards.map(card => ({
            scan_id: scanId,
            front: card.front,
            back: card.back,
            topic: card.topic || null
        }));

        const { data, error } = await supabaseAdmin
            .from('flashcards')
            .insert(flashcardsToInsert)
            .select();

        if (error) {
            console.error('❌ Error saving flashcards:', error);
            return res.status(500).json({ error: error.message });
        }

        console.log(`✅ Saved ${data.length} flashcards to database`);

        res.json({
            success: true,
            count: data.length,
            message: `Saved ${data.length} flashcards`
        });
    } catch (error) {
        console.error('❌ Error in POST /api/flashcards:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/flashcards/:scanId
 * Get flashcards for a scan from database
 */
app.get('/api/flashcards/:scanId', async (req, res) => {
    try {
        const { scanId } = req.params;

        console.log(`📖 Fetching flashcards for scan ${scanId}`);

        const { data, error } = await supabaseAdmin
            .from('flashcards')
            .select('*')
            .eq('scan_id', scanId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('❌ Error fetching flashcards:', error);
            return res.status(500).json({ error: error.message });
        }

        // Transform to match the expected format
        const cards = data.map(fc => ({
            front: fc.front,
            back: fc.back,
            topic: fc.topic
        }));

        console.log(`✅ Found ${cards.length} flashcards`);

        res.json({ cards });
    } catch (error) {
        console.error('❌ Error in GET /api/flashcards:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Vault API: Route not found', path: req.url });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Vault Server running at http://0.0.0.0:${port}`);
});
