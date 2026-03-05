-- Migration: Fix foreign key constraints for test_responses
-- This allows deleting questions even if they have been used in test attempts
-- (Needed for AdminScanApproval cleanup/re-publish)

ALTER TABLE public.test_responses 
DROP CONSTRAINT IF EXISTS test_responses_question_id_fkey,
ADD CONSTRAINT test_responses_question_id_fkey 
  FOREIGN KEY (question_id) 
  REFERENCES public.questions(id) 
  ON DELETE CASCADE;

-- Also check topic_activities (already has ON DELETE SET NULL in schema, but ensuring it)
ALTER TABLE public.topic_activities
DROP CONSTRAINT IF EXISTS topic_activities_question_id_fkey,
ADD CONSTRAINT topic_activities_question_id_fkey
  FOREIGN KEY (question_id)
  REFERENCES public.questions(id)
  ON DELETE SET NULL;
