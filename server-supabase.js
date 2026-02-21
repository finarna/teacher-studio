/**
 * plus2AI Vault - Express Server with Supabase + Redis
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
import Razorpay from 'razorpay';
import crypto from 'crypto';
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
import { handleWebhook } from './lib/webhookHandlers.ts';
import {
  getTopics,
  getTopicResources,
  updateTopicProgress,
  recordActivity,
  generateTest,
  submitTest,
  getTestResults,
  getTestHistory,
  getSubjectProgress,
  getTrajectoryProgress,
  createCustomTest,
  getGenerationProgress
} from './api/learningJourneyEndpoints.js';
import {
  getHistoricalTrends,
  getTopicEvolution
} from './api/trendsEndpoints.js';
import { loadGenerationContext } from './lib/examDataLoader.ts';
import { generateTestQuestions } from './lib/aiQuestionGenerator.ts';

const app = express();
const port = process.env.PORT || 9001;

// =====================================================
// RAZORPAY CONFIGURATION
// =====================================================
let razorpay = null;
const RAZORPAY_ENABLED = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;

if (RAZORPAY_ENABLED) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('✅ RazorPay initialized');
} else {
  console.log('⚠️ RazorPay not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)');
}

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
// Configure CORS to support credentials
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:9000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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

  // Extract year from filename (e.g., "KCET 2022 Biology.pdf" → "2022")
  const extractYearFromFilename = (name) => {
    if (!name) return null;
    // Match 4-digit year (1900-2099)
    const yearMatch = name.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : null;
  };

  const extractedYear = extractYearFromFilename(apiScan.name);

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
    year: extractedYear, // Auto-extract year from filename
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

        // Transform questions to include subject, exam_context, and year
        const dbData = transformApiScanToDb(apiScan);

        // Upload sketch SVGs to storage and get URLs
        const questionsWithMetadata = await Promise.all(
          apiScan.analysisData.questions.map(async (q, index) => {
            let sketchSvgUrl = null;

            // If question has sketch SVG data, upload to storage
            if (q.sketchSvg) {
              try {
                const fileName = `sketches/${apiScan.id}/${q.id || `q${index}`}.svg`;

                // Convert base64 or raw SVG to buffer
                let svgBuffer;
                if (q.sketchSvg.startsWith('data:image/svg+xml;base64,')) {
                  svgBuffer = Buffer.from(q.sketchSvg.replace(/^data:image\/svg\+xml;base64,/, ''), 'base64');
                } else if (q.sketchSvg.startsWith('<svg')) {
                  svgBuffer = Buffer.from(q.sketchSvg, 'utf-8');
                } else {
                  // Assume it's base64 without prefix
                  svgBuffer = Buffer.from(q.sketchSvg, 'base64');
                }

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                  .from('question-sketches')
                  .upload(fileName, svgBuffer, {
                    contentType: 'image/svg+xml',
                    upsert: true
                  });

                if (!uploadError) {
                  // Get public URL
                  const { data: urlData } = supabaseAdmin.storage
                    .from('question-sketches')
                    .getPublicUrl(fileName);

                  sketchSvgUrl = urlData.publicUrl;
                  console.log(`✅ Uploaded sketch for ${q.id || `q${index}`}: ${fileName}`);
                } else {
                  console.error(`❌ Failed to upload sketch for ${q.id || `q${index}`}:`, uploadError);
                }
              } catch (uploadErr) {
                console.error(`❌ Error uploading sketch:`, uploadErr);
              }
            }

            return {
              ...q,
              subject: dbData.subject,
              exam_context: dbData.exam_context,
              year: dbData.year,
              sketchSvgUrl, // Add the storage URL
              sketchSvg: undefined // Remove base64 data to save space
            };
          })
        );

        // Create new questions
        const { error: questionsError } = await createQuestions(apiScan.id, questionsWithMetadata);
        if (questionsError) {
          throw new Error(`Failed to create questions: ${questionsError.message}`);
        }

        const sketchCount = questionsWithMetadata.filter(q => q.sketchSvgUrl).length;
        console.log(`✅ Updated ${questionsWithMetadata.length} questions (${sketchCount} with sketches) for scan ${apiScan.id}`);

        // Auto-map questions to official topics (always, not just for Complete status)
        console.log(`🔗 Auto-mapping questions to topics for scan ${apiScan.id}...`);
        const { autoMapScanQuestions } = await import('./lib/autoMapScanQuestions.ts');
        const result = await autoMapScanQuestions(supabaseAdmin, apiScan.id);
        console.log(`✅ Mapped ${result.mapped || 0}/${questionsWithMetadata.length} questions to topics`);

        // Sync scan data to AI generator tables (for learning from past papers)
        console.log(`🤖 Syncing scan data to AI generator tables...`);
        const { syncScanToAITables } = await import('./lib/syncScanToAITables.ts');
        const syncResult = await syncScanToAITables(supabaseAdmin, apiScan.id);
        if (syncResult.success) {
          console.log(`✅ AI tables updated: ${syncResult.message}`);
        } else {
          console.warn(`⚠️  AI table sync: ${syncResult.message}`);
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
        // Transform questions to include subject, exam_context, and year
        const scanYear = dbData.year;

        // Upload sketch SVGs to storage and get URLs
        const questionsWithMetadata = await Promise.all(
          apiScan.analysisData.questions.map(async (q, index) => {
            let sketchSvgUrl = null;

            // If question has sketch SVG data, upload to storage
            if (q.sketchSvg) {
              try {
                const fileName = `sketches/${apiScan.id}/${q.id || `q${index}`}.svg`;

                // Convert base64 or raw SVG to buffer
                let svgBuffer;
                if (q.sketchSvg.startsWith('data:image/svg+xml;base64,')) {
                  svgBuffer = Buffer.from(q.sketchSvg.replace(/^data:image\/svg\+xml;base64,/, ''), 'base64');
                } else if (q.sketchSvg.startsWith('<svg')) {
                  svgBuffer = Buffer.from(q.sketchSvg, 'utf-8');
                } else {
                  // Assume it's base64 without prefix
                  svgBuffer = Buffer.from(q.sketchSvg, 'base64');
                }

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                  .from('question-sketches')
                  .upload(fileName, svgBuffer, {
                    contentType: 'image/svg+xml',
                    upsert: true
                  });

                if (!uploadError) {
                  // Get public URL
                  const { data: urlData } = supabaseAdmin.storage
                    .from('question-sketches')
                    .getPublicUrl(fileName);

                  sketchSvgUrl = urlData.publicUrl;
                  console.log(`✅ Uploaded sketch for ${q.id || `q${index}`}: ${fileName}`);
                } else {
                  console.error(`❌ Failed to upload sketch for ${q.id || `q${index}`}:`, uploadError);
                }
              } catch (uploadErr) {
                console.error(`❌ Error uploading sketch:`, uploadErr);
              }
            }

            return {
              ...q,
              subject: dbData.subject,
              exam_context: dbData.exam_context,
              year: scanYear,
              sketchSvgUrl, // Add the storage URL
              sketchSvg: undefined // Remove base64 data to save space
            };
          })
        );

        const { error: questionsError } = await createQuestions(apiScan.id, questionsWithMetadata);
        if (questionsError) {
          throw new Error(`Failed to create questions: ${questionsError.message}`);
        }

        const sketchCount = questionsWithMetadata.filter(q => q.sketchSvgUrl).length;
        console.log(`✅ Created ${questionsWithMetadata.length} questions (${sketchCount} with sketches) for scan ${apiScan.id}`);

        // Auto-map questions to official topics (always, not just for Complete status)
        console.log(`🔗 Auto-mapping questions to topics for scan ${apiScan.id}...`);
        const { autoMapScanQuestions } = await import('./lib/autoMapScanQuestions.ts');
        const result = await autoMapScanQuestions(supabaseAdmin, apiScan.id);
        console.log(`✅ Mapped ${result.mapped || 0}/${questionsWithMetadata.length} questions to topics`);

        // Sync scan data to AI generator tables (for learning from past papers)
        console.log(`🤖 Syncing scan data to AI generator tables...`);
        const { syncScanToAITables } = await import('./lib/syncScanToAITables.ts');
        const syncResult = await syncScanToAITables(supabaseAdmin, apiScan.id);
        if (syncResult.success) {
          console.log(`✅ AI tables updated: ${syncResult.message}`);
        } else {
          console.warn(`⚠️  AI table sync: ${syncResult.message}`);
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

      // Auto-map questions to official topics (if scan is complete)
      if (apiScan.status === 'Complete') {
        const { autoMapScanQuestions } = await import('./lib/autoMapScanQuestions.ts');
        await autoMapScanQuestions(supabaseAdmin, scanId);
      }
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

// =====================================================
// PAYMENT & SUBSCRIPTION ENDPOINTS
// =====================================================

/**
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

    res.json(data);
  } catch (err) {
    console.error('Failed to fetch pricing plans:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get user's subscription status
 */
