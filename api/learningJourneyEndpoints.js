/**
 * Learning Journey API Endpoints
 *
 * Add these endpoints to server-supabase.js after existing scan endpoints
 */

import { supabaseAdmin } from '../lib/supabaseServer.ts';
import {
  aggregateTopicsForUser,
  calculateTopicMastery,
  recordTopicActivity
} from '../lib/topicAggregator.ts';
import {
  selectQuestionsForTest,
  getPreviouslyAttemptedQuestions,
  getRecommendedQuestionCount,
  getRecommendedDuration
} from '../lib/questionSelector.ts';
import { loadGenerationContext } from '../lib/examDataLoader.ts';
import { generateTestQuestions } from '../lib/aiQuestionGenerator.ts';
import { AI_CONFIG } from '../config/aiConfigs';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

// =====================================================
// PROGRESS TRACKING FOR AI GENERATION
// =====================================================

// In-memory progress store (cleared after 5 minutes)
const generationProgress = new Map();

/**
 * Get or create a special system scan for AI-generated questions
 * This ensures all AI questions have a valid scan_id
 */
async function getOrCreateAIScan(supabase, subject, examContext, userId) {
  const scanName = `AI-Generated (${examContext} ${subject})`;

  // Try to find existing AI scan for this user
  const { data: existing } = await supabase
    .from('scans')
    .select('id')
    .eq('name', scanName)
    .eq('subject', subject)
    .eq('exam_context', examContext)
    .eq('is_system_scan', false)
    .eq('user_id', userId)
    .single();

  if (existing) {
    console.log(`✅ Using existing AI scan: ${scanName} (${existing.id})`);
    return existing.id;
  }

  // Create new AI scan — must NOT be a system scan, or it appears in the PYQ hub
  const { data: newScan, error } = await supabase
    .from('scans')
    .insert({
      name: scanName,
      user_id: userId,
      subject,
      exam_context: examContext,
      is_system_scan: false,
      status: 'Complete',
      summary: 'AI-generated questions',
      grade: 'Class 12',
      created_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) {
    console.error('⚠️  Failed to create AI scan:', error);
    throw new Error(`Failed to create AI scan: ${error.message}`);
  }

  console.log(`✅ Created AI scan: ${scanName} (${newScan.id})`);
  return newScan.id;
}

function updateProgress(progressId, step, message, percentage, result = null) {
  const entry = { step, message, percentage, timestamp: Date.now() };
  if (result) entry.result = result;
  generationProgress.set(progressId, entry);

  // Auto-cleanup after 5 minutes (unref ensures it doesn't block process exit)
  setTimeout(() => {
    generationProgress.delete(progressId);
  }, 5 * 60 * 1000).unref();
}

export async function getGenerationProgress(req, res) {
  const { progressId } = req.params;
  const progress = generationProgress.get(progressId) || {
    step: 'unknown',
    message: 'Progress not found',
    percentage: 0
  };
  res.json(progress);
}

// =====================================================
// TOPIC ENDPOINTS
// =====================================================

/**
 * GET /api/topics/:subject/:examContext
 * Get all topics for a subject in an exam context
 */
export async function getTopics(req, res) {
  try {
    const { subject, examContext } = req.params;
    const userId = req.userId;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`📚 Fetching topics for ${subject} (${examContext}) - User: ${userId}`);

    // Aggregate topics from user's scans
    const topics = await aggregateTopicsForUser(supabaseAdmin, userId, subject, examContext);

    res.json({
      success: true,
      topics,
      count: topics.length
    });
  } catch (error) {
    console.error('❌ Error fetching topics:', error);
    res.status(500).json({
      error: 'Failed to fetch topics',
      message: error.message
    });
  }
}

/**
 * GET /api/topics/:topicId/resources
 * Get all resources for a specific topic
 */
export async function getTopicResources(req, res) {
  try {
    const { topicId } = req.params;
    const userId = req.userId;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: topicResource, error } = await supabaseAdmin
      .from('topic_resources')
      .select('*')
      .eq('id', topicId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    if (!topicResource) {
      return res.status(404).json({ error: 'Topic resource not found' });
    }

    res.json({
      success: true,
      resource: topicResource
    });
  } catch (error) {
    console.error('❌ Error fetching topic resources:', error);
    res.status(500).json({
      error: 'Failed to fetch topic resources',
      message: error.message
    });
  }
}

/**
 * PUT /api/topics/:topicId/progress
 * Update topic progress (mastery, study stage, etc.)
 */
export async function updateTopicProgress(req, res) {
  try {
    const { topicId } = req.params;
    const userId = req.userId;
    const { masteryLevel, studyStage, lastPracticed } = req.body;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const updates = {};
    if (masteryLevel !== undefined) updates.mastery_level = masteryLevel;
    if (studyStage) updates.study_stage = studyStage;
    if (lastPracticed) updates.last_practiced = lastPracticed;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('topic_resources')
      .update(updates)
      .eq('id', topicId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      resource: data
    });
  } catch (error) {
    console.error('❌ Error updating topic progress:', error);
    res.status(500).json({
      error: 'Failed to update topic progress',
      message: error.message
    });
  }
}

/**
 * POST /api/topics/:topicId/activity
 * Record a learning activity for a topic
 */
export async function recordActivity(req, res) {
  try {
    const { topicId } = req.params;
    const userId = req.userId;
    const { activityType, questionId, isCorrect, timeSpent } = req.body;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await recordTopicActivity(
      supabaseAdmin,
      userId,
      topicId,
      activityType,
      questionId,
      isCorrect,
      timeSpent
    );

    res.json({
      success: true,
      message: 'Activity recorded successfully'
    });
  } catch (error) {
    console.error('❌ Error recording activity:', error);
    res.status(500).json({
      error: 'Failed to record activity',
      message: error.message
    });
  }
}

// =====================================================
// TEST ENDPOINTS
// =====================================================

/**
 * POST /api/tests/generate
 * Generate a new test with selected questions
 */
export async function generateTest(req, res) {
  try {
    const userId = req.userId;
    const {
      testType,
      subject,
      examContext,
      topics,
      totalQuestions,
      durationMinutes,
      masteryLevel
    } = req.body;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🧪 Generating ${testType} test with AI for ${subject} (${examContext})`);

    // Check if AI generation is enabled (requires GEMINI_API_KEY)
    // Now enabling for topic_quiz and subject_test as well to ensure fallback works
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const qCount = totalQuestions || getRecommendedQuestionCount(testType, examContext) || 10;
    const useAIGeneration = !!GEMINI_KEY;
    let questionSet;

    // ─── Strategy 1: Database question pool (Real PYQ questions preferred) ───
    console.log('📦 Checking database question pool for real PYQ questions...');
    try {
      const previouslyAttempted = await getPreviouslyAttemptedQuestions(
        supabaseAdmin, userId, testType, subject
      );

      const dbQuestionSet = await selectQuestionsForTest(supabaseAdmin, {
        userId, testType, subject, examContext, topics,
        totalQuestions: qCount, masteryLevel,
        excludeQuestionIds: previouslyAttempted
      });

      if (dbQuestionSet && dbQuestionSet.questions.length >= qCount * 0.5) {
        console.log(`✅ Strategy 1 (DB) found ${dbQuestionSet.questions.length} real questions. Using them.`);
        questionSet = dbQuestionSet;
      } else {
        console.log(`⚠️  Strategy 1 (DB) found only ${dbQuestionSet?.questions.length || 0} questions. Will augment with AI.`);
        // Keep these questions to potentially merge later
        if (dbQuestionSet && dbQuestionSet.questions.length > 0) {
          questionSet = dbQuestionSet;
        }
      }
    } catch (dbErr) {
      console.warn('⚠️ Strategy 1 (DB) failed or too few questions:', dbErr.message);
    }

    // ─── Strategy 2: AI Generation (Full context) ───────────────────────────
    // Only run if we don't have enough questions yet
    if ((!questionSet || questionSet.questions.length < qCount) && useAIGeneration) {
      console.log('🤖 Using AI Question Generator to fulfill/augment request...');
      try {
        const context = await loadGenerationContext(
          supabaseAdmin, userId, examContext, subject, topics
        );

        // Calculate how many more we need
        const needed = qCount - (questionSet?.questions.length || 0);

        const aiQuestions = await generateTestQuestions(
          context,
          GEMINI_KEY,
          needed,
          null, // onBatchProgress
          questionSet?.questions || []
        );

        if (Array.isArray(aiQuestions) && aiQuestions.length > 0) {
          if (!questionSet) {
            const difficultyBreakdown = { easy: 0, moderate: 0, hard: 0 };
            const topicBreakdown = {};
            let totalDifficulty = 0;
            aiQuestions.forEach(q => {
              if (q.difficulty) {
                difficultyBreakdown[q.difficulty.toLowerCase()] = (difficultyBreakdown[q.difficulty.toLowerCase()] || 0) + 1;
                totalDifficulty += q.difficulty.toLowerCase() === 'easy' ? 1 : q.difficulty.toLowerCase() === 'moderate' ? 2 : 3;
              }
              if (q.topic) topicBreakdown[q.topic] = (topicBreakdown[q.topic] || 0) + 1;
            });

            questionSet = {
              questions: aiQuestions,
              metadata: {
                totalQuestions: aiQuestions.length,
                difficultyBreakdown,
                topicBreakdown,
                averageDifficulty: aiQuestions.length > 0 ? totalDifficulty / aiQuestions.length : 0,
                generatedWithAI: true
              }
            };
          } else {
            // MERGE AI questions into existing set
            questionSet.questions = [...questionSet.questions, ...aiQuestions];
            questionSet.metadata.totalQuestions = questionSet.questions.length;
            questionSet.metadata.generatedWithAI = true;
            // Update other metadata if needed, but for now this is enough for the UI
          }
          console.log(`✅ Strategy 2: Augmented with ${aiQuestions.length} AI questions`);
        }
      } catch (aiError) {
        console.error('⚠️ Strategy 2 failed:', aiError.message);
      }
    }

    // ─── Strategy 3: Direct Gemini prompt (no DB config required) ───────────
    if (!questionSet && GEMINI_KEY) {
      console.log('🤖 Falling back to direct Gemini generation (no DB context)…');
      try {
        const { getGeminiClient, withGeminiRetry } = await import('../utils/geminiClient.ts');
        const ai = getGeminiClient(GEMINI_KEY);

        // topics[] contains UUIDs from the frontend — resolve to readable names first
        const UUID_REGEX_TOPIC = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let topicNames = subject; // safe fallback is always the subject name

        if (topics && topics.length > 0) {
          const uuidTopics = topics.filter(t => UUID_REGEX_TOPIC.test(t));
          const plainTopics = topics.filter(t => !UUID_REGEX_TOPIC.test(t));

          let resolvedNames = [...plainTopics]; // keep any plain-text names as-is

          if (uuidTopics.length > 0) {
            // Resolve UUIDs → topic_name from topic_resources table
            const { data: topicRows } = await supabaseAdmin
              .from('topic_resources')
              .select('topic_name')
              .in('id', uuidTopics);
            if (topicRows && topicRows.length > 0) {
              resolvedNames.push(...topicRows.map(r => r.topic_name).filter(Boolean));
            }
          }

          topicNames = resolvedNames.length > 0 ? resolvedNames.join(', ') : subject;
        }

        console.log(`🎯 Strategy 3: topic names resolved to: "${topicNames}"`);

        const prompt = `You are a World-Class Question Architect for the ${examContext} entrance exam in ${subject}.
Your goal is to generate ${qCount} questions that match the RIGOR and STYLE of real Past Year Papers (2021-2024).

${examContext === 'JEE' ? 'JEE FOCUS: Numerical rigor, multi-step calculus-based application, and complex logical synthesis.' : ''}
${examContext === 'NEET' ? 'NEET FOCUS: Conceptual precision, assertion-reasoning style, and NCERT-plus depth.' : ''}
${examContext === 'KCET' ? 'KCET FOCUS: Trickiness, speed-accuracy challenges, and syllabus-edge cases.' : ''}

REQUIREMENTS:
1. Topic(s): "${topicNames}"
2. QUALITY: ZERO "Definition" questions. Every question must be a Scenario or Application problem.
3. UNIQUENESS: Every question must be distinct and cover a different conceptual facet. Do NOT repeat the same scenario or numerical values.
4. STRUCTURE: 4 options, exactly 1 correct.
5. SOLUTIONS: Include masterclass analytical steps with detailed "solutionSteps", "examTip", "keyFormulas", and "pitfalls".
6. DEEP INSIGHTS: Include "masteryMaterial" with AI reasoning, exam patterns, and conceptual foundations.

🚨 CRITICAL QUALITY STANDARDS - NO GENERIC CONTENT ALLOWED:

A) SOLUTION STEPS (4-6 steps minimum):
   - Each step must show actual mathematical reasoning with specific calculations
   - Include intermediate results, not just "solve this"
   - Show WHY each step follows from the previous one
   - Use proper LaTeX for all mathematical expressions

B) PITFALLS (3-5 specific mistakes):
   - State the EXACT mistake students make
   - Explain WHY they make it (misconception/rushed thinking)
   - Show HOW to avoid it with a concrete technique

