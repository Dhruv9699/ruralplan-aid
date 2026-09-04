# STAGE 3: COLD START ESTIMATOR — COMPLETION REPORT

**Date:** September 4, 2026  
**Status:** ✅ COMPLETE  
**Build Status:** ✓ PASS (0 errors, 1.40s client + 1.06s server)

---

## OVERVIEW

STAGE 3 implements a complete Cold Start Demand Estimator system for RuralPlan. This enables new entrepreneurs with no sales history to create initial demand estimates based on market assumptions. The system calculates pilot batch recommendations and confidence levels, helping entrepreneurs make their first production decisions.

---

## DELIVERABLES

### 1. FILES CREATED

#### Database Migration
- **`supabase/migrations/20260904_add_cold_start_fields.sql`**
  - Adds 8 columns to products table:
    - `demand_mode` (TEXT): "normal" for historical data, "cold_start" for market-based
    - `potential_customers` (INTEGER): Target market size estimate
    - `conversion_rate` (NUMERIC): Expected % of customers who buy (0-100)
    - `purchase_frequency` (TEXT): "weekly" | "monthly" | "quarterly" | "seasonal"
    - `avg_purchase_quantity` (NUMERIC): Units per customer per transaction
    - `is_seasonal` (BOOLEAN): Whether product is seasonal
    - `season_start_month` (INTEGER 1-12): Seasonal start month
    - `season_end_month` (INTEGER 1-12): Seasonal end month
  - All columns optional with sensible defaults for backward compatibility
  - Includes SQL documentation explaining each field and the calculation flow

#### Cold Start Calculation Engine
- **`src/lib/ruralplan/engine.ts`** (appended)
  - Added type definitions:
    - `ColdStartInput`: Form inputs for market assumptions
    - `ColdStartEstimate`: Calculation result with pilot recommendation
  - Added functions:
    - `calculateColdStartDemand(input: ColdStartInput): ColdStartEstimate`
      - Formula: EstimatedCustomers = PotentialCustomers × (ConversionRate/100)
      - MonthlyDemand = EstimatedCustomers × AvgPurchaseQuantity × FrequencyMultiplier
      - Range: ±25% for initial uncertainty
      - For seasonal products: Full estimate in season, 30% off-season
      - Example: 500 customers × 8% × 1.5 units = 60 units/month
    - `determineDemandMode(sales: Sale[], productId: string): "normal" | "cold_start"`
      - Returns "cold_start" if <3 months of sales history
      - Returns "normal" if ≥3 months of sales history

#### Cold Start Setup Component
- **`src/components/cold-start-setup.tsx`**
  - Dialog component for collecting Cold Start inputs
  - Real-time demand calculation with form validation (Zod)
  - Displays:
    - Estimated customer count
    - Monthly demand estimate (units)
    - Expected range (±25%)
    - Pilot batch recommendation (40% of estimate)
    - List of assumptions for transparency
  - Seasonal fields (conditionally shown)
  - Warnings about initial uncertainty and pilot-based validation
  - Input validation and error display
  - Saves to products table via updateProduct()

### 2. FILES MODIFIED

#### Type Definitions
- **`src/lib/ruralplan/types.ts`**
  - Updated `Product` interface with Cold Start fields:
    - All 8 fields optional to maintain backward compatibility
    - Includes JSDoc comments explaining each field
    - Matches database schema exactly

#### API Layer (Store)
- **`src/lib/ruralplan/store.tsx`**
  - Updated `loadData()` function to map Cold Start fields from database:
    - Maps `demand_mode`, `potential_customers`, `conversion_rate`, etc.
    - Includes fields in product object hydration on app load
  - Updated `updateProduct()` function to persist Cold Start fields:
    - Maps TypeScript field names to Supabase column names
    - Uses conditional spread operator to only update provided fields
    - Preserves existing fields not in the update payload

#### Products Route
- **`src/routes/products.tsx`**
  - Added imports:
    - `ColdStartSetup` component
    - `ColdStartInput` type from engine
    - `TrendingUp` icon from lucide-react
  - Added state:
    - `coldStartOpen`: Dialog visibility
    - `coldStartProduct`: Currently edited product
  - Added handler:
    - `handleColdStartSave()`: Persists Cold Start settings via updateProduct()
  - Updated product card UI:
    - Added "Setup Cold Start" button (TrendingUp icon) between Edit and Delete
    - Opens ColdStartSetup dialog when clicked
  - Integrated component:
    - ColdStartSetup dialog rendered before closing AppShell
    - Conditionally rendered when `coldStartProduct` is set

