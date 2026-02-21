/**
 * API Endpoints for Predictive Trends
 * Loads historical data from AI generator tables for UI display
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/trends/historical/:examContext/:subject
 * Get historical patterns and topic distributions for display
 */
export async function getHistoricalTrends(req, res) {
  try {
    const { examContext, subject } = req.params;

    if (!examContext || !subject) {
      return res.status(400).json({ error: 'Missing examContext or subject' });
    }

    console.log(`📊 Loading historical trends for ${examContext} ${subject}...`);

    // Load historical patterns (year-by-year)
    const { data: patterns, error: patternsError } = await supabaseAdmin
      .from('exam_historical_patterns')
      .select('*')
      .eq('exam_context', examContext)
      .eq('subject', subject)
      .order('year', { ascending: true });

    if (patternsError) {
      console.error('Error loading patterns:', patternsError);
      throw patternsError;
    }

    if (!patterns || patterns.length === 0) {
      return res.json({
        success: true,
        data: {
          patterns: [],
          topicDistributions: [],
          topicTrends: {},
          predictions: {},
          message: 'No historical data available. Upload past year papers to see trends.'
        }
      });
    }

    // Get pattern IDs for loading distributions
    const patternIds = patterns.map(p => p.id);

    // Load topic distributions for all patterns
    const { data: distributions, error: distError } = await supabaseAdmin
      .from('exam_topic_distributions')
      .select('*')
      .in('historical_pattern_id', patternIds)
      .order('historical_pattern_id', { ascending: true });

    if (distError) {
      console.error('Error loading distributions:', distError);
      throw distError;
    }

    // Group distributions by pattern (year)
    const distributionsByPattern = {};
    patterns.forEach(pattern => {
      distributionsByPattern[pattern.year] = distributions.filter(
        d => d.historical_pattern_id === pattern.id
      );
    });

    // Calculate topic trends
    const topicTrends = calculateTopicTrends(patterns, distributionsByPattern);

    // Generate predictions for next year
    const predictions = generatePredictions(patterns, topicTrends);

    console.log(`✅ Loaded ${patterns.length} years, ${distributions.length} topic distributions`);

    res.json({
      success: true,
      data: {
        patterns,
        topicDistributions: distributionsByPattern,
        topicTrends,
        predictions,
        yearsAvailable: patterns.map(p => p.year),
        latestYear: Math.max(...patterns.map(p => p.year))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching historical trends:', error);
    res.status(500).json({
      error: 'Failed to fetch historical trends',
      message: error.message
    });
  }
}

/**
 * Calculate trends for each topic across years
 */
function calculateTopicTrends(patterns, distributionsByPattern) {
  const topicTrends = {};

  // Get all unique topics
  const allTopics = new Set();
  Object.values(distributionsByPattern).forEach(yearDists => {
    yearDists.forEach(d => allTopics.add(d.topic_id));
  });

  // For each topic, calculate trend
  allTopics.forEach(topicId => {
    const dataPoints = [];

    patterns.forEach(pattern => {
      const yearDists = distributionsByPattern[pattern.year] || [];
      const topicDist = yearDists.find(d => d.topic_id === topicId);

      if (topicDist) {
        dataPoints.push({
          year: pattern.year,
          questionCount: topicDist.question_count,
          easyCount: topicDist.difficulty_easy_count,
          moderateCount: topicDist.difficulty_moderate_count,
          hardCount: topicDist.difficulty_hard_count,
          avgMarks: topicDist.average_marks
        });
      }
    });

    if (dataPoints.length >= 2) {
      // Calculate growth rate
      const first = dataPoints[0];
      const last = dataPoints[dataPoints.length - 1];
      const yearsDiff = last.year - first.year;
      const questionsDiff = last.questionCount - first.questionCount;
      const growthRate = yearsDiff > 0 ? questionsDiff / yearsDiff : 0;

      // Determine trend
      let trend = 'stable';
      if (growthRate > 0.5) trend = 'increasing';
      else if (growthRate < -0.5) trend = 'decreasing';

      // Importance level
      const avgQuestions = dataPoints.reduce((sum, d) => sum + d.questionCount, 0) / dataPoints.length;
      let importance = 'medium';
      if (avgQuestions >= 12) importance = 'high';
      else if (avgQuestions <= 8) importance = 'low';

      topicTrends[topicId] = {
        dataPoints,
        growthRate: Math.round(growthRate * 10) / 10,
        trend,
        importance,
        avgQuestions: Math.round(avgQuestions),
        latest: last.questionCount,
        change: questionsDiff
      };
    }
  });

  return topicTrends;
}

/**
 * Generate predictions for next year
 */
function generatePredictions(patterns, topicTrends) {
  if (patterns.length === 0) return {};

  const latestYear = Math.max(...patterns.map(p => p.year));
  const nextYear = latestYear + 1;

  const predictions = {
    year: nextYear,
    topics: {}
  };

  // Predict for each topic
  Object.entries(topicTrends).forEach(([topicId, trend]) => {
    const latest = trend.dataPoints[trend.dataPoints.length - 1];
    const predicted = Math.max(1, Math.round(latest.questionCount + trend.growthRate));

    predictions.topics[topicId] = {
      predicted: predicted,
      confidence: trend.dataPoints.length >= 3 ? 'high' : 'medium',
      basis: trend.trend === 'increasing'
        ? `Increasing trend (+${Math.abs(trend.change)} over ${trend.dataPoints.length} years)`
        : trend.trend === 'decreasing'
          ? `Decreasing trend (${trend.change} over ${trend.dataPoints.length} years)`
          : `Stable pattern (~${trend.avgQuestions} questions)`,
      importance: trend.importance
    };
  });

  return predictions;
}

/**
 * GET /api/trends/topic-evolution/:examContext/:subject/:topicId
 * Get detailed evolution of a specific topic
 */
export async function getTopicEvolution(req, res) {
  try {
    const { examContext, subject, topicId } = req.params;

    // Get topic metadata
    const { data: topicMeta } = await supabaseAdmin
      .from('topic_metadata')
      .select('*')
      .eq('topic_id', topicId)
      .eq('exam_context', examContext)
      .eq('subject', subject)
      .single();

    // Get historical patterns
    const { data: patterns } = await supabaseAdmin
      .from('exam_historical_patterns')
      .select('*')
      .eq('exam_context', examContext)
      .eq('subject', subject)
      .order('year', { ascending: true });

    if (!patterns || patterns.length === 0) {
      return res.json({ success: true, data: { evolution: [], topicMeta } });
    }

    const patternIds = patterns.map(p => p.id);

    // Get topic distributions
    const { data: distributions } = await supabaseAdmin
      .from('exam_topic_distributions')
      .select('*')
      .eq('topic_id', topicId)
      .in('historical_pattern_id', patternIds);

    // Combine data
    const evolution = patterns.map(pattern => {
      const dist = distributions?.find(d => d.historical_pattern_id === pattern.id);
      return {
        year: pattern.year,
        questionCount: dist?.question_count || 0,
        difficulty: {
          easy: dist?.difficulty_easy_count || 0,
          moderate: dist?.difficulty_moderate_count || 0,
          hard: dist?.difficulty_hard_count || 0
        },
        avgMarks: dist?.average_marks || 0
      };
    });

    res.json({
      success: true,
      data: { evolution, topicMeta }
    });

  } catch (error) {
    console.error('Error fetching topic evolution:', error);
    res.status(500).json({ error: error.message });
  }
}
