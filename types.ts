
export type Subject = 'Math' | 'Physics' | 'Chemistry' | 'Biology';
export type Grade = 'Class 10' | 'Class 11' | 'Class 12';
export type ExamContext = 'KCET' | 'NEET' | 'JEE' | 'CBSE';

// Multi-Subject Configuration Types
export interface SubjectConfiguration {
  id: Subject;
  name: string;
  displayName: string;
  color: string;
  colorLight: string;
  colorDark: string;
  icon: string;
  iconEmoji: string;
  domains: string[];
  supportedExams: ExamContext[];
}

export interface ExamConfiguration {
  id: ExamContext;
  name: string;
  fullName: string;
  pattern: {
    totalQuestions: number;
    duration: number; // minutes
    marksPerQuestion: number;
    negativeMarking: boolean;
    negativeMarkingValue?: number;
  };
  syllabus: {
    subjects: Subject[];
    weights: Record<Subject, number>; // Percentage weightage
  };
  difficultyProfile: {
    easy: number;
    moderate: number;
    hard: number;
  };
}

export interface UserPreferences {
  activeSubject: Subject;
  activeExamContext: ExamContext;
  lastUpdated: number;
}

export interface SimulationParams {
  [key: string]: number;
}

export interface SimulationResponse {
  status: 'ok' | 'error';
  outputs: Record<string, number> | null;
  ratios?: Record<string, number>;
  equations: string[];
  warnings: string[];
  explanation?: string;
}

export enum ModuleType {
  HOOK = 'HOOK',
  CONCEPT = 'CONCEPT',
  SIMULATION = 'SIMULATION',
  GUIDED_PRACTICE = 'GUIDED_PRACTICE',
  LESSON_SUMMARY = 'LESSON_SUMMARY',
  ADAPTIVE_QUIZ = 'ADAPTIVE_QUIZ',
  EXAM_MODE = 'EXAM_MODE',
  MASTERY_REPORT = 'MASTERY_REPORT'
}

export type SlideType = 'standard' | 'interactive_anatomy' | 'perspective_shift' | 'comparison' | 'why_tangent' | 'line_of_sight' | 'elevation_depression' | 'guided_solution';

export interface ConceptSlide {
  id: string;
  title: string;
  type: SlideType;
  content: string;
  highlight?: string;
  bulletPoints?: string[];
  example?: string;      // NEW: Real-world example
  visualPrompt?: string; // NEW: Prompt for AI image generation
  imageUrl?: string;     // AI Generated Visual
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  misconceptionId?: string;
  hint?: string;
}

export interface LessonModule {
  id: string;
  type: ModuleType;
  title: string;
  content: any;
}

export interface LessonContract {
  lesson_id: string;
  title: string;
  grade: Grade;
  subject: Subject;
  description: string;
  bannerImageUrl?: string;
  modules: LessonModule[];
}

// --- PROFESSOR TRAINING TYPES ---

export enum TrainingModuleType {
  PEDAGOGICAL_STRATEGY = 'PEDAGOGICAL_STRATEGY',
  DIAGNOSTIC_FRAMEWORK = 'DIAGNOSTIC_FRAMEWORK',
  ILLUSTRATION_GUIDE = 'ILLUSTRATION_GUIDE',
  QUESTION_ENGINEERING = 'QUESTION_ENGINEERING',
  ANALYTICAL_DEPTH = 'ANALYTICAL_DEPTH'
}

export interface TrainingModule {
  id: string;
  type: TrainingModuleType;
  title: string;
  content: any;
}

export interface ProfessorTrainingContract {
  id: string;
  title: string;
  subject: Subject;
  grade: Grade;
  contextPaperId?: string; // Reference to the analyzed paper
  learningObjectives: string[];
  pedagogicalDeepDive: {
    hook: string;
    commonMisconceptions: { issue: string; resolution: string }[];
    transitionPoints: string[];
    boardIntelligence: string;
  };
  modules: TrainingModule[];
}

export interface LessonPreview {
  id: string;
  title: string;
  subject: Subject;
  grade: Grade;
  description: string;
  durationMinutes: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  simulationCount: number;
  locked: boolean;
  tags: string[];
}

export type MasteryState = 'NEW' | 'LEARNING' | 'PRACTICING' | 'ASSESSING' | 'MASTERED';

export interface UserState {
  currentModuleIndex: number;
  masteryScore: number;
  masteryState: MasteryState;
  quizHistory: { questionId: string; correct: boolean; timestamp: number }[];
  misconceptions: string[];
  examUnlocked: boolean;
}

// --- NEW TYPES FOR GOD MODE ---

