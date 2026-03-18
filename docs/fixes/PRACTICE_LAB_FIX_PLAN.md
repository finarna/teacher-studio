# Practice Lab - Immediate Fix Plan

## 🚨 CRITICAL ISSUE

The Practice Lab in Learning Journey (Trajectory→Subject→Topic→Practice) is **severely broken** and missing ~80% of Question Bank features. Students cannot:
- Select answers properly (broken option rendering)
- See solutions (buttons exist but don't work)
- Get AI explanations (buttons exist but don't work)
- Learn from their mistakes

**This makes Practice Lab essentially useless for learning.**

---

## 🎯 Goal

Bring Practice Lab to **100% feature parity** with Question Bank and TestInterface in terms of:
1. Question rendering and interaction
2. Solution display
3. AI insights and explanations
4. Progress tracking
5. Visual elements and diagrams

---

## 📋 Step-by-Step Fix Plan

### PHASE 1: CRITICAL FIXES (Priority P0 - Do First)

#### Fix 1: Proper MCQ Option Rendering
**File**: `components/TopicDetailPage.tsx` (lines 476-503)

**Current (BROKEN)**:
```tsx
<RenderWithMath text={q.text} showOptions={true} />
```

**Replace With** (copy from TestInterface:336-370):
```tsx
{/* Question Text */}
<div className="text-xl font-bold text-slate-900 leading-relaxed mb-6">
  <RenderWithMath text={q.text} showOptions={false} />
</div>

{/* Diagram (if present) */}
{q.hasVisualElement && q.extractedImages && q.extractedImages.length > 0 && (
  <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
    <img
      src={q.extractedImages[0]}
      alt="Question diagram"
      className="max-w-full h-auto mx-auto"
    />
  </div>
)}

{/* MCQ Options - 2 Column Grid */}
{q.options && q.options.length > 0 && (
  <div className="grid grid-cols-2 gap-4 mb-4">
    {q.options.map((option, idx) => {
      const isSelected = selectedAnswer === idx;
      const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D

      // Show correct/incorrect after validation
      const showCorrect = hasValidated && idx === q.correctOptionIndex;
      const showIncorrect = hasValidated && isSelected && idx !== q.correctOptionIndex;

      return (
        <button
          key={idx}
          onClick={() => handleAnswerSelect(q.id, idx)}
          disabled={hasValidated}
          className={`relative flex items-start gap-3.5 px-5 py-4 rounded-2xl border transition-all text-left ${
            showCorrect
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500'
              : showIncorrect
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500'
              : isSelected
              ? 'bg-blue-50 shadow-md ring-2 ring-blue-500'
              : 'bg-white shadow-sm hover:shadow-lg hover:ring-2 hover:ring-slate-300'
          } ${hasValidated ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'}`}
        >
          {/* Option Label */}
          <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg transition-all ${
            showCorrect
              ? 'bg-emerald-500 text-white'
              : showIncorrect
              ? 'bg-rose-500 text-white'
              : isSelected
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-slate-100 text-slate-700'
          }`}>
            {showCorrect && '✓'}
            {showIncorrect && '✗'}
            {!showCorrect && !showIncorrect && optionLabel}
          </div>

          {/* Option Text */}
          <div className="flex-1 text-base font-medium text-slate-800 pt-2">
            <RenderWithMath text={option} showOptions={false} />
          </div>
        </button>
      );
    })}
  </div>
)}
```

**Changes Needed**:
1. Move question text above options
2. Add diagram display if available
3. Replace broken `showOptions={true}` with proper option grid
4. Add visual feedback for selected/correct/incorrect states
5. Disable selection after validation

---

#### Fix 2: Solution Modal Implementation

**Create New File**: `components/PracticeSolutionModal.tsx`

```tsx
import React from 'react';
import { X, PenTool } from 'lucide-react';
import { RenderWithMath } from './MathRenderer';
import type { AnalyzedQuestion } from '../types';

interface PracticeSolutionModalProps {
  question: AnalyzedQuestion;
  onClose: () => void;
}

const PracticeSolutionModal: React.FC<PracticeSolutionModalProps> = ({ question, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <PenTool size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black">Solution Steps</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {question.topic} • {question.domain}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Solution Steps */}
          {question.markingScheme && question.markingScheme.length > 0 ? (
            <div className="space-y-5">
              <div className="space-y-3">
                {question.markingScheme.map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 bg-slate-800 text-white rounded-md flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {item.mark} Mark{parseInt(item.mark) > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-sm text-slate-700 leading-relaxed">
                          <RenderWithMath text={item.step} showOptions={false} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Extracted Images */}
              {question.extractedImages && question.extractedImages.length > 0 && (
                <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Reference Diagrams ({question.extractedImages.length})
                    </h4>
                  </div>
                  <div className="space-y-4">
                    {question.extractedImages.map((imgData, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <img
                          src={imgData}
                          alt={`Diagram ${idx + 1}`}
                          className="w-full h-auto object-contain max-h-[500px] bg-white"
                        />
                        {question.visualElementDescription && idx === 0 && (
                          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                            <p className="text-xs text-slate-600">
                              <RenderWithMath text={question.visualElementDescription} showOptions={false} />
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-600">No solution available for this question.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeSolutionModal;
```

---

#### Fix 3: Insights Modal Implementation

**Create New File**: `components/PracticeInsightsModal.tsx`

```tsx
import React from 'react';
import { X, Lightbulb, BookOpen, Clock, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import { RenderWithMath } from './MathRenderer';
import type { AnalyzedQuestion } from '../types';

interface PracticeInsightsModalProps {
  question: AnalyzedQuestion;
  onClose: () => void;
}

const PracticeInsightsModal: React.FC<PracticeInsightsModalProps> = ({ question, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Lightbulb size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black">AI Insights</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {question.topic} • {question.domain}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-5">
          {/* AI Reasoning */}
          {question.aiReasoning && (
            <div className="bg-white border-2 border-slate-300 rounded-lg p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                  <BarChart3 size={18} className="text-slate-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                    Why This Question Matters
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {question.aiReasoning}
                  </p>
                </div>
              </div>

              {/* Historical & Predictive */}
              {(question.historicalPattern || question.predictiveInsight) && (
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200">
                  {question.historicalPattern && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Clock size={14} className="text-slate-600" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Historical</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{question.historicalPattern}</p>
                    </div>
                  )}
                  {question.predictiveInsight && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <TrendingUp size={14} className="text-slate-600" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Predictive</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{question.predictiveInsight}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Key Concepts */}
          {question.keyConcepts && question.keyConcepts.length > 0 && (
            <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={18} className="text-slate-700" />
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Key Concepts</h4>
              </div>
              <div className="space-y-3">
                {question.keyConcepts.map((concept, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-3 border-l-4 border-slate-400">
                    <p className="text-sm font-medium text-slate-800">{concept}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Mistakes */}
          {question.commonMistakes && question.commonMistakes.length > 0 && (
            <div className="bg-white border-2 border-amber-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={18} className="text-amber-600" />
                <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wide">Common Mistakes</h4>
              </div>
              <div className="space-y-3">
                {question.commonMistakes.map((mistake, idx) => (
                  <div key={idx} className="bg-amber-50 rounded-lg p-3 border-l-4 border-amber-500">
                    <p className="text-sm font-medium text-amber-900">{mistake}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual Concept */}
          {question.visualConcept && (
            <div className="bg-white border-2 border-blue-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Visual Concept</h4>
              </div>
              <p className="text-sm text-blue-800 leading-relaxed">{question.visualConcept}</p>
            </div>
          )}

          {/* Empty State */}
          {!question.aiReasoning && !question.keyConcepts?.length && !question.commonMistakes?.length && !question.visualConcept && (
            <div className="text-center py-12">
              <Lightbulb size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No AI insights available for this question yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeInsightsModal;
```

---

#### Fix 4: Update PracticeTab to Use Modals

**File**: `components/TopicDetailPage.tsx`

**Add at top of file**:
```tsx
import PracticeSolutionModal from './PracticeSolutionModal';
import PracticeInsightsModal from './PracticeInsightsModal';
```

**Add state variables** (line ~293):
```tsx
const PracticeTab: React.FC<{ topicResource: TopicResource }> = ({ topicResource }) => {
  const [userAnswers, setUserAnswers] = useState<Map<string, number>>(new Map());
  const [validatedAnswers, setValidatedAnswers] = useState<Map<string, number>>(new Map());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [trashedIds, setTrashedIds] = useState<Set<string>>(new Set());

  // NEW: Add modal state
  const [solutionModalQuestion, setSolutionModalQuestion] = useState<AnalyzedQuestion | null>(null);
  const [insightsModalQuestion, setInsightsModalQuestion] = useState<AnalyzedQuestion | null>(null);
```

**Replace Solution & Insights buttons** (lines 492-502):
```tsx
{/* Solution & Insights Buttons (after validation) */}
{hasValidated && (
  <div className="flex items-center gap-3 mt-4">
    <button
      onClick={() => setSolutionModalQuestion(q)}
      className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all"
    >
      <Eye size={18} />
      Solution
    </button>
    <button
      onClick={() => setInsightsModalQuestion(q)}
      className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-all"
    >
      <Lightbulb size={18} />
      Insights
    </button>
  </div>
)}
```

**Add modals at end of return** (before closing div):
```tsx
      {/* Modals */}
      {solutionModalQuestion && (
        <PracticeSolutionModal
          question={solutionModalQuestion}
          onClose={() => setSolutionModalQuestion(null)}
        />
      )}

      {insightsModalQuestion && (
        <PracticeInsightsModal
          question={insightsModalQuestion}
          onClose={() => setInsightsModalQuestion(null)}
        />
      )}
    </div>
  );
};
```

---

### PHASE 2: DATA & PERSISTENCE (Priority P1)

#### Fix 5: Persistent Answer Tracking

**Create New File**: `hooks/usePracticeSession.ts`

```tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface PracticeAnswer {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  timestamp: Date;
}

interface PracticeSession {
  topicId: string;
  userId: string;
  answers: Map<string, PracticeAnswer>;
  startTime: Date;
}

export function usePracticeSession(topicId: string, userId: string) {
  const [answers, setAnswers] = useState<Map<string, PracticeAnswer>>(new Map());
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load previous session on mount
  useEffect(() => {
    loadSession();
  }, [topicId, userId]);

  const loadSession = async () => {
    try {
      // Load answers
      const { data: answerData, error: answerError } = await supabase
        .from('practice_answers')
        .select('*')
        .eq('user_id', userId)
        .eq('topic_id', topicId);

      if (answerError) throw answerError;

      const answersMap = new Map<string, PracticeAnswer>();
      answerData?.forEach(a => {
        answersMap.set(a.question_id, {
          questionId: a.question_id,
          selectedOption: a.selected_option,
          isCorrect: a.is_correct,
          timestamp: new Date(a.created_at)
        });
      });
      setAnswers(answersMap);

      // Load bookmarks
      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from('bookmarked_questions')
        .select('question_id')
        .eq('user_id', userId);

      if (bookmarkError) throw bookmarkError;

      const bookmarkSet = new Set<string>();
      bookmarkData?.forEach(b => bookmarkSet.add(b.question_id));
      setBookmarkedQuestions(bookmarkSet);

    } catch (error) {
      console.error('Failed to load practice session:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = useCallback(async (
    questionId: string,
    selectedOption: number,
    correctOption: number
  ) => {
    const isCorrect = selectedOption === correctOption;
    const answer: PracticeAnswer = {
      questionId,
      selectedOption,
      isCorrect,
      timestamp: new Date()
    };

    // Update local state
    setAnswers(prev => new Map(prev).set(questionId, answer));

    // Save to database
    try {
      await supabase.from('practice_answers').upsert({
        user_id: userId,
        topic_id: topicId,
        question_id: questionId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save answer:', error);
    }
  }, [userId, topicId]);

  const toggleBookmark = useCallback(async (questionId: string) => {
    const newSet = new Set(bookmarkedQuestions);

    if (newSet.has(questionId)) {
      newSet.delete(questionId);
      // Remove from database
      await supabase
        .from('bookmarked_questions')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', questionId);
    } else {
      newSet.add(questionId);
      // Add to database
      await supabase.from('bookmarked_questions').insert({
        user_id: userId,
        question_id: questionId,
        created_at: new Date().toISOString()
      });
    }

    setBookmarkedQuestions(newSet);
  }, [userId, bookmarkedQuestions]);

  return {
    answers,
    bookmarkedQuestions,
    loading,
    saveAnswer,
    toggleBookmark
  };
}
```

**Database Migration** - Create file: `migrations/008_practice_tracking.sql`

```sql
-- Practice answers tracking
CREATE TABLE IF NOT EXISTS practice_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_option INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX idx_practice_answers_user_topic ON practice_answers(user_id, topic_id);
CREATE INDEX idx_practice_answers_user_question ON practice_answers(user_id, question_id);

-- Bookmarked questions
CREATE TABLE IF NOT EXISTS bookmarked_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX idx_bookmarked_questions_user ON bookmarked_questions(user_id);
```

---

### PHASE 3: ADVANCED FEATURES (Priority P2)

#### Fix 6: Filtering & Search

Add filter controls to PracticeTab header (after line 380):

```tsx
{/* Filter Controls */}
<div className="bg-white border-2 border-slate-200 rounded-xl p-4 mb-6">
  <div className="grid grid-cols-4 gap-4">
    {/* Difficulty Filter */}
    <div>
      <label className="block text-xs font-black text-slate-500 uppercase mb-2">Difficulty</label>
      <select
        value={difficultyFilter}
        onChange={(e) => setDifficultyFilter(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
      >
        <option value="all">All Levels</option>
        <option value="Easy">Easy</option>
        <option value="Moderate">Moderate</option>
        <option value="Hard">Hard</option>
      </select>
    </div>

    {/* Answer Status Filter */}
    <div>
      <label className="block text-xs font-black text-slate-500 uppercase mb-2">Status</label>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
      >
        <option value="all">All Questions</option>
        <option value="unanswered">Not Attempted</option>
        <option value="correct">Answered Correctly</option>
        <option value="incorrect">Answered Incorrectly</option>
        <option value="bookmarked">Bookmarked</option>
      </select>
    </div>

    {/* Year Filter */}
    <div>
      <label className="block text-xs font-black text-slate-500 uppercase mb-2">Year</label>
      <select
        value={yearFilter}
        onChange={(e) => setYearFilter(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
      >
        <option value="all">All Years</option>
        {uniqueYears.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </div>

    {/* Search */}
    <div>
      <label className="block text-xs font-black text-slate-500 uppercase mb-2">Search</label>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search questions..."
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
      />
    </div>
  </div>
</div>
```

---

## 🎯 Success Criteria

After implementing these fixes, Practice Lab should have:

✅ Proper MCQ option rendering with visual feedback
✅ Working Solution modal with marking schemes and diagrams
✅ Working Insights modal with AI explanations
✅ Persistent answer tracking in database
✅ Bookmarking that saves across sessions
✅ Filtering by difficulty, status, year
✅ Search functionality
✅ Visual parity with TestInterface
✅ Feature parity with Question Bank

---

## 📊 Testing Checklist

- [ ] Can select MCQ options properly
- [ ] Selected option shows blue highlight
- [ ] Check Answer button validates correctly
- [ ] Correct answers show green checkmark
- [ ] Incorrect answers show red X
- [ ] Solution button opens modal
- [ ] Solution modal shows marking scheme steps
- [ ] Solution modal shows diagrams
- [ ] Insights button opens modal
- [ ] Insights modal shows AI reasoning
- [ ] Insights modal shows key concepts
- [ ] Insights modal shows common mistakes
- [ ] Bookmarking persists across sessions
- [ ] Answers save to database
- [ ] Filters work correctly
- [ ] Search finds questions
- [ ] Mobile responsive

---

## 📝 Files to Create/Modify

### Create
1. `components/PracticeSolutionModal.tsx`
2. `components/PracticeInsightsModal.tsx`
3. `hooks/usePracticeSession.ts`
4. `migrations/008_practice_tracking.sql`

### Modify
1. `components/TopicDetailPage.tsx` (PracticeTab component)

---

## ⏰ Estimated Time

- **Phase 1 (Critical)**: 4-6 hours
- **Phase 2 (Persistence)**: 2-3 hours
- **Phase 3 (Filters)**: 2-3 hours

**Total**: ~10-12 hours to reach production quality

---

## 🚀 Next Steps

1. Start with Phase 1 fixes immediately
2. Test each fix thoroughly before moving to next
3. Deploy incrementally (don't wait for all phases)
4. Monitor user feedback and iterate

The Practice Lab will be **fully functional and at par with Question Bank** after these fixes are implemented.