C) KEY FORMULAS (3-5 formulas):
   - Include all formulas needed to solve the question
   - Add context: when to use each formula

D) EXAM TIP:
   - Give a SPECIFIC time-saving strategy for this question type
   - Mention common exam traps

E) MASTERY MATERIAL (DEEP INSIGHTS):
   - aiReasoning (2-3 sentences): Explain the EXACT conceptual skill being tested.
   - whyItMatters (2-3 sentences): Explain how this concept connects to other topics.
   - historicalPattern (specific data): Give actual exam frequency and patterns.
   - predictiveInsight (trend analysis): Based on actual exam evolution, predict what's coming.

Return ONLY a valid JSON array:
[
  {
    "id": "q1",
    "text": "The rigorous question with $Proper \\\\LaTeX$...",
    "options": ["...", "...", "...", "..."],
    "correctOptionIndex": 0,
    "solutionSteps": ["Step 1: ...", "Step 2: ..."],
    "examTip": "...",
    "keyFormulas": ["..."],
    "pitfalls": ["..."],
    "masteryMaterial": {
      "aiReasoning": "...",
      "whyItMatters": "...",
      "historicalPattern": "...",
      "predictiveInsight": "...",
      "keyConcepts": [
        { "name": "...", "explanation": "..." }
      ]
    },
    "topic": "${topicNames}",
    "difficulty": "Easy|Moderate|Hard"
  }
]`;

        const result = await withGeminiRetry(() => ai.models.generateContent({
          model: AI_CONFIG.defaultModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
            maxOutputTokens: 12000
          }
        }));

        const raw = result.text || '';
        const jsonStr = raw.includes('```json')
          ? raw.match(/```json\n([\s\S]*?)\n```/)?.[1] || raw
          : raw;
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalizedQuestions = parsed.map((q, i) => ({
            id: q.id || `ai-q-${i + 1}`,
            text: q.text || q.question || '',
            options: Array.isArray(q.options) ? q.options : [],
            correctOptionIndex: q.correctOptionIndex ?? q.correctIndex ?? 0,
            solutionSteps: q.solutionSteps || (q.explanation ? [q.explanation] : []),
            examTip: q.examTip || '',
            keyFormulas: q.keyFormulas || [],
            pitfalls: q.pitfalls || [],
            masteryMaterial: q.masteryMaterial || null,
            topic: q.topic || topicNames,
            difficulty: q.difficulty || 'Moderate',
            marks: 1,
            bloomsLevel: 'application',
            generatedByAI: true,
          }));

          // Deduplicate
          const uniqueNormalized = [];
          const seen = new Set();
          normalizedQuestions.forEach(q => {
            const norm = q.text?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
            if (norm && !seen.has(norm)) {
              uniqueNormalized.push(q);
              seen.add(norm);
            }
          });

          questionSet = {
            questions: uniqueNormalized,
            metadata: {
              totalQuestions: uniqueNormalized.length,
              difficultyBreakdown: { easy: 0, moderate: 0, hard: 0 },
              topicBreakdown: { [topicNames]: uniqueNormalized.length },
              generatedWithAI: true
            }
          };
          console.log(`✅ Strategy 2: Generated ${normalizedQuestions.length} questions with full insights (normalized)`);
        }
      } catch (directErr) {
        console.error('⚠️  Direct Gemini generation failed:', directErr.message);
      }
    }




    // Final guard — all 3 strategies exhausted with no questions
    if (!questionSet || !Array.isArray(questionSet.questions) || questionSet.questions.length === 0) {
      return res.status(500).json({
        error: 'Failed to generate test',
        message: `No questions could be generated for ${subject} (${examContext}). Please check your GEMINI_API_KEY or ensure questions exist in the database.`
      });
    }

    // ─── NEET Section tagging ─────────────────────────────────────────────────
    // Tag sections BEFORE saving the snapshot so scoring filter works at submit time.
    // predictive_mock 50Q → SecA=35, SecB=15; custom n → proportional round(n×35/50)
    if (examContext === 'NEET') {
      questionSet.questions = assignNEETSections(questionSet.questions, qCount, subject);
      console.log(`📐 NEET sections tagged: ${questionSet.questions.filter(q => q.section === 'Section A').length} SecA, ${questionSet.questions.filter(q => q.section === 'Section B').length} SecB`);
    }

    // Create test attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('test_attempts')
      .insert({
        user_id: userId,
        test_type: testType,
        test_name: `${testType.replace('_', ' ')} - ${subject}`,
        exam_context: examContext,
        subject,
        topic_id: topics && topics.length === 1 ? topics[0] : null,
        total_questions: questionSet.questions.length,
        duration_minutes: durationMinutes || getRecommendedDuration(testType, examContext, questionSet.questions.length),
        start_time: new Date().toISOString(),
        status: 'in_progress',
        test_config: {
          questions: questionSet.questions
        }
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Map DB snake_case to frontend camelCase
    const mappedAttempt = {
      id: attempt.id,
      userId: attempt.user_id,
      testType: attempt.test_type,
      testName: attempt.test_name,
      examContext: attempt.exam_context,
      subject: attempt.subject,
      topicId: attempt.topic_id,
      totalQuestions: attempt.total_questions,
      durationMinutes: attempt.duration_minutes,
      startTime: attempt.start_time,
      status: attempt.status,
      questionsAttempted: attempt.questions_attempted || 0,
      createdAt: attempt.created_at,
    };

    res.json({
      success: true,
      attempt: mappedAttempt,
      questions: questionSet.questions,
      metadata: questionSet.metadata
    });
  } catch (error) {
    console.error('❌ Error generating test:', error);
    res.status(500).json({
      error: 'Failed to generate test',
      message: error.message
    });
  }
}

/**
 * POST /api/tests/:attemptId/submit
 * Submit test responses and calculate score
 */
