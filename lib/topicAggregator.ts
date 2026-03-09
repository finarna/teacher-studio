/**
 * Topic Aggregator Service
 *
 * CRITICAL: This service AGGREGATES existing data from scans into topic-level views.
 * It does NOT regenerate questions, sketches, or flashcards.
 * All content already exists in the database - this just organizes it.
 */

import type {
  TopicResource,
  AnalyzedQuestion,
  Flashcard,
  ChapterInsight,
  TopicSketchPage,
  ExamContext,
  Subject,
  TopicActivity
} from '../types';

/**
 * Aggregate topics for a user from their scans
 * Groups existing scan data by topic name
 */
export async function aggregateTopicsForUser(
  supabase: any,
  userId: string,
  subject: Subject,
  examContext: ExamContext
): Promise<TopicResource[]> {

  try {
    // 1. Get ALL official topics for this subject/exam from topics table
    const { data: officialTopics, error: topicsError } = await supabase
      .from('topics')
      .select('*')
      .eq('subject', subject);

    if (topicsError) throw topicsError;
    if (!officialTopics || officialTopics.length === 0) return [];

    // 2. Filter topics by exam context (exam_weightage > 0)
    const examTopics = officialTopics.filter(t => {
      const weightage = t.exam_weightage as any;
      return weightage && weightage[examContext] > 0;
    });

    if (examTopics.length === 0) return [];

    // Create a name -> ID lookup for fallback mapping
    const topicNameToId = new Map<string, string>();
    examTopics.forEach(t => topicNameToId.set(t.name, t.id));

    // 🚀 [PERF] Parallel Phase 1: Basic structural data
    const [scansResult, resourcesResult] = await Promise.all([
      supabase.from('scans').select('id, subject, exam_context, year')
        .or(`user_id.eq.${userId},is_system_scan.eq.true`)
        .eq('subject', subject).eq('exam_context', examContext),

      supabase.from('topic_resources').select('*')
        .eq('user_id', userId).eq('subject', subject).eq('exam_context', examContext)
    ]);

    if (scansResult.error) throw scansResult.error;
    const scanIds = (scansResult.data || []).map(s => s.id);
    const dbResources = resourcesResult.data || [];
    const hasScans = scanIds.length > 0;

    // 🚀 [PERF] Parallel Phase 2: Content & Mappings (One major roundtrip)
    let questionsData: any[] = [];
    let insightsData: any[] = [];
    let sketchesData: any[] = [];
    let flashcardsData: any[] = [];
    const questionTopicMap = new Map<string, string>();

    if (hasScans) {
      const [qRes, iRes, sRes, fRes, mRes] = await Promise.all([
        supabase.from('questions').select('id, topic, marks, difficulty, blooms, scan_id, subject').in('scan_id', scanIds),
        supabase.from('chapter_insights').select('*').in('scan_id', scanIds),
        supabase.from('topic_sketches').select('*').in('scan_id', scanIds),
        supabase.from('flashcards').select('*').eq('user_id', userId).in('scan_id', scanIds),
        supabase.from('topic_question_mapping').select('question_id, topic_id')
          .in('topic_id', Array.from(topicNameToId.values()))
      ]);

      questionsData = qRes.data || [];
      insightsData = iRes.data || [];
      sketchesData = sRes.data || [];
      flashcardsData = fRes.data || [];
      (mRes.data || []).forEach((m: any) => questionTopicMap.set(m.question_id, m.topic_id));
    }

    const allQuestions = questionsData.map(q => ({ ...q, source: 'practice' }));
    const insights = insightsData;
    const sketches = sketchesData;
    const flashcardCache = flashcardsData;

    // 6. Group questions by OFFICIAL topic ID (using mappings from BOTH sources)
    const questionsByTopicId = new Map<string, AnalyzedQuestion[]>();
    allQuestions.forEach(q => {
      let topicId = questionTopicMap.get(q.id);

      // Fallback: Try mapping by name if mapping table entry is missing (common for fresh AI questions)
      if (!topicId && q.topic) {
        topicId = topicNameToId.get(q.topic);
      }

      if (topicId) {
        if (!questionsByTopicId.has(topicId)) {
          questionsByTopicId.set(topicId, []);
        }
        questionsByTopicId.get(topicId)!.push(transformQuestion(q));
      }
    });

    // 7. Group insights by topic (store with lowercase key for fuzzy matching)
    const insightsByTopicLower = new Map<string, { originalTopic: string, insights: ChapterInsight[] }>();
    (insights || []).forEach(i => {
      const topic = i.topic || 'Uncategorized';
      const topicLower = topic.toLowerCase();
      if (!insightsByTopicLower.has(topicLower)) {
        insightsByTopicLower.set(topicLower, { originalTopic: topic, insights: [] });
      }
      insightsByTopicLower.get(topicLower)!.insights.push(transformInsight(i));
    });

    // 8. Group sketches by topic
    const sketchesByTopic = new Map<string, TopicSketchPage[]>();
    (sketches || []).forEach(s => {
      const topic = s.topic || 'Uncategorized';
      if (!sketchesByTopic.has(topic)) {
        sketchesByTopic.set(topic, []);
      }
      // Each sketch has multiple pages
      const pages = (s.pages || []) as any[];
      pages.forEach((page, idx) => {
        sketchesByTopic.get(topic)!.push({
          id: `${s.id}_page_${idx}`,
          title: page.title || `Page ${idx + 1}`,
          content: page.content || '',
          imageUrl: page.imageUrl || ''
        });
      });
    });

    // 9. Parse flashcards
    const flashcardsByTopic = new Map<string, Flashcard[]>();
    (flashcardCache || []).forEach(fc => {
      const data = fc.data as any;
      if (data && Array.isArray(data)) {
        data.forEach((card: any) => {
          // Use card.topic (from RapidRecall) or card.context (legacy) for grouping
          const topic = card.topic || card.context || 'General';
          if (!flashcardsByTopic.has(topic)) {
            flashcardsByTopic.set(topic, []);
          }
          flashcardsByTopic.get(topic)!.push({
            id: card.id || crypto.randomUUID(),
            term: card.term || '',
            // Map card.def to definition (RapidRecall uses 'def' field)
            definition: card.def || card.definition || '',
            context: card.topic || card.context
          });
        });
      }
    });

    console.log(`🔍 [DEBUG] Flashcards grouped by topic:`);
    flashcardsByTopic.forEach((cards, topicName) => {
      console.log(`  - ${topicName}: ${cards.length} cards`);
    });

    const existingMap = new Map(
      (dbResources || []).map(r => [r.topic_id, r])
    );

    // 11. Build TopicResource objects for ALL official topics
    const aggregatedResources: TopicResource[] = [];

    for (const officialTopic of examTopics) {
      const topicId = officialTopic.id;
      const topicName = officialTopic.name;

      // Get user data for this topic using MAPPED topic ID (may be empty)
      const topicQuestions = questionsByTopicId.get(topicId) || [];
      const existing = existingMap.get(topicId) as any;

      // For insights, sketches, flashcards: use fuzzy NAME matching
      // (these resources don't have mappings yet, they rely on name match with tolerance)
      const topicInsights = fuzzyMatchInsights(topicName, insightsByTopicLower);
      const topicSketches = sketchesByTopic.get(topicName) || [];
      const topicFlashcards = flashcardsByTopic.get(topicName) || [];

      if (topicFlashcards.length > 0) {
        console.log(`✅ [DEBUG] Topic "${topicName}" has ${topicFlashcards.length} flashcards`);
      }

      // Calculate difficulty distribution
      const diffDist = calculateDifficultyDistribution(topicQuestions);

      // Get or calculate mastery level
      const masteryLevel = existing?.mastery_level || 0;
      const studyStage = existing?.study_stage || 'not_started';

      const resource: TopicResource = {
        id: existing?.id || crypto.randomUUID(),
        userId,
        topicId,
        topicName,
        subject,
        examContext,

        // Aggregated data from scans
        questions: topicQuestions,
        flashcards: topicFlashcards,
        sketchPages: topicSketches,
        chapterInsights: topicInsights,

        // Metadata
        totalQuestions: topicQuestions.length,
        sourceScanIds: Array.from(new Set(topicQuestions.map(q => q.source || '').filter(Boolean))),
        difficultyDistribution: diffDist,

        // Visual representation (from topics table or existing)
        representativeSymbol: existing?.representative_symbol || officialTopic.representative_symbol,
        symbolType: existing?.symbol_type || officialTopic.symbol_type,
        representativeImageUrl: existing?.representative_image_url || officialTopic.representative_image_url,

        // Progress tracking (from existing or defaults)
        masteryLevel,
        studyStage,
        notesCompleted: existing?.notes_completed || false,
        questionsAttempted: existing?.questions_attempted || 0,
        questionsCorrect: existing?.questions_correct || 0,
        averageAccuracy: existing?.average_accuracy || 0,
        quizzesTaken: existing?.quizzes_taken || 0,
        averageQuizScore: existing?.average_quiz_score || 0,
        lastPracticed: existing?.last_practiced ? new Date(existing.last_practiced) : undefined,

        createdAt: existing?.created_at ? new Date(existing.created_at) : new Date(),
        updatedAt: new Date()
      };

      aggregatedResources.push(resource);
    }

    return aggregatedResources;
  } catch (error) {
    console.error('Error aggregating topics:', error);
    throw error;
  }
}