app.get('/api/subscription/status', async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

/**
 * Create payment order
 */
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const userId = req.userId;
    const { plan_id, amount } = req.body;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!razorpay) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    // Get plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('pricing_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Create RazorPay order
    const orderAmount = amount || plan.price_inr;
    const receipt = `rcpt_${Date.now()}_${userId.substring(0, 8)}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: orderAmount,
      currency: 'INR',
      receipt,
      notes: {
        user_id: userId,
        plan_id: plan_id,
        plan_name: plan.name,
      },
    });

    // Create subscription record (inactive until payment)
    const periodEnd = plan.billing_period === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : plan.billing_period === 'monthly'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years for free/custom

    // DON'T cancel existing subscriptions yet - wait for payment success
    // The verify endpoint will handle cancellation after payment

    // Create new subscription in 'pending' status
    const { data: subscription, error: subError} = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: plan_id,
        status: 'pending', // Will be activated after payment verification
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        scans_limit: plan.limits.scans_per_month || -1,
      })
      .select()
      .single();

    if (subError) throw subError;

    // Create payment record
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        razorpay_order_id: razorpayOrder.id,
        amount: orderAmount,
        currency: 'INR',
        status: 'pending',
        receipt,
      });

    if (paymentError) throw paymentError;

    res.json({
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Failed to create order:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Verify payment signature
 */
app.post('/api/payment/verify', async (req, res) => {
  try {
    const userId = req.userId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = req.body;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Update payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: 'captured',
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', razorpay_order_id)
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Activate subscription and cancel old ones
    if (payment.subscription_id) {
      // First, cancel any existing active subscriptions for this user
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .neq('id', payment.subscription_id); // Don't cancel the new one

      // Then activate the new subscription
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.subscription_id);

      // Queue welcome email
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (user?.user?.email) {
        await supabaseAdmin
          .from('email_queue')
          .insert({
            user_id: userId,
            email: user.user.email,
            template_type: 'payment_success',
            template_data: { subscription_id: payment.subscription_id, amount: payment.amount / 100 },
            status: 'pending',
          });
      }
    }

    res.json({ success: true, payment_id: razorpay_payment_id });
  } catch (err) {
    console.error('Failed to verify payment:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Cancel subscription
 */
app.post('/api/subscription/cancel', async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update subscription
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    res.json({ success: true, message: 'Subscription will be cancelled at period end' });
  } catch (err) {
    console.error('Failed to cancel subscription:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * RazorPay Webhook Handler
 */
app.post('/api/webhook/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const body = req.body.toString();
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Parse and handle event
    const event = JSON.parse(body);
    console.log(`📨 Received webhook: ${event.event}`);

    const result = await handleWebhook(event);

    res.json(result);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Increment scan usage (called after scan creation)
 */
app.post('/api/subscription/increment-usage', async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Call database function to increment usage
    const { data, error } = await supabaseAdmin
      .rpc('increment_scan_usage', { p_user_id: userId });

    if (error) throw error;

    if (!data) {
      return res.status(403).json({ error: 'Scan limit reached' });
    }

    res.json({ success: true, usage_incremented: true });
  } catch (err) {
    console.error('Failed to increment usage:', err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// LEARNING JOURNEY ENDPOINTS
// =====================================================

/**
 * GET /api/topics/:subject/:examContext
 * Get all topics for a subject in an exam context
 */
app.get('/api/topics/:subject/:examContext', getTopics);

/**
 * GET /api/topics/:topicId/resources
 * Get all resources for a specific topic
 */
app.get('/api/topics/:topicId/resources', getTopicResources);

/**
 * PUT /api/topics/:topicId/progress
 * Update topic progress (mastery level, study stage)
 */
app.put('/api/topics/:topicId/progress', updateTopicProgress);

/**
 * POST /api/topics/:topicId/activity
 * Record a topic activity (viewed notes, practiced question, etc.)
 */
app.post('/api/topics/:topicId/activity', recordActivity);

/**
 * POST /api/tests/generate
 * Generate a new test (quiz or mock)
 */
app.post('/api/tests/generate', generateTest);

/**
 * POST /api/tests/:attemptId/submit
 * Submit test responses
 */
app.post('/api/tests/:attemptId/submit', submitTest);

/**
 * GET /api/tests/:attemptId/results
 * Get test results and analysis
 */
app.get('/api/tests/:attemptId/results', getTestResults);

/**
 * GET /api/tests/history
 * Get user's test history
 */
app.get('/api/tests/history', getTestHistory);

/**
 * GET /api/progress/subject/:subject/:examContext
 * Get progress for a subject
 */
app.get('/api/progress/subject/:subject/:examContext', getSubjectProgress);

/**
 * GET /api/progress/trajectory/:examContext
 * Get overall progress for a trajectory
 */
app.get('/api/progress/trajectory/:examContext', getTrajectoryProgress);

// ============================================================================
// LEARNING JOURNEY API (Server-side aggregation with SERVICE_ROLE_KEY)
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
    const topics = await aggregateTopicsForUser(supabaseAdmin, userId, subject, examContext);

    // DEBUG: Log first question from first topic to verify metadata
    if (topics.length > 0 && topics[0].questions && topics[0].questions.length > 0) {
      const firstQ = topics[0].questions[0];
      console.log('🌐 [API /topics] First Question Metadata:', {
        topicName: topics[0].topicName,
        questionId: firstQ.id?.substring(0, 8),
        marks: firstQ.marks,
        diff: firstQ.diff,
        bloomsTaxonomy: firstQ.bloomsTaxonomy,
        year: firstQ.year,
        domain: firstQ.domain,
        pedagogy: firstQ.pedagogy
      });
    }

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
        const topics = await aggregateTopicsForUser(supabaseAdmin, userId, subject, trajectory);

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

/**
 * GET /api/learning-journey/weak-topics
 * Analyze user progress and identify weak topics for custom mock test builder
 */
app.get('/api/learning-journey/weak-topics', async (req, res) => {
  try {
    const { userId, subject, examContext } = req.query;

    if (!userId || !subject || !examContext) {
      return res.status(400).json({
        error: 'Missing required parameters: userId, subject, examContext'
      });
    }

    console.log(`🤖 Analyzing weak topics for ${subject} (${examContext}) - User: ${userId}`);

    // Get all topics for this subject
    const { data: topics, error: topicsError } = await supabaseAdmin
      .from('topics')
      .select('id, name, subject')
      .eq('subject', subject);

    if (topicsError) throw topicsError;

    // Get user's topic progress from topic_resources
    const { data: topicResources, error: resourcesError } = await supabaseAdmin
      .from('topic_resources')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('exam_context', examContext);

    if (resourcesError) throw resourcesError;

    // Analyze weak topics
    const weakTopics = [];

    for (const topic of topics || []) {
      const topicResource = topicResources?.find(tr => tr.topic_id === topic.id);

      // Get practice accuracy for this topic
      const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('id')
        .eq('subject', subject)
        .eq('exam_context', examContext)
        .contains('topics', [topic.topic_name]);

      const questionIds = questions?.map(q => q.id) || [];

      let practiceAccuracy = 0;
      let totalPractice = 0;

      if (questionIds.length > 0) {
        const { data: practiceAnswers } = await supabaseAdmin
          .from('practice_answers')
          .select('is_correct')
          .in('question_id', questionIds)
          .eq('user_id', userId);

        totalPractice = practiceAnswers?.length || 0;
        const correctPractice = practiceAnswers?.filter(pa => pa.is_correct).length || 0;
        practiceAccuracy = totalPractice > 0 ? Math.round((correctPractice / totalPractice) * 100) : 0;
      }

      const masteryLevel = topicResource?.mastery_level || 0;

      // Calculate weakness score
      let weaknessScore = 0;
      let reason = '';

      if (masteryLevel < 40) {
        weaknessScore += 5;
        reason = `Low mastery level (${masteryLevel}%)`;
      }
      if (practiceAccuracy < 60 && totalPractice >= 3) {
        weaknessScore += 5;
        reason = `Low accuracy in practice (${practiceAccuracy}%)`;
      }
      if (totalPractice === 0) {
        weaknessScore += 3;
        reason = 'No practice attempts yet';
      }
      if (masteryLevel < 40 && practiceAccuracy < 60) {
        reason = `Low mastery (${masteryLevel}%) and accuracy (${practiceAccuracy}%)`;
      }

      if (weaknessScore > 0) {
        weakTopics.push({
          topicId: topic.id,
          topicName: topic.name,
          masteryLevel,
          practiceAccuracy,
          weaknessScore,
          reason
        });
      }
    }

    weakTopics.sort((a, b) => b.weaknessScore - a.weaknessScore);
    const topWeakTopics = weakTopics.slice(0, 10);

    res.json({
      success: true,
      data: {
        weakTopics: topWeakTopics,
        recommendedFocus: topWeakTopics.slice(0, 5).map(wt => wt.topicName)
      }
    });

  } catch (error) {
    console.error('Error in /api/learning-journey/weak-topics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/learning-journey/create-custom-test
 * Generate a custom mock test with specified configuration
 * (Uses AI generation when GEMINI_API_KEY is set and test name contains 'mock')
 */
app.post('/api/learning-journey/create-custom-test', createCustomTest);

/**
 * GET /api/learning-journey/generation-progress/:progressId
 * Poll progress of AI test generation
 */
app.get('/api/learning-journey/generation-progress/:progressId', getGenerationProgress);

// =====================================================
// PREDICTIVE TRENDS ENDPOINTS
// =====================================================

/**
 * GET /api/trends/historical/:examContext/:subject
 * Get historical patterns and predictions for Exam Analysis UI
 */
app.get('/api/trends/historical/:examContext/:subject', getHistoricalTrends);

/**
 * GET /api/trends/topic-evolution/:examContext/:subject/:topicId
 * Get detailed evolution of a specific topic
 */
app.get('/api/trends/topic-evolution/:examContext/:subject/:topicId', getTopicEvolution);

/**
 * GET /api/learning-journey/test-templates
 * Get user's saved test templates
 */
app.get('/api/learning-journey/test-templates', async (req, res) => {
  try {
    const { userId, subject, examContext } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: templates, error } = await supabaseAdmin
      .from('test_templates')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('exam_context', examContext)
      .order('last_used_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: { templates: templates || [] }
    });

  } catch (error) {
    console.error('Error in /api/learning-journey/test-templates:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/learning-journey/count-available-questions
 * Count available questions matching specified criteria
 */
app.post('/api/learning-journey/count-available-questions', async (req, res) => {
  try {
    const {
      subject,
      examContext,
      topicIds,
      difficultyMix
    } = req.body;

    if (!subject || !examContext || !topicIds || topicIds.length === 0) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log(`🔢 Counting available questions for ${subject} (${examContext})`);

    // Get topic names for these IDs
    const { data: topics } = await supabaseAdmin
      .from('topics')
      .select('name')
      .in('id', topicIds);

    const topicNames = topics?.map(t => t.name) || [];

    // Get system scans for this subject
    const { data: scans } = await supabaseAdmin
      .from('scans')
      .select('id')
      .eq('is_system_scan', true)
      .eq('subject', subject)
      .eq('exam_context', examContext);

    const scanIds = scans?.map(s => s.id) || [];

    if (scanIds.length === 0) {
      return res.json({
        success: true,
        data: {
          total: 0,
          byDifficulty: { easy: 0, moderate: 0, hard: 0 }
        }
      });
    }

    // Count questions by difficulty
    const counts = { easy: 0, moderate: 0, hard: 0 };

    // Count Easy questions
    const { count: easyCount } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .in('scan_id', scanIds)
      .eq('difficulty', 'Easy')
      .in('topic', topicNames);

    counts.easy = easyCount || 0;

    // Count Moderate questions
    const { count: moderateCount } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .in('scan_id', scanIds)
      .eq('difficulty', 'Moderate')
      .in('topic', topicNames);

    counts.moderate = moderateCount || 0;

    // Count Hard questions
    const { count: hardCount } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .in('scan_id', scanIds)
      .eq('difficulty', 'Hard')
      .in('topic', topicNames);

    counts.hard = hardCount || 0;

    const total = counts.easy + counts.moderate + counts.hard;

    res.json({
      success: true,
      data: {
        total,
        byDifficulty: counts
      }
    });

  } catch (error) {
    console.error('Error in /api/learning-journey/count-available-questions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/learning-journey/mock-history
 * Get user's past custom mock test attempts
 */
app.get('/api/learning-journey/mock-history', async (req, res) => {
  try {
    const { userId, subject, examContext, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log(`📚 Fetching mock test history for user ${userId}, subject: ${subject}, exam: ${examContext}`);

    let query = supabaseAdmin
      .from('test_attempts')
      .select('id, test_name, subject, exam_context, percentage, raw_score, marks_obtained, marks_total, total_questions, questions_attempted, status, created_at, completed_at, duration_minutes, total_duration, topic_analysis, time_analysis')
      .eq('user_id', userId)
      .eq('test_type', 'custom_mock')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (subject) query = query.eq('subject', subject);
    if (examContext) query = query.eq('exam_context', examContext);

    const { data: attempts, error } = await query;
    if (error) throw error;

    console.log(`✅ Found ${attempts?.length || 0} mock test attempts`);

    const mappedAttempts = (attempts || []).map(a => ({
      id: a.id,
      testName: a.test_name,
      subject: a.subject,
      examContext: a.exam_context,
      percentage: a.percentage,
      rawScore: a.raw_score,
      marksObtained: a.marks_obtained,
      marksTotal: a.marks_total,
      totalQuestions: a.total_questions,
      questionsAttempted: a.questions_attempted || 0,
      status: a.status,
      createdAt: a.created_at,
      completedAt: a.completed_at,
      durationMinutes: a.duration_minutes,
      totalDuration: a.total_duration,
      topicAnalysis: a.topic_analysis,
      timeAnalysis: a.time_analysis,
    }));

    res.json({ success: true, data: { attempts: mappedAttempts } });
  } catch (error) {
    console.error('Error in /api/learning-journey/mock-history:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * POST /api/learning-journey/ai-summary
 * Generate Gemini-powered strength/weakness analysis for a completed test
 */
app.post('/api/learning-journey/ai-summary', async (req, res) => {
  try {
    const {
      attemptId,        // For persistence
      subject,
      examContext,
      testName,
      percentage,
      correctAnswers,
      incorrectAnswers,
      skippedAnswers,
      totalQuestions,
      topicStats,       // { topicName: { correct, total, accuracy } }
      difficultyStats,  // { Easy: { correct, total }, Moderate: { ... }, Hard: { ... } }
      avgTimePerQuestion,
      totalTimeSeconds
    } = req.body;

    if (!subject || !examContext || percentage === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const topicLines = Object.entries(topicStats || {})
      .map(([t, s]) => `  - ${t}: ${s.correct}/${s.total} correct (${s.accuracy}%)`)
      .join('\n');

    const diffLines = Object.entries(difficultyStats || {})
      .map(([d, s]) => `  - ${d}: ${s.correct}/${s.total} correct (${s.total > 0 ? Math.round(s.correct/s.total*100) : 0}%)`)
      .join('\n');

    const prompt = `You are an expert ${examContext} exam coach. Analyze this mock test result and give a sharp, personalized report.

