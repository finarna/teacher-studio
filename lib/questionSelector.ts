/**
 * Question Selection Algorithm
 *
 * CRITICAL: This service SELECTS from existing questions in the database.
 * It does NOT generate new questions or modify existing ones.
 * All content already exists - this just intelligently selects the best questions.
 */

import type {
  AnalyzedQuestion,
  ExamContext,
  Subject,
  TestType
} from '../types';

export interface SelectionCriteria {
  userId: string;
  testType: TestType;
  subject: Subject;
  examContext: ExamContext;
  topics?: string[]; // Topic IDs or names
  totalQuestions: number;
  masteryLevel?: number; // 0-100, for adaptive difficulty
  excludeQuestionIds?: string[]; // Questions to exclude (previously attempted)
  difficultyDistribution?: {
    easy: number;
    moderate: number;
    hard: number;
  };
}

export interface SelectedQuestionSet {
  questions: AnalyzedQuestion[];
  metadata: {
    totalQuestions: number;
    difficultyBreakdown: {
      easy: number;
      moderate: number;
      hard: number;
    };
    topicBreakdown: Record<string, number>;
    bloomsBreakdown: Record<string, number>;
    averageDifficulty: number;
  };
}

/**
 * Exam-specific difficulty distributions
 */
const EXAM_DIFFICULTY_PROFILES: Record<ExamContext, { easy: number; moderate: number; hard: number }> = {
  'KCET': { easy: 40, moderate: 45, hard: 15 },
  'NEET': { easy: 35, moderate: 45, hard: 20 },
  'JEE': { easy: 30, moderate: 40, hard: 30 },
  'CBSE': { easy: 45, moderate: 40, hard: 15 }
};

/**
 * Adaptive difficulty based on mastery level
 */
function getAdaptiveDifficulty(masteryLevel: number = 50): { easy: number; moderate: number; hard: number } {
  if (masteryLevel < 30) {
    // Beginner: More easy questions
    return { easy: 60, moderate: 30, hard: 10 };
  } else if (masteryLevel < 60) {
    // Intermediate: Balanced
    return { easy: 35, moderate: 45, hard: 20 };
  } else if (masteryLevel < 85) {
    // Advanced: More challenging
    return { easy: 25, moderate: 45, hard: 30 };
  } else {
    // Expert: Mostly hard
    return { easy: 15, moderate: 35, hard: 50 };
  }
}

/**
 * Main question selection function
 * Intelligently selects questions from existing pool
 */