export async function submitTest(req, res) {
  try {
    const { attemptId } = req.params;
    const userId = req.userId;
    const { responses } = req.body;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`📝 Submitting test ${attemptId} - ${responses.length} responses`);
    console.log(`🔍 [DEBUG] Sample response:`, JSON.stringify(responses[0], null, 2));

    // Verify attempt belongs to user
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('test_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (attemptError || !attempt) {
      console.error(`❌ Test attempt not found:`, attemptError);
      return res.status(404).json({ error: 'Test attempt not found' });
    }

    console.log(`✅ Test attempt verified for user ${userId}`);

    // Delete any existing responses for this attempt (for idempotency)
    const { error: deleteError } = await supabaseAdmin
      .from('test_responses')
      .delete()
      .eq('attempt_id', attemptId);

    if (deleteError) {
      console.error('⚠️ Error deleting existing responses:', deleteError);
    } else {
      console.log(`🗑️  Deleted existing responses for attempt ${attemptId}`);
    }

    // Insert all responses
    // AI questions have IDs like 'ai-q-1' — NOT valid UUIDs, will fail FK constraint.
    // Strategy: insert DB-question responses with question_id, AI responses without it.
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const dbResponses = [];
    const aiResponses = [];

    responses.forEach(r => {
      const isRealUUID = UUID_REGEX.test(r.questionId);
      console.log(`📝 Response: questionId=${r.questionId} (${isRealUUID ? 'DB' : 'AI'}), topic=${r.topic}, correct=${r.isCorrect}`);
      const base = {
        attempt_id: attemptId,
        selected_option: r.selectedOption,
        is_correct: r.isCorrect,
        time_spent: r.timeSpent,
        marked_for_review: r.markedForReview,
        topic: r.topic,
        difficulty: r.difficulty,
        marks: r.marks
      };
      if (isRealUUID) {
        dbResponses.push({ ...base, question_id: r.questionId });
      } else {
        aiResponses.push(base); // omit question_id entirely for AI questions
      }
    });

    console.log(`💾 Inserting ${dbResponses.length} DB responses + ${aiResponses.length} AI responses...`);

    // Insert DB responses (with question_id FK)
    if (dbResponses.length > 0) {
      const { error: dbRespErr } = await supabaseAdmin.from('test_responses').insert(dbResponses);
      if (dbRespErr) {
        console.error(`❌ Error inserting DB responses:`, dbRespErr);
        throw dbRespErr;
      }
    }

    // Insert AI responses (without question_id FK) — non-fatal if schema doesn't support it
    if (aiResponses.length > 0) {
      const { error: aiRespErr } = await supabaseAdmin.from('test_responses').insert(aiResponses);
      if (aiRespErr) {
        console.warn(`⚠️  Could not persist AI question responses to table (schema requires question_id FK): ${aiRespErr.message}`);
        console.log(`💡 Snapshotting responses into test_attempts.test_config as fallback instead.`);
      }
    }



    console.log(`✅ Successfully inserted ${dbResponses.length + aiResponses.length} responses`);


    // Get exam configuration for proper marks calculation
    const { data: examConfig } = await supabaseAdmin
      .from('exam_configurations')
      .select('marks_per_question, negative_marking_enabled, negative_marking_deduction')
      .eq('exam_context', attempt.exam_context)
      .eq('subject', attempt.subject)
      .single();

    const marksPerQuestion = examConfig?.marks_per_question || 1;
    const negativeMarkingEnabled = examConfig?.negative_marking_enabled || false;
    const negativeDeduction = examConfig?.negative_marking_deduction || 0;

    console.log(`📋 Exam Config: ${marksPerQuestion} marks/question, negative marking: ${negativeMarkingEnabled ? negativeDeduction : 'No'}`);

    // Calculate score using actual marking scheme
    const isNEET = attempt.exam_context === 'NEET';
    let correctCount = 0;
    let incorrectCount = 0;
    let questionsAttempted = 0;
    let marksObtained = 0;
    let marksTotal = 0;

    // Use full questions from snapshot to get sections
    const snapshotQs = attempt.test_config?.questions || [];

    if (isNEET && snapshotQs.length > 0) {
      console.log('🧪 Applying NEET Sectional Scoring Logic (Section A: 35, Section B: 10/15)');
      const subjects = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

      // selectedOption is null (not undefined) from DB when skipped — null !== undefined is TRUE (wrong)
      // Use isAttempted() to correctly distinguish answered vs skipped
      const isAttempted = (opt) => opt !== null && opt !== undefined;

      subjects.forEach(subject => {
        // 1. Process Section A (Mandatory 35 per subject)
        const sectionAQs = snapshotQs.filter(q => q.subject === subject && q.section === 'Section A');
        sectionAQs.forEach(q => {
          const r = responses.find(resp => resp.questionId === q.id);
          marksTotal += 4;
          if (r && isAttempted(r.selectedOption)) {
            questionsAttempted++;
            if (r.isCorrect) {
              correctCount++;
              marksObtained += 4;
            } else {
              incorrectCount++;
              marksObtained -= 1;
            }
          }
        });

        // 2. Process Section B (count only first 10 attempts per subject)
        const sectionBQs = snapshotQs.filter(q => q.subject === subject && q.section === 'Section B');
        let subjectBAttempts = 0;
        sectionBQs.forEach(q => {
          const r = responses.find(resp => resp.questionId === q.id);
          if (r && isAttempted(r.selectedOption) && subjectBAttempts < 10) {
            subjectBAttempts++;
            questionsAttempted++;
            if (r.isCorrect) {
              correctCount++;
              marksObtained += 4;
            } else {
              incorrectCount++;
              marksObtained -= 1;
            }
          }
        });
        // SecB max: real NEET = 10 countable, custom tests may have fewer SecB questions
        marksTotal += Math.min(sectionBQs.length, 10) * 4;
      });

      // Full NEET paper (200Q per subject × 4) should always total 720
      if (marksTotal < 720 && snapshotQs.length >= 200) marksTotal = 720;
    } else {
      // Standard scoring — KCET / JEE / CBSE
      // isAttempted guard: null selectedOption from DB must not be treated as answered
      const isAttempted = (opt) => opt !== null && opt !== undefined;
      correctCount = responses.filter(r => r.isCorrect).length;
      incorrectCount = responses.filter(r => !r.isCorrect && isAttempted(r.selectedOption)).length;
      questionsAttempted = responses.filter(r => isAttempted(r.selectedOption)).length;

      responses.forEach(r => {
        const questionMarks = r.marks || marksPerQuestion;
        marksTotal += questionMarks;

        if (r.isCorrect) {
          marksObtained += questionMarks;
        } else if (isAttempted(r.selectedOption) && negativeMarkingEnabled) {
          marksObtained += negativeDeduction;
        }
      });
    }

    const percentage = marksTotal > 0 ? Math.round((Math.max(0, marksObtained) / marksTotal) * 100) : 0;

    console.log(`📊 Score: ${correctCount}/${responses.length} correct, ${marksObtained}/${marksTotal} marks (${percentage}%), ${questionsAttempted} attempted`);

    // Calculate topic-wise performance
    const topicStats = {};
    responses.forEach(r => {
      if (!topicStats[r.topic]) {
        topicStats[r.topic] = { correct: 0, total: 0, accuracy: 0 };
      }
      topicStats[r.topic].total++;
      if (r.isCorrect) topicStats[r.topic].correct++;
    });

    Object.keys(topicStats).forEach(topic => {
      const stats = topicStats[topic];
      stats.accuracy = Math.round((stats.correct / stats.total) * 100);
    });

    console.log(`📈 Topic stats:`, JSON.stringify(topicStats, null, 2));

    // Calculate time analysis
    const totalTime = responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    const avgTime = Math.round(totalTime / responses.length);

    console.log(`⏱️  Time: ${totalTime}s total, ${avgTime}s avg per question`);

    // Update attempt
    const { data: updatedAttempt, error: updateError } = await supabaseAdmin
      .from('test_attempts')
      .update({
        end_time: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        total_duration: totalTime,
        status: 'completed',
        raw_score: correctCount,
        percentage,
        questions_attempted: questionsAttempted,
        marks_obtained: marksObtained,
        marks_total: marksTotal,
        topic_analysis: topicStats,
        test_config: {
          ...attempt.test_config,
          responses_snapshot: responses.map(r => ({
            questionId: r.questionId,
            selectedOption: r.selectedOption,
            isCorrect: r.isCorrect,
            timeSpent: r.timeSpent,
            markedForReview: r.markedForReview,
            topic: r.topic,
            difficulty: r.difficulty,
            marks: r.marks
          }))
        },
        time_analysis: {
          total: totalTime,
          average: avgTime,
          fastest: Math.min(...responses.map(r => r.timeSpent || 0)),
          slowest: Math.max(...responses.map(r => r.timeSpent || 0))
        }
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Map DB snake_case to frontend camelCase
    const mappedAttempt = {
      id: updatedAttempt.id,
      userId: updatedAttempt.user_id,
      testType: updatedAttempt.test_type,
      testName: updatedAttempt.test_name,
      examContext: updatedAttempt.exam_context,
      subject: updatedAttempt.subject,
      topicId: updatedAttempt.topic_id,
      totalQuestions: updatedAttempt.total_questions,
      durationMinutes: updatedAttempt.duration_minutes,
      startTime: updatedAttempt.start_time,
      endTime: updatedAttempt.end_time,
      totalDuration: updatedAttempt.total_duration,
      rawScore: updatedAttempt.raw_score,
      percentage: updatedAttempt.percentage,
      marksObtained: updatedAttempt.marks_obtained,
      marksTotal: updatedAttempt.marks_total,
      status: updatedAttempt.status,
      questionsAttempted: updatedAttempt.questions_attempted || 0,
      topicAnalysis: updatedAttempt.topic_analysis,
      timeAnalysis: updatedAttempt.time_analysis,
      aiReport: updatedAttempt.ai_report,
      createdAt: updatedAttempt.created_at,
      completedAt: updatedAttempt.completed_at,
    };

    // Update student performance profile for AI generator (async, don't block response)
    if (updatedAttempt.exam_context && updatedAttempt.subject && updatedAttempt.test_type === 'custom_mock') {
      console.log('📊 Updating AI performance profile...');
      import('../lib/updateAITablesFromPerformance.ts')
        .then(({ updateStudentPerformanceProfile }) => {
          return updateStudentPerformanceProfile(
            supabaseAdmin,
            userId,
            updatedAttempt.exam_context,
            updatedAttempt.subject,
            topicStats,
            percentage
          );
        })
        .then(result => {
          if (result.success) {
            console.log('✅ AI performance profile updated:', result.message);
          } else {
            console.warn('⚠️  Performance profile update:', result.message);
          }
        })
        .catch(err => {
          console.error('⚠️  Error updating performance profile:', err.message);
        });
    }

    // =========================================================================
    // 🧠 UPSTREAM MASTERY & COMMAND INTEGRATION
    // =========================================================================
    // User requested that Mock Test scores feed upstream into the overall Subject Performance.
    // The Mastery/Command engine relies on `practice_answers` (for absolute accuracy bounds)
    // and `topic_activities` (for incremental effort stats and to trigger recalculations).
    // This background async block connects the isolated mock test responses to the core engine.
    // =========================================================================
    if (['full_mock', 'subject_test', 'topic_quiz', 'custom_mock'].includes(updatedAttempt.test_type)) {
      console.log('🔄 Syncing mock test/quiz responses to upstream Mastery tables...');

      Promise.resolve().then(async () => {
        try {
          // 1. Fetch user's latest aggregated topic resources to map plain text topics to `topic_resource_id`
          // `aggregateTopicsForUser` seamlessly fetches or creates the tracking entities needed.
          const topics = await aggregateTopicsForUser(
            supabaseAdmin,
            userId,
            updatedAttempt.subject,
            updatedAttempt.exam_context
          );

          // Create a lookup dictionary: lowercase topic -> topic_resource_id UUID
          const topicResourceMap = new Map();
          topics.forEach(t => {
            if (t.topicName) topicResourceMap.set(t.topicName.toLowerCase(), t.id);
          });

          // 2. Prepare batch payloads for the `practice_answers` persistent store
          // Skip AI-generated questions (non-UUID IDs) — they have no FK row in the questions table.
          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const practiceAnswersToInsert = [];
          for (const r of responses) {
            // Note: `r.topic` is the plain text topic attached to the question metadata
            const topicNameLower = (r.topic || '').toLowerCase();
            const topicResId = topicResourceMap.get(topicNameLower);
            const isRealQuestion = UUID_RE.test(r.questionId);

            if (topicResId && isRealQuestion) {
              practiceAnswersToInsert.push({
                user_id: userId,
                question_id: r.questionId,
                topic_resource_id: topicResId,
                selected_option: r.selectedOption,
                is_correct: r.isCorrect,
                time_spent_seconds: r.timeSpent,
                first_attempt_correct: r.isCorrect,
                metadata: { source: updatedAttempt.test_type, attempt_id: attemptId }
              });
            }
          }

          // 3. Upsert into `practice_answers`. 
          // `calculateTopicMastery` mathematically relies on this table to derive the base 60% accuracy weight.
          if (practiceAnswersToInsert.length > 0) {
            const { error: paError } = await supabaseAdmin
              .from('practice_answers')
              .upsert(practiceAnswersToInsert, {
                onConflict: 'user_id, question_id',
                ignoreDuplicates: false // We overwrite with the latest test's outcome if they attempt it again
              });

            if (paError) {
              console.error('⚠️ Error syncing to practice_answers:', paError);
            } else {
              console.log(`✅ Synced ${practiceAnswersToInsert.length} test responses into practice_answers for mastery calculation.`);

              // 4. Trigger `recordTopicActivity` sequentially for each valid response.
              // This function:
              //   - A) Logs into `topic_activities` (updating volumetric practice counts & quiz bonuses).
              //   - B) Pulls the fresh `practice_answers` we just upserted.
              //   - C) Re-runs the strict weighted `calculateTopicMastery` logic.
              //   - D) Overwrites `topic_resources.mastery_level`, trickling up to global Command via Postgres triggers.
              for (const r of responses) {
                const topicResId = topicResourceMap.get((r.topic || '').toLowerCase());
                if (topicResId) {
                  await recordTopicActivity(
                    supabaseAdmin,
                    userId,
                    topicResId,
                    'completed_quiz',
                    null,         // Pass null for AI question IDs — recordTopicActivity doesn't need the FK
                    r.isCorrect,
                    r.timeSpent
                  );
                }
              }
              console.log('✅ Global upstream Mastery recalculation completed successfully for Mock Test.');
            }
          }
        } catch (err) {
          console.error('⚠️ Upstream Master/Command sync error during explicit submit:', err);
        }
      });
    }

    res.json({
      success: true,
      attempt: mappedAttempt,
      score: {
        correct: correctCount,
        total: responses.length,
        percentage,
        questionsAttempted
      },
      analysis: {
        topicBreakdown: topicStats,
        timeStats: {
          total: totalTime,
          average: avgTime
        }
      }
    });
  } catch (error) {
    console.error('❌ Error submitting test:', error);
    res.status(500).json({
      error: 'Failed to submit test',
      message: error.message
    });
  }
}

/**
 * GET /api/tests/:attemptId/results
 * Get test results and analysis
 */
export async function getTestResults(req, res) {
  try {
    const { attemptId } = req.params;
    const userId = req.userId;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('test_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: 'Test attempt not found' });
    }

    // Get responses - ordered by created_at to preserve question sequence
    const { data: responses, error: responsesError } = await supabaseAdmin
      .from('test_responses')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true });

    if (responsesError) throw responsesError;

    // Get question IDs from responses (AI-generated responses may have null question_id)
    const questionIds = (responses || []).map(r => r.question_id).filter(Boolean);

    let orderedQuestions = [];
    let mappedQuestions = [];

    if (questionIds.length > 0) {
      // Fetch DB-persisted questions
      const { data: dbQuestions, error: questionsError } = await supabaseAdmin
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (questionsError) throw questionsError;

      const questionsMap = new Map();
      (dbQuestions || []).forEach(q => questionsMap.set(q.id, q));
      orderedQuestions = questionIds.map(id => questionsMap.get(id)).filter(Boolean);

      mappedQuestions = orderedQuestions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        marks: q.marks,
        difficulty: q.difficulty,
        diff: q.difficulty,
        topic: q.topic,
        domain: q.domain,
        year: q.year,
        blooms: q.blooms,
        bloomsTaxonomy: q.blooms,
        solutionSteps: q.solution_steps || [],
        examTip: q.exam_tip,
        visualConcept: q.visual_concept,
        keyFormulas: q.key_formulas || [],
        pitfalls: q.pitfalls || [],
        masteryMaterial: q.mastery_material,
        hasVisualElement: q.has_visual_element,
        visualElementType: q.visual_element_type,
        diagramUrl: q.diagram_url,
        correctOptionIndex: q.correct_option_index,
        source: q.source,
      }));
    }

    // FALLBACK: if no DB questions found (e.g., AI-generated test whose questions weren't
    // persisted), read the snapshot stored in test_attempts.test_config.questions
    if (mappedQuestions.length === 0 && attempt.test_config?.questions?.length > 0) {
      console.log(`📦 [getTestResults] No DB questions found for attempt ${attemptId} - using test_config snapshot (${attempt.test_config.questions.length} qs)`);
      mappedQuestions = attempt.test_config.questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options || [],
        marks: q.marks || 1,
        difficulty: q.difficulty || 'Moderate',
        diff: q.difficulty || 'Moderate',
        topic: q.topic || '',
        domain: q.domain,
        year: q.year,
        blooms: q.blooms || q.bloomsTaxonomy,
        bloomsTaxonomy: q.bloomsTaxonomy || q.blooms,
        solutionSteps: q.solutionSteps || [],
        examTip: q.examTip,
        keyFormulas: q.keyFormulas || [],
        pitfalls: q.pitfalls || [],
        masteryMaterial: q.masteryMaterial,
        hasVisualElement: q.hasVisualElement,
        diagramUrl: q.diagramUrl,
        correctOptionIndex: q.correctOptionIndex,
        source: q.source || 'ai'
      }));
    }

    // Map DB snake_case to frontend camelCase for attempt
    const mappedAttempt = {
      id: attempt.id,
      userId: attempt.user_id,
      testType: attempt.test_type,
      testName: attempt.test_name,
      examContext: attempt.exam_context,
      subject: attempt.subject,
      topicId: attempt.topic_id,
      totalQuestions: attempt.total_questions,
      durationMinutes: attempt.duration_minutes,
      startTime: attempt.start_time,
      endTime: attempt.end_time,
      totalDuration: attempt.total_duration,
      rawScore: attempt.raw_score,
      percentage: attempt.percentage,
      marksObtained: attempt.marks_obtained,
      marksTotal: attempt.marks_total,
      status: attempt.status,
      questionsAttempted: attempt.questions_attempted || 0,
      topicAnalysis: attempt.topic_analysis,
      timeAnalysis: attempt.time_analysis,
      aiReport: attempt.ai_report,
      createdAt: attempt.created_at,
      completedAt: attempt.completed_at,
      testConfig: attempt.test_config,
    };

    // Map responses to frontend format
    // For DB-question tests: match by question_id
    // For AI-question tests: responses have null question_id — match by position using snapshot question IDs
    let formattedResponses;

    const hasNullIds = (responses || []).some(r => !r.question_id);

    if (!hasNullIds && questionIds.length > 0) {
      // Normal DB-question path: match by question_id
      const responsesMap = new Map();
      responses.forEach(r => responsesMap.set(r.question_id, r));
      formattedResponses = questionIds.map(qId => {
        const r = responsesMap.get(qId);
        return r ? {
          questionId: r.question_id,
          selectedOption: r.selected_option,
          isCorrect: r.is_correct,
          timeSpent: r.time_spent,
          markedForReview: r.marked_for_review,
          topic: r.topic,
          difficulty: r.difficulty,
          marks: r.marks
        } : null;
      }).filter(Boolean);
    } else {
      // AI-question path: match responses positionally to snapshot question IDs
      const snapshotQuestions = mappedQuestions; // already built from test_config snapshot
      formattedResponses = (responses || []).map((r, idx) => ({
        questionId: snapshotQuestions[idx]?.id || r.question_id || `ai-q-${idx}`,
        selectedOption: r.selected_option,
        isCorrect: r.is_correct,
        timeSpent: r.time_spent,
        markedForReview: r.marked_for_review,
        topic: r.topic,
        difficulty: r.difficulty,
        marks: r.marks
      }));
    }

    // FALLBACK: If formattedResponses is empty (happens for AI tests where test_responses insert failed FK)
    // Read from the snapshot we saved in test_config during submission
    if (formattedResponses.length === 0 && attempt.test_config?.responses_snapshot?.length > 0) {
      console.log(`📦 [getTestResults] test_responses table empty - using test_config.responses_snapshot (${attempt.test_config.responses_snapshot.length} entries)`);
      formattedResponses = attempt.test_config.responses_snapshot.map(r => ({
        questionId: r.questionId,
        selectedOption: r.selectedOption,
        isCorrect: r.isCorrect,
        timeSpent: r.timeSpent,
        markedForReview: r.markedForReview,
        topic: r.topic,
        difficulty: r.difficulty,
        marks: r.marks
      }));
    }



    res.json({
      success: true,
      attempt: mappedAttempt,
      questions: mappedQuestions,
      responses: formattedResponses
    });
  } catch (error) {
    console.error('❌ Error fetching test results:', error);
    res.status(500).json({
      error: 'Failed to fetch test results',
      message: error.message
    });
  }
}

