# Cold Start Demand Estimator - Investigation & Implementation Plan

## INVESTIGATION COMPLETE ✅

### Current System Analysis

#### 1. Existing Demand Forecasting
**Location**: `src/lib/ruralplan/engine.ts` (lines 87-182)

**Algorithm**: 3-month moving average with trend analysis
- Requires: ≥1 month of sales history
- Confidence levels: high/medium/low based on data consistency (coefficient of variation)
- Returns: estimate, estimateLow, estimateHigh, confidence, trend, monthsUsed, explanation

**Cold-Start Behavior**:
```typescript
if (history.length === 0) {
  return {
    estimate: 0,
    confidence: "low",
    explanation: "No sales data found. Please add sales records to get demand estimates."
  };
}
```

**Problem**: System returns 0 demand when no history → No recommendations generated for new products

---

#### 2. Database Schema - What Exists
**Products Table**:
- id, user_id, product_name, raw_material_name, unit
- production_capacity, current_stock, minimum_stock, shelf_life
- production_cost, workers, raw_per_unit, raw_unit

**Missing for Cold Start**: No fields for market assumptions
- No: potential_customers, conversion_rate, purchase_frequency, seasonality, customer reach

**Production Recommendations Table**:
- Stores: expected_demand, current_stock, safety_stock, recommended_quantity
- Works with existing demand forecasting
- Will need enhancement to support cold-start estimates

---

#### 3. UI Components - What Exists

**Dashboard** (`src/routes/dashboard.tsx`):
- Shows demand estimate with confidence range
- Displays recommended production
- Color-codes by confidence level
- Links to Production Planner

**Production Planner** (`src/routes/planner.tsx`):
- Pre-fills expectedDemand from `estimateDemand(sales, product.id).estimate`
- Shows calculation breakdown
- "Save plan to production history" button

**Products Page** (`src/routes/products.tsx`):
- Form collects: name, raw material, unit, capacity, stock, shelf life, workers, costs
- No market/customer questions

**Sales Page** (`src/routes/sales.tsx`):
- Displays demand stats with confidence
- Shows trend, method, data points
- Tracks sales history

---

### Architecture Observations

✅ **What Makes This Easy to Extend**:
1. Clear separation: engine.ts (calculations) → routes use it
2. Transparent confidence levels already exist
3. DemandEstimate interface is extensible
4. RLS working perfectly - no isolation issues
5. Existing demand calculation returns structured data

❌ **What Needs Changes**:
1. Products table needs new columns for cold-start parameters
2. estimateDemand() needs new mode: "cold-start" vs "historical"
3. Dashboard/Planner need UI to handle both modes
4. Product creation form needs new optional fields

---

## IMPLEMENTATION PLAN

### Phase 1: Database Schema
**New columns on products table** (safe, additive migration):
```sql
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS demand_mode text DEFAULT 'auto';
-- 'auto' = system decides | 'historical' = use history | 'cold_start' = use market assumptions

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS potential_customers numeric DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS conversion_rate numeric DEFAULT NULL; -- 0-100
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purchase_frequency text DEFAULT NULL; -- 'weekly' | 'monthly' | 'quarterly' | 'seasonal'
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS avg_purchase_quantity numeric DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_seasonal boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS season_start_month integer DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS season_end_month integer DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS selling_area text DEFAULT NULL; -- 'village' | 'town' | 'district' | 'multiple' | 'online'
```

**New table: cold_start_estimates** (optional, for tracking):
```sql
CREATE TABLE IF NOT EXISTS public.cold_start_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  estimated_monthly_demand numeric NOT NULL,
  estimated_pilot_batch numeric NOT NULL,
  confidence text NOT NULL, -- 'low' | 'low-medium' | 'medium'
  calculation_json jsonb, -- Store inputs for audit trail
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, created_at)
);
```

### Phase 2: Engine Enhancement
**New function: estimateDemandColdStart()** in `src/lib/ruralplan/engine.ts`

