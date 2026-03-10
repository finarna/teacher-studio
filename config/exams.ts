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
        Biology: 25,
        Botany: 0,
        Zoology: 0
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
      totalQuestions: 200, // 50 per subject (180 to be attempted)
      duration: 200, // 3 hours 20 minutes (200 minutes total)
      marksPerQuestion: 4,
      negativeMarking: true,
      negativeMarkingValue: -1,
      sections: [
        { name: 'Section A (Physics)', questionCount: 35, isMandatory: true, subjects: ['Physics'] },
        { name: 'Section B (Physics)', questionCount: 15, attemptLimit: 10, isMandatory: false, subjects: ['Physics'] },
        { name: 'Section A (Chemistry)', questionCount: 35, isMandatory: true, subjects: ['Chemistry'] },
        { name: 'Section B (Chemistry)', questionCount: 15, attemptLimit: 10, isMandatory: false, subjects: ['Chemistry'] },
        { name: 'Section A (Botany)', questionCount: 35, isMandatory: true, subjects: ['Botany'] },
        { name: 'Section B (Botany)', questionCount: 15, attemptLimit: 10, isMandatory: false, subjects: ['Botany'] },
        { name: 'Section A (Zoology)', questionCount: 35, isMandatory: true, subjects: ['Zoology'] },
        { name: 'Section B (Zoology)', questionCount: 15, attemptLimit: 10, isMandatory: false, subjects: ['Zoology'] }
      ]
    },
    syllabus: {
      subjects: ['Physics', 'Chemistry', 'Botany', 'Zoology'],
      weights: {
        Physics: 25,
        Chemistry: 25,
        Botany: 25,
        Zoology: 25,
        Math: 0,
        Biology: 0 // Migrated to Botany/Zoology
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
        Biology: 0,
        Botany: 0,
        Zoology: 0
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
        Biology: 25,
        Botany: 0,
        Zoology: 0
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
