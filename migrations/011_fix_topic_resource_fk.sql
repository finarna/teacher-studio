-- Fix foreign key constraint issue
-- Make topic_resource_id nullable since topic_resources table may not be populated yet

-- Drop existing foreign key constraint
ALTER TABLE practice_answers
DROP CONSTRAINT IF EXISTS practice_answers_topic_resource_id_fkey;

-- Make column nullable
ALTER TABLE practice_answers
ALTER COLUMN topic_resource_id DROP NOT NULL;

-- Re-add foreign key with ON DELETE SET NULL
ALTER TABLE practice_answers
ADD CONSTRAINT practice_answers_topic_resource_id_fkey
FOREIGN KEY (topic_resource_id)
REFERENCES topic_resources(id)
ON DELETE SET NULL;

-- Same for bookmarked_questions
ALTER TABLE bookmarked_questions
DROP CONSTRAINT IF EXISTS bookmarked_questions_topic_resource_id_fkey;

-- Already nullable, just ensure foreign key has SET NULL
ALTER TABLE bookmarked_questions
ADD CONSTRAINT bookmarked_questions_topic_resource_id_fkey
FOREIGN KEY (topic_resource_id)
REFERENCES topic_resources(id)
ON DELETE SET NULL;

-- Same for practice_sessions
ALTER TABLE practice_sessions
DROP CONSTRAINT IF EXISTS practice_sessions_topic_resource_id_fkey;

ALTER TABLE practice_sessions
ALTER COLUMN topic_resource_id DROP NOT NULL;

ALTER TABLE practice_sessions
ADD CONSTRAINT practice_sessions_topic_resource_id_fkey
FOREIGN KEY (topic_resource_id)
REFERENCES topic_resources(id)
ON DELETE SET NULL;

COMMENT ON COLUMN practice_answers.topic_resource_id IS 'Optional reference to topic_resources table (nullable for compatibility with in-memory topics)';
COMMENT ON COLUMN practice_sessions.topic_resource_id IS 'Optional reference to topic_resources table (nullable for compatibility with in-memory topics)';
