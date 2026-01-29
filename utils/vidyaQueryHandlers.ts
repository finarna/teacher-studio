/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - QUERY HANDLERS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Handle simple queries locally WITHOUT Gemini for instant responses
 */

import { VidyaAppContext } from '../types/vidya';
import { Scan } from '../types';
import { ClassifiedIntent, QueryType } from './vidyaIntentClassifier';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface QueryResponse {
  intent: 'QUERY';
  queryType: QueryType;
  result: {
    type: 'table' | 'list' | 'chart' | 'text' | 'count';
    data: any;
    metadata?: {
      totalCount?: number;
      filteredCount?: number;
      executionTime?: number;
    };
  };
  summary: string;
  suggestions?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BASE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

abstract class BaseQueryHandler {
  protected context: VidyaAppContext;

  constructor(context: VidyaAppContext) {
    this.context = context;
  }

  abstract handle(classified: ClassifiedIntent): QueryResponse;

  /**
   * Get questions from current scan or all scans
   */
  protected getQuestions() {
    if (this.context.selectedScan?.analysisData?.questions) {
      return this.context.selectedScan.analysisData.questions;
    }

    // Fallback to all questions from all scans
    const allQuestions: any[] = [];
    (this.context.scannedPapers || []).forEach((scan: Scan) => {
      if (scan.analysisData?.questions) {
        allQuestions.push(...scan.analysisData.questions);
      }
    });

    return allQuestions;
  }

  /**
   * Get scans with optional filtering
   */
  protected getScans(filter?: any) {
    let scans = this.context.scannedPapers || [];

    if (filter) {
      if (filter.subject) {
        scans = scans.filter((s: Scan) => s.subject === filter.subject);
      }
      if (filter.grade) {
        scans = scans.filter((s: Scan) => s.grade === filter.grade);
      }
      if (filter.status) {
        scans = scans.filter((s: Scan) => s.status === filter.status);
      }
    }

    return scans;
  }

  /**
   * Get unique topics from questions
   */
  protected getTopics() {
    const questions = this.getQuestions();
    const topicCounts: Record<string, number> = {};

    questions.forEach((q: any) => {
      const topic = q.topic || 'General';
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    return Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COUNT QUERY HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

class CountQueryHandler extends BaseQueryHandler {
  handle(classified: ClassifiedIntent): QueryResponse {
    const startTime = Date.now();
    const entity = classified.parameters?.entity || 'questions';

    let count = 0;
    let detail = '';

    switch (entity) {
      case 'questions': {
        const questions = this.getQuestions();
        count = questions.length;
        detail = this.context.selectedScan
          ? `in "${this.context.selectedScan.name}"`
          : 'across all scans';
        break;
      }
      case 'scans': {
        const scans = this.getScans(classified.parameters?.filter);
        count = scans.length;
        detail = classified.parameters?.filter
          ? `matching your criteria`
          : 'total';
        break;
      }
      case 'lessons': {
        count = this.context.customLessons?.length || 0;
        detail = 'created';
        break;
      }
      case 'topics': {
        const topics = this.getTopics();
        count = topics.length;
        detail = 'unique topics found';
        break;
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      intent: 'QUERY',
      queryType: 'COUNT',
      result: {
        type: 'count',
        data: { count, entity, detail },
        metadata: {
          totalCount: count,
          executionTime,
        },
      },
      summary: `Found **${count}** ${entity} ${detail}.`,
      suggestions: count > 0 ? [`Show me the ${entity}`, `Analyze these ${entity}`] : [`Scan a paper to get started`],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RANK QUERY HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

class RankQueryHandler extends BaseQueryHandler {
  handle(classified: ClassifiedIntent): QueryResponse {
    const startTime = Date.now();
    const params = classified.parameters || {};
    const entity = params.entity || 'questions';
    const count = params.count || 5;
    const sortBy = params.sortBy || 'difficulty';
    const order = params.order || 'desc';

    if (entity !== 'questions') {
      return {
        intent: 'QUERY',
        queryType: 'RANK',
        result: {
          type: 'text',
          data: 'Ranking is currently only supported for questions.',
        },
        summary: 'Ranking is currently only supported for questions.',
      };
    }

    let questions = this.getQuestions();

    if (questions.length === 0) {
      return {
        intent: 'QUERY',
        queryType: 'RANK',
        result: {
          type: 'text',
          data: 'No questions available to rank. Please scan a paper first.',
        },
        summary: 'No questions available to rank.',
        suggestions: ['Scan a paper', 'Upload an exam paper'],
      };
    }

    // Apply filtering if specified
    if (params.filter) {
      if (params.filter.difficulty) {
        questions = questions.filter((q: any) => q.difficulty === params.filter!.difficulty);
      }
      if (params.filter.topic) {
        questions = questions.filter((q: any) =>
          q.topic?.toLowerCase().includes(params.filter!.topic!.toLowerCase())
        );
      }
    }

    // Sort questions
    questions = [...questions].sort((a: any, b: any) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'difficulty': {
          const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3 };
          const aVal = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0;
          const bVal = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0;
          compareValue = aVal - bVal;
          break;
        }
        case 'marks': {
          compareValue = (a.marks || 0) - (b.marks || 0);
          break;
        }
        case 'topic': {
          compareValue = (a.topic || '').localeCompare(b.topic || '');
          break;
        }
      }

      return order === 'desc' ? -compareValue : compareValue;
    });

    // Take top N
    const ranked = questions.slice(0, count);

    const executionTime = Date.now() - startTime;

    // Format as table data
    const tableData = ranked.map((q: any, idx: number) => ({
      rank: idx + 1,
      question: `Q${q.questionNumber || idx + 1}`,
      topic: q.topic || 'General',
      difficulty: q.difficulty || 'Unknown',
      marks: q.marks || 0,
      icon: q.difficulty === 'Hard' ? '🔴' : q.difficulty === 'Medium' ? '🟡' : '🟢',
    }));

    const topQuestion = ranked[0];
    const summary = `Found ${questions.length} total questions. Top scorer: **Q${topQuestion.questionNumber}** (${topQuestion.topic}, ${topQuestion.difficulty}, ${topQuestion.marks} marks).`;

    return {
      intent: 'QUERY',
      queryType: 'RANK',
      result: {
        type: 'table',
        data: tableData,
        metadata: {
          totalCount: this.getQuestions().length,
          filteredCount: questions.length,
          executionTime,
        },
      },
      summary,
      suggestions: [
        'Generate sketches for these questions',
        'Show me the next 5 questions',
        'Analyze difficulty distribution',
      ],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIST QUERY HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

class ListQueryHandler extends BaseQueryHandler {
  handle(classified: ClassifiedIntent): QueryResponse {
    const startTime = Date.now();
    const params = classified.parameters || {};
    const entity = params.entity || 'scans';

    let data: any[] = [];
    let summary = '';

    switch (entity) {
      case 'scans': {
        let scans = this.getScans(params.filter);
        data = scans.slice(0, 10).map((s: Scan) => ({
          name: s.name,
          subject: s.subject,
          grade: s.grade,
          questions: s.analysisData?.questions?.length || 0,
          status: s.status,
          date: new Date(s.timestamp).toLocaleDateString(),
        }));
        summary = `Showing ${data.length} of ${scans.length} scans`;
        break;
      }
      case 'topics': {
        const topics = this.getTopics();
        data = topics.slice(0, 10).map((t, idx) => ({
          rank: idx + 1,
          topic: t.topic,
          questions: t.count,
          percentage: ((t.count / topics.reduce((sum, x) => sum + x.count, 0)) * 100).toFixed(1) + '%',
        }));
        summary = `Showing ${data.length} unique topics`;
        break;
      }
      case 'lessons': {
        const lessons = this.context.customLessons || [];
        data = lessons.slice(0, 10).map((l: any) => ({
          title: l.title,
          subject: l.subject,
          grade: l.grade,
          modules: l.modules?.length || 0,
        }));
        summary = `Showing ${data.length} of ${lessons.length} lessons`;
        break;
      }
      case 'questions': {
        const questions = this.getQuestions();
        data = questions.slice(0, 10).map((q: any, idx: number) => ({
          number: q.questionNumber || idx + 1,
          topic: q.topic || 'General',
          difficulty: q.difficulty || 'Unknown',
          marks: q.marks || 0,
        }));
        summary = `Showing ${data.length} of ${questions.length} questions`;
        break;
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      intent: 'QUERY',
      queryType: 'LIST',
      result: {
        type: 'table',
        data,
        metadata: {
          totalCount: data.length,
          executionTime,
        },
      },
      summary,
      suggestions: data.length > 0 ? [`Analyze these ${entity}`, `Filter ${entity}`] : [`Add ${entity} to get started`],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOPICS QUERY HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

class TopicsQueryHandler extends BaseQueryHandler {
  handle(classified: ClassifiedIntent): QueryResponse {
    const startTime = Date.now();
    const topics = this.getTopics();

    if (topics.length === 0) {
      return {
        intent: 'QUERY',
        queryType: 'TOPICS',
        result: {
          type: 'text',
          data: 'No topics found. Please scan a paper first.',
        },
        summary: 'No topics found.',
        suggestions: ['Scan a paper', 'Upload an exam paper'],
      };
    }

    const totalQuestions = topics.reduce((sum, t) => sum + t.count, 0);

    const tableData = topics.map((t, idx) => ({
      rank: idx + 1,
      topic: t.topic,
      questions: t.count,
      percentage: ((t.count / totalQuestions) * 100).toFixed(1) + '%',
      bar: '█'.repeat(Math.round((t.count / totalQuestions) * 10)) + '░'.repeat(10 - Math.round((t.count / totalQuestions) * 10)),
    }));

    const executionTime = Date.now() - startTime;

    const mostFrequent = topics[0];
    const leastFrequent = topics[topics.length - 1];
    const summary = `Found **${topics.length}** unique topics covering **${totalQuestions}** questions. Most frequent: **${mostFrequent.topic}** (${mostFrequent.count} questions), Least frequent: **${leastFrequent.topic}** (${leastFrequent.count} questions).`;

    return {
      intent: 'QUERY',
      queryType: 'TOPICS',
      result: {
        type: 'table',
        data: tableData,
        metadata: {
          totalCount: topics.length,
          executionTime,
        },
      },
      summary,
      suggestions: [
        `Show questions about ${mostFrequent.topic}`,
        'Generate insights about topic distribution',
        'Create a lesson from these topics',
      ],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER QUERY HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

class FilterQueryHandler extends BaseQueryHandler {
  handle(classified: ClassifiedIntent): QueryResponse {
    const startTime = Date.now();
    const params = classified.parameters || {};
    const entity = params.entity || 'questions';
    const filter = params.filter || {};

    let data: any[] = [];
    let summary = '';

    if (entity === 'questions') {
      let questions = this.getQuestions();

      // Apply filters
      if (filter.difficulty) {
        questions = questions.filter((q: any) => q.difficulty === filter.difficulty);
      }
      if (filter.topic) {
        questions = questions.filter((q: any) =>
          q.topic?.toLowerCase().includes(filter.topic!.toLowerCase())
        );
      }

      data = questions.slice(0, 10).map((q: any, idx: number) => ({
        number: q.questionNumber || idx + 1,
        topic: q.topic || 'General',
        difficulty: q.difficulty || 'Unknown',
        marks: q.marks || 0,
      }));

      summary = `Found **${questions.length}** questions matching your criteria`;
    } else if (entity === 'scans') {
      const scans = this.getScans(filter);
      data = scans.slice(0, 10).map((s: Scan) => ({
        name: s.name,
        subject: s.subject,
        grade: s.grade,
        questions: s.analysisData?.questions?.length || 0,
        date: new Date(s.timestamp).toLocaleDateString(),
      }));

      summary = `Found **${scans.length}** scans matching your criteria`;
    }

    const executionTime = Date.now() - startTime;

    return {
      intent: 'QUERY',
      queryType: 'FILTER',
      result: {
        type: 'table',
        data,
        metadata: {
          filteredCount: data.length,
          executionTime,
        },
      },
      summary,
      suggestions: data.length > 0 ? ['Analyze these results', 'Export this data'] : ['Try different filters'],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export function handleQuery(classified: ClassifiedIntent, context: VidyaAppContext): QueryResponse {
  const queryType = classified.subType as QueryType;

  switch (queryType) {
    case 'COUNT':
      return new CountQueryHandler(context).handle(classified);
    case 'RANK':
      return new RankQueryHandler(context).handle(classified);
    case 'LIST':
      return new ListQueryHandler(context).handle(classified);
    case 'TOPICS':
      return new TopicsQueryHandler(context).handle(classified);
    case 'FILTER':
      return new FilterQueryHandler(context).handle(classified);
    default:
      throw new Error(`Unknown query type: ${queryType}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  handleQuery,
};