/**
 * Get topic resource library (EXISTING data only)
 * Returns all resources for a specific topic
 */
export async function getTopicResourceLibrary(
  supabase: any,
  userId: string,
  topicId: string
): Promise<TopicResource | null> {

  try {
    const { data: topicResource, error } = await supabase
      .from('topic_resources')
      .select('*')
      .eq('id', topicId)
      .eq('user_id', userId)
      .single();

    if (error || !topicResource) return null;

    // Fetch questions for this topic
    const { data: questionMappings } = await supabase
      .from('topic_question_mapping')
      .select('question_id')
      .eq('topic_id', topicResource.topic_id);

    const questionIds = (questionMappings || []).map(m => m.question_id);

    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .in('id', questionIds);

    // Fetch flashcards ONLY for the scans associated with this topic
    const sourceScanIds = topicResource.source_scan_ids || [];
    const { data: flashcardCache } = sourceScanIds.length > 0
      ? await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .in('scan_id', sourceScanIds)
      : { data: [] };

    const flashcards: Flashcard[] = [];
    (flashcardCache || []).forEach(fc => {
      const data = fc.data as any;
      if (Array.isArray(data)) {
        data.forEach((card: any) => {
          // Use card.topic (from RapidRecall) or card.context (legacy) for grouping
          // We filter by topicId or similar context here if applicable
          flashcards.push({
            id: card.id || crypto.randomUUID(),
            term: card.term || '',
            definition: card.def || card.definition || '',
            context: card.topic || card.context
          });
        });
      }
    });

    // Fetch sketches
    const { data: sketches } = await supabase
      .from('topic_sketches')
      .select('*')
      .in('scan_id', topicResource.source_scan_ids || []);

    const sketchPages: TopicSketchPage[] = [];
    (sketches || []).forEach(s => {
      const pages = (s.pages || []) as any[];
      pages.forEach((page, idx) => {
        sketchPages.push({
          id: `${s.id}_page_${idx}`,
          title: page.title || `Page ${idx + 1}`,
          content: page.content || '',
          imageUrl: page.imageUrl || ''
        });
      });
    });

    // Fetch insights
    const { data: insights } = await supabase
      .from('chapter_insights')
      .select('*')
      .in('scan_id', topicResource.source_scan_ids || []);

    return {
      id: topicResource.id,
      userId: topicResource.user_id,
      topicId: topicResource.topic_id,
      topicName: topicResource.topic_id, // Will be replaced with actual name
      subject: topicResource.subject,
      examContext: topicResource.exam_context,

      questions: (questions || []).map(transformQuestion),
      flashcards,
      sketchPages,
      chapterInsights: (insights || []).map(transformInsight),

      totalQuestions: topicResource.total_questions || 0,
      sourceScanIds: topicResource.source_scan_ids || [],
      difficultyDistribution: {
        easy: 0,
        moderate: 0,
        hard: 0
      },

      masteryLevel: topicResource.mastery_level || 0,
      studyStage: topicResource.study_stage || 'not_started',
      notesCompleted: topicResource.notes_completed || false,
      questionsAttempted: topicResource.questions_attempted || 0,
      questionsCorrect: topicResource.questions_correct || 0,
      averageAccuracy: topicResource.average_accuracy || 0,
      quizzesTaken: topicResource.quizzes_taken || 0,
      averageQuizScore: topicResource.average_quiz_score || 0,
      lastPracticed: topicResource.last_practiced ? new Date(topicResource.last_practiced) : undefined,

      createdAt: new Date(topicResource.created_at),
      updatedAt: new Date(topicResource.updated_at)
    };
  } catch (error) {
    console.error('Error fetching topic resource library:', error);
    return null;
  }
}

