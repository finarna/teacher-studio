/**
 * Sync Scan Data to AI Generator Tables
 *
 * After a scan is processed and questions are mapped to topics,
 * this module extracts the pattern data and updates the AI generator tables
 * so the AI can learn from newly scanned papers.
 *
 * This is called automatically after auto-mapping scan questions.
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface SyncResult {
  success: boolean;
  patternsUpdated: boolean;
  distributionsUpdated: number;
  message: string;
}

/**
 * Sync scan data to AI generator tables
 * Called after questions are auto-mapped to topics
 */
export async function syncScanToAITables(
  supabase: SupabaseClient,
  scanId: string
): Promise<SyncResult> {

  try {
    console.log(`📊 Syncing scan ${scanId} to AI generator tables...`);

    // Get scan metadata and analysis data
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('year, exam_context, subject, analysis_data, difficulty_distribution, blooms_taxonomy, topic_weightage')
      .eq('id', scanId)
      .single();

    if (scanError || !scan) {
      console.error('❌ Could not load scan:', scanError);
      return { success: false, patternsUpdated: false, distributionsUpdated: 0, message: 'Scan not found' };
    }

    const { year, exam_context, subject, analysis_data, difficulty_distribution, topic_weightage } = scan;

    if (!year || !exam_context || !subject) {
      console.log('⚠️  Scan missing year/exam/subject, skipping AI table sync');
      return { success: true, patternsUpdated: false, distributionsUpdated: 0, message: 'Missing metadata' };
    }

    if (!analysis_data && !difficulty_distribution) {
      console.log('⚠️  Scan has no analysis data yet, skipping AI table sync');
      return { success: true, patternsUpdated: false, distributionsUpdated: 0, message: 'No analysis data' };
    }

    // Get all questions for this scan with topic mappings
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, topic, difficulty, marks, blooms, text')
      .eq('scan_id', scanId);

    if (questionsError) {
      console.error('❌ Error loading questions:', questionsError);
      return { success: false, patternsUpdated: false, distributionsUpdated: 0, message: 'Error loading questions' };
    }

    if (!questions || questions.length === 0) {
      console.log('⚠️  No questions found for scan, skipping');
      return { success: true, patternsUpdated: false, distributionsUpdated: 0, message: 'No questions' };
    }

    // Filter questions that have topic mapping
    const mappedQuestions = questions.filter(q => q.topic && q.topic.trim() !== '');

    if (mappedQuestions.length === 0) {
      console.log('⚠️  No questions mapped to topics yet, skipping AI table sync');
      return { success: true, patternsUpdated: false, distributionsUpdated: 0, message: 'No mapped questions' };
    }

    console.log(`   Found ${mappedQuestions.length}/${questions.length} questions mapped to topics`);

    // Group by topic
    const topicGroups = new Map<string, typeof mappedQuestions>();
    mappedQuestions.forEach(q => {
      const topicId = q.topic!;
      if (!topicGroups.has(topicId)) {
        topicGroups.set(topicId, []);
      }
      topicGroups.get(topicId)!.push(q);
    });

    console.log(`   Topics covered: ${Array.from(topicGroups.keys()).join(', ')}`);

    // Calculate difficulty distribution
    const difficultyDist = {
      easy: mappedQuestions.filter(q => q.difficulty?.toLowerCase() === 'easy').length,
      moderate: mappedQuestions.filter(q => q.difficulty?.toLowerCase() === 'moderate').length,
      hard: mappedQuestions.filter(q => q.difficulty?.toLowerCase() === 'hard').length
    };

    // Calculate total marks
    const totalMarks = mappedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

    // Convert to percentages
    const totalMapped = mappedQuestions.length;
    const difficultyEasyPct = Math.round((difficultyDist.easy / totalMapped) * 100);
    const difficultyModeratePct = Math.round((difficultyDist.moderate / totalMapped) * 100);
    const difficultyHardPct = Math.round((difficultyDist.hard / totalMapped) * 100);

    // 1. Update exam_historical_patterns
    const patternData = {
      exam_context,
      subject,
      year: parseInt(year),
      total_marks: totalMarks,
      difficulty_easy_pct: difficultyEasyPct,
      difficulty_moderate_pct: difficultyModeratePct,
      difficulty_hard_pct: difficultyHardPct
    };

    const { data: upsertedPattern, error: patternError } = await supabase
      .from('exam_historical_patterns')
      .upsert(patternData, {
        onConflict: 'year,exam_context,subject',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (patternError || !upsertedPattern) {
      console.error('❌ Error updating historical patterns:', patternError);
      throw patternError;
    }

    const patternId = upsertedPattern.id;
    console.log(`   ✅ Updated exam_historical_patterns (ID: ${patternId})`);

    // 2. Delete existing distributions for this pattern
    const { error: deleteError } = await supabase
      .from('exam_topic_distributions')
      .delete()
      .eq('historical_pattern_id', patternId);

    if (deleteError) {
      console.warn('⚠️  Could not delete old distributions:', deleteError.message);
    }

    // 3. Insert new distributions
    const distributionRecords = Array.from(topicGroups.entries()).map(([topicId, topicQuestions]) => {
      const easyCount = topicQuestions.filter(q => q.difficulty?.toLowerCase() === 'easy').length;
      const moderateCount = topicQuestions.filter(q => q.difficulty?.toLowerCase() === 'moderate').length;
      const hardCount = topicQuestions.filter(q => q.difficulty?.toLowerCase() === 'hard').length;
      const avgMarks = topicQuestions.reduce((sum, q) => sum + (q.marks || 1), 0) / topicQuestions.length;

      return {
        historical_pattern_id: patternId,
        topic_id: topicId,
        question_count: topicQuestions.length,
        average_marks: Math.round(avgMarks * 10) / 10,
        difficulty_easy_count: easyCount,
        difficulty_moderate_count: moderateCount,
        difficulty_hard_count: hardCount
      };
    });

    const { error: distributionError } = await supabase
      .from('exam_topic_distributions')
      .insert(distributionRecords);

    if (distributionError) {
      console.error('❌ Error updating topic distributions:', distributionError);
      throw distributionError;
    }

    console.log(`   ✅ Updated ${distributionRecords.length} topic distributions`);

    // Log summary
    console.log('📊 AI Table Sync Summary:');
    console.log(`   Year: ${year}, Exam: ${exam_context} ${subject}`);
    console.log(`   Total Questions: ${questions.length} (${mappedQuestions.length} mapped)`);
    console.log(`   Topics: ${topicGroups.size}`);
    console.log(`   Difficulty: Easy=${difficultyDist.easy} Moderate=${difficultyDist.moderate} Hard=${difficultyDist.hard}`);

    return {
      success: true,
      patternsUpdated: true,
      distributionsUpdated: distributionRecords.length,
      message: `Synced ${mappedQuestions.length} questions across ${topicGroups.size} topics`
    };

  } catch (error) {
    console.error('❌ Failed to sync scan to AI tables:', error);
    return {
      success: false,
      patternsUpdated: false,
      distributionsUpdated: 0,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