/**
 * GET /api/tests/history
 * Get user's test history
 */
export async function getTestHistory(req, res) {
  try {
    const userId = req.userId;
    const { testType, subject, limit = 10 } = req.query;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let query = supabaseAdmin
      .from('test_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (testType) {
      query = query.eq('test_type', testType);
    }

    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data: attempts, error } = await query;
    if (error) throw error;

    // Map DB snake_case to frontend camelCase for each attempt
    const mappedAttempts = (attempts || []).map(attempt => ({
      id: attempt.id,
      userId: attempt.user_id,
      testType: attempt.test_type,
      testName: attempt.test_name,
      examContext: attempt.exam_context,
      subject: attempt.subject,
      topicId: attempt.topic_id,
      totalQuestions: attempt.total_questions,
      durationMinutes: attempt.duration_minutes,
      startTime: attempt.start_time,
      endTime: attempt.end_time,
      status: attempt.status,
      questionsAttempted: attempt.questions_attempted || 0,
      createdAt: attempt.created_at,
      rawScore: attempt.raw_score,
      percentage: attempt.percentage
    }));

    res.json({
      success: true,
      attempts: mappedAttempts,
      count: mappedAttempts.length
    });
  } catch (error) {
    console.error('❌ Error fetching test history:', error);
    res.status(500).json({
      error: 'Failed to fetch test history',
      message: error.message
    });
  }
}

// =====================================================
// PROGRESS ENDPOINTS
// =====================================================

/**
 * GET /api/progress/subject/:subject/:examContext
 * Get subject-level progress
 */