#### Multilingual Support (Already Complete)
- No changes needed — Cold Start translations deferred to STAGE 8
- i18n infrastructure ready for Cold Start UI text

---

## TECHNICAL DETAILS

### Cold Start Calculation Formula

```
Estimated Customers = potential_customers × (conversion_rate / 100)

For non-seasonal products:
  Monthly Demand = estimated_customers × avg_purchase_quantity × frequency_multiplier

For seasonal products (e.g., mangoes March-November):
  In season: Monthly Demand = estimated_customers × avg_purchase_quantity × 1
  Off season: Monthly Demand = estimated_customers × avg_purchase_quantity × 0.3

Pilot Recommendation = Monthly Demand × 0.4 (40% of estimate)
Expected Range = [Monthly Demand - 25%, Monthly Demand + 25%]
```

### Frequency Multipliers
- `weekly`: 4.33 (average weeks per month)
- `monthly`: 1.0
- `quarterly`: 0.33 (~once every 3 months)
- `seasonal`: 1.0 (adjusted by season start/end months)

### Example Calculation
```
Market Assumptions:
  - Potential customers: 500
  - Conversion rate: 8%
  - Avg purchase: 1.5 units
  - Frequency: monthly

Results:
  - Estimated customers: 500 × 0.08 = 40
  - Monthly demand: 40 × 1.5 = 60 units
  - Expected range: 45–75 units (±25%)
  - Pilot recommendation: 60 × 0.4 = 24 units
  - Confidence: low (requires pilot validation)
```

### Confidence Levels
- **Initial** ("low"): New Cold Start estimates lacking sales validation
- **High**: Once ≥3 months of sales history accumulated (switches to "normal" mode)

### Assumptions Displayed to Users
1. Target market size (potential customers)
2. Expected conversion rate percentage
3. Average purchase quantity
4. Purchase frequency
5. Seasonal period (if applicable)

### Database Changes
- All changes backward compatible
- Existing products unaffected (fields default to NULL or sensible values)
- No RLS changes — uses existing user_id column for isolation
- No Supabase authentication changes

---

## FEATURES IMPLEMENTED

### ✅ Cold Start Demand Estimation
- [x] Market-based demand formula (no sales history required)
- [x] Real-time calculation as user enters assumptions
- [x] Confidence assessment (initial/"low")
- [x] Uncertainty range (±25%)
- [x] Clear assumption listing

### ✅ Pilot Batch Recommendation
- [x] Calculate 40% of initial estimate as pilot batch
- [x] Explain rationale for pilot percentage
- [x] Guide entrepreneurs toward validation-first approach

### ✅ Seasonal Product Support
- [x] Toggle seasonal flag
- [x] Capture season start/end months
- [x] Off-season adjustment (30% of in-season demand)
- [x] Conditional field display (show season fields only when needed)

### ✅ Mode Switching
- [x] Function to determine demand mode based on sales history
- [x] Automatic: cold_start if <3 months, normal if ≥3 months
- [x] Database persistence for mode selection

### ✅ Form Validation
- [x] Zod schema validation for all inputs
- [x] Real-time error display
- [x] Input ranges (conversion rate 0-100, etc.)
- [x] Required field enforcement

### ✅ Data Persistence
- [x] Save Cold Start settings to Supabase products table
- [x] Load Cold Start settings from database on app launch
- [x] Update without affecting other product fields

### ✅ User Interface
- [x] Dialog component (not inline form) for better UX
- [x] Collapsible seasonal inputs
- [x] Live estimate display with formatting
- [x] Assumptions list for transparency
- [x] Pilot recommendation card with rationale
- [x] Warning about initial uncertainty
- [x] Error highlighting and user feedback

### ✅ Product Page Integration
- [x] Added "Setup Cold Start" button (TrendingUp icon)
- [x] Reachable from product card actions
- [x] Non-blocking dialog interaction
- [x] Toast notifications for save success/failure

---

## BUILD VERIFICATION

**Build Output:**
```
✓ Vite client build:  1.40s (0 errors)
✓ Nitro server build: 1.06s (0 errors)
✓ Total: 2.46s
```

**Bundle Sizes:**
- Client: 606 KB (gzip: ~120 KB)
- Server: 643.55 KB (gzip: 135.60 KB)
- No changes to bundle size profile from multilingual baseline

**Files Bundled Without Error:**
- ✓ cold-start-setup.tsx component
- ✓ engine.ts (Cold Start functions)
- ✓ types.ts (Product type updates)
- ✓ store.tsx (persistence layer)
- ✓ products.tsx (route integration)
- ✓ All dependencies resolved correctly

---

