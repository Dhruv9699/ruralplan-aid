# Cross-Account Data Isolation Investigation Report

**Issue:** Account B sees Account A's data after logout and login  
**Date:** 2026-09-05  
**Status:** 🚨 ROOT CAUSE IDENTIFIED

---

## Executive Summary

**🚨 CRITICAL FINDING:**

The application **DOES NOT USE SUPABASE DATABASE** for storing business data (products, sales, inventory, production).

**ALL business data is stored in browser localStorage**, which persists across account switches.

**Root Cause:** The app uses localStorage as its data store, and logout does NOT clear localStorage.

---

## Complete Data Flow Analysis

### 1. Products Data Flow

#### Where Written
**File:** `src/lib/ruralplan/store.tsx`  
**Storage:** `localStorage` with key `"ruralplan.data.v1"`  
**Method:** `addProduct()`, `updateProduct()`, `removeProduct()`

```typescript
addProduct: (p) => patch((d) => ({ ...d, products: [...d.products, { ...p, id: uid() }] }))
```

**No user_id included:** ❌  
**No Supabase write:** ❌  
**User isolation:** ❌ NONE

#### Where Read
**File:** `src/lib/ruralplan/store.tsx` (lines 51-55)

```typescript
useEffect(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setData({ ...createEmptyData(), ...(JSON.parse(raw) as RuralPlanData) });
  } catch {
    /* ignore corrupted storage */
  }
  setReady(true);
}, []);
```

**No user filter:** ❌  
**No Supabase query:** ❌  
**Reads from localStorage:** ✅ (shared across all users)

#### Usage in Components
**File:** `src/routes/products.tsx`

```typescript
const { products, addProduct, updateProduct, removeProduct } = useStore();
```

**Uses store directly:** ✅  
**No user_id check:** ❌  
**No Supabase fetch:** ❌

---

### 2. Sales History Data Flow

#### Where Written
**File:** `src/lib/ruralplan/store.tsx`  
**Storage:** localStorage (same key: `"ruralplan.data.v1"`)  
**Method:** `addSale()`, `removeSale()`

```typescript
addSale: (s) => patch((d) => ({ ...d, sales: [...d.sales, { ...s, id: uid() }] }))
```

**No user_id included:** ❌  
**No Supabase write:** ❌  
**User isolation:** ❌ NONE

#### Where Read
Same as products - from localStorage on mount

**No user filter:** ❌  
**No Supabase query:** ❌

---

### 3. Inventory (Materials) Data Flow

#### Where Written
**File:** `src/lib/ruralplan/store.tsx`  
**Storage:** localStorage  
**Method:** `addMaterial()`, `updateMaterial()`, `removeMaterial()`

```typescript
addMaterial: (m) => patch((d) => ({ ...d, materials: [...d.materials, { ...m, id: uid() }] }))
```

**No user_id included:** ❌  
**No Supabase write:** ❌  
**User isolation:** ❌ NONE

#### Where Read
Same as products - from localStorage on mount

**No user filter:** ❌  
**No Supabase query:** ❌

---

### 4. Production History Data Flow

#### Where Written
**File:** `src/lib/ruralplan/store.tsx`  
**Storage:** localStorage  
**Method:** `addProduction()`, `removeProduction()`

```typescript
addProduction: (r) => patch((d) => ({ ...d, production: [...d.production, { ...r, id: uid() }] }))
```

**No user_id included:** ❌  
**No Supabase write:** ❌  
**User isolation:** ❌ NONE

#### Where Read
Same as products - from localStorage on mount

**No user filter:** ❌  
**No Supabase query:** ❌

---

### 5. Production Recommendations Data Flow

**Status:** NOT IMPLEMENTED in the current application

The type exists in `types.ts` but no code writes or reads recommendations.

---

## Supabase Database Usage Analysis

### What IS Using Supabase

**ONLY authentication and profiles:**

#### File: `src/routes/auth.tsx`
```typescript
// Signup
await supabase.auth.signUp({ email, password });
await supabase.from("profiles").insert({
  id: authData.user.id,
  name, email, location, district, state
});
```

#### File: `src/lib/auth-utils.ts`
```typescript
// Get session
await supabase.auth.getSession();

// Get profile
await supabase.from("profiles").select("*").eq("id", userId).single();
```

### What is NOT Using Supabase

❌ products  
❌ sales_history  
❌ inventory  
❌ production_history  
❌ production_recommendations  

**None of the business data tables are being used.**

---

## LocalStorage Behavior Analysis

### Storage Key
```typescript
const STORAGE_KEY = "ruralplan.data.v1";
```

