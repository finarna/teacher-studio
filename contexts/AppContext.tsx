import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Subject,
  ExamContext,
  UserPreferences,
  SubjectConfiguration,
  ExamConfiguration
} from '../types';
import { SUBJECT_CONFIGS, getSubjectConfig, isValidSubjectExamCombination, getDefaultExamForSubject } from '../config/subjects';
import { EXAM_CONFIGS, getExamConfig } from '../config/exams';

interface AppContextType {
  // Current state
  activeSubject: Subject;
  activeExamContext: ExamContext;

  // Configurations
  subjectConfig: SubjectConfiguration;
  examConfig: ExamConfiguration;

  // Actions
  setActiveSubject: (subject: Subject) => void;
  setActiveExamContext: (exam: ExamContext) => void;
  switchContext: (subject: Subject, exam: ExamContext) => void;

  // Helpers
  isValidCombination: (subject: Subject, exam: ExamContext) => boolean;
  getAvailableExams: () => ExamContext[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'edujourney_preferences';

// Load preferences from localStorage
const loadPreferences = (): UserPreferences | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load preferences from localStorage:', error);
  }
  return null;
};

// Save preferences to localStorage
const savePreferences = (prefs: UserPreferences): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save preferences to localStorage:', error);
  }
};

// Validate and correct subject-exam combination
const validateAndCorrectCombination = (
  subject: Subject,
  exam: ExamContext
): { subject: Subject; exam: ExamContext; corrected: boolean } => {
  const isValid = isValidSubjectExamCombination(subject, exam);

  if (isValid) {
    return { subject, exam, corrected: false };
  }

  // Auto-correct to default exam for this subject
  const correctedExam = getDefaultExamForSubject(subject);
  console.warn(
    `Invalid combination: ${subject} + ${exam}. Auto-correcting to ${subject} + ${correctedExam}`
  );

  return { subject, exam: correctedExam, corrected: true };
};

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  // Load initial state from localStorage or use defaults
  const loadInitialState = (): { subject: Subject; exam: ExamContext } => {
    const saved = loadPreferences();

    if (saved) {
      // Validate saved preferences
      const validated = validateAndCorrectCombination(
        saved.activeSubject,
        saved.activeExamContext
      );

      if (validated.corrected) {
        // Save corrected preferences immediately
        savePreferences({
          activeSubject: validated.subject,
          activeExamContext: validated.exam,
          lastUpdated: Date.now()
        });
      }

      return { subject: validated.subject, exam: validated.exam };
    }

    // Default: Physics + KCET
    return { subject: 'Physics', exam: 'KCET' };
  };

  const initial = loadInitialState();
  const [activeSubject, setActiveSubjectState] = useState<Subject>(initial.subject);
  const [activeExamContext, setActiveExamContextState] = useState<ExamContext>(initial.exam);

  // Derived configurations
  const subjectConfig = getSubjectConfig(activeSubject);
  const examConfig = getExamConfig(activeExamContext);

  // Save to localStorage whenever state changes
  useEffect(() => {
    savePreferences({
      activeSubject,
      activeExamContext,
      lastUpdated: Date.now()
    });
  }, [activeSubject, activeExamContext]);

  // Set active subject (with validation)
  const setActiveSubject = (subject: Subject) => {
    const validated = validateAndCorrectCombination(subject, activeExamContext);
    setActiveSubjectState(validated.subject);
    setActiveExamContextState(validated.exam);

    if (validated.corrected) {
      console.log(`Switched to ${validated.subject} with auto-corrected exam ${validated.exam}`);
    }
  };

  // Set active exam (with validation)
  const setActiveExamContext = (exam: ExamContext) => {
    const validated = validateAndCorrectCombination(activeSubject, exam);
    setActiveSubjectState(validated.subject);
    setActiveExamContextState(validated.exam);

    if (validated.corrected) {
      console.warn(`Invalid exam ${exam} for ${activeSubject}. Staying with ${validated.exam}`);
    }
  };

  // Switch both subject and exam at once
  const switchContext = (subject: Subject, exam: ExamContext) => {
    const validated = validateAndCorrectCombination(subject, exam);
    setActiveSubjectState(validated.subject);
    setActiveExamContextState(validated.exam);
  };

  // Check if a combination is valid
  const isValidCombination = (subject: Subject, exam: ExamContext): boolean => {
    return isValidSubjectExamCombination(subject, exam);
  };

  // Get available exams for current subject
  const getAvailableExams = (): ExamContext[] => {
    return subjectConfig.supportedExams;
  };

  const value: AppContextType = {
    activeSubject,
    activeExamContext,
    subjectConfig,
    examConfig,
    setActiveSubject,
    setActiveExamContext,
    switchContext,
    isValidCombination,
    getAvailableExams
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook to use AppContext
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }

  return context;
};
