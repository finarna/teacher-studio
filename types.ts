
export type Subject = 'Math' | 'Physics' | 'Chemistry' | 'Biology';
export type Grade = 'Class 10' | 'Class 11' | 'Class 12';

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
  marks: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  topic: string;
  blooms: string;
  masteryMaterial?: {
    logic: string;
    memoryTrigger: string;
    visualPrompt: string;
    commonTrap: string;
    coreConcept?: string;
  };
  solutionSteps: string[];
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
  analysisData?: ExamAnalysisData;
}