### What Gets Stored
**File:** `src/lib/ruralplan/store.tsx` (lines 62-67)

```typescript
useEffect(() => {
  if (!ready) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage full or unavailable */
  }
}, [data, ready]);
```

**Stored data structure:**
```typescript
{
  profile: Profile | null,
  products: Product[],
  sales: Sale[],
  materials: Material[],
  production: ProductionRecord[],
  settings: AppSettings
}
```

**ALL user data stored in ONE localStorage key** with NO user_id separation.

---

## Logout Behavior Analysis

### Current Logout Implementation
**File:** `src/routes/settings.tsx` (lines 136-142)

```typescript
<Button
  variant="ghost"
  className="h-12"
  onClick={async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate({ to: "/auth" });
  }}
>
  Log out
</Button>
```

**What happens:**
1. ✅ `supabase.auth.signOut()` - Clears Supabase auth session
2. ✅ Shows success toast
3. ✅ Navigates to /auth page

**What DOES NOT happen:**
❌ localStorage is NOT cleared  
❌ Store state is NOT reset  
❌ User data remains in browser

### Store's signOut Method
**File:** `src/lib/ruralplan/store.tsx` (line 82)

```typescript
signOut: () => patch((d) => ({ ...d, profile: null }))
```

**What it does:**
- Sets `profile` to `null`
- **Does NOT clear products, sales, materials, or production**
- **Does NOT clear localStorage**

**The store's signOut is NOT even called** during logout!

---

## Login Behavior Analysis

### What Happens on Login
**File:** `src/routes/auth.tsx` (lines 116-135)

```typescript
// Login flow
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  toast.error("Invalid email or password");
  setLoading(false);
  return;
}

if (!data.session) {
  toast.error("Login failed");
  setLoading(false);
  return;
}

toast.success("Welcome back");
navigate({ to: "/dashboard" });
```

**What happens:**
1. ✅ Supabase authentication succeeds
2. ✅ Session created
3. ✅ Navigate to dashboard

**What DOES NOT happen:**
❌ No data fetch from Supabase  
❌ No localStorage clear  
❌ No user-specific data loading  
❌ Old data from previous user persists

### Store Initialization
**File:** `src/lib/ruralplan/store.tsx` (lines 51-58)

```typescript
useEffect(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setData({ ...createEmptyData(), ...(JSON.parse(raw) as RuralPlanData) });
  } catch {
    /* ignore corrupted storage */
  }
  setReady(true);
}, []);
```

**Runs ONCE on mount**, regardless of which user is logged in.

**No user_id check.**

---

## The Complete Problem Flow

### Scenario: Account A → Logout → Account B

#### Step 1: Account A logs in
1. User A authenticates → Supabase session created
2. Store loads data from localStorage
3. If localStorage is empty, loads demo data
4. User A adds products, sales, etc.
5. All changes saved to localStorage

#### Step 2: User clicks Logout
1. `supabase.auth.signOut()` called → Supabase session cleared
2. Navigate to /auth page
3. **localStorage STILL contains Account A's data** ❌

#### Step 3: Account B logs in
1. User B authenticates → NEW Supabase session created
2. Store loads data from localStorage
3. **Loads Account A's data** because localStorage was never cleared ❌
4. User B sees Account A's products, sales, etc.

#### Step 4: Account B adds data
1. User B adds new products
2. **Mixed data** - Account A's old data + Account B's new data
3. All stored together in same localStorage key
4. **No user_id tracking at all**

---

## Root Cause Summary

### Primary Issue: localStorage-Based Architecture

The application was designed as a **client-side-only app** using localStorage, not a multi-user database-backed app.

**Evidence:**

1. **All business data stored in localStorage**
2. **No Supabase queries for business data**
3. **No user_id fields in data structures**
4. **No data fetching on login**
5. **No data clearing on logout**

### Secondary Issue: Logout Incomplete

The logout function only:
- Clears Supabase auth session
- Does NOT clear localStorage
- Does NOT reset store state

### Tertiary Issue: No User Association

Data structures have no user_id:

```typescript
export interface Product {
  id: string;
  name: string;
  // ... other fields
  // ❌ NO user_id field
}

export interface Sale {
  id: string;
  // ... other fields
  // ❌ NO user_id field
}
```

---

## Why RLS Cannot Help Here

**RLS (Row-Level Security) only works if:**
- Data is stored in Supabase database ❌ (currently using localStorage)
- Queries go through Supabase API ❌ (no queries at all)
- Tables have user_id columns ❌ (data structures lack user_id)

