# STAGE 1 — AUDIT REPORT
## Multilingual System + Cold Start Demand Estimator
**Date**: September 4, 2026  
**Status**: AUDIT COMPLETE - NO MODIFICATIONS MADE

---

## 1. EXISTING i18n ARCHITECTURE

### Current State
**Finding**: ✅ NO existing i18n library or translation system detected.

**Evidence**:
- `package.json` has NO i18n libraries (no i18next, react-i18next, etc.)
- No `src/i18n/` directory exists
- No translation files found
- Only generic date localization using `toLocaleDateString("en-IN")` exists in:
  - `src/lib/ruralplan/engine.ts` (4 usages)
  - `src/routes/sales.tsx` (2 usages)
  - `src/routes/production-history.tsx` (1 usage)
  - `src/components/ui/chart.tsx` (1 usage using `toLocaleString()`)
  - `src/components/ui/calendar.tsx` (1 usage)

**Implication**: A complete i18n system must be built from scratch. Recommended approach: 
- Use simple JSON translation files + React Context (no heavy library)
- Lightweight, maintainable, and matches project simplicity

---

## 2. FILES REQUIRING TRANSLATION

### Routes (13 files with user-facing text)
1. **`src/routes/__root.tsx`** — Root layout, errors
   - 404 page text
   - Error boundary text
   - Loading state text
   - Meta descriptions

2. **`src/routes/auth.tsx`** — Login/Signup UI
   - Tab labels: "Sign Up", "Login"
   - Form labels: "Name", "Email", "Password", "Village / Location", "District", "State"
   - Placeholders and hints
   - Error messages (validation)
   - Buttons: "Create account", "Signing in...", "Continue with Google"
   - Success messages: "Account created and logged in successfully!", "Welcome back"
   - Instruction text

3. **`src/routes/dashboard.tsx`** — Dashboard overview
   - Page title and description
   - Stats labels and hints
   - Hero gradient text
   - Alert text
   - Status messages
   - Link text

4. **`src/routes/products.tsx`** — Product management
   - Page title and description
   - Button: "Add product"
   - Empty state text
   - Product dialog title: "Add product", "Edit product"
   - Form labels: "Product name", "Raw material / fruit", "Unit", "Production capacity per day", etc.
   - Buttons: "Cancel", "Add product", "Save changes"
   - Success/error messages
   - Card details

5. **`src/routes/sales.tsx`** — Sales history and demand
   - Page title: "Demand & Sales History"
   - Description text
   - Stat card labels: "Estimated Demand", "Trend", "Data Points", "Method"
   - Form labels: "Date", "Product", "Location", "Quantity sold"
   - Button: "Add"
   - Chart tabs: "Daily", "Weekly", "Monthly", "Trend"
   - Table headers and empty state
   - Success/error messages

6. **`src/routes/planner.tsx`** — Production planner
   - Page title and description
   - Form labels: "Select product", "Current stock", "Expected demand", "Production capacity per day", etc.
   - Button: "Save this plan to production history"
   - "Why this recommendation?" section
   - Status pills: "Overproduction Risk", "Shortage Risk", "No overproduction or shortage risk"
   - Empty state: "Go to the Products page and add a product to use the planner"

7. **`src/routes/inventory.tsx`** — Raw materials
   - Page title: "Raw Materials"
   - Description: "Keep the quantities updated so the planner knows what you can actually produce."
   - Form labels: "Material name", "Unit", "Current quantity", "Required quantity", "Minimum level"
   - Button: "Add material"
   - Alert text: "Production may be affected because..."
   - Card details and material status
   - Success/error messages

8. **`src/routes/production-history.tsx`** — Production records
   - Page title, descriptions, table headers

9. **`src/routes/alerts.tsx`** — Production alerts
   - Page title: "Alerts"
   - Description text
   - Alert levels: "Urgent", "Attention", "All good", "Information", "Weather"
   - Individual alert titles and details

10. **`src/routes/weather.tsx`** — Weather information
    - Page title, descriptions, weather data labels

11. **`src/routes/settings.tsx`** — User settings
    - Page title: "Settings"
    - Section headers: "Profile", "Data"
    - Form labels and hints
    - Buttons: "Save settings", "Reload demo data", "Delete all data and start fresh", "Log out"
    - Helper text

12. **`src/routes/assistant.tsx`** — AI assistant
    - Page title, descriptions, chat UI text

13. **`src/routes/index.tsx`** — Landing page
    - Hero text, CTAs, feature descriptions

