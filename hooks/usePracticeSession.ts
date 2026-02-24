/**
 * usePracticeSession Hook
 *
 * Manages persistent practice sessions with database storage
 * - Saves answers across sessions (per user)
 * - Tracks bookmarks
 * - Records time spent per question
 * - Updates mastery levels
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';
import type { AnalyzedQuestion, Subject, ExamContext } from '../types';

interface PracticeAnswer {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  timeSpentSeconds: number;
  attemptCount: number;
}

interface UsePracticeSessionProps {
  topicResourceId: string;
  topicId: string;
  topicName: string;
  subject: Subject;
  examContext: ExamContext;
  questions: AnalyzedQuestion[];
  onProgressUpdate?: (silent?: boolean) => void;
}

interface PracticeSessionState {
  // Answer state
  savedAnswers: Map<string, number>; // questionId -> selected option index
  validatedAnswers: Map<string, boolean>; // questionId -> is correct

  // Bookmark state
  bookmarkedIds: Set<string>;

  // Time tracking
  questionStartTimes: Map<string, number>; // questionId -> timestamp when started
  timeSpentPerQuestion: Map<string, number>; // questionId -> total seconds spent

  // Session metadata
  sessionId: string | null;
  authenticatedTopicResourceId: string | null;
  isLoading: boolean;
  isSaving: boolean;
}

export const usePracticeSession = ({
  topicResourceId,
  topicId,
  topicName,
  subject,
  examContext,
  questions,
  onProgressUpdate
}: UsePracticeSessionProps) => {
  const { user } = useAuth();

  const [state, setState] = useState<PracticeSessionState>({
    savedAnswers: new Map(),
    validatedAnswers: new Map(),
    bookmarkedIds: new Set(),
    questionStartTimes: new Map(),
    timeSpentPerQuestion: new Map(),
    sessionId: null,
    authenticatedTopicResourceId: null,
    isLoading: true,
    isSaving: false
  });

  // Track active question for time tracking
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const timeTrackingInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  /**
   * Load existing practice data from database
   */
  const loadPracticeData = useCallback(async () => {
    if (!user) {
      console.warn('⚠️ [usePracticeSession] User not authenticated');
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      console.log('📥 [usePracticeSession] Loading practice data for topic:', topicName);
      setState(prev => ({ ...prev, isLoading: true }));

      // 1. CRITICAL: Ensure topic_resource entry exists in database first
      // This provides the source-of-truth UUID that practice_answers and sessions MUST link to.
      // We do this BEFORE loading answers because it's the anchor for everything.
      const { data: resource, error: resourceError } = await supabase
        .from('topic_resources')
        .upsert({
          user_id: user.id,
          topic_id: topicId,
          subject,
          exam_context: examContext
        }, {
          onConflict: 'user_id,topic_id,exam_context'
        })
        .select('id')
        .single();

      if (resourceError) {
        console.error('❌ [usePracticeSession] Failed to ensure topic resource:', resourceError);
        throw resourceError;
      }

      const authenticatedTopicResourceId = resource.id;

      // 2. Get question IDs from current topic
      const questionIds = questions.map(q => q.id);

      console.log(`🔍 [usePracticeSession] SYNCING: ${questionIds.length} questions for topic: ${topicName}`);

      // Load saved answers and bookmarks if we have questions
      let answers: any[] = [];
      let bookmarks: any[] = [];

      if (questionIds.length > 0) {
        // Load saved answers for questions in this topic
        const { data: answersData, error: answersError } = await supabase
          .from('practice_answers')
          .select('question_id, selected_option, is_correct, time_spent_seconds')
          .in('question_id', questionIds);

        if (answersError) throw answersError;
        answers = answersData || [];

        // Load bookmarks for questions in this topic
        const { data: bookmarksData, error: bookmarksError } = await supabase
          .from('bookmarked_questions')
          .select('question_id')
          .in('question_id', questionIds);

        if (bookmarksError) throw bookmarksError;
        bookmarks = bookmarksData || [];
      }

      // 4. Create or get active session linked to THIS validated resource ID
      const { data: sessions, error: sessionsError } = await supabase
        .from('practice_sessions')
        .select('id')
        .eq('topic_resource_id', authenticatedTopicResourceId)
        .eq('is_active', true)
        .limit(1);

      if (sessionsError) throw sessionsError;

      let sessionId = sessions?.[0]?.id;

      if (!sessionId) {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('practice_sessions')
          .insert({
            user_id: user.id,
            topic_resource_id: authenticatedTopicResourceId,
            subject,
            exam_context: examContext,
            topic_name: topicName,
            is_active: true
          })
          .select('id')
          .single();

        if (createError) {
          // If 409 Conflict (race condition), re-query
          if ((createError as any).code === '23505' || createError.message?.includes('duplicate')) {
            const { data: retry } = await supabase
              .from('practice_sessions')
              .select('id')
              .eq('topic_resource_id', authenticatedTopicResourceId)
              .eq('is_active', true)
              .single();

            if (retry) sessionId = retry.id;
            else throw createError;
          } else {
            console.error('❌ Failed to create session:', createError);
            throw createError;
          }
        } else {
          sessionId = newSession.id;
        }
      }

      // Build state maps
      const answersMap = new Map<string, number>();
      const validatedMap = new Map<string, boolean>();
      const timeMap = new Map<string, number>();

      answers?.forEach(a => {
        answersMap.set(a.question_id, a.selected_option);
        validatedMap.set(a.question_id, a.is_correct);
        timeMap.set(a.question_id, a.time_spent_seconds || 0);
      });

      const bookmarksSet = new Set(bookmarks?.map(b => b.question_id) || []);

      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          savedAnswers: answersMap,
          validatedAnswers: validatedMap,
          bookmarkedIds: bookmarksSet,
          timeSpentPerQuestion: timeMap,
          sessionId,
          authenticatedTopicResourceId,
          isLoading: false
        }));
      }

      console.log(`📥 [usePracticeSession] Loaded practice data for topic ${topicName}:`, {
        answers: answersMap.size,
        bookmarks: bookmarksSet.size,
        sessionId,
        authenticatedTopicResourceId,
        questionCount: questionIds.length
      });

    } catch (error) {
      console.error('❌ [usePracticeSession] Error loading practice data:', error);
      if (isMounted.current) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [user?.id, topicId, topicResourceId, topicName, subject, examContext, questions]); // Full dependency set

  /**
   * Save answer to database
   */
  const saveAnswer = useCallback(async (
    questionId: string,
    selectedOption: number,
    isCorrect: boolean
  ) => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, isSaving: true }));

      // Get time spent on this question
      const timeSpent = state.timeSpentPerQuestion.get(questionId) || 0;

      // Check if this is first attempt
      const existingAnswer = state.savedAnswers.has(questionId);
      const firstAttemptCorrect = !existingAnswer ? isCorrect : undefined;

      // Upsert answer
      // Link to verified database ID! Never use the prop directly to avoid ghost FKs
      const verifiedResourceId = state.authenticatedTopicResourceId || topicResourceId;

      const { error } = await supabase
        .from('practice_answers')
        .upsert({
          user_id: user.id,
          question_id: questionId,
          topic_resource_id: verifiedResourceId,
          selected_option: selectedOption,
          is_correct: isCorrect,
          time_spent_seconds: timeSpent,
          attempt_count: existingAnswer ? state.savedAnswers.get(questionId) !== selectedOption ? 2 : 1 : 1,
          ...(firstAttemptCorrect !== undefined && { first_attempt_correct: firstAttemptCorrect })
        }, {
          onConflict: 'user_id,question_id'
        });

      if (error) {
        console.error('❌ Failed to save answer:', error);
        throw error;
      }

      // Update local state and get current values for sync
      const nextSavedAnswers = new Map(state.savedAnswers).set(questionId, selectedOption);
      const nextValidatedAnswers = new Map(state.validatedAnswers).set(questionId, isCorrect);

      setState(prev => ({
        ...prev,
        savedAnswers: nextSavedAnswers,
        validatedAnswers: nextValidatedAnswers,
        isSaving: false
      }));

      // Side-effect: Update stats asynchronously
      (async () => {
        try {
          // 1. Update session stats
          if (state.sessionId) {
            const attempted = nextValidatedAnswers.size;
            const correct = Array.from(nextValidatedAnswers.values()).filter(v => v).length;
            const totalTime = Array.from(state.timeSpentPerQuestion.values()).reduce((sum, t) => sum + t, 0);

            await supabase
              .from('practice_sessions')
              .update({
                questions_attempted: attempted,
                questions_correct: correct,
                total_time_seconds: totalTime,
                last_active_at: new Date().toISOString()
              })
              .eq('id', state.sessionId);
          }

          // 2. Recalculate global mastery
          const totalAttempted = nextValidatedAnswers.size;
          const totalCorrect = Array.from(nextValidatedAnswers.values()).filter(v => v).length;
          const absoluteAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

          const { data: currentStats } = await supabase
            .from('topic_resources')
            .select('quizzes_taken, notes_completed, mastery_level, study_stage')
            .eq('user_id', user.id)
            .eq('topic_id', topicId)
            .eq('exam_context', examContext)
            .maybeSingle();

          const quizzesTaken = currentStats?.quizzes_taken || 0;
          const isNotesDone = currentStats?.notes_completed || false;
          const poolSize = questions?.length || 10;
          const saturationTarget = Math.min(poolSize, Math.max(15, Math.floor(poolSize * 0.5)));
          const coverageWeight = Math.min(1, totalAttempted / Math.max(1, saturationTarget));

          const calculatedMastery = Math.min(100, Math.round(
            (absoluteAccuracy * 0.60 * coverageWeight) +
            Math.min(20, quizzesTaken * 10) +
            Math.min(10, Math.floor(totalAttempted / 10) * 5) +
            (isNotesDone ? 10 : 0)
          ));

          let nextStage = currentStats?.study_stage || 'not_started';
          if (nextStage === 'not_started' || nextStage === 'studying_notes') nextStage = 'practicing';
          if (calculatedMastery >= 90 && quizzesTaken >= 2) nextStage = 'mastered';

          await supabase
            .from('topic_resources')
            .upsert({
              user_id: user.id,
              topic_id: topicId,
              subject,
              exam_context: examContext,
              questions_attempted: totalAttempted,
              questions_correct: totalCorrect,
              average_accuracy: absoluteAccuracy,
              mastery_level: calculatedMastery,
              study_stage: nextStage,
              last_practiced: new Date().toISOString()
            }, {
              onConflict: 'user_id,topic_id,exam_context'
            });

          onProgressUpdate?.(true);
        } catch (e) {
          console.error('❌ [usePracticeSession] Failed to update stats:', e);
        }
      })();

      console.log('💾 [usePracticeSession] Saved answer:', { questionId, selectedOption, isCorrect });

    } catch (error) {
      console.error('❌ [usePracticeSession] Error saving answer:', error);
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, [user?.id, state.savedAnswers, state.timeSpentPerQuestion, state.sessionId, state.authenticatedTopicResourceId, topicResourceId, topicId, subject, examContext, topicName, questions]);

  /**
   * Toggle bookmark
   */
  const toggleBookmark = useCallback(async (questionId: string) => {
    if (!user) return;

    try {
      const isBookmarked = state.bookmarkedIds.has(questionId);

      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarked_questions')
          .delete()
          .eq('question_id', questionId);

        if (error) throw error;

        setState(prev => {
          const newBookmarks = new Set(prev.bookmarkedIds);
          newBookmarks.delete(questionId);
          return { ...prev, bookmarkedIds: newBookmarks };
        });

        console.log('🔖 [usePracticeSession] Removed bookmark:', questionId);

      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarked_questions')
          .insert({
            user_id: user.id,
            question_id: questionId,
            topic_resource_id: null, // In-memory topics don't exist in topic_resources table
            subject,
            exam_context: examContext
          });

        if (error) {
          console.error('❌ Failed to add bookmark:', error);
          throw error;
        }

        setState(prev => {
          const newBookmarks = new Set(prev.bookmarkedIds);
          newBookmarks.add(questionId);
          return { ...prev, bookmarkedIds: newBookmarks };
        });

        console.log('🔖 [usePracticeSession] Added bookmark:', questionId);
      }

    } catch (error) {
      console.error('❌ [usePracticeSession] Error toggling bookmark:', error);
    }
  }, [user?.id, subject, examContext, state.bookmarkedIds]);

  /**
   * Start tracking time for a question
   */
  const startQuestionTimer = useCallback((questionId: string) => {
    setActiveQuestionId(questionId);

    setState(prev => ({
      ...prev,
      questionStartTimes: new Map(prev.questionStartTimes).set(questionId, Date.now())
    }));
  }, []);

  /**
   * Stop tracking time for a question
   */
  const stopQuestionTimer = useCallback((questionId: string) => {
    const startTime = state.questionStartTimes.get(questionId);
    if (!startTime) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const previousTime = state.timeSpentPerQuestion.get(questionId) || 0;

    setState(prev => ({
      ...prev,
      timeSpentPerQuestion: new Map(prev.timeSpentPerQuestion).set(questionId, previousTime + timeSpent),
      questionStartTimes: new Map(prev.questionStartTimes)
    }));

    state.questionStartTimes.delete(questionId);

    if (activeQuestionId === questionId) {
      setActiveQuestionId(null);
    }
  }, [state.questionStartTimes, state.timeSpentPerQuestion, activeQuestionId]);

  /**
   * Update session statistics
   */
  const updateSessionStats = useCallback(async () => {
    if (!user || !supabase || !state.sessionId) return;

    try {
      const attempted = state.validatedAnswers.size;
      const correct = Array.from(state.validatedAnswers.values()).filter(v => v).length;
      const totalTime = Array.from(state.timeSpentPerQuestion.values()).reduce((sum, t) => sum + t, 0);

      await supabase
        .from('practice_sessions')
        .update({
          questions_attempted: attempted,
          questions_correct: correct,
          total_time_seconds: totalTime,
          last_active_at: new Date().toISOString()
        })
        .eq('id', state.sessionId);

    } catch (error) {
      console.error('❌ [usePracticeSession] Error updating session stats:', error);
    }
  }, [user?.id, state.sessionId, state.validatedAnswers, state.timeSpentPerQuestion]);

  /**
   * Get statistics for a specific question
   */
  const getQuestionStats = useCallback((questionId: string) => {
    return {
      hasAnswer: state.savedAnswers.has(questionId),
      selectedOption: state.savedAnswers.get(questionId),
      isCorrect: state.validatedAnswers.get(questionId),
      timeSpent: state.timeSpentPerQuestion.get(questionId) || 0,
      isBookmarked: state.bookmarkedIds.has(questionId)
    };
  }, [state.savedAnswers, state.validatedAnswers, state.timeSpentPerQuestion, state.bookmarkedIds]);

  /**
   * Get overall session statistics
   */
  const getSessionStats = useCallback(() => {
    const attempted = state.validatedAnswers.size;
    const correct = Array.from(state.validatedAnswers.values()).filter(v => v).length;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const totalTime = Array.from(state.timeSpentPerQuestion.values()).reduce((sum, t) => sum + t, 0);
    const avgTime = attempted > 0 ? Math.round(totalTime / attempted) : 0;

    return {
      attempted,
      correct,
      accuracy,
      totalTime,
      avgTime,
      bookmarked: state.bookmarkedIds.size
    };
  }, [state.validatedAnswers, state.timeSpentPerQuestion, state.bookmarkedIds]);

  /**
   * Clear all practice progress for this topic (Retake functionality)
   */
  const clearProgress = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔄 [usePracticeSession] Clearing all progress for topic:', topicName);

      const questionIds = questions.map(q => q.id);

      // Delete all answers for these questions
      const { error: answersError } = await supabase
        .from('practice_answers')
        .delete()
        .in('question_id', questionIds);

      if (answersError) throw answersError;

      // Delete all bookmarks for these questions
      const { error: bookmarksError } = await supabase
        .from('bookmarked_questions')
        .delete()
        .in('question_id', questionIds);

      if (bookmarksError) throw bookmarksError;

      // Mark session as inactive
      if (state.sessionId) {
        await supabase
          .from('practice_sessions')
          .update({ is_active: false })
          .eq('id', state.sessionId);
      }

      // Reset local state
      setState(prev => ({
        ...prev,
        savedAnswers: new Map(),
        validatedAnswers: new Map(),
        bookmarkedIds: new Set(),
        questionStartTimes: new Map(),
        timeSpentPerQuestion: new Map(),
        sessionId: null
      }));

      console.log('✅ [usePracticeSession] Progress cleared successfully');

      // Reload to create new session
      await loadPracticeData();

    } catch (error) {
      console.error('❌ [usePracticeSession] Error clearing progress:', error);
      throw error;
    }
  }, [user?.id, topicName, questions, state.sessionId, loadPracticeData, topicId, examContext, subject]);

  // Load practice data on mount
  useEffect(() => {
    loadPracticeData();
  }, [loadPracticeData]);

  // Cleanup: Stop all timers on unmount
  useEffect(() => {
    return () => {
      if (timeTrackingInterval.current) {
        clearInterval(timeTrackingInterval.current);
      }
      // Save any active timer
      if (activeQuestionId) {
        stopQuestionTimer(activeQuestionId);
      }
    };
  }, [activeQuestionId, stopQuestionTimer]);

  return {
    // State
    savedAnswers: state.savedAnswers,
    validatedAnswers: state.validatedAnswers,
    bookmarkedIds: state.bookmarkedIds,
    timeSpentPerQuestion: state.timeSpentPerQuestion,
    isLoading: state.isLoading,
    isSaving: state.isSaving,

    // Actions
    saveAnswer,
    toggleBookmark,
    startQuestionTimer,
    stopQuestionTimer,
    getQuestionStats,
    getSessionStats,
    clearProgress,

    // Utilities
    reload: loadPracticeData
  };
};