/**
 * Recalculate mastery level for a topic resource using Absolute Truth
 */
export async function calculateTopicMastery(
  supabase: any,
  topicResourceId: string
): Promise<number> {

  try {
    // 1. Fetch the topic resource for base stats (quizzes, notes, total questions)
    const { data: resource, error: resError } = await supabase
      .from('topic_resources')
      .select('notes_completed, quizzes_taken, total_questions, user_id')
      .eq('id', topicResourceId)
      .single();

    if (resError) throw resError;

    // 2. Fetch all practice answers for this resource (Accuracy Truth)
    const { data: allAnswers, error: ansError } = await supabase
      .from('practice_answers')
      .select('id, is_correct')
      .eq('topic_resource_id', topicResourceId);

    if (ansError) throw ansError;

    const isNotesDone = resource?.notes_completed || false;
    const quizzesTaken = resource?.quizzes_taken || 0;
    const answers = allAnswers || [];

    // Calculate Absolute Accuracy
    const totalAttempted = answers.length;
    if (totalAttempted === 0) {
      return isNotesDone ? 10 : 0;
    }

    const correctCount = answers.filter((a: any) => a.is_correct).length;
    const accuracy = (correctCount / totalAttempted) * 100;

    /**
     * Mastery formula (The Absolute Standard):
     * 1. Base Accuracy: 60% weight (weighted by coverage)
     * 2. Quizzes Taken: +10 per quiz (max 20 points / 2 quizzes)
     * 3. Practice Volume: +5 per 10 unique questions (max 10 points / 20 questions)
     * 4. Notes Completion: +10 points if all visual notes viewed
     */
    // Recalculate Mastery using the official standard

    // NEW DYNAMIC COVERAGE: Mastery requires deeper engagement as the pool grows.
    // Full accuracy weight is earned only after solving ~50% of the pool (min 15, max achievable).
    const totalQuestions = resource?.total_questions || 10;
    const saturationTarget = Math.min(totalQuestions, Math.max(15, Math.floor(totalQuestions * 0.5)));
    const coverageWeight = Math.min(1, totalAttempted / Math.max(1, saturationTarget));

    const mastery = Math.min(100, Math.round(
      (accuracy * 0.60 * coverageWeight) +
      Math.min(20, quizzesTaken * 10) +
      Math.min(10, Math.floor(totalAttempted / 10) * 5) +
      (isNotesDone ? 10 : 0)
    ));

    return mastery;
  } catch (error) {
    console.error('❌ [calculateTopicMastery] Error:', error);
    return 0;
  }
}

