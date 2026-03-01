-- ============================================================
-- Migration 006: Add flashcards cache table
-- Missing from CLEAN_START_SCHEMA_v5 but required by the app.
-- ============================================================

-- Cached generated flashcards (30-day TTL)
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT UNIQUE NOT NULL,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id   ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_cache_key ON public.flashcards(cache_key);
CREATE INDEX IF NOT EXISTS idx_flashcards_scan_id   ON public.flashcards(scan_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_expires   ON public.flashcards(expires_at);

-- Row Level Security
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- Users can only access their own cached flashcards
CREATE POLICY "Users can view own flashcards"
  ON public.flashcards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flashcards"
  ON public.flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flashcards"
  ON public.flashcards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcards"
  ON public.flashcards FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.flashcards IS 'Cached generated flashcards (30-day TTL). Each row holds all flashcards for one scan, stored as a JSONB array.';
