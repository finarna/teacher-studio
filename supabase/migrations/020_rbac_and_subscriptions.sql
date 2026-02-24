-- ==========================================
-- ROLE-BASED ACCESS CONTROL & SUBSCRIPTIONS
-- ==========================================

-- 1. Create Enums if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sub_status AS ENUM ('active', 'inactive', 'trial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create profiles table (since it doesn't exist yet)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role user_role DEFAULT 'student',
    subscription_status sub_status DEFAULT 'inactive',
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create helper function for role checking
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text AS $$
    SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Set up Profile RLS Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Admins can do everything
CREATE POLICY "Admins have full access to profiles" 
    ON public.profiles FOR ALL 
    USING (public.user_role() = 'admin');

-- 5. Set up auto-creation trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, subscription_status)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    'student', 
    'inactive'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Backfill existing users into profiles (so you don't get locked out)
INSERT INTO public.profiles (id, email, full_name, role, subscription_status)
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name',
    'admin', -- Default existing users to admin so you don't lose access!
    'active'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
