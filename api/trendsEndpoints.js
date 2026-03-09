/**
 * API Endpoints for Predictive Trends
 * Loads historical data from AI generator tables for UI display
 */

import { supabaseAdmin } from '../lib/supabaseServer.ts';

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
      // If table doesn't exist, return empty data structure gracefully
      if (patternsError.code === 'PGRST205') {
        console.warn('⚠️ Historical patterns table missing. Return empty results.');
        return res.json({
          success: true,
          data: {
            patterns: [],
            topicDistributions: [],
            topicTrends: {},
            predictions: {},
            message: 'Historical analysis tables not found. Please run database migrations.'
          }
        });
      }
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
      if (distError.code === 'PGRST205') {
        console.warn('⚠️ Topic distributions table missing. Return empty results.');
        return res.json({
          success: true,
          data: {
            patterns: patterns || [],
            topicDistributions: {},
            topicTrends: {},
            predictions: {},
            message: 'Topic performance tables not found.'
          }
        });
      }
      console.error('Error loading distributions:', distError);
      throw distError;
    }

    // Group distributions by pattern (year) and normalize if needed
    const distributionsByPattern = {};
    const isKCET = (examContext.toUpperCase().includes('KCET'));

    patterns.forEach(pattern => {
      let yearDists = distributions.filter(
        d => d.historical_pattern_id === pattern.id
      );

      // Normalization: Scale historical counts to 60 if it's KCET and data is incomplete
      if (isKCET && yearDists.length > 0) {
        const currentTotal = yearDists.reduce((sum, d) => sum + (d.question_count || 0), 0);
        if (currentTotal !== 60 && currentTotal > 0) {
          console.log(`⚖️ Normalizing ${pattern.year} distributions from ${currentTotal} to 60`);
          const scale = 60 / currentTotal;
          let runningSum = 0;

          // Sort by count descending to minimize rounding error visibility
          const sortedDists = [...yearDists].sort((a, b) => b.question_count - a.question_count);

          yearDists = sortedDists.map((d, idx) => {
            const isLast = idx === sortedDists.length - 1;
            let newTotal;

            if (isLast) {
              newTotal = Math.max(0, 60 - runningSum);
            } else {
              newTotal = Math.round(d.question_count * scale);
              if (runningSum + newTotal > 60) newTotal = Math.max(0, 60 - runningSum);
            }

            runningSum += newTotal;

            // Proportional scaling for difficulties within the topic
            const qCount = d.question_count || 1;
            const easy = Math.round((d.difficulty_easy_count || 0) * (newTotal / qCount));
            const moderate = Math.round((d.difficulty_moderate_count || 0) * (newTotal / qCount));
            const hard = Math.max(0, newTotal - (easy + moderate));

            return {
              ...d,
              question_count: newTotal,
              difficulty_easy_count: easy,
              difficulty_moderate_count: moderate,
              difficulty_hard_count: hard
            };
          });
        }

        // 🟢 UPDATE PATTERN PERCENTAGES: Ensure the bar chart sums to 100%
        const yearEasyCount = yearDists.reduce((sum, d) => sum + (d.difficulty_easy_count || 0), 0);
        const yearModerateCount = yearDists.reduce((sum, d) => sum + (d.difficulty_moderate_count || 0), 0);
        const yearHardCount = yearDists.reduce((sum, d) => sum + (d.difficulty_hard_count || 0), 0);
        const yearTotal = yearEasyCount + yearModerateCount + yearHardCount;

        if (yearTotal > 0) {
          pattern.difficulty_easy_pct = Math.round((yearEasyCount / yearTotal) * 100);
          pattern.difficulty_moderate_pct = Math.round((yearModerateCount / yearTotal) * 100);
          pattern.difficulty_hard_pct = 100 - (pattern.difficulty_easy_pct + pattern.difficulty_moderate_pct);
        }
      }

      distributionsByPattern[pattern.year] = yearDists;
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

    if (dataPoints.length > 0) {
      const last = dataPoints[dataPoints.length - 1];
      const avgQuestions = dataPoints.reduce((sum, d) => sum + d.questionCount, 0) / dataPoints.length;

      // Default for single data point
      let growthRate = 0;
      let trend = 'stable';
      let change = 0;
      let importance = 'medium';

      if (dataPoints.length >= 2) {
        const first = dataPoints[0];
        const yearsDiff = last.year - first.year;
        const questionsDiff = last.questionCount - first.questionCount;
        growthRate = yearsDiff > 0 ? questionsDiff / yearsDiff : 0;
        change = questionsDiff;

        if (growthRate > 0.5) trend = 'increasing';
        else if (growthRate < -0.5) trend = 'decreasing';
      }

      if (avgQuestions >= 12) importance = 'high';
      else if (avgQuestions <= 8) importance = 'low';

      topicTrends[topicId] = {
        dataPoints,
        growthRate: Math.round(growthRate * 10) / 10,
        trend,
        importance,
        avgQuestions: Math.round(avgQuestions),
        latest: last.questionCount,
        change
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
    topics: {},
    totalPredicted: 0
  };

  // Target total questions based on latest pattern
  const firstPattern = patterns[0];
  const examContextRaw = firstPattern?.exam_context || '';
  const resultContext = examContextRaw.toUpperCase().trim();

  // HARD CONSTRAINT: KCET Math/Physics/Biology are always 60 questions.
  let latestPatternTotal = 60;
  const lp = patterns.find(p => p.year === latestYear);
  if (lp && lp.total_marks) latestPatternTotal = Number(lp.total_marks);

  // Use 60 for anything KCET-related, otherwise fallback to latest year total
  let targetTotal = (resultContext === 'KCET' || resultContext.includes('KCET')) ? 60 : latestPatternTotal;

  console.log(`🔮 [NORMALIZER] Context: ${resultContext}, Target: ${targetTotal}`);

  // 1. Calculate raw predictions
  const topicEntries = Object.entries(topicTrends).filter(([id]) => id && id !== 'null' && id !== 'undefined');
  const rawData = topicEntries.map(([topicId, trend]) => {
    const latest = trend.dataPoints.find(dp => dp.year === latestYear);
    // Use last year as anchor, apply growth if multiple years exist
    const base = latest?.questionCount || trend.avgQuestions;
    const rawVal = Math.max(1, base + (trend.dataPoints.length >= 2 ? trend.growthRate : 0));
    return { topicId, trend, rawVal };
  });

  const rawSum = rawData.reduce((s, d) => s + d.rawVal, 0);

  // 2. Perform proportional scaling with guaranteed sum
  if (rawSum > 0) {
    let runningSum = 0;
    const scale = targetTotal / rawSum;

    // Sort large to small to make adjustment less noticeable
    const sortedData = [...rawData].sort((a, b) => b.rawVal - a.rawVal);

    sortedData.forEach((item, index) => {
      const isLast = index === sortedData.length - 1;
      let predicted;

      if (isLast) {
        predicted = Math.max(0, targetTotal - runningSum);
      } else {
        predicted = Math.round(item.rawVal * scale);
        // Correct for overshoot
        if (runningSum + predicted > targetTotal) {
          predicted = Math.max(0, targetTotal - runningSum);
        }
      }

      runningSum += predicted;

      predictions.topics[item.topicId] = {
        predicted: predicted,
        confidence: item.trend.dataPoints.length >= 2 ? 'high' : 'medium',
        basis: item.trend.trend === 'increasing'
          ? `Increasing trend (+${Math.abs(item.trend.change)} over ${item.trend.dataPoints.length} years)`
          : item.trend.trend === 'decreasing'
            ? `Decreasing trend (${item.trend.change} over ${item.trend.dataPoints.length} years)`
            : `Stable pattern (~${item.trend.avgQuestions} questions)`,
        importance: item.trend.importance
      };
    });
    predictions.totalPredicted = Math.round(runningSum);
  }

  console.log(`🔮 [NORMALIZER] Final Result Sum: ${predictions.totalPredicted}`);
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
    const { data: topicMeta, error: metaError } = await supabaseAdmin
      .from('topic_metadata')
      .select('*')
      .eq('topic_id', topicId)
      .eq('exam_context', examContext)
      .eq('subject', subject)
      .maybeSingle();

    if (metaError && metaError.code !== 'PGRST116') {
      if (metaError.code === 'PGRST205') {
        console.warn('⚠️ Topic metadata table missing.');
      } else {
        console.error('Error fetching topic meta:', metaError);
      }
    }

    // Get historical patterns
    const { data: patterns, error: patternsError } = await supabaseAdmin
      .from('exam_historical_patterns')
      .select('*')
      .eq('exam_context', examContext)
      .eq('subject', subject)
      .order('year', { ascending: true });

    if (patternsError) {
      if (patternsError.code === 'PGRST205') {
        console.warn('⚠️ Historical patterns table missing.');
        return res.json({ success: true, data: { evolution: [], topicMeta: topicMeta || { topic_id: topicId } } });
      }
      throw patternsError;
    }

    if (!patterns || patterns.length === 0) {
      return res.json({ success: true, data: { evolution: [], topicMeta } });
    }

    const patternIds = patterns.map(p => p.id);

    // Get topic distributions
    const { data: distributions, error: distError } = await supabaseAdmin
      .from('exam_topic_distributions')
      .select('*')
      .eq('topic_id', topicId)
      .in('historical_pattern_id', patternIds);

    if (distError && distError.code === 'PGRST205') {
      console.warn('⚠️ Topic distributions table missing.');
      return res.json({
        success: true,
        data: {
          evolution: patterns.map(p => ({ year: p.year, questionCount: 0, difficulty: { easy: 0, moderate: 0, hard: 0 }, avgMarks: 0 })),
          topicMeta
        }
      });
    }

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