```typescript
interface ColdStartInput {
  potentialCustomers: number;
  conversionRate: number; // 0-100
  purchaseFrequency: 'weekly' | 'monthly' | 'quarterly' | 'seasonal';
  avgPurchaseQuantity: number;
  isSeasonal: boolean;
  seasonStartMonth?: number;
  seasonEndMonth?: number;
  sellingArea: 'village' | 'town' | 'district' | 'multiple' | 'online';
}

interface ColdStartEstimate extends DemandEstimate {
  mode: 'cold-start';
  assumptions: ColdStartInput;
  pilotBatchRecommendation: number;
  calculationSteps: Array<{ step: string; value: number; explanation: string }>;
}

export function estimateDemandColdStart(input: ColdStartInput): ColdStartEstimate {
  // 1. Calculate estimated customers
  const estimatedCustomers = Math.round((input.potentialCustomers * input.conversionRate) / 100);
  
  // 2. Calculate base monthly demand
  const frequencyMultiplier = {
    'weekly': 4.33,
    'monthly': 1,
    'quarterly': 0.33,
    'seasonal': 1, // Handled separately
  }[input.purchaseFrequency];
  
  const baseMonthlyDemand = Math.round(estimatedCustomers * input.avgPurchaseQuantity * frequencyMultiplier);
  
  // 3. Adjust for seasonality
  let monthlyDemand = baseMonthlyDemand;
  if (input.isSeasonal) {
    monthlyDemand = Math.round(baseMonthlyDemand * 0.7); // Reduce for off-season assumption
  }
  
  // 4. Create estimate with ranges
  const lowRange = Math.round(monthlyDemand * 0.7);
  const highRange = Math.round(monthlyDemand * 1.3);
  
  // 5. Calculate pilot batch (40-50% of monthly for new product)
  const pilotBatch = Math.round(monthlyDemand * 0.4);
  
  return {
    estimate: monthlyDemand,
    estimateLow: lowRange,
    estimateHigh: highRange,
    confidence: 'low', // Always low for cold-start
    method: 'Market-based estimate from customer assumptions',
    monthsUsed: 0,
    trendPercent: 0,
    trend: 'stable',
    history: [],
    explanation: `Based on ${input.potentialCustomers} potential customers, ${input.conversionRate}% conversion rate, ${input.avgPurchaseQuantity} units per purchase, ${input.purchaseFrequency} frequency. This is an initial estimate.`,
    mode: 'cold-start',
    assumptions: input,
    pilotBatchRecommendation: pilotBatch,
    calculationSteps: [
      { step: 'Potential customers', value: input.potentialCustomers, explanation: 'Your estimate of total addressable market' },
      { step: 'Expected conversion', value: estimatedCustomers, explanation: `${input.potentialCustomers} × ${input.conversionRate}%` },
      { step: 'Purchase frequency multiplier', value: frequencyMultiplier, explanation: input.purchaseFrequency },
      { step: 'Monthly purchase units', value: input.avgPurchaseQuantity, explanation: 'Per customer per purchase cycle' },
      { step: 'Base monthly demand', value: baseMonthlyDemand, explanation: `${estimatedCustomers} × ${input.avgPurchaseQuantity} × ${frequencyMultiplier}` },
      { step: 'Pilot batch recommendation', value: pilotBatch, explanation: 'Start with 40% of monthly to test market' },
    ]
  };
}
```

### Phase 3: Smart Mode Selection
**New function: selectDemandMode()** in `src/lib/ruralplan/engine.ts`

```typescript
export function selectDemandMode(
  salesCount: number,
  hasMarketAssumptions: boolean,
  productHistoryMonths: number
): 'historical' | 'cold-start' | 'hybrid' {
  // Historical data takes precedence
  if (productHistoryMonths >= 3) return 'historical';
  
  // Very new product with market assumptions
  if (hasMarketAssumptions && productHistoryMonths < 1) return 'cold-start';
  
  // Early data (1-2 months) + market assumptions
  if (productHistoryMonths >= 1 && productHistoryMonths < 3 && hasMarketAssumptions) return 'hybrid';
  
  // Fall back to historical (even if low confidence)
  return 'historical';
}

export function estimateDemandAuto(
  sales: Sale[],
  product: Product,
  productId: string
): DemandEstimate | ColdStartEstimate {
  const historicalDemand = estimateDemand(sales, productId);
  const hasMarketAssumptions = Boolean(product.potential_customers && product.conversion_rate);
  
  const mode = selectDemandMode(
    sales.filter(s => s.productId === productId).length,
    hasMarketAssumptions,
    historicalDemand.monthsUsed
  );
  
  if (mode === 'cold-start' && hasMarketAssumptions) {
    return estimateDemandColdStart({
      potentialCustomers: product.potential_customers || 0,
      conversionRate: product.conversion_rate || 0,
      purchaseFrequency: product.purchase_frequency || 'monthly',
      avgPurchaseQuantity: product.avg_purchase_quantity || 1,
      isSeasonal: product.is_seasonal || false,
      seasonStartMonth: product.season_start_month,
      seasonEndMonth: product.season_end_month,
      sellingArea: product.selling_area || 'village',
    });
  }
  
  if (mode === 'hybrid') {
    // Blend both: weight historical by confidence, supplement with market estimate
    return blendEstimates(historicalDemand, estimateDemandColdStart({...}));
  }
  
  return historicalDemand;
}
```

### Phase 4: UI Components

