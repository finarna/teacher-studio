/**
 * EduJourney Vault - Express Server with Supabase + Redis
 *
 * This server replaces the Redis-only server with a hybrid approach:
 * - Supabase PostgreSQL: Persistent data storage (scans, questions, images)
 * - Redis: Cache layer for hot data (question banks, flashcards, scan summaries)
 * - Supabase Storage: CDN-backed image storage
 * - Supabase Auth: Multi-user authentication
 *
 * API Compatibility: Maintains backward compatibility with original endpoints
 */

import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import {
  supabaseAdmin,
  getUserScans,
  getScan,
  createScan,
  updateScan,
  deleteScan,
  getScanQuestions,
  createQuestions,
  getQuestionBank,
  saveQuestionBank,
  getFlashcards,
  saveFlashcards,
  checkDatabaseConnection,
} from './lib/supabaseServer.ts';

const app = express();
const port = process.env.PORT || 9001;

// =====================================================
// REDIS CONFIGURATION (Optional Cache Layer)
// =====================================================
// Redis is now OPTIONAL - disable by default since Supabase handles all data
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true' || false;

let redis = null;
let redisConnected = false;

if (REDIS_ENABLED) {
  console.log('🔄 Redis caching enabled - attempting connection...');
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn('⚠️ Redis connection failed - disabling cache layer');
        return null; // Stop retrying
      }
      return Math.min(times * 50, 2000);
    },
    maxRetriesPerRequest: 3,
  });

  redis.on('error', (err) => {
    redisConnected = false;
    console.error('❌ Redis Error:', err.message);
  });

  redis.on('connect', () => {
    redisConnected = true;
    console.log('✅ Connected to Redis cache at', process.env.REDIS_HOST || 'localhost');
  });

  redis.on('close', () => {
    redisConnected = false;
    console.warn('⚠️ Redis connection closed');
  });
} else {
  console.log('ℹ️ Redis caching disabled - using Supabase only (set REDIS_ENABLED=true to enable)');
}

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(cors());
app.use(express.json({ limit: '500mb' })); // Large payloads for base64 images
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  res.setHeader('X-Vault-Server', 'supabase-v2');
  next();
});

// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================
/**
 * Extract user ID from JWT token (optional for now)
 * In production, this should verify the JWT signature
 */
async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // For backward compatibility, allow requests without auth during migration
      console.log(`⚠️ No Authorization header for ${req.method} ${req.path}`);
      req.userId = 'anonymous';
      return next();
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.warn(`❌ Invalid token for ${req.method} ${req.path}:`, error?.message);
      req.userId = 'anonymous';
      return next();
    }

    console.log(`✅ Authenticated user ${user.email} for ${req.method} ${req.path}`);
    req.userId = user.id;
    req.user = user;
    next();
  } catch (err) {
    console.error(`❌ Auth middleware error for ${req.method} ${req.path}:`, err);
    req.userId = 'anonymous';
    next();
  }
}

// Apply auth middleware to all /api/* routes
app.use('/api', authenticate);

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Transform DB scan to API format (backward compatibility)
 */
function transformDbScanToApi(dbScan) {
  return {
    id: dbScan.id,
    name: dbScan.name,
    date: new Date(dbScan.scan_date).toLocaleDateString(),
    timestamp: new Date(dbScan.scan_date).getTime(),
    status: dbScan.status,
    grade: dbScan.grade,
    subject: dbScan.subject,
    examContext: dbScan.exam_context || 'KCET', // Default to KCET if not set
    analysisData: dbScan.analysis_data || {
      summary: dbScan.summary,
      overallDifficulty: dbScan.overall_difficulty,
      difficultyDistribution: dbScan.difficulty_distribution,
      bloomsTaxonomy: dbScan.blooms_taxonomy,
      topicWeightage: dbScan.topic_weightage,
      trends: dbScan.trends,
      predictiveTopics: dbScan.predictive_topics,
      faq: dbScan.faq,
      strategy: dbScan.strategy,
      questions: [], // Loaded separately
    },
  };
}

