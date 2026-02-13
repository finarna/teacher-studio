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

    console.log(`🧪 Generating ${testType} test for ${subject} (${examContext})`);

    // Get previously attempted questions to avoid repetition
    const previouslyAttempted = await getPreviouslyAttemptedQuestions(
      supabaseAdmin,
      userId,
      testType,
      subject
    );

    // Select questions
    const questionSet = await selectQuestionsForTest(supabaseAdmin, {
      userId,
      testType,
      subject,
      examContext,
      topics,
      totalQuestions: totalQuestions || getRecommendedQuestionCount(testType, examContext),
      masteryLevel,
      excludeQuestionIds: previouslyAttempted
    });

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

    res.json({
      success: true,
      attempt,
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

    // Verify attempt belongs to user
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('test_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: 'Test attempt not found' });
    }

    // Insert all responses
    const { error: responsesError } = await supabaseAdmin
      .from('test_responses')
      .insert(
        responses.map(r => ({
          attempt_id: attemptId,
          question_id: r.questionId,
          selected_option: r.selectedOption,
          is_correct: r.isCorrect,
          time_spent: r.timeSpent,
          marked_for_review: r.markedForReview,
          topic: r.topic,
          difficulty: r.difficulty,
          marks: r.marks
        }))
      );

    if (responsesError) throw responsesError;

    // Calculate score
    const correctCount = responses.filter(r => r.isCorrect).length;
    const percentage = Math.round((correctCount / responses.length) * 100);
    const questionsAttempted = responses.filter(r => r.selectedOption !== undefined).length;

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

    // Calculate time analysis
    const totalTime = responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    const avgTime = Math.round(totalTime / responses.length);

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
        marks_obtained: correctCount, // Simplified - should use actual marks
        marks_total: responses.length,
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

    res.json({
      success: true,
      attempt: updatedAttempt,
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

    // Get responses
    const { data: responses, error: responsesError } = await supabaseAdmin
      .from('test_responses')
      .select('*')
      .eq('attempt_id', attemptId);

    if (responsesError) throw responsesError;

    res.json({
      success: true,
      attempt,
      responses
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
  getTrajectoryProgress
};