**A. Product Creation Form Enhancement** (`src/routes/products.tsx`)

Add optional "Market Assumptions" section that expands when user wants to provide cold-start data:

```typescript
// New form fields
coldStartEnabled: boolean,
potentialCustomers: string,
conversionRate: string,
purchaseFrequency: 'weekly' | 'monthly' | 'quarterly' | 'seasonal',
avgPurchaseQuantity: string,
isSeasonal: boolean,
seasonStartMonth?: number,
seasonEndMonth?: number,
sellingArea: 'village' | 'town' | 'district' | 'multiple' | 'online',
```

**B. Dashboard Enhancement** (`src/routes/dashboard.tsx`)

Add "Cold Start" badge when demand is market-based:

```typescript
const demand = estimateDemandAuto(sales, product, product.id);

// In StatCard for demand:
<StatCard
  label="Expected Demand"
  value={`${demand.estimate} ${product.unit}`}
  hint={`Range: ${demand.estimateLow}–${demand.estimateHigh}`}
  icon={demand.mode === 'cold-start' ? <Lightbulb /> : <TrendingUp />}
  badge={demand.mode === 'cold-start' ? 'Initial Estimate' : demand.confidence}
  tone={demand.confidence === 'high' ? 'success' : 'warning'}
/>
```

Add "Pilot Production Recommendation" card for cold-start products:

```typescript
if (demand.mode === 'cold-start') {
  return (
    <article className="surface-card p-5 border-l-4 border-warning">
      <h3 className="font-display text-base font-semibold">Pilot Production Recommendation</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Since you don't have sales history yet, start with a small pilot batch to test your market assumptions.
      </p>
      <p className="mt-3 font-display text-2xl font-semibold">{demand.pilotBatchRecommendation} {product.unit}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        After this pilot, record your actual sales. The system will improve recommendations as you accumulate data.
      </p>
    </article>
  );
}
```

**C. Planner Integration** (`src/routes/planner.tsx`)

Show calculation breakdown for cold-start:

```typescript
if (demand.mode === 'cold-start') {
  return (
    <div className="surface-card p-5 bg-warning/5 border border-warning">
      <h3 className="font-display text-lg font-semibold">Calculation Breakdown</h3>
      <dl className="mt-3 space-y-2 text-sm">
        {demand.calculationSteps.map((step) => (
          <div key={step.step} className="flex justify-between">
            <dt className="text-muted-foreground">{step.step}</dt>
            <dd className="font-medium">{step.value} ({step.explanation})</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

### Phase 5: Learning Loop - Transition from Cold-Start

**Confidence Progression** as real sales data arrives:

```typescript
export function confidenceWithHistory(
  monthsOfData: number,
  hasMarketAssumptions: boolean
): 'low' | 'low-medium' | 'medium' | 'high' {
  if (monthsOfData === 0) return 'low';                    // No history (cold-start)
  if (monthsOfData === 1) return 'low';                    // 1 month
  if (monthsOfData === 2) return 'low-medium';             // 2 months early data
  if (monthsOfData >= 3 && monthsOfData < 6) return 'medium';  // 3-5 months
  return 'high';                                           // 6+ months
}
```

**Blend Function** for hybrid estimates (1-2 months history + market assumptions):

```typescript
function blendEstimates(
  historical: DemandEstimate,
  coldStart: ColdStartEstimate,
  weight: number = 0.5 // 50/50 blend for 1-2 months data
): DemandEstimate {
  const blendedEstimate = Math.round(
    (historical.estimate * weight) + (coldStart.estimate * (1 - weight))
  );
  
  return {
    ...historical,
    estimate: blendedEstimate,
    estimateLow: Math.round(blendedEstimate * 0.8),
    estimateHigh: Math.round(blendedEstimate * 1.2),
    confidence: 'medium', // Elevated from historical's low
    explanation: `Based on ${historical.monthsUsed} months of sales data (${historical.explanation}) and initial market estimate (${coldStart.explanation}). As more sales data accumulates, the forecast will become more precise.`,
  };
}
```

---

## FILES TO MODIFY

### 1. Database Migration (NEW)
**File**: `supabase/migrations/20260905_cold_start_demand.sql`
- Add columns to products table
- Add cold_start_estimates table (optional)

### 2. Engine Enhancement
**File**: `src/lib/ruralplan/engine.ts`
- Add ColdStartInput interface
- Add ColdStartEstimate interface (extends DemandEstimate)
- Add estimateDemandColdStart() function
- Add selectDemandMode() function
- Add estimateDemandAuto() function (master function)
- Add confidenceWithHistory() function
- Add blendEstimates() function

### 3. Types Update
**File**: `src/lib/ruralplan/types.ts`
- Update Product interface: add new optional fields
- Add ColdStartInput interface
- Update DemandEstimate to include mode and pilotBatchRecommendation

### 4. Product Form
**File**: `src/routes/products.tsx`
- Add "Market Assumptions" collapsible section
- Add fields: potential_customers, conversion_rate, purchase_frequency, etc.
- Add validation for these fields (only required if cold_start enabled)

### 5. Dashboard Update
**File**: `src/routes/dashboard.tsx`
- Change: `estimateDemand()` → `estimateDemandAuto()`
- Add "Initial Demand Estimate" card for cold-start products
- Add "Pilot Production Recommendation" card for new products

### 6. Planner Update
**File**: `src/routes/planner.tsx`
- Change: `estimateDemand()` → `estimateDemandAuto()`
- Add calculation breakdown display for cold-start
- Show pilot batch recommendation if available

### 7. Sales Page Enhancement
**File**: `src/routes/sales.tsx`
- Change: `estimateDemand()` → `estimateDemandAuto()`
- Show confidence progression message as history builds
- Add "Pilot Production Results" section showing pilot vs actual sales

### 8. Store Enhancement
**File**: `src/lib/ruralplan/store.tsx`
- Update addProduct() to save new fields
- Update updateProduct() to update new fields

---

## DATA MODEL ADDITIONS

### products table (existing + new columns)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| demand_mode | text | 'auto' | 'auto' \| 'historical' \| 'cold_start' |
| potential_customers | numeric | NULL | Optional, market assumption |
| conversion_rate | numeric | NULL | 0-100, market assumption |
| purchase_frequency | text | NULL | 'weekly' \| 'monthly' \| 'quarterly' \| 'seasonal' |
| avg_purchase_quantity | numeric | NULL | Average units per customer purchase |
| is_seasonal | boolean | false | Product is seasonal |
| season_start_month | integer | NULL | 1-12 (month number) |
| season_end_month | integer | NULL | 1-12 (month number) |
| selling_area | text | NULL | 'village' \| 'town' \| 'district' \| 'multiple' \| 'online' |

### Types Enhancement

```typescript
interface Product extends existing {
  demand_mode?: 'auto' | 'historical' | 'cold_start';
  potential_customers?: number;
  conversion_rate?: number;
  purchase_frequency?: 'weekly' | 'monthly' | 'quarterly' | 'seasonal';
  avg_purchase_quantity?: number;
  is_seasonal?: boolean;
  season_start_month?: number;
  season_end_month?: number;
  selling_area?: 'village' | 'town' | 'district' | 'multiple' | 'online';
}

