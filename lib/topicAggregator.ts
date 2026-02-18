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

    // 3. Get user's scans + system scans (shared question bank) WITHOUT analysis_data
    // We no longer need to fetch analysis_data here - questions are in the questions table
    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select('id, subject, exam_context, year')
      .or(`user_id.eq.${userId},is_system_scan.eq.true`)
      .eq('subject', subject);

    if (scansError) throw scansError;

    const scanIds = (scans || []).map(s => s.id);
    const hasScans = scanIds.length > 0;

    // 4. Get ALL questions from questions table (published system scans + user practice)
    let allQuestions: any[] = [];
    let questionTopicMap = new Map<string, string>(); // questionId -> topicId

    if (hasScans) {
      // Fetch all questions from questions table for these scans
      const { data: practiceQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('scan_id', scanIds);

      if (!questionsError && practiceQuestions) {
        allQuestions = practiceQuestions.map(q => ({
          ...q,
          source: 'practice' // All questions from table are practice/published questions
        }));
        console.log(`📊 [TOPIC AGGREGATOR] Loaded ${practiceQuestions.length} questions from table`);
      }

      // 4c. Get topic mappings for all questions
      const questionIds = allQuestions.map(q => q.id);

      if (questionIds.length > 0) {
        const chunkSize = 100;
        let allMappings: any[] = [];

        for (let i = 0; i < questionIds.length; i += chunkSize) {
          const chunk = questionIds.slice(i, i + chunkSize);
          const { data: mappings, error: mappingsError } = await supabase
            .from('topic_question_mapping')
            .select('question_id, topic_id')
            .in('question_id', chunk);

          if (!mappingsError) {
            allMappings.push(...(mappings || []));
          }
        }

        allMappings.forEach(m => {
          questionTopicMap.set(m.question_id, m.topic_id);
        });

        console.log(`📊 [TOPIC AGGREGATOR] Loaded ${allMappings.length} question-topic mappings`);
      }

      console.log(`🗺️  [TOPIC AGGREGATOR] Mapped ${questionTopicMap.size} questions to topics`);
    }

    // 5. Get all chapter insights (if scans exist)
    let insights: any[] = [];
    if (hasScans) {
      const { data: insightsData, error: insightsError } = await supabase
        .from('chapter_insights')
        .select('*')
        .in('scan_id', scanIds);

      if (insightsError) throw insightsError;
      insights = insightsData || [];
    }

    // 6. Get all topic sketches (if scans exist)
    let sketches: any[] = [];
    if (hasScans) {
      const { data: sketchesData, error: sketchesError } = await supabase
        .from('topic_sketches')
        .select('*')
        .in('scan_id', scanIds);

      if (sketchesError) throw sketchesError;
      sketches = sketchesData || [];
    }

    // 7. Get all flashcards (from cache table, if scans exist)
    let flashcardCache: any[] = [];
    if (hasScans) {
      const { data: flashcardsData, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .in('scan_id', scanIds);

      if (flashcardsError) throw flashcardsError;
      flashcardCache = flashcardsData || [];
      console.log(`🔍 [DEBUG] Flashcard records fetched: ${flashcardCache.length}`);
      flashcardCache.forEach(fc => {
        console.log(`  - Scan: ${fc.scan_id?.substring(0, 8)}..., Cards in data: ${fc.data?.length || 0}`);
      });
    }

    // 6. Group questions by OFFICIAL topic ID (using mappings from BOTH sources)
    const questionsByTopicId = new Map<string, AnalyzedQuestion[]>();
    allQuestions.forEach(q => {
      const topicId = questionTopicMap.get(q.id);
      if (topicId) {
        if (!questionsByTopicId.has(topicId)) {
          questionsByTopicId.set(topicId, []);
        }
        questionsByTopicId.get(topicId)!.push(transformQuestion(q));
      }
    });

    // 7. Group insights by topic
    const insightsByTopic = new Map<string, ChapterInsight[]>();
    (insights || []).forEach(i => {
      const topic = i.topic || 'Uncategorized';
      if (!insightsByTopic.has(topic)) {
        insightsByTopic.set(topic, []);
      }
      insightsByTopic.get(topic)!.push(transformInsight(i));
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

    // 10. Get existing topic_resources to merge with
    const { data: existingResources } = await supabase
      .from('topic_resources')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('exam_context', examContext);

    const existingMap = new Map(
      (existingResources || []).map(r => [r.topic_id, r])
    );

    // 11. Build TopicResource objects for ALL official topics
    const topicResources: TopicResource[] = [];

    for (const officialTopic of examTopics) {
      const topicId = officialTopic.id;
      const topicName = officialTopic.name;

      // Get user data for this topic using MAPPED topic ID (may be empty)
      const topicQuestions = questionsByTopicId.get(topicId) || [];
      const existing = existingMap.get(topicId);

      // For insights, sketches, flashcards: still use topic NAME matching
      // (these resources don't have mappings yet, they rely on exact name match)
      const topicInsights = insightsByTopic.get(topicName) || [];
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
        questionsAttempted: existing?.questions_attempted || 0,
        questionsCorrect: existing?.questions_correct || 0,
        averageAccuracy: existing?.average_accuracy || 0,
        quizzesTaken: existing?.quizzes_taken || 0,
        averageQuizScore: existing?.average_quiz_score || 0,
        lastPracticed: existing?.last_practiced ? new Date(existing.last_practiced) : undefined,

        createdAt: existing?.created_at ? new Date(existing.created_at) : new Date(),
        updatedAt: new Date()
      };

      topicResources.push(resource);
    }

    return topicResources;
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

    // Fetch flashcards from cache
    const { data: flashcardCache } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId);

    const flashcards: Flashcard[] = [];
    (flashcardCache || []).forEach(fc => {
      const data = fc.data as any;
      if (Array.isArray(data)) {
        data.forEach((card: any) => {
          flashcards.push({
            id: card.id || crypto.randomUUID(),
            term: card.term || '',
            // Map card.def to definition (RapidRecall uses 'def' field)
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
 * Calculate topic mastery based on activities
 */
export async function calculateTopicMastery(
  supabase: any,
  topicResourceId: string
): Promise<number> {

  try {
    const { data: activities, error } = await supabase
      .from('topic_activities')
      .select('*')
      .eq('topic_resource_id', topicResourceId)
      .not('is_correct', 'is', null);

    if (error || !activities || activities.length === 0) return 0;

    // Calculate accuracy
    const correctCount = activities.filter(a => a.is_correct).length;
    const accuracy = (correctCount / activities.length) * 100;

    // Count activities by type
    const quizCount = activities.filter(a => a.activity_type === 'completed_quiz').length;
    const practiceCount = activities.filter(a => a.activity_type === 'practiced_question').length;

    // Mastery formula (from migration):
    // Base: accuracy (65% weight)
    // Bonus: +10 for each quiz (max 20)
    // Bonus: +5 for every 10 practice questions (max 15)
    const mastery = Math.min(100,
      accuracy * 0.65 +
      Math.min(20, quizCount * 10) +
      Math.min(15, Math.floor(practiceCount / 10) * 5)
    );

    return Math.round(mastery);
  } catch (error) {
    console.error('Error calculating mastery:', error);
    return 0;
  }
}

/**
 * Record a topic activity
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
    // Insert activity
    await supabase.from('topic_activities').insert({
      user_id: userId,
      topic_resource_id: topicResourceId,
      activity_type: activityType,
      question_id: questionId,
      is_correct: isCorrect,
      time_spent: timeSpent,
      activity_timestamp: new Date().toISOString()
    });

    // Update topic resource stats
    if (activityType === 'practiced_question' && isCorrect !== undefined) {
      const { data: resource } = await supabase
        .from('topic_resources')
        .select('questions_attempted, questions_correct')
        .eq('id', topicResourceId)
        .single();

      if (resource) {
        const newAttempted = (resource.questions_attempted || 0) + 1;
        const newCorrect = (resource.questions_correct || 0) + (isCorrect ? 1 : 0);
        const newAccuracy = (newCorrect / newAttempted) * 100;

        await supabase
          .from('topic_resources')
          .update({
            questions_attempted: newAttempted,
            questions_correct: newCorrect,
            average_accuracy: newAccuracy,
            last_practiced: new Date().toISOString()
          })
          .eq('id', topicResourceId);
      }
    }

    // Recalculate mastery
    const newMastery = await calculateTopicMastery(topicResourceId);
    await supabase
      .from('topic_resources')
      .update({ mastery_level: newMastery })
      .eq('id', topicResourceId);

  } catch (error) {
    console.error('Error recording activity:', error);
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

  // DEBUG: Log transformed metadata
  console.log('✅ [transformQuestion] Transformed Metadata:', {
    id: transformed.id?.substring(0, 8),
    marks: transformed.marks,
    diff: transformed.diff,
    bloomsTaxonomy: transformed.bloomsTaxonomy,
    year: transformed.year,
    domain: transformed.domain,
    pedagogy: transformed.pedagogy
  });

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