export interface SketchNote {
  id: string;
  title: string;
  subject: Subject;
  tags: string[];
  imageUrl: string;
  highYield: boolean;
  frequency?: string;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  context?: string;
}

export interface AnalyzedQuestion {
  id: string;
  text: string;
  options?: string[];      // NEW: For MCQs
  marks: number | string;  // Can be number or string for UI compatibility
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  diff?: string;           // Alias for difficulty (UI compatibility)
  topic: string;
  domain?: string;         // Subject domain/chapter (e.g., "Mechanics", "Organic Chemistry")
  year?: string;           // Year of exam paper (e.g., "2024", "2023")
  pedagogy?: 'Conceptual' | 'Analytical' | 'Problem-Solving' | 'Application' | 'Critical-Thinking' | 'Numerical' | 'Memorization';
  blooms: string;
  bloomsTaxonomy?: string; // Alias for blooms (UI compatibility)
  masteryMaterial?: {
    logic: string;
    memoryTrigger: string;
    visualPrompt: string;
    commonTrap: string;
    coreConcept?: string;
  };
  solutionSteps: string[];
  markingScheme?: { step: string; mark: string }[]; // Marking scheme with marks per step
  examTip?: string;
  visualConcept?: string;
  diagramUrl?: string;
  keyFormulas?: string[];
  pitfalls?: string[];
  source?: string; // NEW: Identification of origin paper
  correctOptionIndex?: number;
  sketchSvg?: string;
  // Enhanced image support for scanned papers
  hasVisualElement?: boolean; // Indicates if question has diagram/table/image
  visualElementType?:
    // Generic types (all subjects)
    | 'diagram'
    | 'table'
    | 'graph'
    | 'illustration'
    | 'chart'
    | 'image'
    // Math-specific types
    | 'coordinate-plane'    // Cartesian plane with function graphs
    | 'geometric-figure'    // Triangles, circles, polygons with measurements
    | '3d-diagram'          // 3D geometry (cuboids, spheres, cones)
    | 'matrix'              // Matrix/determinant representation
    | 'number-line'         // Number line for inequalities
    | 'venn-diagram'        // Set theory diagrams
    | 'tree-diagram'        // Probability tree diagrams
    | 'flowchart'           // Algorithm/logic flow diagrams
    // Physics-specific types
    | 'circuit-diagram'     // Electrical circuits with resistors, capacitors, batteries
    | 'ray-diagram'         // Optics: ray paths through lenses, mirrors, prisms
    | 'free-body-diagram'   // Mechanics: forces acting on objects
    | 'wave-diagram'        // Wave patterns, interference, standing waves
    | 'field-diagram'       // Electric/magnetic field lines and equipotentials
    | 'energy-level-diagram'; // Atomic energy levels, transitions
  visualElementDescription?: string; // AI description of the visual element
  visualElementPosition?: 'above' | 'below' | 'inline' | 'side'; // Position relative to question text
  visualBoundingBox?: { pageNumber: number; x: string; y: string; width: string; height: string }; // Gemini-provided percentage coordinates (e.g., x: "10%")
  extractedImages?: string[]; // Base64 image data URLs extracted from PDF
}

export interface ChapterInsight {
  topic: string;
  totalMarks: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  description: string;       // High-level summary of this chapter in the paper
  keyConcepts: string[];     // List of concepts appearing in this chapter
  importantFormulas: string[];
  studyResources: string[];  // List of recommended study materials/strategies
  visualSummary?: string;    // Description of a mind map or visual aid
  preparationChecklist?: string[]; // List of actionable items
  highYieldTopics?: string[]; // NEW: For high-yield targets
}

export interface ExamAnalysisData {
  summary: string;
  overallDifficulty: 'Easy' | 'Moderate' | 'Hard';
  difficultyDistribution: { name: 'Easy' | 'Moderate' | 'Hard'; percentage: number; color: string }[];
  bloomsTaxonomy: { name: string; percentage: number; color: string }[];
  topicWeightage: { name: string; marks: number; color: string }[];
  trends: { title: string; description: string; type: 'positive' | 'negative' | 'neutral' }[];
  predictiveTopics: { topic: string; probability: number; reason: string }[];
  faq: { question: string; answer: string }[];
  strategy: string[];
  chapterInsights?: ChapterInsight[]; // NEW: Grouped chapter data
  questions: AnalyzedQuestion[]; // Specific questions from paper
  topicBasedSketches?: Record<string, any>; // NEW: Topic-based flip book sketches (stored as Record to avoid circular dependency)
}

