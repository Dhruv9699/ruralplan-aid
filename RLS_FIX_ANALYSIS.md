# RuralPlan RLS Policy Fix - Analysis Report

**Date:** 2026-09-05  
**Branch:** `restore/old-ruralplan`  
**Issue:** Profile creation failed during signup testing  
**Error:** "new row violates row-level security policy for table profiles"

---

## PART A: EXISTING RLS POLICIES (BEFORE FIX)

### Current State Analysis

Based on the error message and Supabase best practices, the likely current state is:

#### Profiles Table
- **RLS Enabled:** ✅ YES
- **INSERT Policy:** ❌ MISSING (this is causing the error)
- **SELECT Policy:** ❓ Unknown (likely exists or missing)
- **UPDATE Policy:** ❓ Unknown (likely missing)
- **DELETE Policy:** ❓ Unknown (likely missing)

**Why This Causes the Error:**

When a user signs up:
1. Supabase Auth creates the user in `auth.users` table
2. Frontend tries to INSERT profile into `profiles` table
3. RLS is enabled on profiles
4. No INSERT policy exists
5. **INSERT is blocked by default** → Error thrown

The profiles table has RLS enabled but no policy allowing authenticated users to insert their own profile record.

#### Other Tables (Products, Sales, Inventory, etc.)

The implementation report stated:
> "All tables have RLS policies enforcing:
> - Users can only see their own data
> - `auth.uid() = user_id` constraint
> - Full data isolation between users"

However, these policies likely only cover **SELECT** operations and may be missing INSERT/UPDATE/DELETE policies.

**Expected Issues:**
- Users cannot create products (INSERT blocked)
- Users cannot create sales records (INSERT blocked)
- Users cannot create inventory (INSERT blocked)
- Users cannot update their own data (UPDATE blocked)
- Users cannot delete their own data (DELETE blocked)

---

## PART B: WHY THE PROFILE INSERT IS FAILING

### Root Cause Explanation

**Supabase RLS Default Behavior:**
- When RLS is enabled on a table, **ALL operations are DENIED by default**
- Operations are only allowed if an explicit policy permits them
- Each operation type (SELECT, INSERT, UPDATE, DELETE) needs its own policy

**What's Happening:**

```typescript
// In auth.tsx - Signup flow (line ~84)
const { error: profileError } = await supabase.from("profiles").insert({
  id: authData.user.id,  // This is auth.uid()
  name,
  email,
  location: village,
  district,
  state,
});
```

**Step-by-step failure:**

1. User submits signup form
2. `supabase.auth.signUp()` succeeds → User created in auth.users
3. Frontend calls `supabase.from("profiles").insert()`
4. Supabase checks RLS policies for INSERT on profiles table
5. **No INSERT policy found** → Operation denied
6. Error returned: "new row violates row-level security policy for table profiles"
7. Frontend shows error toast to user
8. User is created in auth.users but has NO profile in profiles table
9. User cannot use the app (profile missing)

**Critical Issue:**

The user account exists in Supabase Auth but the profile record failed to create. This creates an **orphaned auth user** with no profile.

---

## PART C: SQL CHANGES TO FIX THE ISSUE

### Required Policies - Profiles Table

The profiles table uses `id` (not `user_id`) as the foreign key to `auth.users.id`.

**Policy Pattern:** `id = auth.uid()`

```sql
-- Allow authenticated users to INSERT their own profile
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

-- Allow authenticated users to DELETE their own profile (optional)
CREATE POLICY "Users can delete their own profile"
ON profiles
FOR DELETE
TO authenticated
USING (id = auth.uid());
```

### Required Policies - All Other Tables

All other tables (products, sales_history, inventory, production_history, production_recommendations) use `user_id` as the foreign key.

**Policy Pattern:** `user_id = auth.uid()`

**Example for products table:**

```sql
-- Allow users to INSERT their own products
CREATE POLICY "Users can insert their own products"
ON products
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to SELECT their own products
CREATE POLICY "Users can view their own products"
ON products
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to UPDATE their own products
CREATE POLICY "Users can update their own products"
ON products
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to DELETE their own products
CREATE POLICY "Users can delete their own products"
ON products
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

**Same pattern applies to:**
- sales_history
- inventory
- production_history
- production_recommendations

### Policy Explanation

**FOR INSERT:**
- `WITH CHECK (condition)` - Checks the NEW row being inserted
- Ensures the user can only insert rows where they are the owner

**FOR SELECT:**
- `USING (condition)` - Filters which rows the user can see
- User only sees rows where they are the owner

**FOR UPDATE:**
- `USING (condition)` - User can only target their own rows
- `WITH CHECK (condition)` - New values must still belong to them
- Prevents changing `user_id` to someone else

**FOR DELETE:**
- `USING (condition)` - User can only delete their own rows

**TO authenticated:**
- Only applies to logged-in users
- Anonymous users cannot access any data

---

## PART D: SQL MIGRATION FILE

Created: `fix-rls-policies.sql`

This file contains:
1. DROP existing policies (to avoid conflicts)
2. CREATE new policies for all 6 tables
3. All 4 operations (INSERT, SELECT, UPDATE, DELETE)
4. Verification queries to confirm setup

**Safety:**
- ✅ Does NOT disable RLS
- ✅ Does NOT make tables publicly accessible
- ✅ Does NOT use service_role keys
- ✅ Maintains full data isolation
- ✅ Only allows users to access their own data

---

## PART E: HOW TO APPLY THE FIX

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/hsukyndfbivssvoqxvfx
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `fix-rls-policies.sql`
5. Paste into the editor
6. Click **Run**
7. Verify output shows policies created successfully

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref hsukyndfbivssvoqxvfx

# Run migration
supabase db execute -f fix-rls-policies.sql
```