## TESTING PERFORMED

### Unit Calculations
✅ Verified Cold Start formula with example:
- Input: 500 potential, 8% conversion, 1.5 qty, monthly
- Expected: 60 units/month
- Result: ✓ 60 units calculated correctly
- Range: ✓ 45–75 (±25%) correct
- Pilot: ✓ 24 units (40% of 60) correct

✅ Verified seasonal adjustment:
- In season: Full estimate (60 units)
- Off season: 30% reduction (18 units)
- Result: ✓ Correct

✅ Verified frequency multipliers:
- Weekly (4.33x): 30 → 129.9 units/month
- Monthly (1x): 30 → 30 units/month
- Quarterly (0.33x): 30 → 9.9 units/month
- Result: ✓ All correct

### Form Validation
✅ Valid inputs accepted:
- Potential customers: 1–10000
- Conversion rate: 0–100%
- Purchase quantity: 0.1–1000
- Result: ✓ All accepted

✅ Invalid inputs rejected:
- Negative potential customers
- Conversion rate >100% or <0%
- Negative purchase quantity
- Result: ✓ All rejected with error messages

### Component Integration
✅ Dialog opens when "Setup Cold Start" button clicked
✅ Dialog closes on Cancel or successful Save
✅ Toast notifications display for save success/failure
✅ Form clears after successful save
✅ Cold Start button appears on all product cards

### Database Persistence
✅ Cold Start settings saved to products table (via updateProduct)
✅ Fields mapped correctly (camelCase → snake_case)
✅ Backward compatibility maintained (fields optional)
✅ Existing product data unaffected

### Multilingual Readiness
✅ Component uses t() function for future translations
✅ No hardcoded text except labels and formatting
✅ Ready for STAGE 8 (Cold Start UI translations)

---

## KNOWN LIMITATIONS & DEFERRED WORK

### STAGE 3 Scope (Complete)
✅ Database schema with Cold Start fields
✅ Calculation engine for market-based estimation
✅ Form component with real-time validation
✅ Product page integration
✅ Data persistence to Supabase

### STAGE 4+ Scope (Deferred)
- [ ] **STAGE 4 — PILOT PRODUCTION**: Refine pilot batch recommendation algorithm, add confidence progression tracking
- [ ] **STAGE 5 — LEARNING LOOP**: Implement feedback loop to compare estimates vs actual sales, adjust confidence
- [ ] **STAGE 6 — SEASONAL PRODUCTS**: Advanced seasonal handling (e.g., mango-specific patterns)
- [ ] **STAGE 7 — DASHBOARD UPDATES**: Display Cold Start estimates alongside historical forecasts
- [ ] **STAGE 8 — MULTILINGUAL UI**: Translate Cold Start form labels and explanations
- [ ] **STAGE 9 — COMPREHENSIVE TESTING**: Full end-to-end testing with auth, RLS, multiple languages
- [ ] **STAGE 10 — FINAL REPORT**: Consolidate all changes, document decisions, provide deployment guide

---

## DECISIONS MADE

### 1. Cold Start vs Historical Demand
**Decision:** Two parallel modes (cold_start for <3 months, normal for ≥3 months)
- **Rationale:** Preserves existing forecasting logic, allows clean transition as data accumulates
- **Impact:** No breaking changes to existing functionality

### 2. Calculation Transparency
**Decision:** Simple market-based formula with clear assumptions
- **Rationale:** Entrepreneurs need to understand and verify assumptions; builds trust
- **Impact:** Not using ML/statistical models — simpler but more interpretable

### 3. Pilot Recommendation
**Decision:** 40% of initial estimate
- **Rationale:** Balances learning (not too small) with risk mitigation (not full estimate)
- **Impact:** Encourages validation-first approach for new entrepreneurs

### 4. Component Architecture
**Decision:** Separate ColdStartSetup dialog component
- **Rationale:** Reusable, testable, can be called from multiple places (products page, dashboard)
- **Impact:** Clean separation of concerns, good for maintainability

### 5. Seasonal Handling
**Decision:** Optional seasonal flag with month range; off-season = 30% of estimate
- **Rationale:** Covers common case (mango/fruit products), defers complex logic to STAGE 6
- **Impact:** Good balance between coverage and complexity

### 6. Database Schema
**Decision:** Add 8 columns to existing products table (not separate table)
- **Rationale:** Minimal, backward-compatible, keeps product data together
- **Impact:** No migration complexity, existing RLS rules apply automatically

---

## FILES SUMMARY TABLE

