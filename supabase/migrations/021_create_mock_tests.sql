-- Create the mock_tests table for flagship 2026 predictions
CREATE TABLE IF NOT EXISTS public.mock_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    exam_type TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_official_prediction BOOLEAN DEFAULT false,
    prediction_metadata JSONB DEFAULT '{}'::jsonb,
    questions JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read official predictions
CREATE POLICY "Anyone can read official predictions" 
ON public.mock_tests FOR SELECT 
USING (is_official_prediction = true);

-- Allow authenticated admins to manage all mock tests
CREATE POLICY "Admins can manage mock tests" 
ON public.mock_tests FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.role = 'teacher')
    )
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mock_tests_updated_at
    BEFORE UPDATE ON public.mock_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
