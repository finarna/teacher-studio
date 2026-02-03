import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getAllSubjects, SUBJECT_CONFIGS } from '../config/subjects';
import { getExamPatternDescription, EXAM_CONFIGS } from '../config/exams';
import { Subject } from '../types';

export const SubjectSwitcher: React.FC = () => {
  const {
    activeSubject,
    activeExamContext,
    subjectConfig,
    examConfig,
    setActiveSubject,
    setActiveExamContext,
    getAvailableExams
  } = useAppContext();

  const allSubjects = getAllSubjects();
  const availableExams = getAvailableExams();

  const handleSubjectSwitch = (subject: Subject) => {
    setActiveSubject(subject);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Subject Dropdown Badge */}
      <div className="relative group">
        <button
          className="flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all hover:shadow-sm"
          style={{
            backgroundColor: subjectConfig.colorLight,
            borderColor: subjectConfig.color + '60'
          }}
        >
          <span className="text-lg">{subjectConfig.iconEmoji}</span>
          <div className="flex flex-col items-start">
            <span className="text-xs font-black leading-tight uppercase" style={{ color: subjectConfig.colorDark }}>
              {subjectConfig.displayName}
            </span>
            <span className="text-[9px] font-medium text-slate-500 leading-tight">
              {subjectConfig.name}
            </span>
          </div>
          <svg className="w-3.5 h-3.5 ml-1" style={{ color: subjectConfig.colorDark }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Subject Dropdown Menu */}
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="p-2">
            {allSubjects.map((subject) => {
              const config = SUBJECT_CONFIGS[subject];
              const isActive = subject === activeSubject;

              return (
                <button
                  key={subject}
                  onClick={() => handleSubjectSwitch(subject)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'shadow-md'
                      : 'hover:bg-slate-50'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: config.colorLight,
                          borderColor: config.color
                        }
                      : undefined
                  }
                >
                  <span className="text-2xl">{config.iconEmoji}</span>
                  <div className="flex flex-col items-start flex-1">
                    <span className="text-sm font-bold" style={isActive ? { color: config.colorDark } : { color: '#334155' }}>
                      {config.displayName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {config.name}
                    </span>
                  </div>
                  {isActive && (
                    <svg className="w-5 h-5" style={{ color: config.color }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Exam/Board Dropdown Badge */}
      <div className="relative group">
        <button
          className="flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all hover:shadow-sm"
          style={{
            backgroundColor: subjectConfig.colorLight,
            borderColor: subjectConfig.color + '60'
          }}
        >
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-bold text-slate-500 leading-tight uppercase tracking-wide">
              Exam Board
            </span>
            <span className="text-xs font-black leading-tight" style={{ color: subjectConfig.colorDark }}>
              {activeExamContext}
            </span>
          </div>
          <svg className="w-3.5 h-3.5" style={{ color: subjectConfig.colorDark }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Exam Dropdown Menu */}
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="p-2">
            {availableExams.map((exam) => {
              const isActive = exam === activeExamContext;
              const examConfig = EXAM_CONFIGS[exam];

              return (
                <button
                  key={exam}
                  onClick={() => setActiveExamContext(exam as any)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'shadow-md'
                      : 'hover:bg-slate-50'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: subjectConfig.colorLight,
                          borderColor: subjectConfig.color
                        }
                      : undefined
                  }
                >
                  <div className="flex flex-col items-start flex-1">
                    <span className="text-sm font-black" style={isActive ? { color: subjectConfig.colorDark } : { color: '#334155' }}>
                      {exam}
                    </span>
                    <span className="text-xs text-slate-500">
                      {examConfig.fullName}
                    </span>
                  </div>
                  {isActive && (
                    <svg className="w-5 h-5" style={{ color: subjectConfig.color }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
