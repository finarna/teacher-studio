/**
 * Auto-Map Scan Questions to Official Topics
 *
 * This runs automatically after a scan completes to map questions
 * to official syllabus topics in the topic_question_mapping table.
 *
 * This enables questions to appear in Learning Journey immediately.
 */

import { matchToOfficialTopic } from '../utils/officialTopics';
import type { Subject } from '../types';

export interface AutoMapResult {
  success: boolean;
  mapped: number;
  failed: number;
  failedTopics: string[];
  error?: string;
}

/**
 * Automatically map questions from a scan to official topics
 *
 * @param supabase - Supabase client (with SERVICE_ROLE_KEY)
 * @param scanId - The scan ID to process
 * @returns Mapping results
 */
export async function autoMapScanQuestions(
  supabase: any,
  scanId: string
): Promise<AutoMapResult> {
  try {
    console.log(`🔗 [AutoMap] Starting auto-mapping for scan ${scanId}`);

    // 1. Get scan details
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('id, name, subject, exam_context')
      .eq('id', scanId)
      .single();

    if (scanError) throw scanError;
    if (!scan) throw new Error('Scan not found');

    console.log(`📋 [AutoMap] Scan: ${scan.name} (${scan.subject})`);

    // 2. Get official topics for this subject
    const subjectsToLoad = scan.subject === 'Combined' ? (scan.subjects || ['Physics', 'Chemistry', 'Biology']) : [scan.subject];
    console.log(`📋 [AutoMap] Loading topics for subjects: ${subjectsToLoad.join(', ')}`);

    const { data: officialTopics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name, subject')
      .in('subject', subjectsToLoad);

    if (topicsError) throw topicsError;
    if (!officialTopics || officialTopics.length === 0) {
      console.log(`⚠️  [AutoMap] No official topics found for subjects: ${subjectsToLoad.join(', ')}`);
      return {
        success: false,
        mapped: 0,
        failed: 0,
        failedTopics: [],
        error: `No official topics found`
      };
    }

    // Create lookup map
    const topicLookup = new Map<string, string>();
    officialTopics.forEach(t => {
      topicLookup.set(t.name, t.id);
    });

    console.log(`📚 [AutoMap] Loaded ${officialTopics.length} official topics`);

    // 3. Get questions from this scan
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, topic, subject, question_order')
      .eq('scan_id', scanId);

    if (questionsError) throw questionsError;
    if (!questions || questions.length === 0) {
      console.log(`⚠️  [AutoMap] No questions found in scan`);
      return {
        success: true,
        mapped: 0,
        failed: 0,
        failedTopics: []
      };
    }

    console.log(`📊 [AutoMap] Found ${questions.length} questions`);

    // 4. Map each question to official topic
    let mapped = 0;
    let failed = 0;
    const failedTopics = new Set<string>();

    for (const question of questions) {
      // Determine subject for this question
      let qSubj = question.subject || scan.subject;
      
      // Fallback inference for NEET Combined if subject was unspecified
      if (qSubj === 'Combined' && scan.exam_context === 'NEET') {
         const qNum = question.question_order + 1;
         if (qNum <= 50) qSubj = 'Physics';
         else if (qNum <= 100) qSubj = 'Chemistry';
         else if (qNum <= 150) qSubj = 'Botany';
         else qSubj = 'Zoology';
      }

      // Use smart matching to find official topic
      const officialTopicName = matchToOfficialTopic(
        question.topic,
        qSubj as Subject
      );

      if (!officialTopicName) {
        failed++;
        failedTopics.add(question.topic);
        continue;
      }

      // Get topic ID
      const topicId = topicLookup.get(officialTopicName);
      if (!topicId) {
        failed++;
        failedTopics.add(question.topic);
        continue;
      }

      // Create mapping
      const { error: mappingError } = await supabase
        .from('topic_question_mapping')
        .upsert({
          topic_id: topicId,
          question_id: question.id,
          confidence: 1.0
        }, { onConflict: 'topic_id,question_id' });

      if (mappingError) {
        // Ignore duplicate errors (23505 = unique violation)
        if (mappingError.code !== '23505') {
          console.error(`❌ [AutoMap] Error mapping ${question.topic}:`, mappingError.message);
          failed++;
          failedTopics.add(question.topic);
        }
      } else {
        mapped++;
      }
    }

    console.log(`✅ [AutoMap] Mapped ${mapped}/${questions.length} questions`);

    if (failed > 0) {
      console.log(`⚠️  [AutoMap] Failed to map ${failed} questions`);
      console.log(`   Topics: ${Array.from(failedTopics).join(', ')}`);
    }

    return {
      success: true,
      mapped,
      failed,
      failedTopics: Array.from(failedTopics)
    };

  } catch (error) {
    console.error('❌ [AutoMap] Error:', error);
    return {
      success: false,
      mapped: 0,
      failed: 0,
      failedTopics: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Hook to be called after scan completion
 *
 * Usage in scan completion handler:
 *
 * await saveScan(scanData);
 * await autoMapScanQuestions(supabaseAdmin, scanId);
 */
export async function onScanComplete(
  supabase: any,
  scanId: string
): Promise<void> {
  console.log(`\n🎯 [ScanComplete] Processing scan ${scanId}`);

  const result = await autoMapScanQuestions(supabase, scanId);

  if (result.success) {
    console.log(`✅ [ScanComplete] Auto-mapping complete: ${result.mapped} questions mapped`);

    if (result.failed > 0) {
      console.log(`⚠️  [ScanComplete] ${result.failed} questions could not be mapped`);
      console.log(`   Topics: ${result.failedTopics.join(', ')}`);
    }
  } else {
    console.error(`❌ [ScanComplete] Auto-mapping failed: ${result.error}`);
  }
}