### Components
1. **`src/components/app-shell.tsx`** — Navigation and layout
   - Navigation labels (NAV array):
     - "Dashboard"
     - "Production Planner"
     - "Products"
     - "Demand & Sales"
     - "Raw Materials"
     - "Weather"
     - "Production History"
     - "Alerts"
     - "RuralPlan Assistant"
     - "Settings"
   - Mobile "More" button label
   - Mobile label abbreviations: "Dash", "Plan", "Prod", "Dmd", "Mat", "Wtr", "Hist", "Alrt", "Help"
   - Loading state: "Loading RuralPlan…"
   - Page header component (used throughout)

2. **`src/components/stat-card.tsx`** — Status pill labels
3. **`src/components/field.tsx`** — Form field component
4. **All `src/components/ui/*.tsx`** — Radix UI components (minimal text, mostly interactive)

---

## 3. EXISTING COLD START-RELATED CODE

### Current State
**Finding**: ❌ NO Cold Start code exists in the codebase.

**Existing Demand System**:
- `src/lib/ruralplan/engine.ts`: `estimateDemand()` function uses 3-month moving average
- Requires historical sales data to function
- Returns `DemandEstimate` interface with `confidence` levels: "low", "medium", "high"
- **Problem**: For new entrepreneurs with 0 sales history, demand estimate returns undefined/null

**Evidence**:
- `estimateDemand()` checks `if (history.length < 3)` and returns low confidence
- No "Initial Demand Estimate" UI component exists
- No "Cold Start" form or logic exists
- No fields for: potential_customers, conversion_rate, purchase_frequency, seasonal flags, etc.

**Implications**:
1. Database schema needs expansion (see Section 4)
2. New Cold Start form component needed
3. New Cold Start calculation engine needed
4. Existing UI needs to detect and switch between modes

---

## 4. DATABASE CHANGES REQUIRED

### Current Schema (from migration file)

| Table | Columns | Status |
|-------|---------|--------|
| **profiles** (user table) | id (FK auth.users), name, email, location, district, state, safety_stock_percent, planning_days, created_at, updated_at | ✅ OK |
| **products** | id, user_id, product_name, raw_material_name, unit, production_capacity, current_stock, minimum_stock, shelf_life, production_cost, workers, raw_per_unit, raw_unit, created_at, updated_at | ⚠️ NEEDS EXPANSION |
| **sales_history** | id, user_id, product_id, date, quantity_sold, location, created_at | ✅ OK |
| **inventory** | id, user_id, product_id, material_name, current_quantity, required_quantity, minimum_quantity, unit, created_at, updated_at | ✅ OK |
| **production_history** | id, user_id, product_id, date, planned_quantity, actual_quantity, quantity_sold, remaining_stock, created_at | ✅ OK |
| **production_recommendations** | id, user_id, product_id, expected_demand, current_stock, safety_stock, recommended_quantity, created_at | ✅ OK |

### Required NEW Columns (products table)

Add these 8 columns to support Cold Start Demand Estimator:

```sql
-- Cold Start fields
demand_mode TEXT NOT NULL DEFAULT 'normal', -- 'normal' or 'cold_start'
potential_customers INTEGER DEFAULT 0,
conversion_rate NUMERIC DEFAULT 0, -- 0-100
purchase_frequency TEXT DEFAULT 'monthly', -- 'weekly', 'monthly', 'quarterly', 'seasonal'
avg_purchase_quantity NUMERIC DEFAULT 0,
is_seasonal BOOLEAN DEFAULT false,
season_start_month INTEGER, -- 1-12 (null if not seasonal)
season_end_month INTEGER, -- 1-12 (null if not seasonal)
```

**Justification**:
- `demand_mode`: Flag to indicate cold start vs normal mode
- `potential_customers`, `conversion_rate`: User inputs for cold start calculation
- `purchase_frequency`: User-selected frequency for demand calculation
- `avg_purchase_quantity`: Quantity per customer per transaction
- `is_seasonal`, `season_start_month`, `season_end_month`: Seasonal product handling

**Risk Assessment**: ✅ LOW - Adding columns is backward-compatible, doesn't break existing functionality

---

## 5. POTENTIAL CONFLICTS & RISKS

