-- RuralPlan Complete Database Schema Migration
-- Date: 2026-09-04
-- Purpose: Create all required tables, functions, triggers, RLS policies, and grants
-- for RuralPlan application in Supabase project ytnjhctmpqhsuglojydx

-- ============================================================================
-- TABLE: profiles
-- Purpose: User profile information linked to auth.users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  location text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT 'Nashik',
  state text NOT NULL DEFAULT 'Maharashtra',
  safety_stock_percent numeric NOT NULL DEFAULT 10,
  planning_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users by id';
COMMENT ON COLUMN public.profiles.id IS 'UUID from auth.users.id';
COMMENT ON COLUMN public.profiles.location IS 'Village or location name';
COMMENT ON COLUMN public.profiles.safety_stock_percent IS 'Safety stock percentage for planning';
COMMENT ON COLUMN public.profiles.planning_days IS 'Planning horizon in days';

-- ============================================================================
-- TABLE: products
-- Purpose: Product catalog for each user
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  raw_material_name text NOT NULL,
  unit text NOT NULL,
  production_capacity numeric NOT NULL DEFAULT 0,
  current_stock numeric NOT NULL DEFAULT 0,
  minimum_stock numeric NOT NULL DEFAULT 0,
  shelf_life numeric NOT NULL DEFAULT 0,
  production_cost numeric NOT NULL DEFAULT 0,
  workers integer NOT NULL DEFAULT 1,
  raw_per_unit numeric NOT NULL DEFAULT 0,
  raw_unit text NOT NULL DEFAULT 'kg',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.products IS 'Product definitions for each user with production parameters';
COMMENT ON COLUMN public.products.user_id IS 'Foreign key to profiles(id)';
COMMENT ON COLUMN public.products.production_capacity IS 'Production capacity per day';
COMMENT ON COLUMN public.products.current_stock IS 'Current inventory level';
COMMENT ON COLUMN public.products.minimum_stock IS 'Minimum stock threshold';
COMMENT ON COLUMN public.products.shelf_life IS 'Shelf life in days';
COMMENT ON COLUMN public.products.production_cost IS 'Cost per unit to produce';
COMMENT ON COLUMN public.products.raw_per_unit IS 'Raw material quantity per unit';

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);

-- ============================================================================
-- TABLE: sales_history
-- Purpose: Record of all sales transactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  date date NOT NULL,
  quantity_sold numeric NOT NULL DEFAULT 0,
  location text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sales_history IS 'Historical record of sales transactions';
COMMENT ON COLUMN public.sales_history.user_id IS 'Foreign key to profiles(id)';
COMMENT ON COLUMN public.sales_history.product_id IS 'Foreign key to products(id)';
COMMENT ON COLUMN public.sales_history.date IS 'Date of sale';
COMMENT ON COLUMN public.sales_history.location IS 'Location where product was sold';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sales_history_user_id ON public.sales_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_product_id ON public.sales_history(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_date ON public.sales_history(date);

-- ============================================================================
-- TABLE: inventory
-- Purpose: Raw materials and inventory management
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  current_quantity numeric NOT NULL DEFAULT 0,
  required_quantity numeric NOT NULL DEFAULT 0,
  minimum_quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.inventory IS 'Raw materials and inventory items';
COMMENT ON COLUMN public.inventory.user_id IS 'Foreign key to profiles(id)';
COMMENT ON COLUMN public.inventory.product_id IS 'Optional foreign key to products(id)';
COMMENT ON COLUMN public.inventory.current_quantity IS 'Current stock quantity';
COMMENT ON COLUMN public.inventory.required_quantity IS 'Required quantity for production';
COMMENT ON COLUMN public.inventory.minimum_quantity IS 'Minimum stock threshold';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);

-- ============================================================================
-- TABLE: production_history
-- Purpose: Record of production batches and output
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.production_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  date date NOT NULL,
  planned_quantity numeric NOT NULL DEFAULT 0,
  actual_quantity numeric NOT NULL DEFAULT 0,
  quantity_sold numeric NOT NULL DEFAULT 0,
  remaining_stock numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.production_history IS 'Production records tracking planned vs actual output';
COMMENT ON COLUMN public.production_history.user_id IS 'Foreign key to profiles(id)';
COMMENT ON COLUMN public.production_history.product_id IS 'Foreign key to products(id)';
COMMENT ON COLUMN public.production_history.date IS 'Production date';
COMMENT ON COLUMN public.production_history.planned_quantity IS 'Planned production quantity';
COMMENT ON COLUMN public.production_history.actual_quantity IS 'Actual produced quantity';
COMMENT ON COLUMN public.production_history.quantity_sold IS 'Quantity sold from this batch';
COMMENT ON COLUMN public.production_history.remaining_stock IS 'Stock remaining from this batch';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_production_history_user_id ON public.production_history(user_id);
CREATE INDEX IF NOT EXISTS idx_production_history_product_id ON public.production_history(product_id);
CREATE INDEX IF NOT EXISTS idx_production_history_date ON public.production_history(date);