export async function selectQuestionsForTest(
  supabase: any,
  criteria: SelectionCriteria
): Promise<SelectedQuestionSet> {
  try {
    // 1. Determine difficulty distribution
    const diffDistribution = criteria.difficultyDistribution ||
      (criteria.testType === 'full_mock'
        ? EXAM_DIFFICULTY_PROFILES[criteria.examContext]
        : getAdaptiveDifficulty(criteria.masteryLevel));

    // 2. Build base query
    let query = supabase
      .from('questions')
      .select('*');

    // Filter by subject (via scan)
    const { data: userScans } = await supabase
      .from('scans')
      .select('id')
      .eq('user_id', criteria.userId)
      .eq('subject', criteria.subject);

    if (!userScans || userScans.length === 0) {
      throw new Error('No scans found for user');
    }

    const scanIds = userScans.map(s => s.id);
    query = query.in('scan_id', scanIds);

    // 3. Filter by topics if specified
    if (criteria.topics && criteria.topics.length > 0) {
      // Get question IDs for these topics
      const { data: mappings } = await supabase
        .from('topic_question_mapping')
        .select('question_id')
        .in('topic_id', criteria.topics);

      if (mappings && mappings.length > 0) {
        const topicQuestionIds = mappings.map(m => m.question_id);
        query = query.in('id', topicQuestionIds);
      } else {
        // Fallback: filter by topic name
        query = query.in('topic', criteria.topics);
      }
    }

    // 4. Exclude previously attempted questions
    if (criteria.excludeQuestionIds && criteria.excludeQuestionIds.length > 0) {
      query = query.not('id', 'in', criteria.excludeQuestionIds);
    }

    // 5. Execute query
    const { data: allQuestions, error } = await query;

    if (error) throw error;
    if (!allQuestions || allQuestions.length === 0) {
      throw new Error('No questions found matching criteria');
    }

    // 6. Group questions by difficulty
    const questionsByDifficulty = {
      Easy: allQuestions.filter(q => q.difficulty === 'Easy'),
      Moderate: allQuestions.filter(q => q.difficulty === 'Moderate'),
      Hard: allQuestions.filter(q => q.difficulty === 'Hard')
    };

    // 7. Calculate target counts per difficulty
    const targetCounts = {
      Easy: Math.round(criteria.totalQuestions * diffDistribution.easy / 100),
      Moderate: Math.round(criteria.totalQuestions * diffDistribution.moderate / 100),
      Hard: Math.round(criteria.totalQuestions * diffDistribution.hard / 100)
    };

    // Adjust for rounding errors
    const totalTarget = targetCounts.Easy + targetCounts.Moderate + targetCounts.Hard;
    if (totalTarget < criteria.totalQuestions) {
      targetCounts.Moderate += (criteria.totalQuestions - totalTarget);
    } else if (totalTarget > criteria.totalQuestions) {
      targetCounts.Moderate -= (totalTarget - criteria.totalQuestions);
    }

    // 8. Select questions using quality-based selection
    const selectedQuestions: any[] = [];

    // Select Easy questions
    selectedQuestions.push(
      ...selectBestQuestions(questionsByDifficulty.Easy, targetCounts.Easy)
    );

    // Select Moderate questions
    selectedQuestions.push(
      ...selectBestQuestions(questionsByDifficulty.Moderate, targetCounts.Moderate)
    );

    // Select Hard questions
    selectedQuestions.push(
      ...selectBestQuestions(questionsByDifficulty.Hard, targetCounts.Hard)
    );

    // 9. If we don't have enough questions, fill with best available
    if (selectedQuestions.length < criteria.totalQuestions) {
      const remaining = criteria.totalQuestions - selectedQuestions.length;
      const selectedIds = new Set(selectedQuestions.map(q => q.id));
      const availableQuestions = allQuestions.filter(q => !selectedIds.has(q.id));

      selectedQuestions.push(
        ...selectBestQuestions(availableQuestions, remaining)
      );
    }

    // 10. Shuffle questions to randomize order
    const shuffled = shuffleArray(selectedQuestions);

    // 11. Transform to AnalyzedQuestion format
    const questions: AnalyzedQuestion[] = shuffled.map(transformQuestion);

    // 12. Calculate metadata
    const metadata = calculateMetadata(questions);

    return {
      questions,
      metadata
    };

  } catch (error) {
    console.error('Error selecting questions:', error);
    throw error;
  }
}

/**
 * Select best questions from a pool based on quality criteria
 */
function selectBestQuestions(pool: any[], count: number): any[] {
  if (pool.length === 0) return [];
  if (pool.length <= count) return pool;

  // Score each question based on quality indicators
  const scored = pool.map(q => ({
    question: q,
    score: calculateQuestionQuality(q)
  }));

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Take top N questions
  return scored.slice(0, count).map(s => s.question);
}

/**
 * Calculate question quality score
 * Higher score = better question for test
 */
