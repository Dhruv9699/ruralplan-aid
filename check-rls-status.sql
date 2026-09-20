-- ============================================================================
-- RLS Diagnostic Queries
-- Run these in Supabase SQL Editor to diagnose the RLS error
-- ============================================================================

-- Query 1: Check if RLS is enabled on profiles table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Expected: rowsecurity = true
-- If false: RLS is DISABLED (this is the problem)

-- ============================================================================

-- Query 2: Check all RLS policies on profiles table
SELECT 
  policyname as policy_name,
  cmd as operation,
  roles as applies_to,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Expected: At least one policy exists
-- Should see: "Users can manage their own profile"
-- If empty: No policies exist (this is the problem)

-- ============================================================================

-- Query 3: Check if profiles table exists and its structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Expected: See all profile columns (id, name, email, location, etc.)
-- If empty: Table doesn't exist (migration didn't run)

-- ============================================================================

-- Query 4: Check auth.users table (to see if Supabase auth is set up)
SELECT COUNT(*) as user_count FROM auth.users;

-- This should work regardless of RLS
-- Shows how many users exist

-- ============================================================================

-- INTERPRETATION:
--
-- If Query 1 shows rowsecurity = false:
--   → RLS is disabled
--   → Run: ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
--
-- If Query 2 returns no rows:
--   → No policies exist
--   → Run the CREATE POLICY statement from the migration
--
-- If Query 3 returns no rows:
--   → Table doesn't exist
--   → Migration did not execute
--   → Run the full migration
--
-- ============================================================================
