/**
 * Topic Aggregator for Redis/In-Memory Data Source
 * This version aggregates topics from the Redis/in-memory cache instead of Supabase
 */

interface Question {
  id: string;
  text: string;
  topic?: string;
  difficulty?: string;
  subject?: string;
  [key: string]: any;
}

interface Scan {
  id: string;
  subject: string;
  examContext?: string;
  analysisData?: {
    questions?: Question[];
    [key: string]: any;
  };
  [key: string]: any;
}

interface TopicSummary {
  topicName: string;
  totalQuestions: number;
  masteryLevel: number;
  studyStage: string;
}

export async function aggregateTopicsFromScans(
  scans: Scan[],
  subject: string,
  examContext: string
): Promise<TopicSummary[]> {
  // Filter scans by subject and exam context
  const relevantScans = scans.filter(scan =>
    scan.subject === subject &&
    (scan.examContext === examContext || !scan.examContext)
  );

  console.log(`[Redis Aggregator] Found ${relevantScans.length} scans for ${subject} (${examContext})`);

  // Extract all questions from relevant scans
  const allQuestions: Question[] = [];
  relevantScans.forEach(scan => {
    const questions = scan.analysisData?.questions || [];
    allQuestions.push(...questions);
  });

  console.log(`[Redis Aggregator] Total questions: ${allQuestions.length}`);

  // Group questions by topic
  const topicMap = new Map<string, Question[]>();

  allQuestions.forEach(q => {
    const topicName = q.topic || 'Uncategorized';
    if (!topicMap.has(topicName)) {
      topicMap.set(topicName, []);
    }
    topicMap.get(topicName)!.push(q);
  });

  console.log(`[Redis Aggregator] Found ${topicMap.size} unique topics`);

  // Convert to TopicSummary array
  const topics: TopicSummary[] = Array.from(topicMap.entries()).map(([topicName, questions]) => ({
    topicName,
    totalQuestions: questions.length,
    masteryLevel: 0, // Default - would need progress tracking
    studyStage: 'not_started' as const
  }));

  // Sort by question count (descending)
  topics.sort((a, b) => b.totalQuestions - a.totalQuestions);

  return topics;
}