-- ============================================================================
-- TABLE: production_recommendations
-- Purpose: AI-generated production recommendations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.production_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  expected_demand numeric NOT NULL DEFAULT 0,
  current_stock numeric NOT NULL DEFAULT 0,
  safety_stock numeric NOT NULL DEFAULT 0,
  recommended_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.production_recommendations IS 'AI-generated production recommendations based on demand forecasting';
COMMENT ON COLUMN public.production_recommendations.user_id IS 'Foreign key to profiles(id)';
COMMENT ON COLUMN public.production_recommendations.product_id IS 'Foreign key to products(id)';
COMMENT ON COLUMN public.production_recommendations.expected_demand IS 'Forecasted demand';
COMMENT ON COLUMN public.production_recommendations.current_stock IS 'Current stock level';
COMMENT ON COLUMN public.production_recommendations.safety_stock IS 'Safety stock recommendation';
COMMENT ON COLUMN public.production_recommendations.recommended_quantity IS 'Recommended production quantity';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_production_recommendations_user_id ON public.production_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_production_recommendations_product_id ON public.production_recommendations(product_id);

-- ============================================================================
-- FUNCTION: update_updated_at_column()
-- Purpose: Automatically update updated_at timestamp on row modifications
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  new.updated_at = now();
  return new;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp';

-- ============================================================================
-- TRIGGERS: Automatic updated_at timestamps
-- ============================================================================

-- Drop triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON public.profiles 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
BEFORE UPDATE ON public.products 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at 
BEFORE UPDATE ON public.inventory 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS): Enable RLS on all tables
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_recommendations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: profiles table
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

CREATE POLICY "Users can manage their own profile" 
  ON public.profiles 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- RLS POLICIES: products table
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage their own products" ON public.products;

CREATE POLICY "Users can manage their own products" 
  ON public.products 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: sales_history table
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage their own sales history" ON public.sales_history;

CREATE POLICY "Users can manage their own sales history" 
  ON public.sales_history 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: inventory table
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage their own inventory" ON public.inventory;

CREATE POLICY "Users can manage their own inventory" 
  ON public.inventory 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: production_history table
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage their own production history" ON public.production_history;

CREATE POLICY "Users can manage their own production history" 
  ON public.production_history 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: production_recommendations table
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage their own production recommendations" ON public.production_recommendations;

CREATE POLICY "Users can manage their own production recommendations" 
  ON public.production_recommendations 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- GRANTS: Table permissions for authenticated users
-- Note: RLS policies enforce user-specific access
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_recommendations TO authenticated;

-- ============================================================================
-- GRANTS: Table permissions for service role (bypasses RLS, server-side only)
-- ============================================================================

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.sales_history TO service_role;
GRANT ALL ON public.inventory TO service_role;
GRANT ALL ON public.production_history TO service_role;
GRANT ALL ON public.production_recommendations TO service_role;

-- ============================================================================
-- GRANT: Function execution permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, service_role;

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

-- Verify all tables exist
DO $$
DECLARE
  missing_tables TEXT[];
BEGIN
  SELECT array_agg(t) INTO missing_tables
  FROM (
    VALUES ('profiles'), ('products'), ('sales_history'), 
           ('inventory'), ('production_history'), ('production_recommendations')
  ) AS required_tables(t)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t
  );
  
  IF missing_tables IS NOT NULL THEN
    RAISE WARNING 'Missing tables: %', missing_tables;
  ELSE
    RAISE NOTICE 'All tables created successfully';
  END IF;
END $$;

-- Verify RLS is enabled on all tables
DO $$
DECLARE
  table_rls RECORD;
BEGIN
  FOR table_rls IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'products', 'sales_history', 'inventory', 
                       'production_history', 'production_recommendations')
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = table_rls.table_name
      AND rowsecurity = true
    ) THEN
      RAISE NOTICE 'RLS enabled on %', table_rls.table_name;
    ELSE
      RAISE WARNING 'RLS NOT enabled on %', table_rls.table_name;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- This migration creates the complete RuralPlan database schema including:
-- - 6 tables with proper relationships and cascade deletes
-- - Automatic timestamp updates via triggers
-- - Comprehensive Row-Level Security (RLS) policies
-- - Appropriate grants for authenticated users and service role
-- - Performance indexes on foreign keys and frequently queried columns
-- - Data isolation to prevent users from seeing each other's data
-- 
-- After this migration, the RuralPlan application should be able to:
-- 1. Create user profiles on signup
-- 2. Manage products, sales, inventory, and production records
-- 3. Generate and store production recommendations
-- 4. Enforce user data isolation via RLS
-- 5. Support cascade deletes when products/profiles are removed
