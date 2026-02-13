/**
 * Learning Journey API Routes
 *
 * Server-side endpoints that use SERVICE_ROLE_KEY to bypass RLS
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { aggregateTopicsForUser } from '../lib/topicAggregator';
import type { ExamContext, Subject } from '../types';

const router = Router();

// Create Supabase client with SERVICE_ROLE_KEY for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * GET /api/learning-journey/topics
 *
 * Aggregate topics for a user (specific subject + exam context)
 * Query params: userId, subject, examContext
 */
router.get('/topics', async (req: Request, res: Response) => {
  try {
    const { userId, subject, examContext } = req.query;

    // Validation
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid userId' });
    }

    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid subject' });
    }

    if (!examContext || typeof examContext !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid examContext' });
    }

    // Validate subject and examContext values
    const validSubjects = ['Physics', 'Chemistry', 'Math', 'Biology'];
    const validExamContexts = ['NEET', 'JEE', 'KCET', 'CBSE'];

    if (!validSubjects.includes(subject)) {
      return res.status(400).json({ error: `Invalid subject. Must be one of: ${validSubjects.join(', ')}` });
    }

    if (!validExamContexts.includes(examContext)) {
      return res.status(400).json({ error: `Invalid examContext. Must be one of: ${validExamContexts.join(', ')}` });
    }

    // Call aggregator (uses SERVICE_ROLE_KEY on server)
    const topics = await aggregateTopicsForUser(
      supabaseAdmin,
      userId,
      subject as Subject,
      examContext as ExamContext
    );

    // DEBUG: Log first question from first topic to verify metadata
    if (topics.length > 0 && topics[0].questions.length > 0) {
      const firstQ = topics[0].questions[0];
      console.log('🌐 [API /topics] First Question Metadata:', {
        topicName: topics[0].topicName,
        questionId: firstQ.id?.substring(0, 8),
        marks: firstQ.marks,
        diff: firstQ.diff,
        bloomsTaxonomy: firstQ.bloomsTaxonomy,
        year: firstQ.year,
        domain: firstQ.domain,
        pedagogy: firstQ.pedagogy
      });
    }

    res.json({
      success: true,
      data: topics,
      meta: {
        userId,
        subject,
        examContext,
        topicCount: topics.length,
        topicsWithQuestions: topics.filter(t => t.totalQuestions > 0).length,
        totalQuestions: topics.reduce((sum, t) => sum + t.totalQuestions, 0)
      }
    });

  } catch (error) {
    console.error('Error in /api/learning-journey/topics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/learning-journey/topic/:topicId
 *
 * Get detailed view of a single topic including all questions
 */
router.get('/topic/:topicId', async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid userId' });
    }

    // This would use getTopicResourceLibrary from topicAggregator
    // For now, return placeholder
    res.json({
      success: true,
      data: {
        topicId,
        message: 'Topic detail endpoint - to be implemented'
      }
    });

  } catch (error) {
    console.error('Error in /api/learning-journey/topic/:topicId:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/learning-journey/subjects/:trajectory
 *
 * Get all subjects with progress for a trajectory
 */
router.get('/subjects/:trajectory', async (req: Request, res: Response) => {
  try {
    const { trajectory } = req.params;
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid userId' });
    }

    const validTrajectories = ['NEET', 'JEE', 'KCET', 'CBSE'];
    if (!validTrajectories.includes(trajectory)) {
      return res.status(400).json({ error: `Invalid trajectory. Must be one of: ${validTrajectories.join(', ')}` });
    }

    // Return subject list with basic progress
    const subjects: Subject[] = ['Physics', 'Chemistry', 'Math', 'Biology'];
    const subjectProgress = await Promise.all(
      subjects.map(async (subject) => {
        const topics = await aggregateTopicsForUser(
          supabaseAdmin,
          userId,
          subject,
          trajectory as ExamContext
        );

        return {
          subject,
          totalTopics: topics.length,
          topicsWithQuestions: topics.filter(t => t.totalQuestions > 0).length,
          totalQuestions: topics.reduce((sum, t) => sum + t.totalQuestions, 0),
          overallMastery: topics.length > 0
            ? Math.round(topics.reduce((sum, t) => sum + t.masteryLevel, 0) / topics.length)
            : 0
        };
      })
    );

    res.json({
      success: true,
      data: subjectProgress
    });

  } catch (error) {
    console.error('Error in /api/learning-journey/subjects/:trajectory:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