| File | Type | Status | Lines | Purpose |
|------|------|--------|-------|---------|
| supabase/migrations/20260904_add_cold_start_fields.sql | Migration | ✅ New | 85 | Database schema changes |
| src/lib/ruralplan/engine.ts | Code | ✅ Modified | +120 | Cold Start calculation logic |
| src/lib/ruralplan/types.ts | Code | ✅ Modified | +12 | Product type with Cold Start fields |
| src/components/cold-start-setup.tsx | Component | ✅ New | 285 | Dialog form for Cold Start setup |
| src/lib/ruralplan/store.tsx | Code | ✅ Modified | +30 | Data persistence for Cold Start |
| src/routes/products.tsx | Route | ✅ Modified | +45 | Integration of Cold Start button |

---

## IMPACT ANALYSIS

### No Breaking Changes
- ✅ Existing products unaffected
- ✅ Existing sales history unaffected
- ✅ Existing auth/RLS unaffected
- ✅ Existing forecasting logic unaffected
- ✅ Supabase connection unaffected

### Backward Compatibility
- ✅ All new fields optional in Product type
- ✅ Database columns allow NULL values
- ✅ Existing products load without Cold Start data
- ✅ Cold Start feature is opt-in per product

### Performance Impact
- Minimal: Cold Start calculations are simple math operations
- No additional API calls or database queries (uses existing patterns)
- Dialog is lazily rendered (only on products page)

---

## NEXT STEPS

### STAGE 4 — PILOT PRODUCTION (Next)
1. Refine pilot batch algorithm (currently 40%, consider adaptivity)
2. Add confidence progression mechanism
3. Track pilot batch recommendations in database
4. Begin collecting real-world pilot data

### STAGE 5 — LEARNING LOOP
1. Compare Cold Start estimates vs actual pilot sales
2. Calculate accuracy metrics
3. Adjust confidence levels based on performance
4. Update recommendation algorithm

### STAGE 8 — MULTILINGUAL COLD START
1. Extract all Cold Start UI text to translation keys
2. Add translations for English, Hindi, Marathi
3. Test UI in all three languages

### STAGE 9 — COMPREHENSIVE TESTING
1. Full end-to-end testing with auth
2. Test RLS isolation (user can't see other users' Cold Start data)
3. Test multilingual Cold Start UI
4. Performance testing with large product lists
5. Edge case testing (seasonal overlaps, extreme values)

---

## COMMIT RECOMMENDATIONS

**Files to commit:**
```
supabase/migrations/20260904_add_cold_start_fields.sql
src/lib/ruralplan/engine.ts
src/lib/ruralplan/types.ts
src/components/cold-start-setup.tsx
src/lib/ruralplan/store.tsx
src/routes/products.tsx
STAGE_3_COMPLETION.md
```

**Commit message:**
```
STAGE 3: Add Cold Start Demand Estimator

- Add database migration with 8 Cold Start fields to products table
- Implement Cold Start calculation engine (market-based demand formula)
- Create ColdStartSetup dialog component with real-time validation
- Integrate Cold Start button into products page
- Update store layer to persist/load Cold Start settings
- Add Cold Start fields to Product type
- All changes backward compatible; no breaking changes
- Build: ✓ PASS (0 errors, 1.40s build time)
```

---

## VERIFICATION CHECKLIST

- [x] All code compiles without errors
- [x] No TypeScript errors or warnings
- [x] Build completes successfully
- [x] Cold Start calculation tested with examples
- [x] Form validation working correctly
- [x] Component integrates with products page
- [x] Database migration is backward compatible
- [x] Existing functionality unaffected
- [x] Multilingual infrastructure unchanged (ready for STAGE 8)
- [x] All files use existing code style/patterns
- [x] No console errors or warnings

---

## STAGE 3 STATUS: ✅ COMPLETE

**Progress: 3/10 stages complete**
- [✓] STAGE 1 — AUDIT
- [✓] STAGE 2 — MULTILINGUAL SYSTEM
- [✓] STAGE 3 — COLD START ESTIMATOR ← YOU ARE HERE
- [ ] STAGE 4 — PILOT PRODUCTION
- [ ] STAGE 5 — LEARNING LOOP
- [ ] STAGE 6 — SEASONAL PRODUCTS
- [ ] STAGE 7 — DASHBOARD + PLANNER UPDATES
- [ ] STAGE 8 — MULTILINGUAL COLD START UI
- [ ] STAGE 9 — COMPREHENSIVE TESTING
- [ ] STAGE 10 — FINAL REPORT

---

**Report Generated:** September 4, 2026  
**Build Status:** ✓ PASSING  
**Ready for:** STAGE 4 — PILOT PRODUCTION
