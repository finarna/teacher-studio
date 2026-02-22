-- Migration 018: Add notes_completed tracking to topic_resources
-- Created: 2026-02-21

ALTER TABLE topic_resources ADD COLUMN IF NOT EXISTS notes_completed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN topic_resources.notes_completed IS 'Tracks whether the user has completed all visual study notes for this topic';