TEST: "${testName}" | ${subject} | ${examContext}
SCORE: ${percentage}% (${correctAnswers} correct, ${incorrectAnswers} incorrect, ${skippedAnswers} skipped out of ${totalQuestions})
AVG TIME/QUESTION: ${avgTimePerQuestion}s
TOTAL TIME: ${Math.round((totalTimeSeconds || 0) / 60)} min

TOPIC BREAKDOWN:
${topicLines || '  (not available)'}

DIFFICULTY BREAKDOWN:
${diffLines || '  (not available)'}

Return ONLY valid JSON (no markdown, no explanation, no LaTeX, no backslashes) in exactly this structure:
{
  "verdict": "One sharp sentence: what this score means for their ${examContext} preparation and the single most important thing to fix",
  "strengths": [
    {"title": "Short title (3-5 words)", "detail": "One specific sentence with numbers from their data"},
    {"title": "Short title (3-5 words)", "detail": "One specific sentence with numbers from their data"},
    {"title": "Short title (3-5 words)", "detail": "One specific sentence with numbers from their data"}
  ],
  "weaknesses": [
    {"title": "Short title (3-5 words)", "detail": "One specific sentence with numbers and why it matters for ${examContext}"},
    {"title": "Short title (3-5 words)", "detail": "One specific sentence with numbers and why it matters for ${examContext}"},
    {"title": "Short title (3-5 words)", "detail": "One specific sentence with numbers and why it matters for ${examContext}"}
  ],
  "studyPlan": "3-4 sentence concrete action plan for the next 7 days — specific topics, hours, and techniques. Reference actual weak topics from their data."
}