export interface Scan {
  id: string;
  name: string;
  date: string; // Formatted date string
  timestamp: number;
  status: 'Processing' | 'Complete' | 'Failed';
  grade: string;
  subject: string;
  examContext?: ExamContext; // Optional for backward compatibility
  analysisData?: ExamAnalysisData;
}

// --- VIDYA AI CHATBOT TYPES ---

export type VidyaRole = 'user' | 'assistant';

export interface VidyaMessage {
  id: string;
  role: VidyaRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface VidyaChatState {
  messages: VidyaMessage[];
  isOpen: boolean;
  isThinking: boolean;
  error: string | null;
}

export type UserRole = 'student' | 'teacher';

export interface VidyaAppContext {
  // Teacher Mode Context
  scannedPapers?: Scan[];
  selectedScan?: Scan | null;
  customLessons?: LessonContract[];
  currentView?: string;

  // Student Mode Context
  currentLesson?: LessonContract | null;
  userProgress?: {
    masteryScore: number;
    currentModule: string;
    quizHistory: any[];
    misconceptions: string[];
  };
}

// --- LEARNING JOURNEY TYPES ---

export interface Topic {
  id: string;
  subject: Subject;
  domain: string;
  name: string;
  description?: string;
  difficultyLevel: 'Easy' | 'Moderate' | 'Hard';
  estimatedStudyHours?: number;
  examWeightage: Record<ExamContext, number>; // {NEET: 5, JEE: 3, KCET: 4}
  prerequisiteTopics?: string[]; // Array of topic IDs
  keyConcepts: string[];
  createdAt: Date;
}

export type StudyStage = 'not_started' | 'studying_notes' | 'practicing' | 'taking_quiz' | 'mastered';

export interface TopicResource {
  id: string;
  userId: string;
  topicId: string;
  topicName: string;
  subject: Subject;
  examContext: ExamContext;

  // Aggregated data from scans
  questions: AnalyzedQuestion[];
  flashcards: Flashcard[];
  sketchPages: TopicSketchPage[];
  chapterInsights: ChapterInsight[];

  // Metadata
  totalQuestions: number;
  sourceScanIds: string[];
  difficultyDistribution: {
    easy: number;
    moderate: number;
    hard: number;
  };

  // Progress tracking
  masteryLevel: number; // 0-100
  studyStage: StudyStage;
  questionsAttempted: number;
  questionsCorrect: number;
  averageAccuracy: number;
  quizzesTaken: number;
  averageQuizScore: number;
  lastPracticed?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface TopicSketchPage {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
}

export type ActivityType = 'viewed_notes' | 'practiced_question' | 'completed_quiz' | 'reviewed_flashcard';

export interface TopicActivity {
  id: string;
  userId: string;
  topicResourceId: string;
  activityType: ActivityType;
  questionId?: string;
  isCorrect?: boolean;
  timeSpent?: number; // seconds
  activityTimestamp: Date;
  metadata?: Record<string, any>;
}

export type TestType = 'topic_quiz' | 'subject_test' | 'full_mock';
export type TestStatus = 'in_progress' | 'completed' | 'abandoned';

export interface TestAttempt {
  id: string;
  userId: string;
  testType: TestType;
  testName: string;
  examContext: ExamContext;
  subject: Subject;
  topicId?: string;

  // Configuration
  totalQuestions: number;
  durationMinutes: number;

  // Timing
  startTime: Date;
  endTime?: Date;
  totalDuration?: number; // seconds

  // Scoring
  rawScore?: number;
  percentage?: number;
  marksObtained?: number;
  marksTotal?: number;
  negativeMarks?: number;

  // Status
  status: TestStatus;
  questionsAttempted: number;

  // Analysis
  topicAnalysis?: Record<string, any>;
  timeAnalysis?: Record<string, any>;
  aiReport?: Record<string, any>;

  createdAt: Date;
  completedAt?: Date;
}

export interface TestResponse {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOption?: number;
  isCorrect?: boolean;
  timeSpent?: number; // seconds
  markedForReview: boolean;

  // Denormalized for analytics
  topic: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  marks: number;

  createdAt: Date;
}

export interface SubjectProgress {
  id: string;
  userId: string;
  trajectoryId: ExamContext;
  subject: Subject;

  overallMastery: number; // 0-100
  topicsTotal: number;
  topicsMastered: number; // mastery >= 85%

  totalQuestionsAttempted: number;
  overallAccuracy: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface TopicQuestionMapping {
  id: string;
  topicId: string;
  questionId: string;
  confidence: number; // 0.0-1.0
  mappedBy: 'ai' | 'manual';
  createdAt: Date;
}