/**
 * Record a topic activity and update aggregated stats
 */
export async function recordTopicActivity(
  supabase: any,
  userId: string,
  topicResourceId: string,
  activityType: 'viewed_notes' | 'practiced_question' | 'completed_quiz' | 'reviewed_flashcard',
  questionId?: string,
  isCorrect?: boolean,
  timeSpent?: number
): Promise<void> {
  try {
    // 1. Insert activity log
    await supabase.from('topic_activities').insert({
      user_id: userId,
      topic_resource_id: topicResourceId,
      activity_type: activityType,
      question_id: questionId,
      is_correct: isCorrect,
      time_spent: timeSpent,
      activity_timestamp: new Date().toISOString()
    });

    // 2. Fetch fresh stats to update topic_resources
    // We update accuracy and volume from practice_answers to avoid drift
    const { data: allAnswers } = await supabase
      .from('practice_answers')
      .select('is_correct')
      .eq('topic_resource_id', topicResourceId);

    const { data: currentRes } = await supabase
      .from('topic_resources')
      .select('quizzes_taken, notes_completed, study_stage, total_questions')
      .eq('id', topicResourceId)
      .single();

    if (allAnswers && currentRes) {
      const totalAttempted = allAnswers.length;
      const totalCorrect = allAnswers.filter((a: any) => a.is_correct).length;
      const accuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

      // Recalculate Mastery using the official standard

      // NEW DYNAMIC COVERAGE: Adjust mastery weight based on total pool size
      const totalQuestions = currentRes?.total_questions || 10;
      const saturationTarget = Math.min(totalQuestions, Math.max(15, Math.floor(totalQuestions * 0.5)));
      const coverageWeight = Math.min(1, totalAttempted / Math.max(1, saturationTarget));

      const newMastery = Math.min(100, Math.round(
        (accuracy * 0.60 * coverageWeight) +
        Math.min(20, (currentRes.quizzes_taken || 0) * 10) +
        Math.min(10, Math.floor(totalAttempted / 10) * 5) +
        (currentRes.notes_completed ? 10 : 0)
      ));

      // Determine Study Stage Shifting
      let nextStage = currentRes.study_stage || 'not_started';
      if (nextStage === 'not_started' || nextStage === 'studying_notes') {
        if (activityType === 'practiced_question') nextStage = 'practicing';
      }

      // Elite Mastery Threshold: Accuracy 90%+ and 2+ Quizzes
      if (newMastery >= 90 && currentRes.quizzes_taken >= 2) {
        nextStage = 'mastered';
      }

      let quizzesTaken = currentRes.quizzes_taken || 0;
      let averageQuizScore = currentRes.average_quiz_score || 0;

      if (activityType === 'completed_quiz') {
        quizzesTaken += 1;
        // In this simplified upstream sync, we use the current accuracy of the quiz activity.
        // For more precision, we'd pass the specific quiz score, but recordTopicActivity usually
        // processes per-question. However, completed_quiz is called once at the end of the batch in submitTest.
        // We'll update the average quiz score using the current overall accuracy as a proxy if it was a focused quiz.
        averageQuizScore = Math.round(((averageQuizScore * (quizzesTaken - 1)) + accuracy) / quizzesTaken);
      }

      await supabase
        .from('topic_resources')
        .update({
          questions_attempted: totalAttempted,
          questions_correct: totalCorrect,
          average_accuracy: Math.round(accuracy),
          quizzes_taken: quizzesTaken,
          average_quiz_score: averageQuizScore,
          mastery_level: newMastery,
          study_stage: nextStage,
          last_practiced: new Date().toISOString()
        })
        .eq('id', topicResourceId);
    }

  } catch (error) {
    console.error('❌ [recordTopicActivity] Error:', error);
    throw error;
  }
}

