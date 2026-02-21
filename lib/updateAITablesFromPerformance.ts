/**
 * Update AI Generator Tables from Student Performance
 *
 * When students complete tests, this module:
 * 1. Tracks topic-wise performance (accuracy, time spent)
 * 2. Updates student performance profiles
 * 3. Helps AI generator adjust difficulty levels
 * 4. Improves prediction accuracy based on real student data
 *
 * This ensures the AI generator learns from actual student performance.
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface TopicPerformance {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface UpdateResult {
  success: boolean;
  profileUpdated: boolean;
  message: string;
}

/**
 * Update student performance profile after test completion
 */
export async function updateStudentPerformanceProfile(
  supabase: SupabaseClient,
  userId: string,
  examContext: string,
  subject: string,
  topicStats: Record<string, TopicPerformance>,
  overallAccuracy: number
): Promise<UpdateResult> {

  try {
    console.log(`📈 Updating performance profile for user ${userId}...`);
    console.log(`   Exam: ${examContext} ${subject}`);
    console.log(`   Topics: ${Object.keys(topicStats).length}`);
    console.log(`   Overall Accuracy: ${overallAccuracy}%`);

    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('student_performance_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('exam_context', examContext)
      .eq('subject', subject)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error fetching profile:', fetchError);
      throw fetchError;
    }

    // Prepare topic performance data
    const topicPerformanceData: Record<string, any> = {};
    Object.entries(topicStats).forEach(([topic, stats]) => {
      topicPerformanceData[topic] = {
        accuracy: stats.accuracy,
        questions_attempted: stats.total,
        questions_correct: stats.correct,
        last_updated: new Date().toISOString()
      };
    });

    // Calculate weak areas (accuracy < 60%)
    const weakAreas = Object.entries(topicStats)
      .filter(([_, stats]) => stats.accuracy < 60)
      .map(([topic, _]) => topic);

    // Calculate strong areas (accuracy >= 80%)
    const strongAreas = Object.entries(topicStats)
      .filter(([_, stats]) => stats.accuracy >= 80)
      .map(([topic, _]) => topic);

    if (existingProfile) {
      // Update existing profile
      const updatedData = {
        overall_accuracy: Math.round((existingProfile.overall_accuracy + overallAccuracy) / 2), // Moving average
        total_tests_taken: (existingProfile.total_tests_taken || 0) + 1,
        topic_performance: {
          ...existingProfile.topic_performance,
          ...topicPerformanceData
        },
        weak_areas: Array.from(new Set([...(existingProfile.weak_areas || []), ...weakAreas])),
        strong_areas: Array.from(new Set([...(existingProfile.strong_areas || []), ...strongAreas])),
        last_test_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('student_performance_profiles')
        .update(updatedData)
        .eq('user_id', userId)
        .eq('exam_context', examContext)
        .eq('subject', subject);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        throw updateError;
      }

      console.log('✅ Updated existing performance profile');
    } else {
      // Create new profile
      const newProfile = {
        user_id: userId,
        exam_context: examContext,
        subject: subject,
        overall_accuracy: overallAccuracy,
        total_tests_taken: 1,
        topic_performance: topicPerformanceData,
        weak_areas: weakAreas,
        strong_areas: strongAreas,
        last_test_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('student_performance_profiles')
        .insert(newProfile);

      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
        throw insertError;
      }

      console.log('✅ Created new performance profile');
    }

    console.log(`   Weak areas: ${weakAreas.length > 0 ? weakAreas.join(', ') : 'None'}`);
    console.log(`   Strong areas: ${strongAreas.length > 0 ? strongAreas.join(', ') : 'None'}`);

    return {
      success: true,
      profileUpdated: true,
      message: `Profile updated with ${Object.keys(topicStats).length} topics`
    };

  } catch (error) {
    console.error('❌ Failed to update performance profile:', error);
    return {
      success: false,
      profileUpdated: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update topic difficulty estimates based on student performance
 * Call this periodically or after significant test volume
 */
export async function updateTopicDifficultyFromPerformance(
  supabase: SupabaseClient,
  examContext: string,
  subject: string
): Promise<UpdateResult> {

  try {
    console.log(`🔧 Updating topic difficulty estimates from student performance...`);
    console.log(`   Exam: ${examContext} ${subject}`);

    // Get all student performance profiles for this exam/subject
    const { data: profiles, error: profilesError } = await supabase
      .from('student_performance_profiles')
      .select('topic_performance')
      .eq('exam_context', examContext)
      .eq('subject', subject);

    if (profilesError) {
      console.error('❌ Error loading profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️  No performance data available yet');
      return { success: true, profileUpdated: false, message: 'No data' };
    }

    // Aggregate performance across all students by topic
    const topicAggregates = new Map<string, { totalAccuracy: number; count: number }>();

    profiles.forEach(profile => {
      if (!profile.topic_performance) return;

      Object.entries(profile.topic_performance).forEach(([topic, perf]: [string, any]) => {
        if (!topicAggregates.has(topic)) {
          topicAggregates.set(topic, { totalAccuracy: 0, count: 0 });
        }
        const agg = topicAggregates.get(topic)!;
        agg.totalAccuracy += perf.accuracy || 0;
        agg.count += 1;
      });
    });

    // Update topic metadata based on average student performance
    let updatedCount = 0;
    for (const [topic, agg] of topicAggregates.entries()) {
      const avgAccuracy = agg.totalAccuracy / agg.count;

      // Calculate difficulty (inverse of accuracy)
      // High accuracy (80%+) = Lower difficulty (4-5/10)
      // Low accuracy (40%-) = Higher difficulty (8-10/10)
      const difficultyEstimate = Math.round(10 - (avgAccuracy / 10));

      const { error } = await supabase
        .from('topic_metadata')
        .update({
          estimated_difficulty: Math.max(1, Math.min(10, difficultyEstimate)), // Clamp 1-10
          updated_at: new Date().toISOString()
        })
        .eq('topic_id', topic)
        .eq('exam_context', examContext)
        .eq('subject', subject);

      if (error) {
        console.warn(`⚠️  Could not update difficulty for ${topic}:`, error.message);
      } else {
        console.log(`   Updated ${topic}: avg accuracy=${avgAccuracy.toFixed(1)}%, difficulty=${difficultyEstimate}/10`);
        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} topic difficulty estimates`);

    return {
      success: true,
      profileUpdated: true,
      message: `Updated ${updatedCount} topics`
    };

  } catch (error) {
    console.error('❌ Failed to update difficulty from performance:', error);
    return {
      success: false,
      profileUpdated: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
