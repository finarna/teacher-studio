-- AI UNIVERSAL CALIBRATION (REI v3.0)
-- Stores evolutionary weights, board signatures, and recursive directives
CREATE TABLE IF NOT EXISTS ai_universal_calibration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_type TEXT NOT NULL, -- 'JEE', 'NEET', 'CET', 'BOARD_CBSE', etc.
  topic_id UUID REFERENCES topics(id),
  target_year INTEGER NOT NULL,
  rigor_velocity FLOAT DEFAULT 0.0,       -- Acceleration of difficulty relative to domain norm
  ids_accuracy FLOAT DEFAULT 0.0,         -- Historical success metric (0.0 - 1.0)
  intent_signature JSONB,                 -- { "synthesis": 0.9, "ar_trap": 0.8, "speed_test": 0.5 }
  calibration_directives TEXT[],          -- "Inject 3-step L'Hopital", "Use A-R format"
  board_signature TEXT DEFAULT 'DEFAULT', -- 'SYNTHESIZER', 'LOGICIAN', 'INTIMIDATOR'
  signature_resonance FLOAT DEFAULT 0.0,  -- Match with current board committee style
  last_reset_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup during question generation
CREATE INDEX IF NOT EXISTS idx_calibration_exam_year ON ai_universal_calibration (exam_type, target_year);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_universal_calibration_updated_at
    BEFORE UPDATE ON ai_universal_calibration
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
