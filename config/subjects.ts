import { Subject, SubjectConfiguration, ExamContext } from '../types';

export const SUBJECT_CONFIGS: Record<Subject, SubjectConfiguration> = {
  'Math': {
    id: 'Math',
    name: 'Math',
    displayName: 'Mathematics',
    color: '#3B82F6', // Blue
    colorLight: '#DBEAFE',
    colorDark: '#1E40AF',
    icon: 'Calculator',
    iconEmoji: '🧮',
    domains: [
      'Algebra',
      'Calculus',
      'Geometry',
      'Trigonometry',
      'Statistics',
      'Probability',
      'Coordinate Geometry',
      'Vectors',
      'Matrices'
    ],
    supportedExams: ['KCET', 'JEE', 'CBSE']
  },
  'Physics': {
    id: 'Physics',
    name: 'Physics',
    displayName: 'Physics',
    color: '#10B981', // Green
    colorLight: '#D1FAE5',
    colorDark: '#047857',
    icon: 'Atom',
    iconEmoji: '⚛️',
    domains: [
      'Mechanics',
      'Thermodynamics',
      'Electromagnetism',
      'Optics',
      'Modern Physics',
      'Waves and Oscillations',
      'Nuclear Physics',
      'Electronics',
      'Gravitation'
    ],
    supportedExams: ['KCET', 'NEET', 'JEE', 'CBSE']
  },
  'Chemistry': {
    id: 'Chemistry',
    name: 'Chemistry',
    displayName: 'Chemistry',
    color: '#8B5CF6', // Purple
    colorLight: '#EDE9FE',
    colorDark: '#6D28D9',
    icon: 'FlaskConical',
    iconEmoji: '⚗️',
    domains: [
      'Organic Chemistry',
      'Inorganic Chemistry',
      'Physical Chemistry',
      'Chemical Bonding',
      'Thermodynamics',
      'Electrochemistry',
      'Chemical Kinetics',
      'Coordination Compounds',
      'Environmental Chemistry'
    ],
    supportedExams: ['KCET', 'NEET', 'JEE', 'CBSE']
  },
  'Biology': {
    id: 'Biology',
    name: 'Biology',
    displayName: 'Biology',
    color: '#F59E0B', // Amber
    colorLight: '#FEF3C7',
    colorDark: '#D97706',
    icon: 'Leaf',
    iconEmoji: '🌿',
    domains: [
      'Cell Biology',
      'Genetics',
      'Evolution',
      'Plant Physiology',
      'Human Physiology',
      'Ecology',
      'Biotechnology',
      'Reproduction',
      'Molecular Biology'
    ],
    supportedExams: ['KCET', 'NEET', 'CBSE']
  }
};

// Helper function to get subject config
export const getSubjectConfig = (subject: Subject): SubjectConfiguration => {
  return SUBJECT_CONFIGS[subject];
};

// Helper function to check if a subject-exam combination is valid
export const isValidSubjectExamCombination = (
  subject: Subject,
  exam: ExamContext
): boolean => {
  return SUBJECT_CONFIGS[subject].supportedExams.includes(exam);
};

// Helper function to get default exam for a subject
export const getDefaultExamForSubject = (subject: Subject): ExamContext => {
  const supportedExams = SUBJECT_CONFIGS[subject].supportedExams;

  // Preference order: KCET > NEET > JEE > CBSE
  if (supportedExams.includes('KCET')) return 'KCET';
  if (supportedExams.includes('NEET')) return 'NEET';
  if (supportedExams.includes('JEE')) return 'JEE';
  return 'CBSE';
};

// Get all subjects
export const getAllSubjects = (): Subject[] => {
  return Object.keys(SUBJECT_CONFIGS) as Subject[];
};
