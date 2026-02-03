import { ExamContext, ExamConfiguration, Subject } from '../types';

export const EXAM_CONFIGS: Record<ExamContext, ExamConfiguration> = {
  'KCET': {
    id: 'KCET',
    name: 'KCET',
    fullName: 'Karnataka Common Entrance Test',
    pattern: {
      totalQuestions: 60,
      duration: 80, // minutes per subject
      marksPerQuestion: 1,
      negativeMarking: false
    },
    syllabus: {
      subjects: ['Math', 'Physics', 'Chemistry', 'Biology'],
      weights: {
        Math: 25,
        Physics: 25,
        Chemistry: 25,
        Biology: 25
      }
    },
    difficultyProfile: {
      easy: 40,
      moderate: 40,
      hard: 20
    }
  },
  'NEET': {
    id: 'NEET',
    name: 'NEET',
    fullName: 'National Eligibility cum Entrance Test',
    pattern: {
      totalQuestions: 45, // per subject (180 total)
      duration: 200, // minutes total for all subjects
      marksPerQuestion: 4,
      negativeMarking: true,
      negativeMarkingValue: -1
    },
    syllabus: {
      subjects: ['Physics', 'Chemistry', 'Biology'],
      weights: {
        Math: 0,
        Physics: 25,
        Chemistry: 25,
        Biology: 50
      }
    },
    difficultyProfile: {
      easy: 30,
      moderate: 50,
      hard: 20
    }
  },
  'JEE': {
    id: 'JEE',
    name: 'JEE',
    fullName: 'Joint Entrance Examination (Main)',
    pattern: {
      totalQuestions: 30, // per subject (90 total)
      duration: 180, // minutes total
      marksPerQuestion: 4,
      negativeMarking: true,
      negativeMarkingValue: -1
    },
    syllabus: {
      subjects: ['Math', 'Physics', 'Chemistry'],
      weights: {
        Math: 33.33,
        Physics: 33.33,
        Chemistry: 33.33,
        Biology: 0
      }
    },
    difficultyProfile: {
      easy: 20,
      moderate: 40,
      hard: 40
    }
  },
  'CBSE': {
    id: 'CBSE',
    name: 'CBSE',
    fullName: 'Central Board of Secondary Education',
    pattern: {
      totalQuestions: 40, // varies by subject
      duration: 180, // minutes per subject
      marksPerQuestion: 1,
      negativeMarking: false
    },
    syllabus: {
      subjects: ['Math', 'Physics', 'Chemistry', 'Biology'],
      weights: {
        Math: 25,
        Physics: 25,
        Chemistry: 25,
        Biology: 25
      }
    },
    difficultyProfile: {
      easy: 50,
      moderate: 30,
      hard: 20
    }
  }
};

// Helper function to get exam config
export const getExamConfig = (exam: ExamContext): ExamConfiguration => {
  return EXAM_CONFIGS[exam];
};

// Helper function to get all exams that support a specific subject
export const getExamsForSubject = (subject: Subject): ExamContext[] => {
  return Object.values(EXAM_CONFIGS)
    .filter(config => config.syllabus.subjects.includes(subject))
    .map(config => config.id);
};

// Get all exams
export const getAllExams = (): ExamContext[] => {
  return Object.keys(EXAM_CONFIGS) as ExamContext[];
};

// Get exam pattern description
export const getExamPatternDescription = (exam: ExamContext): string => {
  const config = EXAM_CONFIGS[exam];
  const negMarking = config.pattern.negativeMarking
    ? ` (${config.pattern.negativeMarkingValue} for wrong answer)`
    : '';

  return `${config.pattern.totalQuestions}Q, ${config.pattern.duration}min, ${config.pattern.marksPerQuestion} mark${config.pattern.marksPerQuestion > 1 ? 's' : ''} per question${negMarking}`;
};