function calculateQuestionQuality(question: any): number {
  let score = 0;

  // Has visual element (+20 points)
  if (question.has_visual_element) {
    score += 20;
  }

  // Has solution steps (+15 points)
  if (question.solution_steps && question.solution_steps.length > 0) {
    score += 15;
  }

  // Has mastery material (+10 points)
  if (question.mastery_material) {
    score += 10;
  }

  // Has exam tip (+10 points)
  if (question.exam_tip) {
    score += 10;
  }

  // Has formulas (+5 points)
  if (question.key_formulas && question.key_formulas.length > 0) {
    score += 5;
  }

  // Has MCQ options (+10 points) - better for objective tests
  if (question.options && question.options.length > 0) {
    score += 10;
  }

  // Has correct option index (+5 points) - verifiable answer
  if (question.correct_option_index !== null && question.correct_option_index !== undefined) {
    score += 5;
  }

  // Bloom's taxonomy diversity (+5 points for non-Remember level)
  if (question.blooms && question.blooms !== 'Remember') {
    score += 5;
  }

  // Random factor (0-10) to add variety
  score += Math.random() * 10;

  return score;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Transform database question to AnalyzedQuestion
 */
function transformQuestion(dbQuestion: any): AnalyzedQuestion {
  return {
    id: dbQuestion.id,
    text: dbQuestion.text,
    options: dbQuestion.options || [],
    marks: dbQuestion.marks || 1,
    difficulty: dbQuestion.difficulty || 'Moderate',
    topic: dbQuestion.topic || 'Unknown',
    blooms: dbQuestion.blooms || 'Understand',
    masteryMaterial: dbQuestion.mastery_material,
    solutionSteps: dbQuestion.solution_steps || [],
    examTip: dbQuestion.exam_tip,
    visualConcept: dbQuestion.visual_concept,
    diagramUrl: dbQuestion.diagram_url,
    keyFormulas: dbQuestion.key_formulas || [],
    pitfalls: dbQuestion.pitfalls || [],
    source: dbQuestion.source,
    correctOptionIndex: dbQuestion.correct_option_index,
    hasVisualElement: dbQuestion.has_visual_element,
    visualElementType: dbQuestion.visual_element_type,
    visualElementDescription: dbQuestion.visual_element_description,
    visualElementPosition: dbQuestion.visual_element_position,
    visualBoundingBox: dbQuestion.visual_bounding_box
  };
}

/**
 * Calculate test metadata
 */
function calculateMetadata(questions: AnalyzedQuestion[]): SelectedQuestionSet['metadata'] {
  const total = questions.length;

  // Difficulty breakdown
  const diffBreakdown = {
    easy: questions.filter(q => q.difficulty === 'Easy').length,
    moderate: questions.filter(q => q.difficulty === 'Moderate').length,
    hard: questions.filter(q => q.difficulty === 'Hard').length
  };

  // Topic breakdown
  const topicBreakdown: Record<string, number> = {};
  questions.forEach(q => {
    topicBreakdown[q.topic] = (topicBreakdown[q.topic] || 0) + 1;
  });

  // Blooms breakdown
  const bloomsBreakdown: Record<string, number> = {};
  questions.forEach(q => {
    const blooms = q.blooms || 'Understand';
    bloomsBreakdown[blooms] = (bloomsBreakdown[blooms] || 0) + 1;
  });

  // Average difficulty (Easy=1, Moderate=2, Hard=3)
  const difficultyScores = questions.map(q => {
    switch (q.difficulty) {
      case 'Easy': return 1;
      case 'Moderate': return 2;
      case 'Hard': return 3;
      default: return 2;
    }
  });
  const averageDifficulty = difficultyScores.reduce((a, b) => a + b, 0) / total;

  return {
    totalQuestions: total,
    difficultyBreakdown: diffBreakdown,
    topicBreakdown,
    bloomsBreakdown,
    averageDifficulty: Number(averageDifficulty.toFixed(2))
  };
}

/**
 * Get previously attempted question IDs for a user
 */
export async function getPreviouslyAttemptedQuestions(
  supabase: any,
  userId: string,
  testType?: TestType,
  subject?: Subject
): Promise<string[]> {
  try {
    let query = supabase
      .from('test_responses')
      .select('question_id, test_attempts!inner(user_id, test_type, subject)')
      .eq('test_attempts.user_id', userId);

    if (testType) {
      query = query.eq('test_attempts.test_type', testType);
    }

    if (subject) {
      query = query.eq('test_attempts.subject', subject);
    }

    const { data, error } = await query;

    if (error) throw error;

    const questionIds = Array.from(new Set((data || []).map(r => r.question_id)));
    return questionIds;

  } catch (error) {
    console.error('Error fetching previously attempted questions:', error);
    return [];
  }
}

/**
 * Recommend optimal question count for test type
 */
export function getRecommendedQuestionCount(
  testType: TestType,
  examContext: ExamContext
): number {
  if (testType === 'topic_quiz') {
    return 10; // Short quiz: 10-15 questions
  } else if (testType === 'subject_test') {
    return 30; // Subject test: 30-40 questions
  } else {
    // Full mock: Exam-specific
    const fullMockCounts: Record<ExamContext, number> = {
      'KCET': 60,
      'NEET': 45, // Per subject (180 total / 4 subjects)
      'JEE': 30, // Per subject (90 total / 3 subjects)
      'CBSE': 40
    };
    return fullMockCounts[examContext];
  }
}

/**
 * Get recommended duration for test
 */
export function getRecommendedDuration(
  testType: TestType,
  examContext: ExamContext,
  questionCount: number
): number {
  if (testType === 'topic_quiz') {
    return 15; // 15 minutes for quick quiz
  } else if (testType === 'subject_test') {
    return 60; // 60 minutes for subject test
  } else {
    // Full mock: Exam-specific (in minutes)
    const fullMockDurations: Record<ExamContext, number> = {
      'KCET': 80,
      'NEET': 200, // Full exam duration
      'JEE': 180, // Full exam duration
      'CBSE': 180
    };
    return fullMockDurations[examContext];
  }
}