export async function getSubjectProgress(req, res) {
  try {
    const { subject, examContext } = req.params;
    const userId = req.userId;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: progress, error } = await supabaseAdmin
      .from('subject_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('trajectory_id', examContext)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    res.json({
      success: true,
      progress: progress || {
        overallMastery: 0,
        topicsTotal: 0,
        topicsMastered: 0,
        totalQuestionsAttempted: 0,
        overallAccuracy: 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching subject progress:', error);
    res.status(500).json({
      error: 'Failed to fetch subject progress',
      message: error.message
    });
  }
}

/**
 * GET /api/progress/trajectory/:examContext
 * Get overall progress for a trajectory
 */
export async function getTrajectoryProgress(req, res) {
  try {
    const { examContext } = req.params;
    const userId = req.userId;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: subjectProgress, error } = await supabaseAdmin
      .from('subject_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('trajectory_id', examContext);

    if (error) throw error;

    // Calculate overall metrics
    const overallMastery = subjectProgress.length > 0
      ? Math.round(
        subjectProgress.reduce((sum, sp) => sum + sp.overall_mastery, 0) / subjectProgress.length
      )
      : 0;

    const totalTopics = subjectProgress.reduce((sum, sp) => sum + sp.topics_total, 0);
    const masteredTopics = subjectProgress.reduce((sum, sp) => sum + sp.topics_mastered, 0);

    res.json({
      success: true,
      progress: {
        overallMastery,
        totalTopics,
        masteredTopics,
        subjectBreakdown: subjectProgress
      }
    });
  } catch (error) {
    console.error('❌ Error fetching trajectory progress:', error);
    res.status(500).json({
      error: 'Failed to fetch trajectory progress',
      message: error.message
    });
  }
}

/**
 * GET /api/progress/streak
 * Calculate current daily study streak
 */
export async function getStudyStreak(req, res) {
  try {
    const userId = req.headers['x-user-id'] || req.query.userId || req.userId;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [activitiesRes, testsRes] = await Promise.all([
      supabaseAdmin
        .from('topic_activities')
        .select('activity_timestamp')
        .eq('user_id', userId)
        .order('activity_timestamp', { ascending: false }),
      supabaseAdmin
        .from('test_attempts')
        .select('created_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
    ]);

    const allDates = [
      ...(activitiesRes.data || []).map(a => new Date(a.activity_timestamp).toDateString()),
      ...(testsRes.data || []).map(t => new Date(t.created_at).toDateString())
    ];

    if (allDates.length === 0) {
      return res.json({ success: true, streak: 0 });
    }

    const uniqueDates = Array.from(new Set(allDates)).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    let streak = 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const firstDate = new Date(uniqueDates[0]);
    const firstDateNormalized = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());

    if (firstDateNormalized.getTime() === today.getTime() || firstDateNormalized.getTime() === yesterday.getTime()) {
      streak = 1;
      for (let i = 0; i < uniqueDates.length - 1; i++) {
        const current = new Date(uniqueDates[i]);
        const currNorm = new Date(current.getFullYear(), current.getMonth(), current.getDate());
        const next = new Date(uniqueDates[i + 1]);
        const nextNorm = new Date(next.getFullYear(), next.getMonth(), next.getDate());
        const diffDays = (currNorm.getTime() - nextNorm.getTime()) / (1000 * 60 * 60 * 24);

        if (Math.round(diffDays) === 1) streak++;
        else if (Math.round(diffDays) === 0) continue;
        else break;
      }
    }

    res.json({ success: true, streak });
  } catch (error) {
    console.error('❌ Error calculating streak:', error);
    res.status(500).json({ error: 'Failed to calculate streak', message: error.message });
  }
}

// =====================================================
// CUSTOM MOCK TEST ENDPOINTS
// =====================================================

/**
 * GET /api/learning-journey/weak-topics
 * Analyze user progress and identify weak topics using AI
 */
// cache for weak topics to prevent expensive recalculations
const weakTopicsCache = new Map();

export async function getWeakTopics(req, res) {
  try {
    const { userId, subject, examContext } = req.query;

    const cacheKey = `${userId}:${subject}:${examContext}`;
    const cached = weakTopicsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
      console.log(`⚡️ [CACHE HIT] Returning cached weak topics for ${subject}`);
      return res.json({ success: true, data: { weakTopics: cached.data } });
    }

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🤖 Analyzing weak topics for ${subject} (${examContext}) - User: ${userId}`);

    // Get all topics for this subject
    // topics table uses 'name' column (not 'topic_name'); it has no 'exam_context' column
    // Filter by exam is done via exam_weightage JSON field
    const { data: allTopicsRaw, error: topicsError } = await supabaseAdmin
      .from('topics')
      .select('id, name, subject, exam_weightage')
      .eq('subject', subject);

    // Filter topics that belong to this exam context (exam_weightage > 0)
    const topics = (allTopicsRaw || []).filter(t => {
      const w = t.exam_weightage;
      return w && (w[examContext] ?? 0) > 0;
    });

    if (topicsError) throw topicsError;

    // Get user's topic progress from topic_resources
    const { data: topicResources, error: resourcesError } = await supabaseAdmin
      .from('topic_resources')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('exam_context', examContext);

    if (resourcesError) throw resourcesError;

    // Get user's practice performance per topic
    // 🚀 OPTIMIZATION: Use bulk queries instead of N+1 loop
    console.log(`⚡️ [PERF] Running bulk analysis for ${topics.length} topics...`);

    // 1. Fetch ALL questions for this subject/exam in one go
    let questionsQuery = supabaseAdmin
      .from('questions')
      .select('id, topic')
      .eq('subject', subject)
      .eq('exam_context', examContext);
    // Exclude chapters removed from NEET 2026 syllabus
    if (examContext === 'NEET') questionsQuery = questionsQuery.eq('neet_out_of_scope', false);
    const { data: allQuestions } = await questionsQuery;

    // 2. Fetch ALL relevant practice answers for the user in one go
    const allQuestionIds = (allQuestions || []).map(q => q.id);
    const { data: allPracticeAnswers } = allQuestionIds.length > 0
      ? await supabaseAdmin
        .from('practice_answers')
        .select('question_id, is_correct')
        .in('question_id', allQuestionIds)
        .eq('user_id', userId)
      : { data: [] };

    // 🧠 [In-Memory Indexing] Group questions and answers by topic name
    const questionsByTopic = new Map();
    (allQuestions || []).forEach(q => {
      const t = q.topic;
      if (!questionsByTopic.has(t)) questionsByTopic.set(t, []);
      questionsByTopic.get(t).push(q.id);
    });

    const answersByQuestionId = new Map();
    (allPracticeAnswers || []).forEach(pa => {
      if (!answersByQuestionId.has(pa.question_id)) answersByQuestionId.set(pa.question_id, []);
      answersByQuestionId.get(pa.question_id).push(pa.is_correct);
    });

    const weakTopics = [];

    for (const topic of topics) {
      const topicResource = topicResources?.find(tr => tr.topic_id === topic.id);
      const questionIds = questionsByTopic.get(topic.name) || [];

      let totalPractice = 0;
      let correctPractice = 0;

      // Grouped calculation
      questionIds.forEach(qid => {
        const answers = answersByQuestionId.get(qid) || [];
        totalPractice += answers.length;
        correctPractice += answers.filter(isCorrect => isCorrect).length;
      });

      const practiceAccuracy = totalPractice > 0 ? Math.round((correctPractice / totalPractice) * 100) : 0;
      const masteryLevel = topicResource?.mastery_level || 0;

      // Calculate weakness score (higher = weaker)
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
          topicName: topic.name, // topics table column is 'name'
          masteryLevel,
          practiceAccuracy,
          weaknessScore,
          reason
        });
      }
    }

    // Sort by weakness score descending
    weakTopics.sort((a, b) => b.weaknessScore - a.weaknessScore);

    // Take top 10 weak topics
    const topWeakTopics = weakTopics.slice(0, 10);

    weakTopicsCache.set(cacheKey, { timestamp: Date.now(), data: topWeakTopics });

    res.json({
      success: true,
      data: {
        weakTopics: topWeakTopics,
        recommendedFocus: topWeakTopics.slice(0, 5).map(wt => wt.topicName)
      }
    });
  } catch (error) {
    console.error('❌ Error analyzing weak topics:', error);
    res.status(500).json({
      error: 'Failed to analyze weak topics',
      message: error.message
    });
  }
}

/**
 * Background worker: runs AI generation + DB writes after the HTTP response is sent.
 * Stores the final result (or error) in generationProgress so the client can poll.
 */
/**
 * Tags NEET Section A / Section B on a flat array of questions for a single subject.
 * Rules (matches real NEET pattern):
 *   - 50Q per subject  → SecA = first 35, SecB = last 15
 *   - Custom n < 50    → SecA = first round(n × 35/50), SecB = rest
 * All questions also get the subject tag stamped so the scoring filter works.
 */
function assignNEETSections(questions, totalCount, subjectName) {
  if (!questions || questions.length === 0) return questions;
  const sectionACount = totalCount >= 50 ? 35 : Math.round(totalCount * 35 / 50);
  return questions.map((q, idx) => ({
    ...q,
    subject: q.subject || subjectName,
    section: idx < sectionACount ? 'Section A' : 'Section B'
  }));
}

export async function generateTestInBackground({ userId, testName, subject, examContext, topicIds, questionCount, difficultyMix, durationMinutes, saveAsTemplate, progressId, strategyMode, oracleMode }) {
  // Check if AI generation is enabled (requires GEMINI_API_KEY)
  let useAIGeneration = !!(process.env.GEMINI_API_KEY && examContext && subject);

  let finalQuestions = [];

  try {
    const mode = strategyMode || 'hybrid';

    if (useAIGeneration) {
      // ✨ AI-powered question generation (always use AI if available)
      console.log('🤖 Using AI Question Generator for custom test...');
      const aiStartTime = Date.now();

      try {
        updateProgress(progressId, 'analyzing', '🎯 Analyzing your performance and past exam patterns...', 10, { strategy: 'Strategy 1: Full Contextual AI' });

        console.log(`📊 Loading generation context for ${subject} (${examContext})...`);
        console.log(`🎯 User selected ${topicIds?.length || 0} topics:`, topicIds);

        // Get topic names from the topics table (UI uses UUID IDs from topics table)
        let selectedTopicNames = null;
        if (topicIds && topicIds.length > 0) {
          // topics table uses 'name' column (NOT 'topic_name')
          const { data: selectedTopics } = await supabaseAdmin
            .from('topics')
            .select('id, name')
            .in('id', topicIds);

          selectedTopicNames = selectedTopics?.map(t => t.name).filter(Boolean) || [];
          console.log(`🎯 Selected topic names (${selectedTopicNames.length}):`, selectedTopicNames);
        }

        // ==========================================================================================
        // 🧠 AI CONTEXT PIPELINE: 5 LAYERS OF ANALYTICAL DATA INGESTION
        // ==========================================================================================
        // This function dynamically queries the database to build a complete intelligence profile
        // for the AI generation prompt, so the model isn't "guessing", but mathematically building
        // a tailored test. It fetches:
        // 1. loadExamConfiguration: Official duration, rules, and marking schemes (CBSE/NEET etc.)
        // 2. loadTopicMetadata: Syllabus structure, prerequisites, and Bloom's difficulty logic.
        // 3. loadHistoricalPatterns: Past 5 years of exam questions, topic weights, & difficulty distributions.
        // 4. loadStudentProfile: The user's specific accuracy bounds, mastery scores, and time spent.
        // 5. loadGenerationRules: Algorithm weighting (e.g., 40% History matching, 30% User Weakness matching).
        // ==========================================================================================
        const context = await loadGenerationContext(
          supabaseAdmin,
          userId,
          examContext,
          subject,
          selectedTopicNames,  // Pass topic names to filter generation
          difficultyMix        // Pass difficulty override if present
        );

        console.log(`✅ Context loaded in ${Date.now() - aiStartTime}ms`);
        console.log(`🎯 Context: examConfig=${!!context.examConfig}, topics=${context.topics?.length}, patterns=${context.historicalPatterns?.length}`);

        // Override total questions and set strategy mode
        context.examConfig.totalQuestions = questionCount;
        if (context.generationRules) {
          context.generationRules.strategyMode = mode;
          if (oracleMode) {
            context.generationRules.oracleMode = {
              ...(context.generationRules.oracleMode || {}),
              ...oracleMode
            };
            console.log(`🧠 [REI v3.0] Merged Oracle Mode: enabled=${context.generationRules.oracleMode.enabled}, idsTarget=${context.generationRules.oracleMode.idsTarget}`);
          }
        }
        updateProgress(progressId, 'requesting', `🤖 [Strategy 1] Generating ${questionCount} questions via Full Contextual AI (${mode})...`, 30, {
          strategy: 'Strategy 1: Full Contextual AI',
          mode,
          targetQuestions: questionCount,
          subject,
          examContext,
          topicsLoaded: context.topics?.length || 0,
          batchCurrent: 0,
          batchTotal: 0,
          questionsGenerated: 0
        });

        console.log(`🤖 [Strategy 1] Generating ${questionCount} questions (${mode}) with Gemini AI...`);
        console.log(`📦 Context: ${context.topics?.length} topics, ${context.historicalPatterns?.length} patterns, strategyMode=${mode}`);
        const genStartTime = Date.now();

        let latestBatchInfo = { batchCurrent: 0, batchTotal: 0, questionsGenerated: 0 };

        // Generate fresh questions with AI (no corruption, perfect LaTeX)
        const questions = await generateTestQuestions(
          context,
          process.env.GEMINI_API_KEY,
          undefined,
          (info) => {
            // Server-side batch progress callback — updates progress store and logs each batch
            latestBatchInfo = { batchCurrent: info.batchIdx, batchTotal: info.totalBatches, questionsGenerated: info.totalSoFar };
            const pct = 30 + Math.round((info.batchIdx / info.totalBatches) * 45); // 30–75%
            const msg = `🤖 [Strategy 1] Batch ${info.batchIdx}/${info.totalBatches}: ${info.batchQuestions} questions generated (total: ${info.totalSoFar}) — Topics: ${info.topicNames.join(', ')}`;
            console.log(msg);
            updateProgress(progressId, 'requesting', msg, pct, {
              strategy: 'Strategy 1: Full Contextual AI',
              mode,
              targetQuestions: questionCount,
              subject,
              examContext,
              batchCurrent: info.batchIdx,
              batchTotal: info.totalBatches,
              questionsGenerated: info.totalSoFar,
              currentTopics: info.topicNames
            });
          }
        );

        const genMs = Date.now() - genStartTime;
        console.log(`✅ [Strategy 1] AI generation completed in ${genMs}ms — ${questions.length} questions from ${latestBatchInfo.batchTotal} batches`);

        console.log(`🔍 [Strategy 1] Validation complete: ${questions.length} returned (target was ${questionCount})`);
        if (questions.length < questionCount) {
          console.warn(`⚠️  [Strategy 1] Short by ${questionCount - questions.length} question(s) after validation + top-up`);
        }
        updateProgress(progressId, 'validating', `✅ [Strategy 1] ${questions.length}/${questionCount} questions validated. Saving to database...`, 80, {
          strategy: 'Strategy 1: Full Contextual AI',
          questionsValidated: questions.length,
          targetQuestions: questionCount
        });

        // Take exactly the requested count (generateTestQuestions may return slightly more after top-up)
        finalQuestions = questions.slice(0, questionCount);

        updateProgress(progressId, 'validating', '💾 Saving AI questions to database...', 85);

        // Map questions to identities
        try {
          const { mapQuestionToIdentity } = await import('../lib/identityMapper.ts');
          console.log(`🧬 Mapping ${finalQuestions.length} questions to identities...`);
          finalQuestions.forEach(q => {
            if (q.topic && !q.identityId) {
              q.identityId = mapQuestionToIdentity(q.topic, subject, examContext, {
                minConfidence: 0.5,
                preferHighYield: true
              });
            }
          });
          const assignedCount = finalQuestions.filter(q => q.identityId).length;
          console.log(`🧬 Identity mapping: ${assignedCount}/${finalQuestions.length} questions assigned`);
        } catch (mapError) {
          console.warn(`⚠️  Identity mapping failed:`, mapError.message);
          // Continue without identity mapping
        }

        // Get or create AI scan for these questions
        const aiScanId = await getOrCreateAIScan(supabaseAdmin, subject, examContext, userId);

        // Insert AI questions into questions table so foreign key constraints are satisfied
        const questionsToInsert = finalQuestions.map(q => ({
          id: q.id,
          text: q.text,
          options: q.options,
          correct_option_index: q.correctOptionIndex,
          marks: q.marks,
          difficulty: q.difficulty,
          topic: q.topic,
          blooms: q.blooms,  // Fixed: use 'blooms' not 'blooms_level'
          solution_steps: q.solutionSteps,
          exam_tip: q.examTip,
          key_formulas: q.keyFormulas,
          pitfalls: q.pitfalls,
          mastery_material: q.masteryMaterial,
          source: q.source || `AI-Generated (${examContext})`,
          exam_context: examContext,
          subject: subject,
          scan_id: aiScanId,  // Use AI scan instead of null
          metadata: {
            questionType: q.questionType || null,
            identityId: q.identityId || null,
            ...(q.metadata || {})
          }
        }));

        const { error: insertError } = await supabaseAdmin
          .from('questions')
          .insert(questionsToInsert);

        if (insertError) {
          console.error('⚠️  Failed to insert AI questions:', insertError);
          // Continue anyway - questions are already generated
        } else {
          console.log(`💾 Successfully saved ${finalQuestions.length} AI questions to database`);
        }

        updateProgress(progressId, 'rendering', '🎨 Rendering questions and preparing your test...', 90);

        console.log(`✅ Generated ${finalQuestions.length} fresh AI questions for custom test (total time: ${Date.now() - aiStartTime}ms)`);
      } catch (aiError) {
        console.error('⚠️  Strategy 1 AI (full context) failed for custom test:', aiError.message);
        // Falls through to Strategy 2
        useAIGeneration = false;
      }
    }

    // ─── Strategy 2: Direct Gemini prompt (no DB config required) ───────────
    if (finalQuestions.length === 0) {
      console.log(`🔀 [Strategy 2] Activating: Strategy 1 produced 0 questions. Falling back to direct Gemini prompt...`);
      updateProgress(progressId, 'requesting', `🤖 [Strategy 2] Fallback: generating ${questionCount} questions via direct Gemini prompt...`, 40, {
        strategy: 'Strategy 2: Direct Gemini Prompt (Fallback)',
        mode,
        targetQuestions: questionCount,
        reason: 'Strategy 1 returned 0 questions'
      });
      const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (GEMINI_KEY) {
        console.log('🤖 [Strategy 2] Direct Gemini generation for custom mock test...');
        try {
          const { getGeminiClient, withGeminiRetry } = await import('../utils/geminiClient.ts');
          const ai = getGeminiClient(GEMINI_KEY);

          // Resolve topic names if we don't have them yet
          let topicNamesForPrompt = subject;
          if (topicIds && topicIds.length > 0) {
            // topics table uses 'name' column
            const { data: topicRows } = await supabaseAdmin
              .from('topics')
              .select('name')
              .in('id', topicIds);
            const resolved = topicRows?.map(r => r.name).filter(Boolean) || [];
            if (resolved.length > 0) topicNamesForPrompt = resolved.join(', ');
          }

          console.log(`🎯 Strategy 2 topic names: "${topicNamesForPrompt}"`);

          const rigorDirective = (examContext === 'JEE') ? 'JEE FOCUS: Numerical rigor, multi-concept integration, and multi-step reasoning.' : (examContext === 'NEET' ? 'NEET FOCUS: Conceptual depth, assertion-reasoning, and NCERT-plus level details.' : 'KCET FOCUS: Rapid trickiness and syllabus-edge cases.');

          const prompt = `You are a World-Class Question Architect for the ${examContext} entrance exam in ${subject}.
Your mission is to generate ${questionCount} ULTIMATE-RIGOR MCQ questions.

STRATEGY: ${mode === 'predictive_mock' ? 'PREDICTIVE MOCK (Focus 100% on real exam pattern probability)' : (mode === 'adaptive_growth' ? 'ADAPTIVE GROWTH (Focus heavily on common student vulnerabilities)' : 'HYBRID BALANCE')}

${rigorDirective}

QUALITY MANDATE:
1. ZERO "Definition" questions. Every question must be a Scenario or Application problem.
2. Focus on "The Prediction Gap": Create questions that pre-empt how real exams evolve each year.
3. MANDATORY SOLUTIONS: Every single question MUST include detailed "solutionSteps", "examTip", "keyFormulas", and "pitfalls". NEVER leave these empty.
4. MANDATORY INSIGHTS: Every question MUST include "masteryMaterial" object with "aiReasoning", "whyItMatters", "historicalPattern", "predictiveInsight", and "keyConcepts" array.
5. STRUCTURE: 4 options, exactly 1 correct.
6. Topic(s): "${topicNamesForPrompt}"
7. Difficulty: ~${difficultyMix.easy}% Easy, ~${difficultyMix.moderate}% Moderate, ~${difficultyMix.hard}% Hard.
8. Use PROPER LaTeX for all expressions.

🚨 CRITICAL QUALITY STANDARDS - NO GENERIC CONTENT ALLOWED:

A) SOLUTION STEPS (4-6 steps minimum):
   - Each step must show actual mathematical reasoning with specific calculations
   - Include intermediate results, not just "solve this"
   - Show WHY each step follows from the previous one
   - Use proper LaTeX for all mathematical expressions
   - Example: "Step 1: Identify domain restriction ::: For $f(x) = \\\\frac{x}{1-|x|}$, the denominator cannot be zero. Set $1-|x|=0 \\\\Rightarrow |x|=1 \\\\Rightarrow x = \\\\pm 1$. These are the excluded values."

B) PITFALLS (3-5 specific mistakes):
   - State the EXACT mistake students make
   - Explain WHY they make it (misconception/rushed thinking)
   - Show HOW to avoid it with a concrete technique
   - Example: "PITFALL: Confusing 'domain is $\\\\mathbb{R} - [-1,1]$' with '$\\\\mathbb{R} - \\\\{-1,1\\\\}$'. WHY: Students forget that $|x|=1$ gives discrete points, not an interval. The interval $[-1,1]$ includes all values from -1 to 1, which is incorrect. HOW TO AVOID: Always solve the restriction equation completely to find exact excluded points, then use set notation with curly braces for discrete values."

