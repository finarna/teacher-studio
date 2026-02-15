-- Migration: Add representative symbols and images to topics and topic_resources
-- This enables AI-generated visual representations for each topic

-- Add columns to topics table (master data)
ALTER TABLE topics
ADD COLUMN IF NOT EXISTS representative_symbol TEXT,
ADD COLUMN IF NOT EXISTS symbol_type TEXT CHECK (symbol_type IN ('math', 'emoji', 'text')),
ADD COLUMN IF NOT EXISTS representative_image_url TEXT;

-- Add columns to topic_resources table (user-specific)
ALTER TABLE topic_resources
ADD COLUMN IF NOT EXISTS representative_symbol TEXT,
ADD COLUMN IF NOT EXISTS symbol_type TEXT CHECK (symbol_type IN ('math', 'emoji', 'text')),
ADD COLUMN IF NOT EXISTS representative_image_url TEXT;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_topics_symbol ON topics(representative_symbol);
CREATE INDEX IF NOT EXISTS idx_topics_image ON topics(representative_image_url);
CREATE INDEX IF NOT EXISTS idx_topic_resources_symbol ON topic_resources(representative_symbol);
CREATE INDEX IF NOT EXISTS idx_topic_resources_image ON topic_resources(representative_image_url);

-- Comment the columns (topics table)
COMMENT ON COLUMN topics.representative_symbol IS 'AI-generated mathematical symbol, emoji, or text representation for the topic';
COMMENT ON COLUMN topics.symbol_type IS 'Type of symbol: math (mathematical notation), emoji, or text';
COMMENT ON COLUMN topics.representative_image_url IS 'URL to AI-generated visual image representing the topic';

-- Comment the columns (topic_resources table)
COMMENT ON COLUMN topic_resources.representative_symbol IS 'AI-generated mathematical symbol, emoji, or text representation for the topic';
COMMENT ON COLUMN topic_resources.symbol_type IS 'Type of symbol: math (mathematical notation), emoji, or text';
COMMENT ON COLUMN topic_resources.representative_image_url IS 'URL to AI-generated visual image representing the topic';
