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
      createdAt: updatedAttempt.created_at,
      completedAt: updatedAttempt.completed_at,
    };

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
 * POST /api/learning-journey/create-custom-test
 * Generate a custom mock test with specified configuration
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

    // Validate difficulty mix
    const total = difficultyMix.easy + difficultyMix.moderate + difficultyMix.hard;
    if (total !== 100) {
      return res.status(400).json({ error: 'Difficulty mix must total 100%' });
    }

    console.log(`🎯 Creating custom test "${testName}" - ${questionCount} questions`);

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
      return res.status(400).json({ error: 'No questions available for this subject' });
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
      return res.status(400).json({
        error: `Insufficient questions available. Found ${selectedQuestions.length}, needed ${questionCount}`
      });
    }

    // Shuffle all questions together
    const finalQuestions = selectedQuestions.sort(() => 0.5 - Math.random());

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

    res.json({
      success: true,
      data: {
        attempt,
        questions: finalQuestions,
        templateId
      }
    });
  } catch (error) {
    console.error('❌ Error creating custom test:', error);
    res.status(500).json({
      error: 'Failed to create custom test',
      message: error.message
    });
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
        byDifficulty: counts
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
  countAvailableQuestions
};