C) KEY FORMULAS (3-5 formulas):
   - Include all formulas needed to solve the question
   - Add context: when to use each formula
   - Example: "$\\\\text{Domain of } \\\\frac{f(x)}{g(x)}: \\\\text{Dom}(f) \\\\cap \\\\{x : g(x) \\\\neq 0\\\\}$ - Always check both numerator domain AND denominator ≠ 0"

D) EXAM TIP:
   - Give a SPECIFIC time-saving strategy for this question type
   - Mention common exam traps
   - Example: "In ${examContext} exams, domain questions often test absolute value cases. ALWAYS split $|x|$ into $x \\\\geq 0$ and $x < 0$ cases separately, then combine. This avoids missing edge cases that cost marks."

E) MASTERY MATERIAL (DEEP INSIGHTS):

   - aiReasoning (2-3 sentences):
     Explain the EXACT conceptual skill being tested. NOT generic placeholders.
     Example: "This question combines three concepts: (1) domain restrictions from denominators, (2) absolute value properties creating piecewise conditions, and (3) set theory notation. It specifically tests whether students can identify that $|x|=1$ yields two discrete points, not a continuous interval—a common ${examContext} trap."

   - whyItMatters (2-3 sentences):
     Explain how this concept connects to other topics and real applications.
     Example: "Domain mastery is foundational for limits, continuity, and integration in calculus. Understanding absolute value restrictions appears in optimization problems, and the set notation distinction ($\\\\{-1,1\\\\}$ vs $[-1,1]$) is critical for advanced topics like measure theory and database query ranges in computer science."

   - historicalPattern (specific data):
     Give actual exam frequency and patterns, not vague percentages.
     Example: "Domain problems appear in 85-90% of ${examContext} ${subject} papers (2018-2024). Absolute value in denominators specifically appeared in 2024, 2022, 2020, and 2019 papers. The trend shows increasing complexity: recent exams combine domain with composition of functions."

   - predictiveInsight (trend analysis):
     Based on actual exam evolution, predict what's coming.
     Example: "Given the 2023-2024 shift toward multi-layered function problems, expect ${examContext} 2025 to combine domain restrictions with inverse functions or parametric forms. Probability: 75-80% based on syllabus rotation patterns and examiner emphasis on composite reasoning."

   - keyConcepts (3-5 foundational concepts):
     Each concept must include: definition, key theorem/formula, worked mini-example, and connection to question.
     Example format:
     {
       "name": "Absolute Value Properties",
       "explanation": "$|x| = a$ means $x = \\\\pm a$ (for $a > 0$). This creates TWO solutions, not an interval. Geometrically: distance from origin equals $a$ at exactly two points on the number line. In this question: $|x|=1$ gives $x \\\\in \\\\{-1, 1\\\\}$ (2 discrete points), NOT $x \\\\in [-1,1]$ (interval with infinitely many points). Connection: This distinction is why the domain excludes exactly 2 values, making the answer $\\\\mathbb{R} - \\\\{-1,1\\\\}$."
     }

