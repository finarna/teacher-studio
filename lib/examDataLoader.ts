/**
 * Exam Data Loader
 *
 * Loads all exam configurations, patterns, and rules from database
 * NO hardcoded data - everything is data-driven
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ExamConfiguration,
  TopicMetadata,
  HistoricalExamData,
  StudentProfile,
  GenerationContext,
  GenerationRules
} from './aiQuestionGenerator';
import type { ExamContext, Subject } from '../types';

/**
 * Load exam configuration from database
 */
export async function loadExamConfiguration(
  supabase: SupabaseClient,
  examContext: ExamContext,
  subject: Subject
): Promise<ExamConfiguration> {
  const { data, error } = await supabase
    .from('exam_configurations')
    .select('*')
    .eq('exam_context', examContext)
    .eq('subject', subject)
    .single();

  if (error || !data) {
    throw new Error(`Exam configuration not found for ${examContext} ${subject}`);
  }

  return {
    examContext,
    subject,
    totalQuestions: data.total_questions,
    durationMinutes: data.duration_minutes,
    marksPerQuestion: data.marks_per_question || 'variable',
    passingPercentage: data.passing_percentage,
    negativeMarking: data.negative_marking_enabled ? {
      enabled: true,
      deduction: data.negative_marking_deduction
    } : undefined
  };
}

/**
 * Load all topics for a subject and exam
 */
export async function loadTopicMetadata(
  supabase: SupabaseClient,
  examContext: ExamContext,
  subject: Subject
): Promise<TopicMetadata[]> {
  const { data, error } = await supabase
    .from('topic_metadata')
    .select('*')
    .eq('exam_context', examContext)
    .eq('subject', subject);

  if (error) {
    console.error('Error loading topics:', error);
    return [];
  }

  const topics = (data || []).map(row => ({
    topicId: row.topic_id,
    topicName: row.topic_name,
    syllabus: row.syllabus || '',
    bloomsLevels: row.blooms_levels || ['Understand', 'Apply'],
    estimatedDifficulty: row.estimated_difficulty || 5,
    prerequisites: row.prerequisites || []
  }));

  console.log(`📊 [DEBUG] Loaded ${topics.length} topics from topic_metadata:`, topics.map(t => ({ id: t.topicId, name: t.topicName })));

  return topics;
}

/**
 * Load historical exam patterns
 */
export async function loadHistoricalPatterns(
  supabase: SupabaseClient,
  examContext: ExamContext,
  subject: Subject,
  yearsBack: number = 5
): Promise<HistoricalExamData[]> {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - yearsBack;

  // Fetch historical patterns
  const { data: patterns, error: patternsError } = await supabase
    .from('exam_historical_patterns')
    .select('*')
    .eq('exam_context', examContext)
    .eq('subject', subject)
    .gte('year', startYear)
    .order('year', { ascending: false });

  if (patternsError || !patterns) {
    console.warn(`No historical patterns found for ${examContext} ${subject}`);
    return [];
  }

  // For each pattern, load topic distributions
  const historicalData: HistoricalExamData[] = [];

  for (const pattern of patterns) {
    const { data: distributions, error: distError } = await supabase
      .from('exam_topic_distributions')
      .select('*')
      .eq('historical_pattern_id', pattern.id);

    if (distError || !distributions) continue;

    historicalData.push({
      year: pattern.year,
      examContext,
      subject,
      topicDistribution: distributions.map(d => ({
        topicId: d.topic_id,
        questionCount: d.question_count,
        averageMarks: d.average_marks || 1,
        difficultyBreakdown: {
          easy: d.difficulty_easy_count || 0,
          moderate: d.difficulty_moderate_count || 0,
          hard: d.difficulty_hard_count || 0
        }
      })),
      overallDifficulty: {
        easy: pattern.difficulty_easy_pct || 35,
        moderate: pattern.difficulty_moderate_pct || 45,
        hard: pattern.difficulty_hard_pct || 20
      },
      totalMarks: pattern.total_marks
    });
  }

  return historicalData;
}

/**
 * Load student's learning profile
 */
