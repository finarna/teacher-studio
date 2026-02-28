-- Migration: Add missing columns to ai_universal_calibration
-- This ensures the REI v3.0 Processor can persist Intelligence Signatures
ALTER TABLE ai_universal_calibration 
ADD COLUMN IF NOT EXISTS intent_signature JSONB;

ALTER TABLE ai_universal_calibration 
ADD COLUMN IF NOT EXISTS signature_resonance FLOAT DEFAULT 0.0;

ALTER TABLE ai_universal_calibration 
ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN ai_universal_calibration.intent_signature IS 'Processing metadata for autonomous calibration (synthesis, trap density, etc.)';