Be direct, specific, and use actual numbers from the data. No generic advice.`;

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    let rawText = response.text || '';
    // Strip markdown code fences if present
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    // Extract first JSON object (handles trailing garbage)
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      rawText = rawText.slice(firstBrace, lastBrace + 1);
    }
    // Fix common Gemini JSON issues: unescaped backslashes outside of known escape sequences
    rawText = rawText.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

    let summary;
    try {
      summary = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('AI JSON parse failed, raw:', rawText.slice(0, 300));
      throw parseErr;
    }

    // Persist AI summary to database if attemptId provided
    if (attemptId) {
      try {
        const { error: updateError } = await supabaseAdmin
          .from('test_attempts')
          .update({ ai_report: summary })
          .eq('id', attemptId);

        if (updateError) {
          console.error('Failed to persist AI summary:', updateError);
          // Don't fail the request, just log the error
        } else {
          console.log(`✅ AI summary persisted for attempt ${attemptId}`);
        }
      } catch (persistErr) {
        console.error('Error persisting AI summary:', persistErr);
        // Don't fail the request
      }
    }

    res.json({ success: true, data: summary });

  } catch (error) {
    console.error('Error in /api/learning-journey/ai-summary:', error);
    // Return a graceful fallback so the page still works
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'AI summary failed'
    });
  }
});

// ============================================================================

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
      // Payment endpoints
      'GET /api/pricing/plans',
      'GET /api/subscription/status',
      'POST /api/payment/create-order',
      'POST /api/payment/verify',
      'POST /api/subscription/cancel',
      'POST /api/subscription/increment-usage',
      'POST /api/webhook/razorpay',
      // Learning Journey endpoints
      'GET /api/topics/:subject/:examContext',
      'GET /api/topics/:topicId/resources',
      'PUT /api/topics/:topicId/progress',
      'POST /api/topics/:topicId/activity',
      'POST /api/tests/generate',
      'POST /api/tests/:attemptId/submit',
      'GET /api/tests/:attemptId/results',
      'GET /api/tests/history',
      'GET /api/progress/subject/:subject/:examContext',
      'GET /api/progress/trajectory/:examContext',
    ],
  });
});

// =====================================================
// START SERVER
// =====================================================
app.listen(port, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 plus2AI Vault Server (Supabase Edition)');
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
