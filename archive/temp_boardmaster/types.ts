
export type ExamType = 'KCET_ENTRANCE' | 'NEET_ENTRANCE';
export type SubjectType = 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology';
export type UserRole = 'student' | 'admin' | 'teacher';

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface SubTopic {
  name: string;
  mastery: number;
  questionCount: number;
}

export interface TopicMastery {
  topic: string;
  correctCount: number;
  totalCount: number;
  masteryScore: number;
  lastAttemptDate: string;
  trend: 'improving' | 'declining' | 'stable';
  avgTimePerQuestion: number;
  weightage: number;
  subTopics?: SubTopic[];
}

export interface SessionMetrics {
  timeSpentPerQuestion: Record<number, number>;
  totalTime: number;
  efficiencyIndex: number;
  accuracyRate: number;
  stressFactor: number;
}

export interface SmartNotes {
  topicTitle: string;
  visualConcept: string;
  keyPoints: string[];
  steps: { title: string; content: string }[];
  mentalAnchor: string;
  quickRef: string;
  diagramUrl?: string;
}

export interface SolutionStep {
  text: string;
  pitfall?: string;
  reminder?: string;
}

export interface SolutionData {
  steps: SolutionStep[];
  finalTip: string;
}

export interface Question {
  id: number;
  text: string;
  options: Option[];
  subject: SubjectType;
  imageUrl?: string;
  solutionData?: SolutionData;
  smartNotes?: SmartNotes;
  strategicHook?: string; 
  metadata?: {
    topic?: string;
    subTopic?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    bloomLevel?: 'Remembering' | 'Understanding' | 'Applying' | 'Analyzing' | 'Evaluating' | 'Creating';
    marksWeight?: number;
    trapPotential?: number;
    isPastYear?: boolean;
    year?: string;
    source?: string;
  };
}

export interface StrategyCorrection {
  summary: string;
  timeManagement: string;
  accuracyStrategy: string;
  nextSteps: string[];
}

export interface MockTestSession {
  id: string;
  subject: SubjectType;
  questions: Question[];
  answers: Record<number, string>;
  startTime: number;
  endTime?: number;
  durationLimit: number;
  score: number;
  accuracy: number;
  strategyCorrection?: StrategyCorrection;
}

export interface ChatContext {
  currentQuestion?: Question;
  allQuestions: Question[];
  userAnswers: Record<number, string>;
  masteryData: Record<string, TopicMastery>;
  isSubmitted: boolean;
  activeView: string;
  selectedExam?: ExamType;
  selectedSubject?: SubjectType;
  mockHistory: MockTestSession[];
}