**Current situation:**
- RLS is configured correctly in database
- But the app never touches the database for business data
- RLS is completely bypassed by using localStorage

---

## Proposed Fix (Smallest Secure Solution)

### Option 1: Clear localStorage on Logout (TEMPORARY FIX - NOT RECOMMENDED)

**What:** Clear localStorage when user logs out

**Implementation:**
```typescript
// In settings.tsx logout handler
onClick={async () => {
  await supabase.auth.signOut();
  localStorage.removeItem('ruralplan.data.v1');  // Add this
  toast.success("Logged out");
  navigate({ to: "/auth" });
}}
```

**Pros:**
- Minimal code change (1 line)
- Prevents immediate cross-contamination
- Quick fix

**Cons:**
- ❌ Data is NOT saved to database (lost forever)
- ❌ Data cannot sync across devices
- ❌ Data lost if browser cache cleared
- ❌ Not a proper multi-user solution
- ❌ Each user starts fresh every time

**Verdict:** NOT RECOMMENDED (data loss)

---

### Option 2: Use Supabase Database (RECOMMENDED - PROPER FIX)

**What:** Migrate from localStorage to Supabase database

**This is the ONLY proper solution.**

**Changes required:**

#### 1. Add user_id to data structures
```typescript
export interface Product {
  id: string;
  user_id: string;  // ADD THIS
  name: string;
  // ... rest unchanged
}

// Same for Sale, Material, ProductionRecord
```

#### 2. Replace store methods with Supabase calls

**Example for products:**

```typescript
// OLD (localStorage)
addProduct: (p) => patch((d) => ({ ...d, products: [...d.products, { ...p, id: uid() }] }))

// NEW (Supabase)
addProduct: async (p) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  
  const { data, error } = await supabase.from('products').insert({
    user_id: session.user.id,
    product_name: p.name,
    raw_material_name: p.rawMaterial,
    unit: p.unit,
    // ... map all fields
  }).select().single();
  
  if (error) throw error;
  // Update React state with returned data
}
```

#### 3. Fetch data on login

```typescript
// After successful login
const { data: { session } } = await supabase.auth.getSession();

// Fetch user's data
const { data: products } = await supabase
  .from('products')
  .select('*')
  .eq('user_id', session.user.id);

const { data: sales } = await supabase
  .from('sales_history')
  .select('*')
  .eq('user_id', session.user.id);

// ... fetch all tables
// Load into store
```

#### 4. Clear localStorage completely

Remove all localStorage logic from store.tsx

**Files to modify:**
- `src/lib/ruralplan/store.tsx` - Complete rewrite
- `src/lib/ruralplan/types.ts` - Add user_id to all types
- `src/routes/products.tsx` - Handle async operations
- `src/routes/sales.tsx` - Handle async operations
- `src/routes/inventory.tsx` - Handle async operations
- `src/routes/production-history.tsx` - Handle async operations
- `src/routes/auth.tsx` - Load data after login

**Estimated changes:** ~500-800 lines across 7-10 files

**Pros:**
- ✅ Proper multi-user support
- ✅ Data persists across devices
- ✅ RLS enforces isolation
- ✅ Data backed up in cloud
- ✅ Can sync across devices
- ✅ Professional architecture

**Cons:**
- Significant code changes
- Need to handle async operations
- Need loading states
- Need error handling
- More complex than localStorage

**Verdict:** ✅ RECOMMENDED (proper solution)

---

## Summary

### Root Cause

**The application uses localStorage for ALL business data, with NO user_id tracking, NO database storage, and NO data clearing on logout.**

**This is a fundamental architecture issue, not a configuration bug.**

### Why It Happens

1. **All data in shared localStorage**
2. **Logout does NOT clear localStorage**
3. **Login does NOT fetch user-specific data**
4. **No user_id in data structures**
5. **RLS database is not being used at all**

### Immediate Impact

- ✅ RLS is configured correctly (but unused)
- ✅ Database schema is correct (but empty)
- ❌ Application architecture is wrong for multi-user
- ❌ Data isolation completely broken
- ❌ All users share the same localStorage

### Recommended Fix

**Migrate to Supabase database** (Option 2)

**Minimum changes:**
1. Add `user_id` to all data type interfaces
2. Replace localStorage store with Supabase queries
3. Fetch user-specific data on login
4. Remove localStorage entirely
5. Handle async operations in UI

**Estimated effort:** Medium (500-800 lines across 7-10 files)

**Security:** ✅ RLS will work correctly once database is used

---

**Status:** Investigation complete, root cause identified, fix proposed