/**
 * Transform API scan to DB format
 */
function transformApiScanToDb(apiScan) {
  // Normalize difficulty values to match DB constraint
  const normalizeDifficulty = (diff) => {
    if (!diff) return 'Moderate'; // Default
    const normalized = diff.trim();
    // Map common variations to allowed values: 'Easy', 'Moderate', 'Hard'
    if (normalized === 'Medium') return 'Moderate';
    if (['Easy', 'Moderate', 'Hard'].includes(normalized)) return normalized;
    return 'Moderate'; // Safe default
  };

  // Default exam context based on subject if not provided
  const defaultExamContext = (subject) => {
    if (subject === 'Biology') return 'NEET';
    return 'KCET';
  };

  return {
    name: apiScan.name,
    grade: apiScan.grade,
    subject: apiScan.subject,
    exam_context: apiScan.examContext || defaultExamContext(apiScan.subject),
    status: apiScan.status || 'Processing',
    summary: apiScan.analysisData?.summary,
    overall_difficulty: normalizeDifficulty(apiScan.analysisData?.overallDifficulty),
    analysis_data: apiScan.analysisData,
    difficulty_distribution: apiScan.analysisData?.difficultyDistribution,
    blooms_taxonomy: apiScan.analysisData?.bloomsTaxonomy,
    topic_weightage: apiScan.analysisData?.topicWeightage,
    trends: apiScan.analysisData?.trends,
    predictive_topics: apiScan.analysisData?.predictiveTopics,
    faq: apiScan.analysisData?.faq,
    strategy: apiScan.analysisData?.strategy,
    scan_date: apiScan.date ? new Date(apiScan.date).toISOString() : new Date().toISOString(),
    metadata: {},
  };
}

/**
 * Get scan from cache or DB
 */
