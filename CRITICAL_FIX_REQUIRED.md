# ⚠️ CRITICAL FIX REQUIRED - Migration File

## Issue Found: 1 CRITICAL

### **profiles.id missing foreign key to auth.users(id)**

---

## THE PROBLEM

**Current migration file** (Line 12):
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  ...
);
```

**Problem**: 
- `profiles.id` is a primary key but does NOT reference `auth.users(id)`
- Missing: `ON DELETE CASCADE`
- **Consequence**: If auth user is deleted, orphaned profile remains (data integrity violation)

---

## THE FIX

**Line 12 must change from**:
```sql
  id uuid PRIMARY KEY,
```

**To**:
```sql
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
```

---

## EXACT SQL CHANGE

### File: `supabase/migrations/20260904_complete_schema.sql`

### Location: Lines 11-25 (profiles table)

### Current (WRONG):
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
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
```

### Corrected (FIXED):
```sql
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
```

### Change Summary
- **Line 12**: Add `REFERENCES auth.users(id) ON DELETE CASCADE` to the id column

---

## WHY THIS MATTERS

### Without the foreign key:
```
User deletes account
  ↓
DELETE FROM auth.users WHERE id = user_uuid
  ↓
✅ auth.users record deleted
✅ All related tables deleted (products, sales, etc.) via cascade
❌ profiles record REMAINS (orphaned)
```

### With the foreign key (CORRECT):
```
User deletes account
  ↓
DELETE FROM auth.users WHERE id = user_uuid
  ↓
✅ auth.users record deleted
✅ CASCADE triggers
✅ profiles record deleted
✅ All related tables deleted (products, sales, etc.)
✅ Complete data cleanup
```

---

## FRONTEND VERIFICATION

The frontend code confirms this is needed:

**Frontend links profiles to auth.users**:
```typescript
// store.tsx - register() function
const profileResult = await supabase.from("profiles").upsert({ 
  id: signUpResult.user.id,  // ← profiles.id = auth.users.id
  name: profile.name,
  ...
});
```

This confirms:
- ✅ profiles.id IS meant to match auth.users.id
- ✅ Foreign key relationship should exist
- ❌ Missing in current migration file

---

## OTHER REVIEWS - ALL PASSED ✅

| Check | Result | Notes |
|-------|--------|-------|
| Frontend creates profiles | ✅ YES | register() function creates it |
| Auth trigger needed | ✅ NO | Frontend handles it |
| Tables match frontend | ✅ YES | All columns correct |
| Columns match frontend | ✅ YES | All types correct |
| RLS policies correct | ✅ YES | All 6 policies isolate users |
| Destructive SQL | ✅ SAFE | No data deletion |
| Foreign key on profiles.id | ❌ NO | **THIS IS THE ISSUE** |

---

## DEPLOYMENT IMPACT

### Before Applying Fix
- ❌ Cannot deploy safely
- ❌ Data integrity violated
- ❌ Will cause issues later

### After Applying Fix
- ✅ Can deploy safely
- ✅ Data integrity maintained
- ✅ Cascade deletes work correctly
- ✅ All 404 errors resolved

---

## ACTION REQUIRED

**Apply the one-line fix to the migration file before deployment.**

**Time to fix**: < 1 minute

**Lines to change**: 1

---

## CONFIRMATION AFTER FIX

Run this query in Supabase SQL Editor after migration completes:

```sql
SELECT 
  constraint_name, 
  table_name, 
  column_name, 
  foreign_table_name,
  delete_rule
FROM information_schema.referential_constraints
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'id';
```

**Expected result**:
- Should return 1 row
- foreign_table_name = 'auth.users'
- delete_rule = 'CASCADE'

If you see this, the fix worked ✅

---

## NEXT STEPS

1. Apply the one-line fix (see above)
2. Deploy the corrected migration file
3. Run the verification query above
4. Proceed with application testing

---

**Status**: Ready to fix and deploy

**Issue Severity**: CRITICAL (data integrity)

**Fix Complexity**: Trivial (1-line change)