export async function loadStudentProfile(
  supabase: SupabaseClient,
  userId: string,
  examContext: ExamContext,
  subject: Subject
): Promise<StudentProfile> {
  // Load topic mastery from test responses
  const { data: responses, error } = await supabase
    .from('test_responses')
    .select(`
      *,
      test_attempts!inner(
        user_id,
        exam_context,
        subject,
        created_at
      )
    `)
    .eq('test_attempts.user_id', userId)
    .eq('test_attempts.exam_context', examContext)
    .eq('test_attempts.subject', subject);

  if (error) {
    console.error('Error loading student profile:', error);
  }

  // Aggregate by topic
  const topicStats = new Map<string, { correct: number; total: number; timeSpent: number; lastAttempt: string }>();

  (responses || []).forEach(r => {
    const topic = r.topic || 'Unknown';
    const stats = topicStats.get(topic) || { correct: 0, total: 0, timeSpent: 0, lastAttempt: '' };

    stats.total++;
    if (r.is_correct) stats.correct++;
    stats.timeSpent += r.time_spent || 0;
    stats.lastAttempt = r.created_at;

    topicStats.set(topic, stats);
  });

  // Convert to topic mastery array
  const topicMastery = Array.from(topicStats.entries()).map(([topic, stats]) => ({
    topicId: topic,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    attemptsCount: stats.total,
    lastAttemptDate: stats.lastAttempt,
    averageTimeSpent: stats.total > 0 ? Math.round(stats.timeSpent / stats.total) : 0
  }));

  const totalAttempts = responses?.length || 0;
  const correctAttempts = responses?.filter(r => r.is_correct).length || 0;
  const overallAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 50;

  return {
    userId,
    examContext,
    subject,
    topicMastery,
    overallAccuracy,
    studyStreak: 0, // TODO: Calculate from user activity
    targetExamDate: undefined // TODO: Load from user profile
  };
}

/**
 * Load generation rules
 */
export async function loadGenerationRules(
  supabase: SupabaseClient,
  examContext: ExamContext,
  subject?: Subject
): Promise<GenerationRules> {
  const { data, error } = await supabase
    .from('generation_rules')
    .select('*')
    .eq('exam_context', examContext)
    .eq('subject', subject || null)
    .single();

  if (error || !data) {
    // Return defaults if not found
    return {
      weights: {
        predictedExamPattern: 0.4,
        studentWeakAreas: 0.3,
        curriculumBalance: 0.2,
        recentTrends: 0.1
      },
      adaptiveDifficulty: {
        enabled: true,
        baselineAccuracy: 60,
        stepSize: 0.1
      },
      freshness: {
        avoidRecentQuestions: true,
        daysSinceLastAttempt: 30,
        maxRepetitionAllowed: 2
      }
    };
  }

  return {
    weights: {
      predictedExamPattern: data.weight_predicted_pattern,
      studentWeakAreas: data.weight_student_weak_areas,
      curriculumBalance: data.weight_curriculum_balance,
      recentTrends: data.weight_recent_trends
    },
    adaptiveDifficulty: {
      enabled: data.adaptive_difficulty_enabled,
      baselineAccuracy: data.adaptive_baseline_accuracy,
      stepSize: data.adaptive_step_size
    },
    freshness: {
      avoidRecentQuestions: data.avoid_recent_questions,
      daysSinceLastAttempt: data.days_since_last_attempt,
      maxRepetitionAllowed: data.max_repetition_allowed
    }
  };
}

/**
 * Load complete generation context
 * This is the main function to call before generating questions
 */
export async function loadGenerationContext(
  supabase: SupabaseClient,
  userId: string,
  examContext: ExamContext,
  subject: Subject,
  selectedTopicNames?: string[]
): Promise<GenerationContext> {
  console.log(`📦 Loading generation context for ${examContext} ${subject}...`);
  if (selectedTopicNames && selectedTopicNames.length > 0) {
    console.log(`🎯 Filtering to ${selectedTopicNames.length} selected topics:`, selectedTopicNames);
  }

  const [examConfig, allTopics, historicalData, studentProfile, generationRules] = await Promise.all([
    loadExamConfiguration(supabase, examContext, subject),
    loadTopicMetadata(supabase, examContext, subject),
    loadHistoricalPatterns(supabase, examContext, subject),
    loadStudentProfile(supabase, userId, examContext, subject),
    loadGenerationRules(supabase, examContext, subject)
  ]);

  // Filter topics if user selected specific ones (by topic name)
  const topics = selectedTopicNames && selectedTopicNames.length > 0
    ? allTopics.filter(t => {
        // Match by topic name (case-insensitive)
        const match = selectedTopicNames.some(name =>
          t.topicName.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(t.topicName.toLowerCase())
        );
        if (!match) {
          console.log(`📊 [DEBUG] Topic "${t.topicName}" NOT in selected names`);
        }
        return match;
      })
    : allTopics;

  if (selectedTopicNames && selectedTopicNames.length > 0 && topics.length === 0) {
    console.warn(`⚠️  [DEBUG] No topics matched! Selected names:`, selectedTopicNames);
    console.warn(`⚠️  [DEBUG] Available topic names:`, allTopics.map(t => t.topicName));
  }

  console.log(`✅ Loaded: ${topics.length} topics, ${historicalData.length} years of patterns`);

  return {
    examConfig,
    historicalData,
    studentProfile,
    topics,
    generationRules
  };
}
