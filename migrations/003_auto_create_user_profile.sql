-- =====================================================
-- Migration: 003 - Auto-create user profiles
-- =====================================================
-- This trigger automatically creates a user profile in the
-- users table when a new user signs up via Supabase Auth.
-- This prevents 401 errors from frontend trying to insert directly.
-- =====================================================

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    'student' -- Default role
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicates if triggered multiple times

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users table (runs after user signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile when auth user is created';
