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
  topicName: string;
  subject: Subject;
  examContext: ExamContext;
  questions: AnalyzedQuestion[];
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
  isLoading: boolean;
  isSaving: boolean;
}

export const usePracticeSession = ({
  topicResourceId,
  topicName,
  subject,
  examContext,
  questions
}: UsePracticeSessionProps) => {
  const { user } = useAuth();

  const [state, setState] = useState<PracticeSessionState>({
    savedAnswers: new Map(),
    validatedAnswers: new Map(),
    bookmarkedIds: new Set(),
    questionStartTimes: new Map(),
    timeSpentPerQuestion: new Map(),
    sessionId: null,
    isLoading: true,
    isSaving: false
  });

  // Track active question for time tracking
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const timeTrackingInterval = useRef<NodeJS.Timeout | null>(null);

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

      // Get question IDs from current topic
      const questionIds = questions.map(q => q.id);

      if (questionIds.length === 0) {
        console.log('📥 [usePracticeSession] No questions in topic, skipping load');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Load saved answers for questions in this topic
      const { data: answers, error: answersError } = await supabase
        .from('practice_answers')
        .select('question_id, selected_option, is_correct, time_spent_seconds')
        .in('question_id', questionIds);

      if (answersError) throw answersError;

      // Load bookmarks for questions in this topic
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('bookmarked_questions')
        .select('question_id')
        .in('question_id', questionIds);

      if (bookmarksError) throw bookmarksError;

      // Create or get active session (match by topic_name, subject, exam_context since topic_resource_id is NULL)
      const { data: sessions, error: sessionsError } = await supabase
        .from('practice_sessions')
        .select('id')
        .eq('topic_name', topicName)
        .eq('subject', subject)
        .eq('exam_context', examContext)
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
            topic_resource_id: null, // In-memory topics don't exist in topic_resources table
            subject,
            exam_context: examContext,
            topic_name: topicName
          })
          .select('id')
          .single();

        if (createError) {
          console.error('❌ Failed to create session:', createError);
          throw createError;
        }
        sessionId = newSession.id;
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

      setState(prev => ({
        ...prev,
        savedAnswers: answersMap,
        validatedAnswers: validatedMap,
        bookmarkedIds: bookmarksSet,
        timeSpentPerQuestion: timeMap,
        sessionId,
        isLoading: false
      }));

      console.log('📥 [usePracticeSession] Loaded practice data:', {
        answers: answersMap.size,
        bookmarks: bookmarksSet.size,
        sessionId
      });

    } catch (error) {
      console.error('❌ [usePracticeSession] Error loading practice data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id, topicName, subject, examContext, questions]); // Use user.id to prevent unnecessary reloads

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
      const { error } = await supabase
        .from('practice_answers')
        .upsert({
          user_id: user.id,
          question_id: questionId,
          topic_resource_id: null, // In-memory topics don't exist in topic_resources table
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

      // Update local state FIRST, then stats
      setState(prev => {
        const newSavedAnswers = new Map(prev.savedAnswers).set(questionId, selectedOption);
        const newValidatedAnswers = new Map(prev.validatedAnswers).set(questionId, isCorrect);

        // Calculate stats immediately with new values
        const attempted = newValidatedAnswers.size;
        const correct = Array.from(newValidatedAnswers.values()).filter(v => v).length;
        const totalTime = Array.from(prev.timeSpentPerQuestion.values()).reduce((sum, t) => sum + t, 0);

        // Update session stats in database (async, don't wait)
        if (state.sessionId) {
          supabase
            .from('practice_sessions')
            .update({
              questions_attempted: attempted,
              questions_correct: correct,
              total_time_seconds: totalTime,
              last_active_at: new Date().toISOString()
            })
            .eq('id', state.sessionId)
            .then(() => console.log('📊 [usePracticeSession] Updated session stats'))
            .catch(err => console.error('❌ Failed to update session stats:', err));
        }

        return {
          ...prev,
          savedAnswers: newSavedAnswers,
          validatedAnswers: newValidatedAnswers,
          isSaving: false
        };
      });

      console.log('💾 [usePracticeSession] Saved answer:', { questionId, selectedOption, isCorrect });

    } catch (error) {
      console.error('❌ [usePracticeSession] Error saving answer:', error);
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, [user?.id, state.savedAnswers, state.timeSpentPerQuestion, state.sessionId]);

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
  }, [user?.id, topicName, questions, state.sessionId, loadPracticeData]);

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
