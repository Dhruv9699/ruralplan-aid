-- ============================================================================
-- RuralPlan RLS Policy Fix
-- Issue: "new row violates row-level security policy for table profiles"
-- Root Cause: Missing INSERT policy for profiles table
-- ============================================================================

-- PROFILES TABLE
-- Users need to INSERT their own profile during signup
-- Users need to SELECT their own profile
-- Users need to UPDATE their own profile
-- They must NOT access other users' profiles

-- Drop existing policies if any (to recreate correctly)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- Allow authenticated users to INSERT their own profile
-- Critical: id must match auth.uid()
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Allow authenticated users to SELECT their own profile
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow authenticated users to UPDATE their own profile
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow authenticated users to DELETE their own profile (optional, for cleanup)
CREATE POLICY "Users can delete their own profile"
ON profiles
FOR DELETE
TO authenticated
USING (id = auth.uid());

-- ============================================================================
-- PRODUCTS TABLE
-- Users can only access their own products
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own products" ON products;
DROP POLICY IF EXISTS "Users can view their own products" ON products;
DROP POLICY IF EXISTS "Users can update their own products" ON products;
DROP POLICY IF EXISTS "Users can delete their own products" ON products;

CREATE POLICY "Users can insert their own products"
ON products
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own products"
ON products
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own products"
ON products
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own products"
ON products
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- SALES_HISTORY TABLE
-- Users can only access their own sales records
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own sales" ON sales_history;
DROP POLICY IF EXISTS "Users can view their own sales" ON sales_history;
DROP POLICY IF EXISTS "Users can update their own sales" ON sales_history;
DROP POLICY IF EXISTS "Users can delete their own sales" ON sales_history;

CREATE POLICY "Users can insert their own sales"
ON sales_history
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own sales"
ON sales_history
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own sales"
ON sales_history
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own sales"
ON sales_history
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- INVENTORY TABLE
-- Users can only access their own inventory
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can view their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can update their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can delete their own inventory" ON inventory;

CREATE POLICY "Users can insert their own inventory"
ON inventory
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own inventory"
ON inventory
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own inventory"
ON inventory
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own inventory"
ON inventory
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- PRODUCTION_HISTORY TABLE
-- Users can only access their own production records
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own production history" ON production_history;
DROP POLICY IF EXISTS "Users can view their own production history" ON production_history;
DROP POLICY IF EXISTS "Users can update their own production history" ON production_history;
DROP POLICY IF EXISTS "Users can delete their own production history" ON production_history;

CREATE POLICY "Users can insert their own production history"
ON production_history
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own production history"
ON production_history
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own production history"
ON production_history
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own production history"
ON production_history
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- PRODUCTION_RECOMMENDATIONS TABLE
-- Users can only access their own production recommendations
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own recommendations" ON production_recommendations;
DROP POLICY IF EXISTS "Users can view their own recommendations" ON production_recommendations;
DROP POLICY IF EXISTS "Users can update their own recommendations" ON production_recommendations;
DROP POLICY IF EXISTS "Users can delete their own recommendations" ON production_recommendations;

CREATE POLICY "Users can insert their own recommendations"
ON production_recommendations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own recommendations"
ON production_recommendations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own recommendations"
ON production_recommendations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own recommendations"
ON production_recommendations
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'products', 'sales_history', 'inventory', 'production_history', 'production_recommendations')
ORDER BY tablename;

-- Count policies per table
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'products', 'sales_history', 'inventory', 'production_history', 'production_recommendations')
GROUP BY schemaname, tablename
ORDER BY tablename;