Return ONLY a valid JSON array:
[
  {
    "id": "q1",
    "text": "The rigorous question with $Proper \\\\LaTeX$...",
    "options": ["...", "...", "...", "..."],
    "correctOptionIndex": 0,
    "solutionSteps": [
      "Step 1: Title ::: Detailed mathematical reasoning with intermediate calculations and LaTeX",
      "Step 2: Title ::: Show exactly what to do, with actual numbers/expressions",
      "Step 3: Title ::: Continue with complete working",
      "Step 4: Title ::: Final step with answer derivation"
    ],
    "examTip": "Specific time-saving technique for this question type in ${examContext} exams, mentioning common traps",
    "keyFormulas": [
      "$formula_1$ - context on when to use",
      "$formula_2$ - context on when to use",
      "$formula_3$ - context on when to use"
    ],
    "pitfalls": [
      "EXACT mistake ::: WHY students make it ::: HOW to avoid with specific technique",
      "EXACT mistake ::: WHY students make it ::: HOW to avoid with specific technique",
      "EXACT mistake ::: WHY students make it ::: HOW to avoid with specific technique"
    ],
    "masteryMaterial": {
      "aiReasoning": "2-3 sentences explaining the EXACT conceptual skills being tested, with specific reference to what makes this question challenging for ${examContext} students",
      "whyItMatters": "2-3 sentences on how this concept connects to other ${subject} topics, higher mathematics, and real-world applications. Be specific with topic names.",
      "historicalPattern": "Specific exam frequency data (e.g., '85% of 2018-2024 papers'), mention actual years where this appeared, describe how difficulty evolved",
      "predictiveInsight": "Based on 2023-2024 trends, predict what variation will appear in 2025-2026 ${examContext} with probability estimate and reasoning",
      "keyConcepts": [
        {
          "name": "Concept Name (e.g., Absolute Value Properties)",
          "explanation": "Complete explanation: (1) Definition with LaTeX, (2) Key theorem/formula, (3) Worked mini-example with numbers, (4) Direct connection to how it's used in THIS question. Minimum 3-4 sentences with actual mathematical content."
        },
        {
          "name": "Second Core Concept",
          "explanation": "Complete explanation with definition, theorem, example, and question connection"
        },
        {
          "name": "Third Core Concept",
          "explanation": "Complete explanation with definition, theorem, example, and question connection"
        }
      ]
    },
    "topic": "${topicNamesForPrompt}",
    "difficulty": "Easy|Moderate|Hard"
  }
]`;

          const result = await withGeminiRetry(() => ai.models.generateContent({
            model: AI_CONFIG.defaultModel,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.7,
              maxOutputTokens: 12000
            }
          }));
          const raw = result.text || '';
          const jsonStr = raw.includes('```json')
            ? raw.match(/```json\n([\s\S]*?)\n```/)?.[1] || raw
            : raw.startsWith('[') ? raw : raw;
          const parsed = JSON.parse(jsonStr.trim());

          if (Array.isArray(parsed) && parsed.length > 0) {
            finalQuestions = parsed.map((q, i) => ({
              id: q.id || `ai-mock-${i + 1}`,
              text: q.text || q.question || '',
              options: Array.isArray(q.options) ? q.options : [],
              correctOptionIndex: q.correctOptionIndex ?? q.correct_option_index ?? q.correctIndex ?? 0,
              solutionSteps: q.solutionSteps || q.solution_steps || (q.explanation ? [q.explanation] : []),
              examTip: q.examTip || q.exam_tip || '',
              keyFormulas: q.keyFormulas || q.key_formulas || [],
              pitfalls: q.pitfalls || q.pit_falls || [],
              masteryMaterial: q.masteryMaterial || q.mastery_material || null,
              topic: q.topic || topicNamesForPrompt,
              difficulty: q.difficulty || 'Moderate',
              marks: 1,
              bloomsLevel: 'application',
              subject,
              examContext,
              generatedByAI: true,
            }));
            console.log(`✅ Strategy 2: Generated ${finalQuestions.length} questions with full insights via direct Gemini`);
          }
        } catch (directErr) {
          console.error('⚠️  Strategy 2 (direct Gemini) failed:', directErr.message);
          // Falls through to Strategy 3
        }
      }
    }

    // ─── Strategy 3: Database question pool (broad fallback) ────────────────
    if (finalQuestions.length === 0) {
      console.log('📦 [Strategy 3] Activating: Both AI strategies failed. Falling back to DB question pool...');
      updateProgress(progressId, 'requesting', `📦 [Strategy 3] Both AI strategies failed. Fetching from question database...`, 50, {
        strategy: 'Strategy 3: Database Fallback',
        reason: 'Strategy 1 + Strategy 2 both returned 0 questions'
      });
      console.log('📦 [Strategy 3] Using database question selection for custom test...');

      // topics table uses 'name' column
      const { data: topicRows } = await supabaseAdmin
        .from('topics')
        .select('name')
        .in('id', topicIds);
      const topicNames = topicRows?.map(t => t.name).filter(Boolean) || [];

      // Search across ALL scans for this subject/exam (not just system scans)
      const { data: allScans } = await supabaseAdmin
        .from('scans')
        .select('id')
        .eq('subject', subject)
        .eq('exam_context', examContext);

      const scanIds = allScans?.map(s => s.id) || [];

      const selectedQuestions = [];

      if (scanIds.length > 0 && topicNames.length > 0) {
        // Fetch and filter by topic overlap, difficulty via both 'difficulty' and 'diff' columns
        let dbQsQuery = supabaseAdmin
          .from('questions')
          .select('*')
          .in('scan_id', scanIds)
          .limit(500);
        // Exclude chapters removed from NEET 2026 syllabus
        if (examContext === 'NEET') dbQsQuery = dbQsQuery.eq('neet_out_of_scope', false);
        const { data: allQs } = await dbQsQuery;

        // questions table uses 'topic' (singular TEXT), not 'topics' array
        const pool = (allQs || []).filter(q => {
          if (topicNames.length === 0) return true;
          const qTopic = (q.topic || '').toLowerCase();
          return topicNames.some(tn =>
            qTopic.includes(tn.toLowerCase()) || tn.toLowerCase().includes(qTopic)
          );
        });

        console.log(`📦 Strategy 3: pool has ${pool.length} questions after topic filter`);

        const easyCount = Math.round((questionCount * difficultyMix.easy) / 100);
        const moderateCount = Math.round((questionCount * difficultyMix.moderate) / 100);
        const hardCount = questionCount - easyCount - moderateCount;

        const getDiff = (q) => (q.difficulty || q.diff || 'moderate').toLowerCase();

        const easyPool = pool.filter(q => getDiff(q) === 'easy').sort(() => 0.5 - Math.random());
        const modPool = pool.filter(q => ['moderate', 'medium'].includes(getDiff(q))).sort(() => 0.5 - Math.random());
        const hardPool = pool.filter(q => getDiff(q) === 'hard').sort(() => 0.5 - Math.random());

        selectedQuestions.push(...easyPool.slice(0, easyCount));
        selectedQuestions.push(...modPool.slice(0, moderateCount));
        selectedQuestions.push(...hardPool.slice(0, hardCount));

        // If we still don't have enough, fill from any remaining pool
        if (selectedQuestions.length < questionCount) {
          const usedIds = new Set(selectedQuestions.map(q => q.id));
          const remaining = pool.filter(q => !usedIds.has(q.id)).sort(() => 0.5 - Math.random());
          selectedQuestions.push(...remaining.slice(0, questionCount - selectedQuestions.length));
        }
      } else if (scanIds.length > 0) {
        // No topic filter — just pull any questions for this subject
        let anyQsQuery = supabaseAdmin
          .from('questions')
          .select('*')
          .in('scan_id', scanIds)
          .limit(questionCount * 3);
        if (examContext === 'NEET') anyQsQuery = anyQsQuery.eq('neet_out_of_scope', false);
        const { data: anyQs } = await anyQsQuery;
        selectedQuestions.push(...(anyQs || []).sort(() => 0.5 - Math.random()).slice(0, questionCount));
      }

      if (selectedQuestions.length > 0) {
        finalQuestions = selectedQuestions.slice(0, questionCount).map(q => ({
          ...q,
          text: q.text || q.question_text || '',
          correctOptionIndex: q.correct_option_index ?? q.correctOptionIndex ?? 0,
        }));
        console.log(`✅ Strategy 3: Selected ${finalQuestions.length} questions from DB`);
      } else {
        throw new Error(`No questions found for ${subject} (${examContext}). Please upload papers or enable AI generation.`);
      }
    }

    // ─── Final guard: all 3 strategies exhausted ────────────────────────────
    if (!finalQuestions || finalQuestions.length === 0) {
      throw new Error(`Could not generate questions for ${subject} (${examContext}). Please check your Gemini API key or upload past papers.`);
    }

    // ─── NEET Section tagging ─────────────────────────────────────────────────
    // Must happen BEFORE the snapshot so scoring filter (q.subject + q.section) works.
    // predictive_mock (50Q) → SecA=35, SecB=15 (exact spec)
    // hybrid / adaptive_growth (custom n) → SecA=round(n×35/50), SecB=rest
    if (examContext === 'NEET') {
      finalQuestions = assignNEETSections(finalQuestions, questionCount, subject);
      console.log(`📐 NEET sections assigned: ${finalQuestions.filter(q => q.section === 'Section A').length} SecA, ${finalQuestions.filter(q => q.section === 'Section B').length} SecB`);
    }

    // Create test attempt — store the full questions snapshot so review always works
    // (AI questions are not persisted in the questions table, so we need this fallback)
    const questionsSnapshot = finalQuestions.map(q => ({
      id: q.id,
      text: q.text,
      options: q.options,
      marks: q.marks || 4,
      difficulty: q.difficulty,
      topic: q.topic,
      subject: q.subject || subject,   // critical for NEET scoring filter
      section: q.section || null,      // critical for NEET SecA/SecB scoring
      blooms: q.blooms,
      domain: q.domain,
      year: q.year,
      solutionSteps: q.solutionSteps || q.solution_steps || [],
      examTip: q.examTip || q.exam_tip,
      keyFormulas: q.keyFormulas || q.key_formulas || [],
      pitfalls: q.pitfalls || [],
      masteryMaterial: q.masteryMaterial || q.mastery_material,
      correctOptionIndex: q.correctOptionIndex ?? q.correct_option_index,
      hasVisualElement: q.hasVisualElement ?? q.has_visual_element,
      diagramUrl: q.diagramUrl || q.diagram_url,
      bloomsTaxonomy: q.bloomsTaxonomy || q.blooms,
      source: q.source
    }));

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('test_attempts')
      .insert({
        user_id: userId,
        test_type: 'custom_mock',
        test_name: testName,
        exam_context: examContext,
        subject,
        topic_id: null, // Multiple topics
        total_questions: finalQuestions.length,
        duration_minutes: durationMinutes,
        start_time: new Date().toISOString(),
        status: 'in_progress',
        test_config: {
          topicIds,
          difficultyMix,
          questionCount,
          durationMinutes,
          strategyMode,
          oracleMode: oracleMode?.enabled ? oracleMode : undefined,
          questions: questionsSnapshot // ← snapshot for review fallback
        }
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Save as template if requested
    let templateId = null;
    if (saveAsTemplate) {
      const { data: template, error: templateError } = await supabaseAdmin
        .from('test_templates')
        .insert({
          user_id: userId,
          template_name: testName,
          subject,
          exam_context: examContext,
          topic_ids: topicIds,
          difficulty_mix: difficultyMix,
          question_count: questionCount,
          duration_minutes: durationMinutes,
          last_used_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!templateError) {
        templateId = template.id;
      }
    }

    // Map database fields to camelCase for frontend
    const mappedAttempt = {
      id: attempt.id,
      userId: attempt.user_id,
      testType: attempt.test_type,
      testName: attempt.test_name,
      examContext: attempt.exam_context,
      subject: attempt.subject,
      topicId: attempt.topic_id,
      totalQuestions: attempt.total_questions,
      durationMinutes: attempt.duration_minutes,
      startTime: attempt.start_time,
      status: attempt.status,
      questionsAttempted: attempt.questions_attempted || 0,
      createdAt: attempt.created_at,
      testConfig: attempt.test_config
    };

    // Store result in progress map so the polling client can retrieve it
    const resultPayload = {
      attempt: mappedAttempt,
      questions: finalQuestions,
      templateId
    };

    updateProgress(progressId, 'complete', '✅ Test ready! Redirecting...', 100, resultPayload);

    console.log(`✅ Background generation complete for progressId=${progressId}`);
    return resultPayload;
  } catch (error) {
    console.error('❌ Error in background test generation:', error);
    updateProgress(progressId, 'error', error.message || 'Failed to create test', 0);
    throw error;
  }
}

/**
 * Helper to prepare an official test attempt by loading a context-aware flagship paper
 */
async function prepareOfficialTest(userId, setId, supabase, subject, examContext) {
  let questions = [];
  const subjectLower = (subject?.toLowerCase() || 'math').replace('mathematics', 'math');
  const isMath = subjectLower === 'math';
  const isPhysics = subjectLower === 'physics';
  const isChem = subjectLower === 'chemistry' || subjectLower === 'chem';
  const isBio = subjectLower === 'biology' || subjectLower === 'bio';

  let nId = setId.toUpperCase();
  let normalizedSetId = 'SET-A';
  if (nId.includes('SET-B') || nId.endsWith('-B') || nId.endsWith('_B') || nId.includes('SET_B')) normalizedSetId = 'SET-B';

  let sourceName = `PLUS2AI OFFICIAL ${subject.toUpperCase()} PREDICTION 2026: ${normalizedSetId}`;
  
  try {
    let sourceFile;
    if (isMath) {
      sourceFile = normalizedSetId === 'SET-B' ? 'flagship_final_b.json' : 'flagship_final.json';
    } else if (isPhysics) {
      sourceFile = normalizedSetId === 'SET-B' ? 'flagship_physics_final_b.json' : 'flagship_physics_final.json';
    } else if (isChem) {
      sourceFile = normalizedSetId === 'SET-B' ? 'flagship_chemistry_final_b.json' : 'flagship_chemistry_final.json';
    } else if (isBio) {
      sourceFile = normalizedSetId === 'SET-B' ? 'flagship_biology_final_b.json' : 'flagship_biology_final.json';
    }
    
    if (sourceFile) {
      const filePath = path.join(process.cwd(), sourceFile);
      if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath, 'utf8');
        const sourceData = JSON.parse(rawData);
        questions = sourceData.test_config?.questions || sourceData.questions || [];
        sourceName = sourceData.test_name || sourceName;
        console.log(`✅ [Flagship Bypass] Loaded ${questions.length} from ${sourceFile}`);
      }
    }
  } catch (e) {
    console.error(`❌ [Flagship Bypass] Resolution failed for ${setId}:`, e.message);
  }

  if (questions.length === 0) {
    throw new Error(`The official ${setId} paper for ${subject} (${examContext}) could not be loaded.`);
  }

  // Create real DB attempt for tracking
  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from('test_attempts')
    .insert({
      user_id: userId,
      test_type: 'custom_mock',
      test_name: sourceName,
      exam_context: examContext || 'KCET',
      subject: subject || (isMath ? 'Mathematics' : isPhysics ? 'Physics' : isChem ? 'Chemistry' : 'Biology'),
      total_questions: questions.length,
      duration_minutes: 80,
      start_time: new Date().toISOString(),
      status: 'in_progress',
      test_config: { questions, is_official: true, setId: normalizedSetId, isOfficialPrediction: true }
    })
    .select()
    .single();

  if (attemptError) throw attemptError;

  // Map DB snake_case to frontend camelCase for attempt
  const mappedAttempt = {
    id: attempt.id,
    userId: attempt.user_id,
    testType: attempt.test_type,
    testName: attempt.test_name,
    examContext: attempt.exam_context,
    subject: attempt.subject,
    topicId: attempt.topic_id,
    totalQuestions: attempt.total_questions,
    durationMinutes: attempt.duration_minutes,
    startTime: attempt.start_time,
    status: attempt.status,
    questionsAttempted: attempt.questions_attempted || 0,
    createdAt: attempt.created_at,
    testConfig: attempt.test_config
  };

  return { attempt: mappedAttempt, questions, isInstant: true };
}

