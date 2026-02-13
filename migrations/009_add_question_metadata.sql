-- Add missing metadata fields to questions table
-- These fields are needed for proper UI display in Practice Lab and Question Bank

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS year TEXT,
ADD COLUMN IF NOT EXISTS domain TEXT,
ADD COLUMN IF NOT EXISTS pedagogy TEXT CHECK (pedagogy IN ('Conceptual', 'Analytical', 'Problem-Solving', 'Application', 'Critical-Thinking', 'Numerical', 'Memorization')),
ADD COLUMN IF NOT EXISTS exam_context TEXT CHECK (exam_context IN ('NEET', 'JEE', 'KCET', 'CBSE')),
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_questions_year ON questions(year);
CREATE INDEX IF NOT EXISTS idx_questions_domain ON questions(domain);
CREATE INDEX IF NOT EXISTS idx_questions_pedagogy ON questions(pedagogy);
CREATE INDEX IF NOT EXISTS idx_questions_exam_context ON questions(exam_context);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);

-- Update existing questions with default values where scan_id exists
UPDATE questions q
SET
  exam_context = s.exam_context,
  subject = s.subject
FROM scans s
WHERE q.scan_id = s.id
AND q.exam_context IS NULL;

COMMENT ON COLUMN questions.year IS 'Year of exam paper (e.g., "2024", "2023")';
COMMENT ON COLUMN questions.domain IS 'Subject domain/chapter (e.g., "Mechanics", "Organic Chemistry")';
COMMENT ON COLUMN questions.pedagogy IS 'Question type: Conceptual, Analytical, Problem-Solving, Application, Critical-Thinking, Numerical, Memorization';
COMMENT ON COLUMN questions.exam_context IS 'Exam context: NEET, JEE, KCET, CBSE';
COMMENT ON COLUMN questions.subject IS 'Subject: Physics, Chemistry, Math, Biology';