interface DemandEstimate extends existing {
  mode?: 'historical' | 'cold-start' | 'hybrid';
  pilotBatchRecommendation?: number;
  calculationSteps?: Array<{ step: string; value: number; explanation: string }>;
}
```

---

## BACKWARD COMPATIBILITY

✅ **Fully Backward Compatible**:
- All new fields optional with sensible defaults
- Existing products continue using historical forecasting
- estimateDemandAuto() fallback to estimateDemand() when no market assumptions
- No changes to existing database structure (only additions)
- No breaking changes to UI components
- Existing RLS policies work as-is

✅ **No Changes To**:
- Authentication system
- Supabase connection
- User isolation / RLS
- Existing demand forecasting algorithm
- Production recommendations storage
- Dashboard/Planner core functionality

---

## TESTING SCENARIOS

| Test | New User | Product | Sales History | Expected |
|------|----------|---------|----------------|----------|
| 1 | Yes | New with market assumptions | None | Cold-start estimate, pilot recommendation, low confidence |
| 2 | Yes | New without market assumptions | None | Zero demand, prompt to add sales |
| 3 | Existing | 1-2 months old | 1-2 months | Hybrid estimate (blend historical + market) |
| 4 | Existing | 6+ months old | 6+ months | Historical forecast, high confidence |
| 5 | Any | Seasonal with dates set | 6+ months | Seasonal adjustment applied |
| 6 | User A | Product | Sales recorded | User B cannot see |
| 7 | Existing | Existing products | Existing sales | Zero changes, existing forecasting works |

---

## IMPLEMENTATION COMPLEXITY

**Low Risk**:
- ✅ Engine functions are self-contained
- ✅ No changes to core forecasting algorithm
- ✅ UI components are additive
- ✅ Database changes are additive only
- ✅ RLS unaffected
- ✅ Authentication unaffected

**Estimated Effort**:
- Database migration: 30 minutes
- Engine code: 2 hours
- UI components: 3 hours
- Testing: 2 hours
- **Total: ~7-8 hours**

---

**Status**: Investigation complete. Ready to implement.