### Authentication
**Status**: ✅ SAFE
- Current: Supabase Auth + profiles table
- Migration has correct CASCADE DELETE: `id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- RLS policies properly isolate users
- **No risk to modifying**: Multilingual (localStorage) or Cold Start (new columns) don't affect auth

### Supabase Connection
**Status**: ✅ SAFE
- Project ID: ytnjhctmpqhsuglojydx
- All tables have proper RLS policies
- Adding new columns doesn't break existing queries
- **No risk**: Cold Start columns are optional (NULLs for existing products)

### Data Isolation (RLS)
**Status**: ✅ SAFE
- All 6 tables have RLS enabled
- Policies check `auth.uid() = user_id`
- Existing data remains isolated
- **No risk**: New columns inherit same RLS policy

### Existing Demand Forecasting
**Status**: ✅ SAFE
- `estimateDemand()` function works independently
- Can coexist with Cold Start logic
- UI should detect mode and show appropriate UI

**Risk to Address**:
- Need to ensure existing products don't accidentally get `demand_mode = 'cold_start'`
- **Solution**: Default migration sets `demand_mode = 'normal'` for all existing products

### Production Planning Logic
**Status**: ✅ SAFE
- `computePlan()` function uses historical data
- Cold Start doesn't modify existing recommendation logic
- New products with Cold Start input just get different initial demand

---

## 6. SUMMARY TABLE

| Aspect | Status | Details |
|--------|--------|---------|
| **i18n System** | ❌ None | Build JSON + Context from scratch |
| **Files to Translate** | 13 routes + app-shell | ~200+ hardcoded strings |
| **Cold Start Code** | ❌ None | Build complete feature |
| **Cold Start UI** | ❌ None | Build form + calculation display |
| **Database Schema** | ⚠️ Needs expansion | Add 8 columns to products table |
| **Auth System** | ✅ Safe | No changes required |
| **Supabase Connection** | ✅ Safe | No changes required |
| **RLS Policies** | ✅ Safe | No changes required |
| **Existing Features** | ✅ Safe | All remain functional |

---

## 7. IMPLEMENTATION ROADMAP (STAGES 2-10)

### STAGE 2: Multilingual System (4-5 hours)
1. Create `src/i18n/` folder with `en.json`, `hi.json`, `mr.json`
2. Extract all hardcoded strings into translation keys
3. Create i18n Context + hook
4. Add language selector to app-shell navbar
5. Implement localStorage persistence
6. Test all 3 languages

### STAGE 3: Cold Start Estimator (2-3 hours)
1. Create migration to add 8 columns to products table
2. Extend products form to collect Cold Start inputs
3. Build `coldStartEstimate()` function in engine.ts
4. Add Cold Start mode detection logic
5. Create "Initial Demand Estimate" UI component

### STAGE 4: Pilot Production (1 hour)
1. Add pilot batch recommendation to `coldStartEstimate()`
2. Display pilot guidance in UI

### STAGE 5: Learning Loop (1.5 hours)
1. Implement confidence progression based on sales history
2. Add mode switching logic (cold_start → normal)

### STAGE 6: Seasonal Products (1 hour)
1. Add seasonal handling to Cold Start calculation
2. Display seasonal warnings

### STAGE 7: Dashboard + Planner Updates (2 hours)
1. Update dashboard to show Cold Start vs Demand Forecast
2. Update planner to accept Cold Start mode inputs
3. Visual distinction between modes

### STAGE 8: Multilingual Cold Start (1.5 hours)
1. Translate all Cold Start UI text to Hindi + Marathi

### STAGE 9: Comprehensive Testing (3+ hours)
1. Auth: signup, login, logout, session
2. Data isolation: User A ≠ User B
3. Languages: EN, HI, MR + refresh + no data loss
4. Cold Start: Various customer counts, conversion rates, frequencies
5. Edge cases: 0 customers, 0% conversion, invalid inputs
6. Integration: Existing features still work

### STAGE 10: Final Report
1. Document all changes
2. List files created/modified
3. Database migration summary
4. Testing results

---

## 8. BLOCKERS OR DEPENDENCIES

**None identified.** All work can proceed independently:
- ✅ Multilingual doesn't require database changes
- ✅ Cold Start doesn't require i18n (can translate after)
- ✅ Existing features remain fully functional
- ✅ Auth system doesn't need modification
- ✅ RLS policies don't need change

---

## APPROVAL CHECKPOINT

**Audit complete.** No issues blocking implementation.

**Ready to proceed to STAGE 2 — MULTILINGUAL SYSTEM?**
- [x] Existing i18n architecture documented
- [x] Files needing translation identified
- [x] Existing Cold Start code verified (none)
- [x] Database changes planned
- [x] Conflicts/risks assessed
- [x] No blockers identified

**Next Step**: Build i18n infrastructure and translate all user-facing text.