/**
 * POST /api/learning-journey/create-custom-test
 */
export async function createCustomTest(req, res) {
  try {
    const { userId, subject, examContext, topicIds, questionCount, difficultyMix, durationMinutes, saveAsTemplate, oracleMode, officialSetId } = req.body;

    if (!userId || userId === 'anonymous') return res.status(401).json({ error: 'Authentication required' });

    // --- OFFICIAL SET BYPASS ---
    if (officialSetId) {
      try {
        const result = await prepareOfficialTest(userId, officialSetId, supabaseAdmin, subject, examContext);
        return res.json({ success: true, data: result });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    const progressId = randomUUID();
    res.json({ success: true, data: { progressId } });

    generateTestInBackground({ userId, testName: `${subject} Mock Test`, subject, examContext, topicIds, questionCount, difficultyMix, durationMinutes, saveAsTemplate, progressId, oracleMode })
      .catch(err => updateProgress(progressId, 'error', err.message, 0));

  } catch (error) {
    console.error('❌ Error creating custom test:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
}

  /**
   * GET /api/learning-journey/test-templates
   * Get user's saved test templates
   */
  export async function getTestTemplates(req, res) {
    try {
      const { userId, subject, examContext } = req.query;

      if (!userId || userId === 'anonymous') {
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
        data: {
          templates: templates || []
        }
      });
    } catch (error) {
      console.error('❌ Error fetching test templates:', error);
      res.status(500).json({
        error: 'Failed to fetch test templates',
        message: error.message
      });
    }
  }

  /**
   * POST /api/learning-journey/count-available-questions
   * Count available questions matching specified criteria
   */
  export async function countAvailableQuestions(req, res) {
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
      // topics table uses 'name' column (not 'topic_name')
      const { data: topicsData } = await supabaseAdmin
        .from('topics')
        .select('name')
        .in('id', topicIds);

      const topicNames = topicsData?.map(t => t.name).filter(Boolean) || [];

      // Check if AI generation is enabled - if so we have essentially infinite questions
      // Check both GEMINI_API_KEY and VITE_GEMINI_API_KEY (same as generateTest strategy)
      const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      const useAIGeneration = !!(GEMINI_KEY && examContext && subject);

      if (useAIGeneration) {
        console.log(`🤖 AI generation is enabled -> Reporting virtually infinite question capacity`);

        // Calculate realistic max based on number of topics selected
        const topicsMultiplier = Math.max(1, topicNames.length);
        const totalAvailable = topicsMultiplier * 300; // E.g., 300 questions per topic capacity

        return res.json({
          success: true,
          data: {
            total: totalAvailable,
            byDifficulty: {
              easy: Math.floor(totalAvailable * 0.3),
              moderate: Math.floor(totalAvailable * 0.5),
              hard: Math.floor(totalAvailable * 0.2)
            },
            isAIGenerated: true
          }
        });
      }

      // fallback to actual DB counts if AI generation is off

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
            byDifficulty: { easy: 0, moderate: 0, hard: 0 },
            isAIGenerated: false
          }
        });
      }

      // Count questions by difficulty
      const counts = { easy: 0, moderate: 0, hard: 0 };

      // questions table uses: 'difficulty' (not 'diff'), 'topic' singular TEXT (not 'topics' array)
      // Count Easy questions
      let easyQuery = supabaseAdmin
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .in('scan_id', scanIds)
        .eq('difficulty', 'Easy');
      if (topicNames.length > 0) easyQuery = easyQuery.in('topic', topicNames);
      const { count: easyCount } = await easyQuery;
      counts.easy = easyCount || 0;

      // Count Moderate questions
      let modQuery = supabaseAdmin
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .in('scan_id', scanIds)
        .eq('difficulty', 'Moderate');
      if (topicNames.length > 0) modQuery = modQuery.in('topic', topicNames);
      const { count: moderateCount } = await modQuery;
      counts.moderate = moderateCount || 0;

      // Count Hard questions
      let hardQuery = supabaseAdmin
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .in('scan_id', scanIds)
        .eq('difficulty', 'Hard');
      if (topicNames.length > 0) hardQuery = hardQuery.in('topic', topicNames);
      const { count: hardCount } = await hardQuery;
      counts.hard = hardCount || 0;

      const total = counts.easy + counts.moderate + counts.hard;

      res.json({
        success: true,
        data: {
          total,
          byDifficulty: counts,
          isAIGenerated: false
        }
      });
    } catch (error) {
      console.error('❌ Error counting available questions:', error);
      res.status(500).json({
        error: 'Failed to count questions',
        message: error.message
      });
    }
  }

  /**
   * GET /api/tests/official
   * Fetch official flagship papers (visible to all users)
   */
  export async function getOfficialTests(req, res) {
    try {
      const { subject, examContext } = req.query;

      // 🚀 [MISSION CRITICAL] Load Local Flagship Files as "Virtual Blueprints"
      // Flagship papers are ONLY stored locally, NOT in the database
      const sortedBaseline = [];
      // --- UNIVERSAL SUBJECT-AWARE VIRTUAL BLUEPRINT INJECTION ---
      const subjectLower = subject?.toLowerCase() || '';
      const isMath = subjectLower === 'mathematics' || subjectLower === 'math';
      const isPhysics = subjectLower === 'physics';
      const isChem = subjectLower === 'chemistry';
      const isBio = subjectLower === 'biology';

      if (isMath || isPhysics || isChem || isBio) {
        let flagships = [];
        const prefix = isMath ? 'MATH' : isPhysics ? 'PHYSICS' : isChem ? 'CHEM' : 'BIO';
        
        if (isMath) {
          flagships = [
            { id: 'SET-A', file: 'flagship_final.json', label: 'Math Set-A Prediction' },
            { id: 'SET-B', file: 'flagship_final_b.json', label: 'Math Set-B Prediction' }
          ];
        } else if (isPhysics) {
          flagships = [
            { id: 'SET-A', file: 'flagship_physics_final.json', label: 'Physics Set-A Prediction' },
            { id: 'SET-B', file: 'flagship_physics_final_b.json', label: 'Physics Set-B Prediction' }
          ];
        } else if (isChem) {
          flagships = [
            { id: 'SET-A', file: 'flagship_chemistry_final.json', label: 'Chemistry Set-A Prediction' },
            { id: 'SET-B', file: 'flagship_chemistry_final_b.json', label: 'Chemistry Set-B Prediction' }
          ];
        } else if (isBio) {
          flagships = [
            { id: 'SET-A', file: 'flagship_biology_final.json', label: 'Biology Set-A Prediction' },
            { id: 'SET-B', file: 'flagship_biology_final_b.json', label: 'Biology Set-B Prediction' }
          ];
        }

        const normalizedSubject = isMath ? 'Mathematics' : isPhysics ? 'Physics' : isChem ? 'Chemistry' : 'Biology';

        for (const set of flagships) {
          try {
            const filePath = path.join(process.cwd(), set.file);
            if (fs.existsSync(filePath)) {
              sortedBaseline.push({
                id: `virtual-${subjectLower}-${set.id.toLowerCase()}`,
                test_name: set.label,
                subject: normalizedSubject,
                exam_context: examContext || 'KCET',
                status: 'completed',
                total_questions: 60,
                duration_minutes: 80,
                created_at: new Date().toISOString(),
                is_virtual: true,
                official_set_id: `${prefix}-${set.id}`, // Locked subject-specific set ID
                label: set.label
              });
            }
          } catch (e) {
            console.error(`Failed to inject virtual flagship ${set.id}:`, e);
          }
        }
      }

      // --- Aggressive Forensic Deduplication ---
      const unique = [];
      const seenOfficialSets = new Set();
      const seenNames = new Set();

      // Sort: Virtual/Official Blueprints FIRST, then by Date
      const sorted = sortedBaseline.sort((a, b) => {
        if (a.is_virtual && !b.is_virtual) return -1;
        if (!a.is_virtual && b.is_virtual) return 1;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      sorted.forEach(item => {
        const name = (item.testName || item.test_name || '').toUpperCase();
        
        // Identify the "Set" (A or B)
        let setType = 'CUSTOM';
        if (item.official_set_id?.includes('SET-B') || item.setId?.includes('SET-B') || name.includes('SET-B') || name.includes('SET B')) {
          setType = 'SET-B';
        } else if (item.official_set_id?.includes('SET-A') || item.setId?.includes('SET-A') || name.includes('SET-A') || name.includes('SET A')) {
          setType = 'SET-A';
        }

        if (setType !== 'CUSTOM') {
          // Force EXACTLY ONE card per Set Type (SET-A, SET-B)
          if (!seenOfficialSets.has(setType)) {
            seenOfficialSets.add(setType);
            unique.push({
              ...item,
              testName: item.test_name || item.testName,
              durationMinutes: item.duration_minutes || 80,
              totalQuestions: item.total_questions || 60,
              isOfficialBlueprint: true
            });
          }
        } else if (!seenNames.has(name)) {
          seenNames.add(name);
          unique.push({
            ...item,
            testName: item.test_name,
            durationMinutes: item.duration_minutes,
            totalQuestions: item.total_questions
          });
        }
      });

      res.json({
        success: true,
        data: unique
      });
    } catch (error) {
      console.error('❌ Error fetching official tests:', error);
      res.status(500).json({ error: 'Failed to load official prediction papers' });
    }
  }

  // Export all handlers
  export const learningJourneyHandlers = {
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
    getWeakTopics,
    createCustomTest,
    getTestTemplates,
    countAvailableQuestions,
    getGenerationProgress,
    getOfficialTests
  };
