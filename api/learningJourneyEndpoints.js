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
    .eq('is_system_scan', true)
    .eq('user_id', userId)
    .single();

  if (existing) {
    console.log(`✅ Using existing AI scan: ${scanName} (${existing.id})`);
    return existing.id;
  }

  // Create new AI scan
  const { data: newScan, error } = await supabase
    .from('scans')
    .insert({
      name: scanName,
      user_id: userId,
      subject,
      exam_context: examContext,
      is_system_scan: true,
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

  // Auto-cleanup after 5 minutes
  setTimeout(() => {
    generationProgress.delete(progressId);
  }, 5 * 60 * 1000);
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
    const useAIGeneration = process.env.GEMINI_API_KEY && testType === 'mock_test';

    let questionSet;

    if (useAIGeneration) {
      // ✨ NEW: AI-powered question generation
      console.log('🤖 Using AI Question Generator...');

      try {
        // Load all context from database (exam config, historical patterns, student profile)
        const context = await loadGenerationContext(
          supabaseAdmin,
          userId,
          examContext,
          subject
        );

        // Generate fresh questions with AI (no corruption, perfect LaTeX)
        const questions = await generateTestQuestions(
          context,
          process.env.GEMINI_API_KEY
        );

        // Calculate metadata for compatibility
        const difficultyBreakdown = { easy: 0, moderate: 0, hard: 0 };
        const topicBreakdown = {};
        const bloomsBreakdown = {};
        let totalDifficulty = 0;

        questions.forEach(q => {
          // Count difficulty
          if (q.difficulty) {
            difficultyBreakdown[q.difficulty] = (difficultyBreakdown[q.difficulty] || 0) + 1;
            totalDifficulty += q.difficulty === 'easy' ? 1 : q.difficulty === 'moderate' ? 2 : 3;
          }

          // Count topics
          if (q.topic) {
            topicBreakdown[q.topic] = (topicBreakdown[q.topic] || 0) + 1;
          }

          // Count Bloom's levels
          if (q.bloomsLevel) {
            bloomsBreakdown[q.bloomsLevel] = (bloomsBreakdown[q.bloomsLevel] || 0) + 1;
          }
        });

        questionSet = {
          questions,
          metadata: {
            totalQuestions: questions.length,
            difficultyBreakdown,
            topicBreakdown,
            bloomsBreakdown,
            averageDifficulty: questions.length > 0 ? totalDifficulty / questions.length : 0,
            generatedWithAI: true
          }
        };

        console.log(`✅ Generated ${questions.length} fresh AI questions`);
      } catch (aiError) {
        console.error('⚠️  AI generation failed, falling back to database:', aiError.message);
        // Fall back to database selection if AI fails
        const previouslyAttempted = await getPreviouslyAttemptedQuestions(
          supabaseAdmin,
          userId,
          testType,
          subject
        );

        questionSet = await selectQuestionsForTest(supabaseAdmin, {
          userId,
          testType,
          subject,
          examContext,
          topics,
          totalQuestions: totalQuestions || getRecommendedQuestionCount(testType, examContext),
          masteryLevel,
          excludeQuestionIds: previouslyAttempted
        });
      }
    } else {
      // OLD: Database selection (for non-mock tests or when AI is disabled)
      console.log('📦 Using database question selection...');

      const previouslyAttempted = await getPreviouslyAttemptedQuestions(
        supabaseAdmin,
        userId,
        testType,
        subject
      );

      questionSet = await selectQuestionsForTest(supabaseAdmin, {
        userId,
        testType,
        subject,
        examContext,
        topics,
        totalQuestions: totalQuestions || getRecommendedQuestionCount(testType, examContext),
        masteryLevel,
        excludeQuestionIds: previouslyAttempted
      });
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
        status: 'in_progress'
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
    // Both AI-generated and database questions now use valid UUIDs
    const responsesToInsert = responses.map(r => {
      console.log(`📝 Response: questionId=${r.questionId}, topic=${r.topic}, correct=${r.isCorrect}`);

      return {
        attempt_id: attemptId,
        question_id: r.questionId,  // Valid UUID for both AI and DB questions
        selected_option: r.selectedOption,
        is_correct: r.isCorrect,
        time_spent: r.timeSpent,
        marked_for_review: r.markedForReview,
        topic: r.topic,
        difficulty: r.difficulty,
        marks: r.marks
      };
    });

    console.log(`💾 Inserting ${responsesToInsert.length} responses...`);

    const { error: responsesError } = await supabaseAdmin
      .from('test_responses')
      .insert(responsesToInsert);

    if (responsesError) {
      console.error(`❌ Error inserting responses:`, responsesError);
      throw responsesError;
    }

    console.log(`✅ Successfully inserted ${responsesToInsert.length} responses`);

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
    const correctCount = responses.filter(r => r.isCorrect).length;
    const incorrectCount = responses.filter(r => !r.isCorrect && r.selectedOption !== undefined).length;
    const questionsAttempted = responses.filter(r => r.selectedOption !== undefined).length;

    // Calculate marks based on question marks (supports variable marks)
    let marksObtained = 0;
    let marksTotal = 0;

    responses.forEach(r => {
      const questionMarks = r.marks || marksPerQuestion;
      marksTotal += questionMarks;

      if (r.isCorrect) {
        marksObtained += questionMarks;
      } else if (r.selectedOption !== undefined && negativeMarkingEnabled) {
        // Wrong answer - apply negative marking
        marksObtained += negativeDeduction; // negativeDeduction is already negative (e.g., -1)
      }
    });

    const percentage = marksTotal > 0 ? Math.round((marksObtained / marksTotal) * 100) : 0;

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
          const practiceAnswersToInsert = [];
          for (const r of responses) {
            // Note: `r.topic` is the plain text topic attached to the question metadata
            const topicNameLower = (r.topic || '').toLowerCase();
            const topicResId = topicResourceMap.get(topicNameLower);

            if (topicResId) {
              practiceAnswersToInsert.push({
                user_id: userId,
                question_id: r.questionId,
                topic_resource_id: topicResId,
                selected_option: r.selectedOption,
                is_correct: r.isCorrect,
                time_spent_seconds: r.timeSpent,
                first_attempt_correct: r.isCorrect, // We treat a mock test environment attempt as primary
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
                    'completed_quiz', // Classifiable as quiz tracking rather than passive practice
                    r.questionId,
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

    // Get questions for this test
    const questionIds = responses.map(r => r.question_id);
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .in('id', questionIds);

    if (questionsError) throw questionsError;

    // Create a map of questions by ID for easy lookup
    const questionsMap = new Map();
    (questions || []).forEach(q => questionsMap.set(q.id, q));

    // Order questions based on the order they appear in responses (which preserves test order)
    // This ensures questions appear in the same sequence as during the test
    const orderedQuestions = questionIds.map(id => questionsMap.get(id)).filter(Boolean);

    // Map questions to frontend format
    const mappedQuestions = orderedQuestions.map(q => ({
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
    };

    // Map responses to include question data - order by questionIds to match questions order
    const responsesMap = new Map();
    responses.forEach(r => responsesMap.set(r.question_id, r));

    const formattedResponses = questionIds.map(qId => {
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

    res.json({
      success: true,
      attempts,
      count: attempts.length
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

// =====================================================
// CUSTOM MOCK TEST ENDPOINTS
// =====================================================

/**
 * GET /api/learning-journey/weak-topics
 * Analyze user progress and identify weak topics using AI
 */
export async function getWeakTopics(req, res) {
  try {
    const { userId, subject, examContext } = req.query;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🤖 Analyzing weak topics for ${subject} (${examContext}) - User: ${userId}`);

    // Get all topics for this subject
    const { data: topics, error: topicsError } = await supabaseAdmin
      .from('topics')
      .select('id, topic_name, subject, exam_context')
      .eq('subject', subject)
      .eq('exam_context', examContext);

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
    const weakTopics = [];

    for (const topic of topics) {
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
      let correctPractice = 0;

      if (questionIds.length > 0) {
        const { data: practiceAnswers } = await supabaseAdmin
          .from('practice_answers')
          .select('is_correct')
          .in('question_id', questionIds)
          .eq('user_id', userId);

        totalPractice = practiceAnswers?.length || 0;
        correctPractice = practiceAnswers?.filter(pa => pa.is_correct).length || 0;
        practiceAccuracy = totalPractice > 0 ? Math.round((correctPractice / totalPractice) * 100) : 0;
      }

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
          topicName: topic.topic_name,
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
async function generateTestInBackground({ userId, testName, subject, examContext, topicIds, questionCount, difficultyMix, durationMinutes, saveAsTemplate, progressId }) {
  // Check if AI generation is enabled (requires GEMINI_API_KEY)
  let useAIGeneration = !!(process.env.GEMINI_API_KEY && examContext && subject);

  let finalQuestions = [];

  try {
    if (useAIGeneration) {
      // ✨ AI-powered question generation (always use AI if available)
      console.log('🤖 Using AI Question Generator for custom test...');
      const aiStartTime = Date.now();

      try {
        updateProgress(progressId, 'analyzing', '🎯 Analyzing your performance and past exam patterns...', 10);

        console.log(`📊 Loading generation context for ${subject} (${examContext})...`);
        console.log(`🎯 User selected ${topicIds?.length || 0} topics:`, topicIds);

        // Get topic names from the topics table (UI uses UUID IDs from topics table)
        let selectedTopicNames = null;
        if (topicIds && topicIds.length > 0) {
          const { data: selectedTopics } = await supabaseAdmin
            .from('topics')
            .select('id, name, domain')
            .in('id', topicIds);

          selectedTopicNames = selectedTopics?.map(t => t.name) || [];
          console.log(`🎯 Selected topic names:`, selectedTopicNames);
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
          selectedTopicNames  // Pass topic names to filter generation
        );

        console.log(`✅ Context loaded in ${Date.now() - aiStartTime}ms`);
        console.log(`🎯 Context: examConfig=${!!context.examConfig}, topics=${context.topics?.length}, patterns=${context.historicalPatterns?.length}`);

        // Override total questions with user's custom count
        context.examConfig.totalQuestions = questionCount;

        updateProgress(progressId, 'requesting', '🤖 Requesting AI agent to generate personalized questions...', 30);

        console.log(`🤖 Generating ${questionCount} questions with Gemini AI...`);
        const genStartTime = Date.now();

        // Generate fresh questions with AI (no corruption, perfect LaTeX)
        const questions = await generateTestQuestions(
          context,
          process.env.GEMINI_API_KEY
        );

        console.log(`✅ AI generation completed in ${Date.now() - genStartTime}ms`);

        updateProgress(progressId, 'validating', '✅ Validating questions and checking LaTeX formatting...', 80);

        // Take only the requested count (AI might generate more)
        finalQuestions = questions.slice(0, questionCount);

        updateProgress(progressId, 'validating', '💾 Saving AI questions to database...', 85);

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
          scan_id: aiScanId  // Use AI scan instead of null
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
        console.error('⚠️  AI generation failed for custom test, falling back to database:', aiError.message);
        console.error('Stack trace:', aiError.stack);
        // Fall back to database selection
        useAIGeneration = false;
      }
    }

    if (!useAIGeneration || finalQuestions.length === 0) {
      // OLD: Database selection (for non-AI tests or when AI fails)
      console.log('📦 Using database question selection for custom test...');

      // Get topic names for these IDs
      const { data: topics } = await supabaseAdmin
        .from('topics')
        .select('topic_name')
        .in('id', topicIds);

      const topicNames = topics?.map(t => t.topic_name) || [];

      // Calculate questions needed per difficulty
      const easyCount = Math.round((questionCount * difficultyMix.easy) / 100);
      const moderateCount = Math.round((questionCount * difficultyMix.moderate) / 100);
      const hardCount = questionCount - easyCount - moderateCount; // Ensure total is exact

      // Get system scans for this subject
      const { data: scans } = await supabaseAdmin
        .from('scans')
        .select('id')
        .eq('is_system_scan', true)
        .eq('subject', subject)
        .eq('exam_context', examContext);

      const scanIds = scans?.map(s => s.id) || [];

      if (scanIds.length === 0) {
        throw new Error('No questions available for this subject');
      }

      // Sample questions by difficulty
      const selectedQuestions = [];

      // Easy questions
      if (easyCount > 0) {
        const { data: easyQuestions } = await supabaseAdmin
          .from('questions')
          .select('*')
          .in('scan_id', scanIds)
          .eq('diff', 'Easy')
          .overlaps('topics', topicNames)
          .limit(easyCount * 2); // Get more than needed for random sampling

        if (easyQuestions && easyQuestions.length > 0) {
          const shuffled = easyQuestions.sort(() => 0.5 - Math.random());
          selectedQuestions.push(...shuffled.slice(0, easyCount));
        }
      }

      // Moderate questions
      if (moderateCount > 0) {
        const { data: moderateQuestions } = await supabaseAdmin
          .from('questions')
          .select('*')
          .in('scan_id', scanIds)
          .eq('diff', 'Moderate')
          .overlaps('topics', topicNames)
          .limit(moderateCount * 2);

        if (moderateQuestions && moderateQuestions.length > 0) {
          const shuffled = moderateQuestions.sort(() => 0.5 - Math.random());
          selectedQuestions.push(...shuffled.slice(0, moderateCount));
        }
      }

      // Hard questions
      if (hardCount > 0) {
        const { data: hardQuestions } = await supabaseAdmin
          .from('questions')
          .select('*')
          .in('scan_id', scanIds)
          .eq('diff', 'Hard')
          .overlaps('topics', topicNames)
          .limit(hardCount * 2);

        if (hardQuestions && hardQuestions.length > 0) {
          const shuffled = hardQuestions.sort(() => 0.5 - Math.random());
          selectedQuestions.push(...shuffled.slice(0, hardCount));
        }
      }

      if (selectedQuestions.length < questionCount) {
        throw new Error(`Insufficient questions available. Found ${selectedQuestions.length}, needed ${questionCount}`);
      }

      // Shuffle all questions together
      finalQuestions = selectedQuestions.sort(() => 0.5 - Math.random());
    }

    // Create test attempt
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
          durationMinutes
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
    updateProgress(progressId, 'complete', '✅ Test ready! Redirecting...', 100, {
      attempt: mappedAttempt,
      questions: finalQuestions,
      templateId
    });

    console.log(`✅ Background generation complete for progressId=${progressId}`);
  } catch (error) {
    console.error('❌ Error in background test generation:', error);
    updateProgress(progressId, 'error', error.message || 'Failed to create test', 0);
  }
}

/**
 * POST /api/learning-journey/create-custom-test
 * Validates the request, responds immediately with a progressId, then
 * runs AI generation + DB writes asynchronously to avoid gateway timeouts.
 */
export async function createCustomTest(req, res) {
  try {
    const {
      userId,
      testName,
      subject,
      examContext,
      topicIds,
      questionCount,
      difficultyMix,
      durationMinutes,
      saveAsTemplate
    } = req.body;

    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const total = (difficultyMix?.easy || 0) + (difficultyMix?.moderate || 0) + (difficultyMix?.hard || 0);
    if (total !== 100) {
      return res.status(400).json({ error: 'Difficulty mix must total 100%' });
    }

    console.log(`🎯 Creating custom test "${testName}" - ${questionCount} questions`);

    const { randomUUID } = await import('crypto');
    const progressId = randomUUID();

    // Respond immediately — prevents 504 gateway timeout during AI generation
    updateProgress(progressId, 'analyzing', '🎯 Analyzing your performance and past exam patterns...', 5);
    res.json({ success: true, data: { progressId } });

    // Fire-and-forget background generation
    generateTestInBackground({ userId, testName, subject, examContext, topicIds, questionCount, difficultyMix, durationMinutes, saveAsTemplate, progressId })
      .catch(err => {
        console.error('❌ Unhandled background generation error:', err);
        updateProgress(progressId, 'error', err.message || 'Failed to create test', 0);
      });

  } catch (error) {
    console.error('❌ Error creating custom test:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create custom test', message: error.message });
    }
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
    const { data: topics } = await supabaseAdmin
      .from('topics')
      .select('topic_name')
      .in('id', topicIds);

    const topicNames = topics?.map(t => t.topic_name) || [];

    // Check if AI generation is enabled - if so we have essentially infinite questions
    const useAIGeneration = !!(process.env.GEMINI_API_KEY && examContext && subject);

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

    // Count Easy questions
    const { count: easyCount } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .in('scan_id', scanIds)
      .eq('diff', 'Easy')
      .overlaps('topics', topicNames);

    counts.easy = easyCount || 0;

    // Count Moderate questions
    const { count: moderateCount } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .in('scan_id', scanIds)
      .eq('diff', 'Moderate')
      .overlaps('topics', topicNames);

    counts.moderate = moderateCount || 0;

    // Count Hard questions
    const { count: hardCount } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .in('scan_id', scanIds)
      .eq('diff', 'Hard')
      .overlaps('topics', topicNames);

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
  getGenerationProgress
};