async function getCachedScan(scanId, userId) {
  // Try Redis first
  if (redis && redis.status === 'ready') {
    const cached = await redis.get(`scan:${scanId}`);
    if (cached) {
      console.log(`Cache HIT: scan:${scanId}`);
      return JSON.parse(cached);
    }
  }

  console.log(`Cache MISS: scan:${scanId}, fetching from DB`);

  // Fetch from Supabase
  const { data: dbScan, error } = await getScan(scanId, userId);

  if (error || !dbScan) {
    return null;
  }

  // Transform to API format
  const apiScan = transformDbScanToApi(dbScan);

  // Load questions
  const { data: questions } = await getScanQuestions(scanId);
  if (questions && apiScan.analysisData) {
    apiScan.analysisData.questions = questions.map((q) => ({
      id: q.id,
      text: q.text,
      marks: q.marks,
      difficulty: q.difficulty,
      topic: q.topic,
      blooms: q.blooms,
      options: q.options,
      correctOptionIndex: q.correct_option_index,
      solutionSteps: q.solution_steps,
      examTip: q.exam_tip,
      visualConcept: q.visual_concept,
      keyFormulas: q.key_formulas,
      pitfalls: q.pitfalls,
      masteryMaterial: q.mastery_material,
      hasVisualElement: q.has_visual_element,
      visualElementType: q.visual_element_type,
      visualElementDescription: q.visual_element_description,
      diagramUrl: q.diagram_url,
      sketchSvg: q.sketch_svg_url,
      source: q.source,
    }));
  }

  // Cache in Redis (7 days TTL)
  if (redis && redis.status === 'ready') {
    await redis.set(`scan:${scanId}`, JSON.stringify(apiScan), 'EX', 60 * 60 * 24 * 7);
  }

  return apiScan;
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Health Check
 */
app.get('/api/health', async (req, res) => {
  const { healthy, error } = await checkDatabaseConnection();

  res.json({
    status: 'ok',
    redis: redis ? redis.status : 'disabled',
    supabase: healthy ? 'connected' : `error: ${error}`,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Clear Cache (Redis only)
 * Note: This no longer deletes scans from persistent storage
 */
app.post('/api/cache/clear', async (req, res) => {
  try {
    let clearedCount = 0;

    if (redis && redis.status === 'ready') {
      const patterns = ['scan:*', 'questionbank:*', 'flashcards:*'];
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          clearedCount += keys.length;
        }
      }
    }

    res.json({
      status: 'success',
      redis_cleared: clearedCount,
      message: '✅ Redis cache cleared! Your scans are safe in Supabase.',
    });
  } catch (err) {
    console.error('Failed to clear cache:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get All Scans
 * Supports filtering: ?subject=Physics&examContext=KCET
 */
app.get('/api/scans', async (req, res) => {
  try {
    const userId = req.userId;
    const { subject, examContext } = req.query;

    // Fetch from Supabase with optional filters
    let query = supabaseAdmin
      .from('scans')
      .select('*')
      .eq('user_id', userId);

    // Apply subject filter
    if (subject) {
      query = query.eq('subject', subject);
    }

    // Apply examContext filter
    if (examContext) {
      query = query.eq('exam_context', examContext);
    }

    const { data: dbScans, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Transform to API format
    const apiScans = (dbScans || []).map(transformDbScanToApi);

    // Sort by timestamp (newest first)
    apiScans.sort((a, b) => b.timestamp - a.timestamp);

    res.json(apiScans);
  } catch (err) {
    console.error('Failed to fetch scans:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Single Scan
 */
app.get('/api/scans/:id', async (req, res) => {
  try {
    const scanId = req.params.id;
    const userId = req.userId;

    const scan = await getCachedScan(scanId, userId);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json(scan);
  } catch (err) {
    console.error('Failed to fetch scan:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create or Update Scan
 */
app.post('/api/scans', async (req, res) => {
  try {
    const apiScan = req.body;
    const userId = req.userId;

    // Require authentication for creating/updating scans
    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!apiScan || !apiScan.id) {
      return res.status(400).json({ error: 'Invalid scan data' });
    }

    // Validate examContext if provided
    const validExamContexts = ['KCET', 'NEET', 'JEE', 'CBSE'];
    if (apiScan.examContext && !validExamContexts.includes(apiScan.examContext)) {
      return res.status(400).json({
        error: `Invalid examContext: ${apiScan.examContext}`,
        valid: validExamContexts,
        hint: 'Must be one of: KCET, NEET, JEE, CBSE'
      });
    }

    // Check if scan already exists
    const { data: existingScan } = await getScan(apiScan.id, userId);
    console.log(`🔍 [UPSERT CHECK] Scan ${apiScan.id} exists: ${!!existingScan}`);

    if (existingScan) {
      // Update existing scan
      console.log(`📝 [UPDATE] Updating existing scan ${apiScan.id}`);
      const dbData = transformApiScanToDb(apiScan);
      const { data: updated, error } = await updateScan(apiScan.id, userId, dbData);

      if (error) {
        throw new Error(error.message);
      }

      // Update questions if provided
      if (apiScan.analysisData?.questions && apiScan.analysisData.questions.length > 0) {
        // Delete existing questions first (cascade)
        await supabaseAdmin.from('questions').delete().eq('scan_id', apiScan.id);

        // Create new questions
        const { error: questionsError } = await createQuestions(apiScan.id, apiScan.analysisData.questions);
        if (questionsError) {
          throw new Error(`Failed to create questions: ${questionsError.message}`);
        }
      }
    } else {
      // Create new scan
      console.log(`✨ [CREATE] Creating new scan ${apiScan.id}`);
      const dbData = transformApiScanToDb(apiScan);
      dbData.id = apiScan.id; // Use provided ID
      const { data: created, error } = await createScan(userId, dbData);

      if (error) {
        throw new Error(error.message);
      }

      // Create questions if provided
      if (apiScan.analysisData?.questions && apiScan.analysisData.questions.length > 0) {
        const { error: questionsError } = await createQuestions(apiScan.id, apiScan.analysisData.questions);
        if (questionsError) {
          throw new Error(`Failed to create questions: ${questionsError.message}`);
        }
      }
    }

    // Invalidate cache
    if (redis && redis.status === 'ready') {
      await redis.del(`scan:${apiScan.id}`);
    }

    res.json({ status: 'success', synced: true });
  } catch (err) {
    console.error('Failed to save scan:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update Existing Scan (PUT)
 */
app.put('/api/scans/:id', async (req, res) => {
  try {
    const scanId = req.params.id;
    const apiScan = req.body;
    const userId = req.userId;

    // Require authentication
    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!apiScan || !scanId) {
      return res.status(400).json({ error: 'Invalid scan data' });
    }

    // Check if scan exists and belongs to user
    const { data: existingScan, error: fetchError } = await getScan(scanId, userId);

    if (fetchError || !existingScan) {
      return res.status(404).json({ error: 'Scan not found or unauthorized' });
    }

    // Update scan
    const dbData = transformApiScanToDb(apiScan);
    const { data: updated, error } = await updateScan(scanId, userId, dbData);

    if (error) {
      throw new Error(error.message);
    }

    // Update questions if provided
    if (apiScan.analysisData?.questions && apiScan.analysisData.questions.length > 0) {
      // Delete existing questions first (cascade)
      await supabaseAdmin.from('questions').delete().eq('scan_id', scanId);

      // Create new questions
      await createQuestions(scanId, apiScan.analysisData.questions);
    }

    // Invalidate cache
    if (redis && redis.status === 'ready') {
      await redis.del(`scan:${scanId}`);
    }

    res.json({ status: 'success', updated: true });
  } catch (err) {
    console.error('Failed to update scan:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete Scan
 */
app.delete('/api/scans/:id', async (req, res) => {
  try {
    const scanId = req.params.id;
    const userId = req.userId;

    // Delete from Supabase (cascades to questions, images, etc.)
    const { error } = await deleteScan(scanId, userId);

    if (error) {
      throw new Error(error.message);
    }

    // Invalidate cache
    if (redis && redis.status === 'ready') {
      await redis.del(`scan:${scanId}`);
    }

    res.json({ status: 'success' });
  } catch (err) {
    console.error('Failed to delete scan:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Question Bank (Cached)
 */
app.get('/api/questionbank/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const userId = req.userId;

    // Try Redis first
    if (redis && redis.status === 'ready') {
      const cached = await redis.get(`questionbank:${key}`);
      if (cached) {
        console.log(`Cache HIT: questionbank:${key}`);
        return res.json({ questions: JSON.parse(cached), cached: true });
      }
    }

    console.log(`Cache MISS: questionbank:${key}, checking DB`);

    // Try Supabase
    const { data: dbCache } = await getQuestionBank(key, userId);

    if (dbCache) {
      // Update Redis cache
      if (redis && redis.status === 'ready') {
        await redis.set(`questionbank:${key}`, JSON.stringify(dbCache.data), 'EX', 60 * 60 * 24 * 30);
      }

      return res.json({ questions: dbCache.data, cached: true });
    }

    // No cache found
    res.json({ questions: null, cached: false });
  } catch (err) {
    console.error('Failed to fetch question bank:', err);
    res.json({ questions: null, cached: false, error: err.message });
  }
});

/**
 * Save Question Bank
 */
app.post('/api/questionbank', async (req, res) => {
  try {
    const { key, questions } = req.body;
    const userId = req.userId;

    if (!key || !questions) {
      return res.status(400).json({ error: 'Invalid question bank data' });
    }

    // Extract scanId from key (format: "scanId" or "subject_grade")
    const scanId = key.includes('_') ? null : key;

    // Save to Supabase
    await saveQuestionBank(userId, key, scanId, questions);

    // Save to Redis with TTL
    if (redis && redis.status === 'ready') {
      await redis.set(`questionbank:${key}`, JSON.stringify(questions), 'EX', 60 * 60 * 24 * 30);
    }

    res.json({ status: 'success', synced: true });
  } catch (err) {
    console.error('Failed to save question bank:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Flashcards (Cached)
 */
app.get('/api/flashcards/:scanId', async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.userId;

    // Try Redis first
    if (redis && redis.status === 'ready') {
      const cached = await redis.get(`flashcards:${scanId}`);
      if (cached) {
        console.log(`Cache HIT: flashcards:${scanId}`);
        return res.json({ cards: JSON.parse(cached), cached: true });
      }
    }

    console.log(`Cache MISS: flashcards:${scanId}, checking DB`);

    // Try Supabase
    const { data: dbCache } = await getFlashcards(scanId, userId);

    if (dbCache) {
      // Update Redis cache
      if (redis && redis.status === 'ready') {
        await redis.set(`flashcards:${scanId}`, JSON.stringify(dbCache.data), 'EX', 60 * 60 * 24 * 30);
      }

      return res.json({ cards: dbCache.data, cached: true });
    }

    // No cache found
    res.json({ cards: null, cached: false });
  } catch (err) {
    console.error('Failed to fetch flashcards:', err);
    res.json({ cards: null, cached: false, error: err.message });
  }
});

/**
 * Save Flashcards
 */
app.post('/api/flashcards', async (req, res) => {
  try {
    const { scanId, cards } = req.body;
    const userId = req.userId;

    if (!scanId || !cards) {
      return res.status(400).json({ error: 'Invalid flashcard data' });
    }

    // Save to Supabase
    await saveFlashcards(userId, scanId, scanId, cards);

    // Save to Redis with TTL
    if (redis && redis.status === 'ready') {
      await redis.set(`flashcards:${scanId}`, JSON.stringify(cards), 'EX', 60 * 60 * 24 * 30);
    }

    res.json({ status: 'success', synced: true });
  } catch (err) {
    console.error('Failed to save flashcards:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Subject/Exam Statistics
 * Returns aggregated stats for multi-subject view
 */
app.get('/api/stats/subjects', async (req, res) => {
  try {
    const userId = req.userId;

    // Fetch all scans for user
    const { data: scans, error } = await supabaseAdmin
      .from('scans')
      .select('subject, exam_context, analysis_data')
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    // Aggregate stats by subject and exam
    const stats = {
      Math: { scans: 0, questions: 0, exams: {} },
      Physics: { scans: 0, questions: 0, exams: {} },
      Chemistry: { scans: 0, questions: 0, exams: {} },
      Biology: { scans: 0, questions: 0, exams: {} }
    };

    scans.forEach(scan => {
      if (stats[scan.subject]) {
        stats[scan.subject].scans++;
        stats[scan.subject].questions += scan.analysis_data?.questions?.length || 0;

        const examKey = scan.exam_context || 'KCET';
        stats[scan.subject].exams[examKey] = (stats[scan.subject].exams[examKey] || 0) + 1;
      }
    });

    res.json(stats);
  } catch (err) {
    console.error('Failed to fetch subject stats:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Vault API (Supabase): Route not found',
    path: req.url,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/cache/clear',
      'GET /api/scans',
      'GET /api/scans/:id',
      'POST /api/scans',
      'DELETE /api/scans/:id',
      'GET /api/stats/subjects',
      'GET /api/questionbank/:key',
      'POST /api/questionbank',
      'GET /api/flashcards/:scanId',
      'POST /api/flashcards',
    ],
  });
});

// =====================================================
// START SERVER
// =====================================================
app.listen(port, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 EduJourney Vault Server (Supabase Edition)');
  console.log('='.repeat(60));
  console.log(`✅ Server running at http://0.0.0.0:${port}`);
  console.log(`📊 Redis: ${redis ? redis.status : 'disabled (Supabase-only mode)'}`);
  console.log(`🗄️  Supabase: Checking connection...`);
  console.log('='.repeat(60) + '\n');

  // Check Supabase connection
  checkDatabaseConnection().then(({ healthy, error }) => {
    if (healthy) {
      console.log('✅ Supabase connected successfully\n');
    } else {
      console.error('❌ Supabase connection failed:', error, '\n');
    }
  });
});
