# Multi-Subject Architecture - Complete Implementation Guide

**Version:** 1.0
**Date:** 2026-01-31
**Status:** Design Complete - Awaiting Implementation
**Scope:** Full multi-subject (Math, Physics, Chemistry, Biology) and multi-exam (KCET, NEET) support

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Frontend Changes](#frontend-changes)
4. [Backend Changes](#backend-changes)
5. [Data Model Changes](#data-model-changes)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Rollback Plan](#rollback-plan)

---

## Executive Summary

### Problem Statement
The application currently supports multiple subjects theoretically (via types), but lacks:
- Global subject/exam context management
- Subject-specific UI theming
- Exam-specific configurations (KCET vs NEET patterns)
- Seamless switching between subjects
- Subject-filtered content across all views

### Solution Overview
Implement a **context-driven architecture** that provides:
- Global `AppContext` for subject/exam state
- Subject-specific configurations and theming
- Automatic content filtering across all components
- Persistent user preferences
- Exam-specific analysis and patterns

### Key Benefits
- **Scalability:** Add new subjects/exams with config-only changes
- **UX:** Seamless subject switching with visual feedback
- **Performance:** Client-side filtering, no backend changes needed initially
- **Maintainability:** Centralized configuration, DRY principles
- **Data Integrity:** Type-safe subject/exam handling

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React App                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              AppContextProvider                        │ │
│  │  - activeSubject: Subject                              │ │
│  │  - activeExamContext: ExamContext                      │ │
│  │  - subjectConfig: SubjectConfiguration                 │ │
│  │  - examConfig: ExamConfiguration                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│  ┌────────────────┬────────┴────────┬──────────────────┐   │
│  │ SubjectSwitcher│   Components    │  Data Layer      │   │
│  │  (UI Control)  │  (Auto-filtered)│  (Hooks/Utils)   │   │
│  └────────────────┴─────────────────┴──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Express)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GET /api/scans?subject=X&examContext=Y              │  │
│  │  POST /api/scans (with examContext field)            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Redis Storage                           │
│  scan:{id} → {                                              │
│    subject: "Physics",                                      │
│    examContext: "KCET",  ← NEW FIELD                       │
│    grade: "Class 12",                                       │
│    ...                                                      │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action: Switch Subject
        │
        ▼
┌──────────────────┐
│ SubjectSwitcher  │ → Updates AppContext
└──────────────────┘
        │
        ▼
┌──────────────────┐
│   AppContext     │ → Broadcasts new subject/exam
└──────────────────┘
        │
        ├─────────────────────┬──────────────────┬──────────────┐
        ▼                     ▼                  ▼              ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────┐  ┌────────────┐
│  Sidebar     │  │ BoardMastermind  │  │ Analysis │  │ VidyaV3    │
│ (color theme)│  │ (filtered scans) │  │(theming) │  │ (context)  │
└──────────────┘  └──────────────────┘  └──────────┘  └────────────┘
        │                     │
        │                     ▼
        │          ┌──────────────────┐
        │          │ useFilteredScans │ → Client-side filter
        │          └──────────────────┘
        │                     │
        │                     ▼
        │          ┌──────────────────┐
        │          │   Display Scans  │
        │          └──────────────────┘
        ▼
localStorage (persist preferences)
```

---

## Frontend Changes

### 1. Type System Extensions

**File:** `types.ts`

```typescript
// NEW: Exam context type
export type ExamContext = 'KCET' | 'NEET' | 'CBSE' | 'JEE';

// NEW: Subject configuration
export interface SubjectConfiguration {
  id: Subject;
  name: string;
  displayName: string;
  color: string;           // Primary brand color
  colorLight: string;      // Light variant for backgrounds
  colorDark: string;       // Dark variant for text
  icon: string;            // Lucide icon name
  iconEmoji: string;       // Emoji fallback
  domains: string[];       // Subject-specific topics
  formulaNotation: 'latex' | 'unicode';
  examContexts: ExamContext[]; // Applicable exams
}

// NEW: Exam configuration
export interface ExamConfiguration {
  id: ExamContext;
  name: string;
  fullName: string;
  applicableSubjects: Subject[];
  grade: Grade;
  pattern: {
    totalQuestions: number;
    marksPerQuestion: number;
    negativeMark: number;
    duration: number;        // minutes
    sectionsPerSubject?: number;
  };
  syllabus: {
    class11Weight: number;   // Percentage
    class12Weight: number;
  };
  difficultyDistribution: {
    easy: number;
    moderate: number;
    hard: number;
  };
}

// UPDATED: Add examContext to Scan
export interface Scan {
  id: string;
  name: string;
  date: string;
  timestamp: number;
  status: 'Processing' | 'Complete' | 'Failed';
  grade: string;
  subject: Subject;
  examContext: ExamContext;  // NEW FIELD
  analysisData?: ExamAnalysisData;
}

// NEW: User preferences
export interface UserPreferences {
  defaultSubject: Subject;
  defaultExamContext: ExamContext;
  lastActiveSubject: Subject;
  lastActiveExam: ExamContext;
  subjectHistory: { subject: Subject; exam: ExamContext; timestamp: number }[];
}
```

---

### 2. Configuration Files

**File:** `config/subjects.ts` (NEW)

```typescript
import { Subject, SubjectConfiguration } from '../types';

export const SUBJECT_CONFIGS: Record<Subject, SubjectConfiguration> = {
  'Math': {
    id: 'Math',
    name: 'Math',
    displayName: 'Mathematics',
    color: '#3B82F6',        // Blue
    colorLight: '#DBEAFE',
    colorDark: '#1E40AF',
    icon: 'Calculator',
    iconEmoji: '🧮',
    domains: [
      'Algebra',
      'Calculus',
      'Coordinate Geometry',
      'Trigonometry',
      'Vectors',
      'Probability',
      'Statistics',
      'Matrices & Determinants'
    ],
    formulaNotation: 'latex',
    examContexts: ['KCET', 'JEE', 'CBSE']
  },
  'Physics': {
    id: 'Physics',
    name: 'Physics',
    displayName: 'Physics',
    color: '#10B981',        // Green
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
      'Wave Motion',
      'Gravitation'
    ],
    formulaNotation: 'latex',
    examContexts: ['KCET', 'NEET', 'JEE', 'CBSE']
  },
  'Chemistry': {
    id: 'Chemistry',
    name: 'Chemistry',
    displayName: 'Chemistry',
    color: '#8B5CF6',        // Purple
    colorLight: '#EDE9FE',
    colorDark: '#6D28D9',
    icon: 'FlaskConical',
    iconEmoji: '⚗️',
    domains: [
      'Physical Chemistry',
      'Organic Chemistry',
      'Inorganic Chemistry',
      'Chemical Kinetics',
      'Electrochemistry'
    ],
    formulaNotation: 'unicode',
    examContexts: ['KCET', 'NEET', 'JEE', 'CBSE']
  },
  'Biology': {
    id: 'Biology',
    name: 'Biology',
    displayName: 'Biology',
    color: '#F59E0B',        // Amber
    colorLight: '#FEF3C7',
    colorDark: '#D97706',
    icon: 'Leaf',
    iconEmoji: '🌿',
    domains: [
      'Botany',
      'Zoology',
      'Genetics',
      'Ecology',
      'Human Physiology',
      'Plant Physiology',
      'Evolution',
      'Biotechnology'
    ],
    formulaNotation: 'unicode',
    examContexts: ['KCET', 'NEET', 'CBSE']
  }
};

// Utility functions
export const getSubjectConfig = (subject: Subject): SubjectConfiguration => {
  return SUBJECT_CONFIGS[subject];
};

export const getAllSubjects = (): Subject[] => {
  return Object.keys(SUBJECT_CONFIGS) as Subject[];
};
```

**File:** `config/exams.ts` (NEW)

```typescript
import { ExamContext, ExamConfiguration } from '../types';

export const EXAM_CONFIGS: Record<ExamContext, ExamConfiguration> = {
  'KCET': {
    id: 'KCET',
    name: 'KCET',
    fullName: 'Karnataka Common Entrance Test',
    applicableSubjects: ['Math', 'Physics', 'Chemistry', 'Biology'],
    grade: 'Class 12',
    pattern: {
      totalQuestions: 60,
      marksPerQuestion: 1,
      negativeMark: 0,
      duration: 80,
      sectionsPerSubject: 1
    },
    syllabus: {
      class11Weight: 50,
      class12Weight: 50
    },
    difficultyDistribution: {
      easy: 40,
      moderate: 40,
      hard: 20
    }
  },
  'NEET': {
    id: 'NEET',
    name: 'NEET',
    fullName: 'National Eligibility cum Entrance Test',
    applicableSubjects: ['Physics', 'Chemistry', 'Biology'],
    grade: 'Class 12',
    pattern: {
      totalQuestions: 45,
      marksPerQuestion: 4,
      negativeMark: -1,
      duration: 180,
      sectionsPerSubject: 2  // Section A + Section B
    },
    syllabus: {
      class11Weight: 50,
      class12Weight: 50
    },
    difficultyDistribution: {
      easy: 30,
      moderate: 50,
      hard: 20
    }
  },
  'JEE': {
    id: 'JEE',
    name: 'JEE Main',
    fullName: 'Joint Entrance Examination - Main',
    applicableSubjects: ['Math', 'Physics', 'Chemistry'],
    grade: 'Class 12',
    pattern: {
      totalQuestions: 30,
      marksPerQuestion: 4,
      negativeMark: -1,
      duration: 180,
      sectionsPerSubject: 2
    },
    syllabus: {
      class11Weight: 40,
      class12Weight: 60
    },
    difficultyDistribution: {
      easy: 20,
      moderate: 50,
      hard: 30
    }
  },
  'CBSE': {
    id: 'CBSE',
    name: 'CBSE',
    fullName: 'Central Board of Secondary Education',
    applicableSubjects: ['Math', 'Physics', 'Chemistry', 'Biology'],
    grade: 'Class 12',
    pattern: {
      totalQuestions: 40,
      marksPerQuestion: 1,
      negativeMark: 0,
      duration: 180
    },
    syllabus: {
      class11Weight: 0,
      class12Weight: 100
    },
    difficultyDistribution: {
      easy: 30,
      moderate: 50,
      hard: 20
    }
  }
};

// Utility functions
export const getExamConfig = (exam: ExamContext): ExamConfiguration => {
  return EXAM_CONFIGS[exam];
};

export const getExamsForSubject = (subject: Subject): ExamContext[] => {
  return Object.values(EXAM_CONFIGS)
    .filter(config => config.applicableSubjects.includes(subject))
    .map(config => config.id);
};
```

---

### 3. Context Implementation

**File:** `contexts/AppContext.tsx` (NEW)

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Subject, ExamContext, SubjectConfiguration, ExamConfiguration } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { EXAM_CONFIGS } from '../config/exams';

interface AppContextType {
  // Active state
  activeSubject: Subject;
  activeExamContext: ExamContext;

  // Setters
  setActiveSubject: (subject: Subject) => void;
  setActiveExamContext: (exam: ExamContext) => void;
  switchContext: (subject: Subject, exam: ExamContext) => void;

  // Derived configurations
  subjectConfig: SubjectConfiguration;
  examConfig: ExamConfiguration;

  // Utilities
  isValidCombination: (subject: Subject, exam: ExamContext) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'edujourney_preferences';

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  // Load from localStorage or use defaults
  const loadPreferences = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          subject: parsed.lastActiveSubject || 'Physics',
          exam: parsed.lastActiveExam || 'KCET'
        };
      } catch {
        return { subject: 'Physics' as Subject, exam: 'KCET' as ExamContext };
      }
    }
    return { subject: 'Physics' as Subject, exam: 'KCET' as ExamContext };
  };

  const initial = loadPreferences();
  const [activeSubject, setActiveSubjectState] = useState<Subject>(initial.subject);
  const [activeExamContext, setActiveExamContextState] = useState<ExamContext>(initial.exam);

  // Persist to localStorage
  useEffect(() => {
    const preferences = {
      defaultSubject: activeSubject,
      defaultExamContext: activeExamContext,
      lastActiveSubject: activeSubject,
      lastActiveExam: activeExamContext,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [activeSubject, activeExamContext]);

  // Validate subject-exam combination
  const isValidCombination = (subject: Subject, exam: ExamContext): boolean => {
    const examConfig = EXAM_CONFIGS[exam];
    return examConfig.applicableSubjects.includes(subject);
  };

  const setActiveSubject = (subject: Subject) => {
    // If current exam doesn't support new subject, switch to first valid exam
    if (!isValidCombination(subject, activeExamContext)) {
      const validExam = EXAM_CONFIGS[activeExamContext].applicableSubjects.includes(subject)
        ? activeExamContext
        : SUBJECT_CONFIGS[subject].examContexts[0];
      setActiveExamContextState(validExam);
    }
    setActiveSubjectState(subject);
  };

  const setActiveExamContext = (exam: ExamContext) => {
    // If current subject doesn't support new exam, keep subject but warn
    if (!isValidCombination(activeSubject, exam)) {
      console.warn(`Subject ${activeSubject} not available for ${exam}`);
      return;
    }
    setActiveExamContextState(exam);
  };

  const switchContext = (subject: Subject, exam: ExamContext) => {
    if (!isValidCombination(subject, exam)) {
      console.error(`Invalid combination: ${subject} + ${exam}`);
      return;
    }
    setActiveSubjectState(subject);
    setActiveExamContextState(exam);
  };

  const value: AppContextType = {
    activeSubject,
    activeExamContext,
    setActiveSubject,
    setActiveExamContext,
    switchContext,
    subjectConfig: SUBJECT_CONFIGS[activeSubject],
    examConfig: EXAM_CONFIGS[activeExamContext],
    isValidCombination
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
};
```

---

### 4. Custom Hooks

**File:** `hooks/useFilteredScans.ts` (NEW)

```typescript
import { useMemo } from 'react';
import { Scan, Subject, ExamContext } from '../types';
import { useAppContext } from '../contexts/AppContext';

export const useFilteredScans = (scans: Scan[]) => {
  const { activeSubject, activeExamContext } = useAppContext();

  const filteredScans = useMemo(() => {
    return scans.filter(scan =>
      scan.subject === activeSubject &&
      scan.examContext === activeExamContext
    );
  }, [scans, activeSubject, activeExamContext]);

  return {
    scans: filteredScans,
    count: filteredScans.length,
    hasScans: filteredScans.length > 0
  };
};

export const useSubjectStats = (scans: Scan[]) => {
  const { activeSubject, activeExamContext } = useAppContext();

  return useMemo(() => {
    const filtered = scans.filter(scan =>
      scan.subject === activeSubject &&
      scan.examContext === activeExamContext
    );

    const totalQuestions = filtered.reduce((sum, scan) =>
      sum + (scan.analysisData?.questions?.length || 0), 0
    );

    const completedScans = filtered.filter(s => s.status === 'Complete').length;

    const uniqueTopics = new Set(
      filtered.flatMap(scan =>
        scan.analysisData?.questions?.map(q => q.topic) || []
      )
    );

    return {
      totalScans: filtered.length,
      completedScans,
      processingScans: filtered.filter(s => s.status === 'Processing').length,
      totalQuestions,
      uniqueTopics: uniqueTopics.size,
      averageQuestionsPerScan: filtered.length > 0
        ? Math.round(totalQuestions / filtered.length)
        : 0
    };
  }, [scans, activeSubject, activeExamContext]);
};
```

**File:** `hooks/useSubjectTheme.ts` (NEW)

```typescript
import { useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';

export const useSubjectTheme = () => {
  const { subjectConfig } = useAppContext();

  useEffect(() => {
    // Update CSS variables for dynamic theming
    const root = document.documentElement;
    root.style.setProperty('--subject-primary', subjectConfig.color);
    root.style.setProperty('--subject-light', subjectConfig.colorLight);
    root.style.setProperty('--subject-dark', subjectConfig.colorDark);
  }, [subjectConfig]);

  return {
    color: subjectConfig.color,
    colorLight: subjectConfig.colorLight,
    colorDark: subjectConfig.colorDark,
    icon: subjectConfig.icon,
    iconEmoji: subjectConfig.iconEmoji
  };
};
```

---

### 5. UI Components

**File:** `components/SubjectSwitcher.tsx` (NEW)

```typescript
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { EXAM_CONFIGS } from '../config/exams';
import { Subject, ExamContext } from '../types';
import * as Icons from 'lucide-react';

const SubjectSwitcher: React.FC = () => {
  const {
    activeSubject,
    activeExamContext,
    setActiveSubject,
    setActiveExamContext,
    examConfig
  } = useAppContext();

  const subjects: Subject[] = ['Math', 'Physics', 'Chemistry', 'Biology'];
  const availableExams = examConfig.applicableSubjects.includes(activeSubject)
    ? Object.keys(EXAM_CONFIGS) as ExamContext[]
    : [];

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Subject Pills */}
        <div className="flex items-center gap-2">
          {subjects.map(subject => {
            const config = SUBJECT_CONFIGS[subject];
            const IconComponent = Icons[config.icon as keyof typeof Icons] as any;
            const isActive = activeSubject === subject;

            return (
              <button
                key={subject}
                onClick={() => setActiveSubject(subject)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm
                  transition-all duration-200 border-2
                  ${isActive
                    ? 'border-current shadow-lg'
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
                style={{
                  backgroundColor: isActive ? config.colorLight : 'white',
                  color: isActive ? config.colorDark : '#64748B',
                  borderColor: isActive ? config.color : undefined
                }}
              >
                {IconComponent && <IconComponent size={18} />}
                <span className="hidden sm:inline">{config.name}</span>
                <span className="sm:hidden">{config.iconEmoji}</span>
              </button>
            );
          })}
        </div>

        {/* Exam Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Exam
          </span>
          <select
            value={activeExamContext}
            onChange={(e) => setActiveExamContext(e.target.value as ExamContext)}
            className="px-4 py-2.5 rounded-xl border-2 border-slate-200 font-bold text-sm
                       focus:outline-none focus:border-slate-900 bg-white cursor-pointer
                       hover:border-slate-300 transition-colors"
          >
            {availableExams.map(exam => (
              <option key={exam} value={exam}>
                {EXAM_CONFIGS[exam].fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Context Indicator */}
      <div className="bg-slate-50 border-t border-slate-100 px-6 py-2">
        <p className="text-xs text-slate-500 font-medium">
          Viewing: <span className="font-bold text-slate-700">
            {SUBJECT_CONFIGS[activeSubject].displayName}
          </span>
          {' • '}
          <span className="font-bold text-slate-700">
            {EXAM_CONFIGS[activeExamContext].fullName}
          </span>
          {' • '}
          Pattern: {examConfig.pattern.totalQuestions}Q, {examConfig.pattern.duration}min
        </p>
      </div>
    </div>
  );
};

export default SubjectSwitcher;
```

**File:** `components/EmptyState.tsx` (NEW)

```typescript
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Upload } from 'lucide-react';
import * as Icons from 'lucide-react';

interface EmptyStateProps {
  onUpload?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onUpload }) => {
  const { subjectConfig, examConfig } = useAppContext();
  const IconComponent = Icons[subjectConfig.icon as keyof typeof Icons] as any;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div
        className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
        style={{ backgroundColor: subjectConfig.colorLight }}
      >
        {IconComponent && (
          <IconComponent size={48} style={{ color: subjectConfig.color }} />
        )}
      </div>

      <h3 className="text-2xl font-black text-slate-900 mb-2 font-outfit">
        No {subjectConfig.displayName} Papers Yet
      </h3>

      <p className="text-slate-500 text-center max-w-md mb-8">
        Upload your first {subjectConfig.displayName} paper for {examConfig.fullName}
        to unlock AI-powered analysis and intelligent insights.
      </p>

      {onUpload && (
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white
                     shadow-lg hover:shadow-xl transition-all"
          style={{ backgroundColor: subjectConfig.color }}
        >
          <Upload size={20} />
          Upload {subjectConfig.name} Paper
        </button>
      )}
    </div>
  );
};

export default EmptyState;
```

---

### 6. Component Updates

**File:** `components/BoardMastermind.tsx` (MODIFIED)

```typescript
// REMOVE these lines (around line 37-38):
- const [selectedSubject, setSelectedSubject] = useState('Physics');
- const [selectedGrade, setSelectedGrade] = useState('Class 12');

// ADD these imports:
+ import { useAppContext } from '../contexts/AppContext';
+ import { useFilteredScans, useSubjectStats } from '../hooks/useFilteredScans';
+ import EmptyState from './EmptyState';

// MODIFY component:
const BoardMastermind: React.FC<BoardMastermindProps> = ({
  onNavigate,
  recentScans,
  onAddScan,
  onSelectScan
}) => {
+ const { activeSubject, activeExamContext, subjectConfig, examConfig } = useAppContext();
+ const { scans: filteredScans, hasScans } = useFilteredScans(recentScans);
+ const stats = useSubjectStats(recentScans);

  // Update file upload handler to include examContext:
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... existing code ...

    const newScan: Scan = {
      id: scanId,
      name: file.name,
      // ... existing fields ...
+     examContext: activeExamContext,  // NEW
    };
  };

  // REPLACE scan display section with:
+ if (!hasScans) {
+   return <EmptyState onUpload={() => document.getElementById('file-input')?.click()} />;
+ }

  return (
    <div>
      {/* Subject Stats Card - NEW */}
+     <div className="grid grid-cols-4 gap-4 mb-6">
+       <MetricCard title="Total Papers" content={stats.totalScans} icon={<FileText />} />
+       <MetricCard title="Questions" content={stats.totalQuestions} icon={<HelpCircle />} />
+       <MetricCard title="Topics" content={stats.uniqueTopics} icon={<BookOpen />} />
+       <MetricCard title="Completed" content={stats.completedScans} icon={<CheckCircle />} />
+     </div>

      {/* Recent Scans - Use filtered */}
      <div className="grid grid-cols-3 gap-4">
-       {recentScans.map(scan => (
+       {filteredScans.map(scan => (
          <ScanCard
            scan={scan}
            onClick={() => onSelectScan(scan)}
+           subjectColor={subjectConfig.color}
          />
        ))}
      </div>
    </div>
  );
};
```

**File:** `components/ExamAnalysis.tsx` (MODIFIED)

```typescript
// ADD imports:
+ import { useAppContext } from '../contexts/AppContext';
+ import { useSubjectTheme } from '../hooks/useSubjectTheme';

const ExamAnalysis: React.FC<ExamAnalysisProps> = ({ onBack, scan, ... }) => {
+ const { subjectConfig, examConfig } = useAppContext();
+ const theme = useSubjectTheme();

  // UPDATE chart colors to use subject theme:
  const chartData = scan?.analysisData?.topicWeightage.map(item => ({
    ...item,
-   color: '#3B82F6'  // Static blue
+   color: theme.color // Dynamic subject color
  }));

  return (
    <div>
      {/* Subject Badge - NEW */}
+     <div className="flex items-center gap-2 mb-4">
+       <div
+         className="px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2"
+         style={{
+           backgroundColor: subjectConfig.colorLight,
+           color: subjectConfig.colorDark
+         }}
+       >
+         {subjectConfig.iconEmoji} {subjectConfig.displayName}
+       </div>
+       <div className="text-xs text-slate-400">
+         {examConfig.fullName}
+       </div>
+     </div>

      {/* Rest of component... */}
    </div>
  );
};
```

**File:** `components/Sidebar.tsx` (MODIFIED)

```typescript
+ import { useAppContext } from '../contexts/AppContext';

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate }) => {
+ const { subjectConfig, examConfig } = useAppContext();

  return (
    <div className={`...sidebar classes...`}>
      {/* Logo Section - Add subject badge */}
      <div className="p-6...">
        {/* Existing logo */}
+       {!isCollapsed && (
+         <div
+           className="mt-3 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider"
+           style={{
+             backgroundColor: subjectConfig.colorLight,
+             color: subjectConfig.colorDark
+           }}
+         >
+           {subjectConfig.iconEmoji} {subjectConfig.name} • {examConfig.name}
+         </div>
+       )}
      </div>

      {/* Navigation - Add subject color to active item */}
      <button
        className={`... ${activeView === item.id
-         ? 'bg-slate-900 text-white'
+         ? `bg-slate-900 text-white`
          : '...'
        }`}
+       style={activeView === item.id ? {
+         boxShadow: `0 0 20px ${subjectConfig.color}40`
+       } : undefined}
      >
        {/* ... */}
      </button>
    </div>
  );
};
```

**File:** `App.tsx` (MODIFIED)

```typescript
// ADD imports:
+ import { AppContextProvider } from './contexts/AppContext';
+ import SubjectSwitcher from './components/SubjectSwitcher';

const AppContent: React.FC = () => {
  // ... existing code ...

  return (
+   <AppContextProvider>
      <div className="flex h-screen">
+       <SubjectSwitcher />
        <Sidebar activeView={godModeView} onNavigate={setGodModeView} />
        <main className="flex-1 overflow-y-auto">
          {/* Existing content */}
        </main>
      </div>
+   </AppContextProvider>
  );
};
```

---

## Backend Changes

### 1. API Endpoint Updates

**File:** `server.js` (MODIFIED)

```javascript
// GET /api/scans - Add query filtering
app.get('/api/scans', async (req, res) => {
  try {
    const { subject, examContext } = req.query;

    const keys = await redis.keys('scan:*');
    let scans = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      })
    );

    scans = scans.filter(Boolean);

    // NEW: Filter by subject/exam if provided
+   if (subject) {
+     scans = scans.filter(scan => scan.subject === subject);
+   }
+   if (examContext) {
+     scans = scans.filter(scan => scan.examContext === examContext);
+   }

    // Sort by timestamp
    scans.sort((a, b) => b.timestamp - a.timestamp);

    res.json(scans);
  } catch (error) {
    console.error('Error fetching scans:', error);
    res.status(500).json({ error: 'Failed to fetch scans' });
  }
});

// POST /api/scans - Validate examContext
app.post('/api/scans', async (req, res) => {
  try {
    const scan = req.body;

+   // Validate examContext is provided
+   if (!scan.examContext) {
+     return res.status(400).json({
+       error: 'examContext is required',
+       hint: 'Must be one of: KCET, NEET, JEE, CBSE'
+     });
+   }
+
+   // Validate examContext value
+   const validExamContexts = ['KCET', 'NEET', 'JEE', 'CBSE'];
+   if (!validExamContexts.includes(scan.examContext)) {
+     return res.status(400).json({
+       error: `Invalid examContext: ${scan.examContext}`,
+       valid: validExamContexts
+     });
+   }

    await redis.set(`scan:${scan.id}`, JSON.stringify(scan));

+   console.log(`✅ Scan saved: ${scan.subject} - ${scan.examContext} - ${scan.id}`);
    res.json({ success: true, id: scan.id });
  } catch (error) {
    console.error('Error saving scan:', error);
    res.status(500).json({ error: 'Failed to save scan' });
  }
});

// NEW: GET /api/stats/subjects - Subject-wise statistics
+ app.get('/api/stats/subjects', async (req, res) => {
+   try {
+     const keys = await redis.keys('scan:*');
+     const scans = await Promise.all(
+       keys.map(async (key) => {
+         const data = await redis.get(key);
+         return data ? JSON.parse(data) : null;
+       })
+     );
+
+     const stats = {
+       Math: { scans: 0, questions: 0, exams: {} },
+       Physics: { scans: 0, questions: 0, exams: {} },
+       Chemistry: { scans: 0, questions: 0, exams: {} },
+       Biology: { scans: 0, questions: 0, exams: {} }
+     };
+
+     scans.filter(Boolean).forEach(scan => {
+       if (stats[scan.subject]) {
+         stats[scan.subject].scans++;
+         stats[scan.subject].questions += scan.analysisData?.questions?.length || 0;
+         stats[scan.subject].exams[scan.examContext] =
+           (stats[scan.subject].exams[scan.examContext] || 0) + 1;
+       }
+     });
+
+     res.json(stats);
+   } catch (error) {
+     console.error('Error fetching subject stats:', error);
+     res.status(500).json({ error: 'Failed to fetch stats' });
+   }
+ });
```

---

### 2. Data Migration Script

**File:** `scripts/migrateExamContext.js` (NEW)

```javascript
/**
 * Migration Script: Add examContext to existing scans
 * Run: node scripts/migrateExamContext.js
 */

import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// Default exam mapping based on subject
const DEFAULT_EXAM_MAP = {
  'Math': 'KCET',
  'Physics': 'KCET',
  'Chemistry': 'KCET',
  'Biology': 'NEET'
};

async function migrate() {
  console.log('🔄 Starting migration: Adding examContext to scans...\n');

  try {
    const keys = await redis.keys('scan:*');
    console.log(`Found ${keys.length} scans in Redis\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const key of keys) {
      try {
        const data = await redis.get(key);
        if (!data) continue;

        const scan = JSON.parse(data);

        // Check if already has examContext
        if (scan.examContext) {
          console.log(`⏭️  Skipping ${scan.id} - already has examContext: ${scan.examContext}`);
          skipped++;
          continue;
        }

        // Add default examContext based on subject
        const defaultExam = DEFAULT_EXAM_MAP[scan.subject] || 'KCET';
        scan.examContext = defaultExam;

        // Save back to Redis
        await redis.set(key, JSON.stringify(scan));

        console.log(`✅ Migrated ${scan.id}: ${scan.subject} → ${defaultExam}`);
        migrated++;

      } catch (err) {
        console.error(`❌ Error migrating ${key}:`, err.message);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log(`   ❌ Errors:   ${errors}`);
    console.log(`   📝 Total:    ${keys.length}\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    redis.disconnect();
  }
}

migrate();
```

---

### 3. Redis Schema Updates

**Current Schema:**
```json
{
  "scan:uuid": {
    "id": "string",
    "subject": "Math | Physics | Chemistry | Biology",
    "grade": "Class 10 | Class 11 | Class 12",
    "analysisData": { ... }
  }
}
```

**Updated Schema:**
```json
{
  "scan:uuid": {
    "id": "string",
    "subject": "Math | Physics | Chemistry | Biology",
    "examContext": "KCET | NEET | JEE | CBSE",  ← NEW FIELD
    "grade": "Class 10 | Class 11 | Class 12",
    "analysisData": { ... }
  }
}
```

---

## Data Model Changes

### Database Schema (Redis)

**No schema changes to existing keys**, only additions:

```
# Existing (unchanged)
scan:{uuid} → Scan object (with new examContext field)

# New indexes for faster querying (optional optimization)
subject:Math → Set of scan IDs
subject:Physics → Set of scan IDs
exam:KCET → Set of scan IDs
exam:NEET → Set of scan IDs
subject:Math:exam:KCET → Set of scan IDs (composite index)
```

---

## Implementation Roadmap

### Phase 1: Foundation (2-3 days)
**Goal:** Set up core architecture without breaking existing functionality

**Tasks:**
1. Create type definitions (types.ts updates)
2. Create configuration files (subjects.ts, exams.ts)
3. Implement AppContext and provider
4. Create custom hooks (useFilteredScans, useSubjectTheme)
5. Update CSS with subject color variables

**Deliverables:**
- `types.ts` with new interfaces
- `config/subjects.ts`
- `config/exams.ts`
- `contexts/AppContext.tsx`
- `hooks/useFilteredScans.ts`
- `hooks/useSubjectTheme.ts`

**Testing:**
- Context loads with default values
- localStorage persistence works
- Subject switching updates context

---

### Phase 2: UI Components (2-3 days)
**Goal:** Build subject switcher and update existing components

**Tasks:**
1. Create SubjectSwitcher component
2. Create EmptyState component
3. Wrap App.tsx with AppContextProvider
4. Update Sidebar with subject badge
5. Update BoardMastermind to use filtered scans
6. Add subject theming to ExamAnalysis

**Deliverables:**
- `components/SubjectSwitcher.tsx`
- `components/EmptyState.tsx`
- Updated `App.tsx`
- Updated `Sidebar.tsx`
- Updated `BoardMastermind.tsx`
- Updated `ExamAnalysis.tsx`

**Testing:**
- Subject switcher changes active subject
- Components filter scans correctly
- Empty states show when no scans
- Theme colors update dynamically

---

### Phase 3: Backend Integration (1-2 days)
**Goal:** Update API and data layer

**Tasks:**
1. Update server.js with filtering endpoints
2. Create migration script for existing data
3. Update file upload to include examContext
4. Add validation for examContext
5. Create subject stats endpoint

**Deliverables:**
- Updated `server.js`
- `scripts/migrateExamContext.js`
- API documentation

**Testing:**
- GET /api/scans?subject=X works
- POST validates examContext
- Migration script runs successfully
- Stats endpoint returns correct data

---

### Phase 4: Feature Completeness (2-3 days)
**Goal:** Update all components to be subject-aware

**Tasks:**
1. Update VisualQuestionBank with subject filtering
2. Update SketchGallery with subject theming
3. Update VidyaV3 with subject context
4. Update RapidRecall with subject filtering
5. Update TrainingStudio with subject awareness

**Deliverables:**
- Updated `VisualQuestionBank.tsx`
- Updated `SketchGallery.tsx`
- Updated `VidyaV3.tsx`
- Updated `RapidRecall.tsx`
- Updated `TrainingStudio.tsx`

**Testing:**
- All components respect active subject
- Cross-subject navigation works
- No data leakage between subjects

---

### Phase 5: Polish & Optimization (1-2 days)
**Goal:** Refinements and performance

**Tasks:**
1. Add loading states during subject switch
2. Optimize re-renders with React.memo
3. Add analytics tracking for subject switches
4. Create user guide/tooltips
5. Performance testing with large datasets

**Deliverables:**
- Optimized components
- Analytics integration
- User documentation
- Performance report

**Testing:**
- No performance regression
- Smooth animations
- No unnecessary re-renders

---

### Phase 6: Testing & Documentation (1-2 days)
**Goal:** Comprehensive testing and docs

**Tasks:**
1. End-to-end testing all subject combinations
2. Edge case testing (switching during upload, etc.)
3. Update README with subject switching guide
4. Create video walkthrough
5. Deploy to staging

**Deliverables:**
- Test report
- Updated README
- Video tutorial
- Staging deployment

---

## Migration Strategy

### Pre-Migration Checklist

- [ ] Backup Redis database
- [ ] Test migration script on sample data
- [ ] Notify users of maintenance window (if applicable)
- [ ] Prepare rollback script

### Migration Steps

1. **Backup Current Data**
   ```bash
   redis-cli SAVE
   cp /var/lib/redis/dump.rdb /backup/dump_$(date +%Y%m%d).rdb
   ```

2. **Run Migration Script**
   ```bash
   node scripts/migrateExamContext.js
   ```

3. **Verify Migration**
   ```bash
   # Check sample scans have examContext
   redis-cli GET scan:sample-id
   ```

4. **Update Frontend**
   ```bash
   npm run build
   pm2 restart edujourney-frontend
   ```

5. **Monitor Errors**
   ```bash
   tail -f logs/error.log
   ```

### Rollback Procedure

If migration fails:

```bash
# Stop services
pm2 stop all

# Restore backup
cp /backup/dump_YYYYMMDD.rdb /var/lib/redis/dump.rdb
redis-cli SHUTDOWN
redis-server &

# Revert code
git revert HEAD
npm run build
pm2 restart all
```

---

## Testing Strategy

### Unit Tests

**File:** `tests/AppContext.test.tsx`
```typescript
describe('AppContext', () => {
  test('loads default subject and exam', () => {
    // Test default values
  });

  test('persists to localStorage', () => {
    // Test persistence
  });

  test('validates subject-exam combinations', () => {
    // Test validation logic
  });

  test('auto-switches exam when subject changes', () => {
    // Test auto-switching
  });
});
```

**File:** `tests/useFilteredScans.test.ts`
```typescript
describe('useFilteredScans', () => {
  test('filters scans by active subject', () => {
    // Test filtering
  });

  test('returns empty array when no matches', () => {
    // Test empty state
  });

  test('updates when context changes', () => {
    // Test reactivity
  });
});
```

### Integration Tests

**Test Scenarios:**
1. Upload scan → should include active examContext
2. Switch subject → should filter scans
3. Switch exam → should update if invalid subject
4. Refresh page → should restore last active subject/exam
5. Navigate between views → should maintain subject context

### E2E Tests

**Critical User Flows:**
1. New user → selects subject → uploads paper → views analysis
2. Existing user → switches between subjects → views filtered content
3. Power user → uploads multiple subjects → switches rapidly → no crashes
4. Edge case → switch during upload → upload completes with correct context

---

## Rollback Plan

### If Critical Bugs Detected

**Severity Levels:**

**Level 1 (Critical - Immediate Rollback):**
- Data loss or corruption
- App crashes on load
- Unable to upload new scans

**Action:**
```bash
# Revert to previous deployment
git revert HEAD~5..HEAD  # Revert last 5 commits
npm run build
pm2 restart all
```

**Level 2 (High - Rollback within 24h):**
- Subject switching doesn't work
- Scans showing in wrong subject
- Performance degradation >50%

**Action:**
- Fix forward if possible
- Otherwise revert specific features

**Level 3 (Medium - Fix Forward):**
- UI glitches
- Minor filtering issues
- Theme color inconsistencies

**Action:**
- Create hotfix branch
- Deploy patch

### Feature Flags

Implement feature flag for gradual rollout:

```typescript
// config/featureFlags.ts
export const FEATURES = {
  MULTI_SUBJECT_CONTEXT: process.env.ENABLE_MULTI_SUBJECT === 'true',
};

// Usage in components
if (FEATURES.MULTI_SUBJECT_CONTEXT) {
  return <SubjectSwitcher />;
} else {
  return <LegacySubjectDropdown />;
}
```

---

## Performance Considerations

### Expected Impact

**Positive:**
- Faster filtering (client-side)
- Better UX with instant subject switching
- Reduced backend queries with caching

**Potential Concerns:**
- Larger bundle size (+15KB gzipped for configs)
- More re-renders on subject switch
- localStorage I/O on every switch

### Optimizations

1. **Memoization**
   ```typescript
   const filteredScans = useMemo(() =>
     scans.filter(/* ... */),
     [scans, activeSubject, activeExamContext]
   );
   ```

2. **Lazy Loading**
   ```typescript
   const SubjectSwitcher = lazy(() => import('./SubjectSwitcher'));
   ```

3. **Debounced localStorage**
   ```typescript
   const debouncedSave = debounce((prefs) => {
     localStorage.setItem('edujourney_preferences', JSON.stringify(prefs));
   }, 500);
   ```

---

## Security Considerations

### Input Validation

**Frontend:**
```typescript
// Validate subject/exam combinations
const isValidCombination = (subject: Subject, exam: ExamContext): boolean => {
  return EXAM_CONFIGS[exam].applicableSubjects.includes(subject);
};
```

**Backend:**
```javascript
// Whitelist validation
const VALID_SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology'];
const VALID_EXAMS = ['KCET', 'NEET', 'JEE', 'CBSE'];

if (!VALID_SUBJECTS.includes(scan.subject)) {
  return res.status(400).json({ error: 'Invalid subject' });
}
```

### XSS Prevention

All subject names and exam contexts are hardcoded in configs, not user-provided.

### Data Isolation

Scans are filtered client-side after fetching, ensuring no cross-contamination.

---

## API Reference

### New Endpoints

#### `GET /api/scans?subject={subject}&examContext={exam}`

**Query Parameters:**
- `subject` (optional): Filter by subject (Math, Physics, Chemistry, Biology)
- `examContext` (optional): Filter by exam (KCET, NEET, JEE, CBSE)

**Response:**
```json
[
  {
    "id": "uuid",
    "subject": "Physics",
    "examContext": "KCET",
    "grade": "Class 12",
    "analysisData": { ... }
  }
]
```

#### `GET /api/stats/subjects`

**Response:**
```json
{
  "Math": {
    "scans": 15,
    "questions": 900,
    "exams": { "KCET": 10, "JEE": 5 }
  },
  "Physics": {
    "scans": 20,
    "questions": 1200,
    "exams": { "KCET": 12, "NEET": 8 }
  }
}
```

---

## Monitoring & Observability

### Metrics to Track

1. **Subject Usage:**
   - Most frequently selected subject
   - Average session duration per subject
   - Subject switch frequency

2. **Performance:**
   - Time to filter scans
   - Re-render count on subject switch
   - localStorage I/O time

3. **Errors:**
   - Invalid subject/exam combinations
   - Failed uploads with examContext
   - Context provider errors

### Logging

```typescript
// Analytics tracking
const trackSubjectSwitch = (from: Subject, to: Subject) => {
  console.log('[Analytics] Subject switch:', { from, to, timestamp: Date.now() });
  // Send to analytics service
};
```

---

## Success Metrics

### KPIs

- [ ] Zero data loss during migration
- [ ] <100ms subject switch time
- [ ] 100% of scans have valid examContext
- [ ] Zero critical bugs post-launch
- [ ] User satisfaction score >4.5/5
- [ ] <5% rollback rate

### Acceptance Criteria

- [ ] User can switch between subjects seamlessly
- [ ] Scans filter correctly by subject and exam
- [ ] Empty states show when no scans
- [ ] Subject theme colors apply throughout UI
- [ ] localStorage persists preferences
- [ ] All existing features work unchanged
- [ ] Mobile responsive
- [ ] Backward compatible with old scans

---

## Appendix

### A. File Checklist

**New Files:**
- [ ] `config/subjects.ts`
- [ ] `config/exams.ts`
- [ ] `contexts/AppContext.tsx`
- [ ] `hooks/useFilteredScans.ts`
- [ ] `hooks/useSubjectTheme.ts`
- [ ] `components/SubjectSwitcher.tsx`
- [ ] `components/EmptyState.tsx`
- [ ] `scripts/migrateExamContext.js`
- [ ] `tests/AppContext.test.tsx`
- [ ] `tests/useFilteredScans.test.ts`

**Modified Files:**
- [ ] `types.ts`
- [ ] `App.tsx`
- [ ] `components/Sidebar.tsx`
- [ ] `components/BoardMastermind.tsx`
- [ ] `components/ExamAnalysis.tsx`
- [ ] `components/VisualQuestionBank.tsx`
- [ ] `components/VidyaV3.tsx`
- [ ] `server.js`
- [ ] `index.css` (CSS variables)

### B. Dependencies

**No new npm packages required.** All features use existing dependencies:
- React Context API (built-in)
- localStorage API (built-in)
- lucide-react (already installed)

### C. Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (localStorage + Context API)
- Mobile browsers: ✅ Responsive design

---

## Conclusion

This architecture provides a scalable, maintainable solution for multi-subject and multi-exam support. The context-driven approach ensures consistency across the application while maintaining performance and user experience.

**Total Implementation Time:** 10-15 days
**Risk Level:** Low (backward compatible, incremental rollout)
**Impact:** High (foundational feature for app scalability)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-31
**Author:** Claude Sonnet 4.5
**Status:** Ready for Implementation