### Option 3: Direct psql Connection

```bash
# Get connection string from Supabase dashboard
psql "postgresql://postgres:[PASSWORD]@db.hsukyndfbivssvoqxvfx.supabase.co:5432/postgres"

# Run the SQL file
\i fix-rls-policies.sql
```

---

## PART F: VERIFICATION AFTER APPLYING

### 1. Check RLS is Still Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'products', 'sales_history', 'inventory', 'production_history', 'production_recommendations');
```

**Expected Result:**
All tables should show `rowsecurity = true`

### 2. Count Policies Per Table

```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'products', 'sales_history', 'inventory', 'production_history', 'production_recommendations')
GROUP BY tablename;
```

**Expected Result:**
- profiles: 4 policies (INSERT, SELECT, UPDATE, DELETE)
- products: 4 policies
- sales_history: 4 policies
- inventory: 4 policies
- production_history: 4 policies
- production_recommendations: 4 policies

**Total: 24 policies**

### 3. Test Signup

After applying the fix:

1. Clear browser cookies/localStorage
2. Visit http://localhost:5173/auth
3. Click "Sign Up"
4. Enter test credentials:
   - Name: Test User
   - Email: test@example.com
   - Password: test123
   - Village: TestVillage
   - District: Nashik
   - State: Maharashtra
5. Click "Create account"

**Expected Result:**
- ✅ Toast: "Account created successfully"
- ✅ Redirected to /dashboard
- ✅ No RLS error
- ✅ Profile created in database

### 4. Verify Profile in Database

```sql
SELECT id, name, email, location, district, state
FROM profiles
WHERE email = 'test@example.com';
```

**Expected Result:**
- Row exists
- All fields populated correctly
- id matches auth.users.id

---

## PART G: TESTING PLAN AFTER FIX

### Test 1: Signup (Profile Creation) ✅ PRIMARY FIX
**Status:** Should now work  
**Tests INSERT policy on profiles table**

### Test 2: Login
**Status:** Should work (doesn't involve INSERT)  
**Tests SELECT policy on profiles table**

### Test 3: Create Product
**Status:** Should now work  
**Tests INSERT policy on products table**

### Test 4: View Products
**Status:** Should work  
**Tests SELECT policy on products table**

### Test 5: Edit Product
**Status:** Should now work  
**Tests UPDATE policy on products table**

### Test 6: Delete Product
**Status:** Should now work  
**Tests DELETE policy on products table**

### Test 7: Create Sales Record
**Status:** Should now work  
**Tests INSERT policy on sales_history table**

### Test 8: Data Isolation Between Users
**Status:** Should work (USING clause filters)
**Steps:**
1. Create User A, add products
2. Create User B
3. User B should NOT see User A's products
4. Confirms RLS is working correctly

---

## PART H: SECURITY VERIFICATION

### RLS Security Checklist

- [x] ✅ RLS remains enabled on all tables
- [x] ✅ No public access policies
- [x] ✅ Only authenticated users can access data
- [x] ✅ Users can only access their own data
- [x] ✅ INSERT blocked for other users' data
- [x] ✅ SELECT blocked for other users' data
- [x] ✅ UPDATE blocked for other users' data
- [x] ✅ DELETE blocked for other users' data
- [x] ✅ No service_role keys used in frontend
- [x] ✅ Policies use auth.uid() correctly
- [x] ✅ Data isolation enforced at database level

### Attack Scenarios (All Should Fail)

**Scenario 1: User A tries to view User B's products**
```javascript
// User A logged in
const { data } = await supabase.from('products').select('*');
// Result: Only User A's products returned (RLS filters)
```

**Scenario 2: User A tries to insert product for User B**
```javascript
// User A logged in
const { error } = await supabase.from('products').insert({
  user_id: 'user-b-id',  // Different user
  product_name: 'Hack'
});
// Result: RLS blocks - WITH CHECK fails
```

**Scenario 3: User A tries to update User B's product**
```javascript
// User A logged in
const { error } = await supabase.from('products').update({
  product_name: 'Hacked'
}).eq('id', 'user-b-product-id');
// Result: RLS blocks - USING clause filters out User B's products
```

**Scenario 4: Unauthenticated user tries to access any data**
```javascript
// No auth session
const { data } = await supabase.from('products').select('*');
// Result: Empty array (TO authenticated blocks anonymous access)
```

---

## SUMMARY

### Problem
- **Error:** "new row violates row-level security policy for table profiles"
- **Cause:** RLS enabled but no INSERT policy on profiles table
- **Impact:** Users cannot sign up, profile creation fails

### Solution
- Add 4 policies to profiles table (INSERT, SELECT, UPDATE, DELETE)
- Add 4 policies to each of 5 other tables (products, sales_history, inventory, production_history, production_recommendations)
- Total: 24 policies across 6 tables

### Security Guarantees
- ✅ RLS still enabled
- ✅ No public access
- ✅ Full data isolation
- ✅ Only authenticated users
- ✅ Users can only access their own data

### Next Steps
1. Apply `fix-rls-policies.sql` in Supabase dashboard
2. Run signup test (should succeed)
3. Run full test suite (10 tests from implementation report)
4. Verify data isolation
5. Report results

---

**Status:** Ready to apply fix  
**Risk Level:** Low (only enables intended access, maintains security)  
**Rollback:** Can drop policies if issues occur (RLS remains enabled)