/**
 * Helper: Transform database question to AnalyzedQuestion
 */
function transformQuestion(dbQuestion: any): AnalyzedQuestion {
  // DEBUG: Log metadata fields from database
  console.log('🔍 [transformQuestion] DB Question Metadata:', {
    id: dbQuestion.id?.substring(0, 8),
    topic: dbQuestion.topic,
    marks: dbQuestion.marks,
    difficulty: dbQuestion.difficulty,
    blooms: dbQuestion.blooms,
    year: dbQuestion.year,
    domain: dbQuestion.domain,
    pedagogy: dbQuestion.pedagogy
  });

  const transformed = {
    id: dbQuestion.id,
    text: dbQuestion.text,
    options: dbQuestion.options || [],
    marks: String(dbQuestion.marks || 1), // Convert to string for UI
    diff: dbQuestion.difficulty || 'Moderate', // Map difficulty -> diff
    difficulty: dbQuestion.difficulty || 'Moderate',
    topic: dbQuestion.topic || 'Unknown',
    blooms: dbQuestion.blooms || 'Understand',
    bloomsTaxonomy: dbQuestion.blooms || 'Understand', // Map blooms -> bloomsTaxonomy
    domain: dbQuestion.domain || undefined, // NEW: domain field
    year: dbQuestion.year || undefined, // NEW: year field
    pedagogy: dbQuestion.pedagogy || undefined, // NEW: pedagogy field
    masteryMaterial: dbQuestion.mastery_material,
    solutionSteps: dbQuestion.solution_steps || [],
    markingScheme: (dbQuestion.solution_steps || []).map((step: string, idx: number) => ({
      step,
      mark: '1' // Default mark per step
    })),
    examTip: dbQuestion.exam_tip,
    visualConcept: dbQuestion.visual_concept,
    diagramUrl: dbQuestion.diagram_url,
    sketchSvg: dbQuestion.sketch_svg_url, // NEW: map from DB field
    extractedImages: dbQuestion.diagram_url ? [dbQuestion.diagram_url] : [],
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

  return transformed;
}

/**
 * Helper: Transform database insight to ChapterInsight
 */
function transformInsight(dbInsight: any): ChapterInsight {
  return {
    topic: dbInsight.topic,
    totalMarks: dbInsight.total_marks || 0,
    difficulty: dbInsight.difficulty || 'Moderate',
    description: dbInsight.description || '',
    keyConcepts: dbInsight.key_concepts || [],
    importantFormulas: dbInsight.important_formulas || [],
    studyResources: dbInsight.study_resources || [],
    visualSummary: dbInsight.visual_summary,
    preparationChecklist: dbInsight.preparation_checklist,
    highYieldTopics: dbInsight.high_yield_topics
  };
}

/**
 * Helper: Fuzzy match insights by topic name
 * Uses bidirectional substring matching (case-insensitive)
 */
function fuzzyMatchInsights(
  topicName: string,
  insightsByTopicLower: Map<string, { originalTopic: string, insights: ChapterInsight[] }>
): ChapterInsight[] {
  const topicNameLower = topicName.toLowerCase();
  const allInsights: ChapterInsight[] = [];

  // Try exact match first
  const exactMatch = insightsByTopicLower.get(topicNameLower);
  if (exactMatch) {
    return exactMatch.insights;
  }

  // Try fuzzy match (bidirectional substring)
  for (const [insightTopicLower, data] of insightsByTopicLower.entries()) {
    if (insightTopicLower.includes(topicNameLower) || topicNameLower.includes(insightTopicLower)) {
      allInsights.push(...data.insights);
    }
  }

  return allInsights;
}

/**
 * Helper: Calculate difficulty distribution
 */
function calculateDifficultyDistribution(questions: AnalyzedQuestion[]) {
  const total = questions.length;
  if (total === 0) return { easy: 0, moderate: 0, hard: 0 };

  const easy = questions.filter(q => q.difficulty === 'Easy').length;
  const moderate = questions.filter(q => q.difficulty === 'Moderate').length;
  const hard = questions.filter(q => q.difficulty === 'Hard').length;

  return {
    easy: Math.round((easy / total) * 100),
    moderate: Math.round((moderate / total) * 100),
    hard: Math.round((hard / total) * 100)
  };
}

/**
 * Super-fast Subject Stats Aggregator for Trajectory View
 * Avoids loading full question/resource metadata
 */
export async function getSubjectSummaryStats(
  supabase: any,
  userId: string,
  subject: Subject,
  examContext: ExamContext
) {
  try {
    const [topicsResult, resourcesResult] = await Promise.all([
      supabase.from('topics').select('id, exam_weightage').eq('subject', subject),
      supabase.from('topic_resources').select('topic_id, mastery_level, questions_attempted, average_accuracy, is_mastered').eq('user_id', userId).eq('subject', subject).eq('exam_context', examContext)
    ]);

    const topics = (topicsResult.data || []).filter(t => (t.exam_weightage?.[examContext] || 0) > 0);
    const resources = resourcesResult.data || [];

    const masteredCount = resources.filter(r => r.is_mastered || r.mastery_level >= 80).length;
    const totalAttempted = resources.reduce((sum, r) => sum + (r.questions_attempted || 0), 0);

    // Calculate average accuracy across all practiced topics
    const practicedTopics = resources.filter(r => (r.questions_attempted || 0) > 0);
    const avgAccuracy = practicedTopics.length > 0
      ? Math.round(practicedTopics.reduce((sum, r) => sum + (r.average_accuracy || 0), 0) / practicedTopics.length)
      : 0;

    const overallMastery = topics.length > 0
      ? Math.round(resources.reduce((sum, r) => sum + (r.mastery_level || 0), 0) / topics.length)
      : 0;

    return {
      subject,
      totalTopics: topics.length,
      topicsMastered: masteredCount,
      totalQuestionsAttempted: totalAttempted,
      overallMastery,
      overallAccuracy: avgAccuracy
    };
  } catch (err) {
    console.error(`Error in getSubjectSummaryStats:`, err);
    return { subject, totalTopics: 0, topicsMastered: 0, totalQuestionsAttempted: 0, overallMastery: 0, overallAccuracy: 0 };
  }
}
