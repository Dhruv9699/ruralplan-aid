-- RuralPlan Cold Start Demand Estimator Migration
-- Date: 2026-09-04
-- Purpose: Add fields to support Cold Start mode for new entrepreneurs with no sales history

-- ============================================================================
-- TABLE: products (ALTER)
-- Purpose: Add Cold Start fields for demand estimation without sales history
-- ============================================================================

-- Add Cold Start fields to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS demand_mode TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS potential_customers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchase_frequency TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS avg_purchase_quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS season_start_month INTEGER,
ADD COLUMN IF NOT EXISTS season_end_month INTEGER;

-- Add comments for clarity
COMMENT ON COLUMN public.products.demand_mode IS 'Mode: "normal" for historical data or "cold_start" for market-based estimation';
COMMENT ON COLUMN public.products.potential_customers IS 'Estimated number of potential customers in target market';
COMMENT ON COLUMN public.products.conversion_rate IS 'Expected percentage of potential customers who will buy (0-100)';
COMMENT ON COLUMN public.products.purchase_frequency IS 'How often customers purchase: weekly, monthly, quarterly, seasonal';
COMMENT ON COLUMN public.products.avg_purchase_quantity IS 'Average quantity each customer purchases per transaction';
COMMENT ON COLUMN public.products.is_seasonal IS 'Whether product is seasonal';
COMMENT ON COLUMN public.products.season_start_month IS 'Month when season starts (1-12, NULL if not seasonal)';
COMMENT ON COLUMN public.products.season_end_month IS 'Month when season ends (1-12, NULL if not seasonal)';

-- ============================================================================
-- VALIDATION: Ensure all new columns are created
-- ============================================================================

DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT array_agg(col_name) INTO missing_columns
  FROM (
    VALUES 
      ('demand_mode'),
      ('potential_customers'),
      ('conversion_rate'),
      ('purchase_frequency'),
      ('avg_purchase_quantity'),
      ('is_seasonal'),
      ('season_start_month'),
      ('season_end_month')
  ) AS required_cols(col_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = required_cols.col_name
  );

  IF missing_columns IS NOT NULL THEN
    RAISE WARNING 'Missing columns in products table: %', missing_columns;
  ELSE
    RAISE NOTICE 'All Cold Start columns successfully added to products table';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration adds Cold Start support to the products table:
--
-- 1. demand_mode: Indicates whether to use "normal" (historical) or "cold_start" (market-based) demand
--
-- 2. potential_customers: User estimates how many potential customers exist in their target market
--    Example: 500 potential customers in nearby town
--
-- 3. conversion_rate: User estimates what percentage will actually buy (0-100)
--    Example: 8% expected conversion = 40 actual customers
--
-- 4. purchase_frequency: How often customers are expected to purchase
--    Options: "weekly", "monthly", "quarterly", "seasonal"
--    Used to calculate monthly/annual demand
--
-- 5. avg_purchase_quantity: How much each customer buys per transaction
--    Example: 1.5 units per customer per month
--
-- 6. is_seasonal: Boolean flag for seasonal products
--    When true, season_start_month and season_end_month must be set
--
-- 7. season_start_month: Month (1-12) when seasonal availability begins
--    Example: Mango pickle season starts in March (3)
--
-- 8. season_end_month: Month (1-12) when seasonal availability ends
--    Example: Mango pickle season ends in November (11)
--
-- Cold Start Calculation Flow:
-- =============================
-- Initial Monthly Demand = potential_customers × (conversion_rate/100) × avg_purchase_quantity
--
-- Example:
--   potential_customers = 500
--   conversion_rate = 8
--   avg_purchase_quantity = 1.5
--   estimated customers = 500 × 0.08 = 40
--   estimated monthly demand = 40 × 1.5 = 60 units/month
--
-- For seasonal products, demand is adjusted based on current month
-- For non-seasonal products, same demand applies year-round
--
-- All existing products have:
--   demand_mode = 'normal' (use existing historical forecasting)
--   is_seasonal = false (existing seasonal logic applies)
-- All other fields = default values (0, NULL, or default strings)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
