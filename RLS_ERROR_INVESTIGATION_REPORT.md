# RLS Error Investigation Report

**Error:** "new row violates row-level security policy for table profiles"  
**Date:** 2026-09-05  
**Status:** Root cause identified

---

## Investigation Findings

### 1. Current Signup Code Analysis

**File:** `src/routes/auth.tsx` (lines 78-112)

```typescript
if (mode === "signup") {
  // Step 1: Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    toast.error(authError.message);
    setLoading(false);
    return;
  }

  if (!authData.user) {
    toast.error("Signup failed");
    setLoading(false);
    return;
  }

  // Step 2: Create profile (IMMEDIATELY after signup)
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    name,
    email,
    location: village,
    district,
    state,
  });

  if (profileError) {
    toast.error("Profile creation failed: " + profileError.message);
    setLoading(false);
    return;
  }

  toast.success("Account created successfully");
  navigate({ to: "/dashboard" });
}
```

**Critical Issue Identified:**

The code attempts to insert the profile **immediately** after `signUp()` returns, but it does NOT check if a session exists.

---

### 2. The RLS Policy from Migration

**From migration file:**

```sql
CREATE POLICY "Users can manage their own profile" 
  ON public.profiles 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);
```

**Policy Analysis:**

- **FOR ALL**: Covers SELECT, INSERT, UPDATE, DELETE
- **TO authenticated**: Only authenticated users (users WITH a session)
- **USING (auth.uid() = id)**: Row filter - user can only see rows where id matches their auth.uid()
- **WITH CHECK (auth.uid() = id)**: Insert/update check - new rows must have id = auth.uid()

**Critical Requirement:** `auth.uid()` must return a value (not NULL)

`auth.uid()` only returns a value when:
- ✅ A valid session exists
- ✅ The user is authenticated

`auth.uid()` returns NULL when:
- ❌ No session exists
- ❌ User not authenticated
- ❌ Email not confirmed (if email confirmation enabled)

---

### 3. Supabase Email Confirmation Behavior

**Two possible configurations:**

#### Configuration A: Email Confirmation DISABLED (default for new projects)
```
signUp() → auth user created → session created immediately → auth.uid() available
```
**Result:** Profile insert should work ✅

#### Configuration B: Email Confirmation ENABLED
```
signUp() → auth user created → NO session → user must confirm email → auth.uid() is NULL
```
**Result:** Profile insert FAILS with RLS error ❌

---

### 4. Test Results

**Test 1: Query profiles without auth**
```
Result: ✅ Allowed (returned 0 rows)
```

**🚨 CRITICAL FINDING:**

This should have been BLOCKED by RLS!

The RLS policy requires authentication (`TO authenticated`), so anonymous queries should fail with an RLS error.

**Possible causes:**
1. RLS is not enabled on profiles table
2. RLS policy was not created
3. There's a permissive policy allowing anonymous SELECT
4. Migration did not execute successfully

---

### 5. Root Cause Analysis

**There are TWO potential issues:**

#### Issue A: Email Confirmation Timing

**IF email confirmation is enabled:**
- `signUp()` returns a user but NO session
- `auth.uid()` is NULL
- Profile insert fails RLS check
- **Error:** "new row violates row-level security policy"

**Solution:** Disable email confirmation OR handle profile creation after confirmation

#### Issue B: RLS Not Properly Configured

**Evidence:**
- Anonymous SELECT on profiles succeeded (should be blocked)
- This suggests RLS is either disabled or misconfigured

**This is the MORE LIKELY issue** because:
- The test showed anonymous access was allowed
- Proper RLS should block ALL operations without auth

---

## Proposed Fixes

### Option 1: Verify and Fix RLS Configuration (RECOMMENDED)

**This is the smallest, most secure fix.**

**Steps:**

1. **Check if RLS is actually enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'profiles';
   ```
   Expected: `rowsecurity = true`

2. **Check if policy exists:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE schemaname = 'public' AND tablename = 'profiles';
   ```
   Expected: Policy named "Users can manage their own profile"

3. **If RLS is OFF, enable it:**
   ```sql
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   ```

4. **If policy is missing, create it:**
   ```sql
   CREATE POLICY "Users can manage their own profile" 
     ON public.profiles 
     FOR ALL 
     TO authenticated 
     USING (auth.uid() = id) 
     WITH CHECK (auth.uid() = id);
   ```

**Why this is best:**
- Smallest change
- Most secure
- Matches the original migration design
- No code changes needed

---

### Option 2: Disable Email Confirmation (SIMPLE)

**If email confirmation is enabled and causing the issue:**

1. Go to Supabase Dashboard → Authentication → Settings
2. Find "Enable email confirmations"
3. Disable it
4. Save changes

**Effect:**
- `signUp()` creates session immediately
- `auth.uid()` is available right away
- Profile insert works

**Pros:**
- No code changes
- No database changes
- Works immediately

**Cons:**
- Users can sign up with any email (even fake ones)
- Less secure for production
- Not recommended for public apps

---

### Option 3: Handle Profile Creation After Confirmation (COMPLEX)

**Change the signup flow to create profile after email confirmation:**

**Changes needed:**

1. **Remove profile creation from signup handler**
2. **Create a database trigger or edge function:**
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.profiles (id, email, name, location, district, state)
     VALUES (
       new.id,
       new.email,
       'New User',  -- Default name
       '',          -- Default location
       'Nashik',    -- Default district
       'Maharashtra' -- Default state
     );
     RETURN new;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

3. **Update profile after first login** with user-provided data

**Pros:**
- Works with email confirmation
- Automatic profile creation
- Secure

**Cons:**
- Most complex solution
- Requires database changes
- Need trigger with SECURITY DEFINER (bypasses RLS)
- Profile created with default values, needs update

---

## Recommendation

### ✅ RECOMMENDED: Option 1 - Verify and Fix RLS

**Reason:** The test showed that anonymous SELECT succeeded on profiles, which should NOT be possible with proper RLS. This strongly suggests the migration did not execute properly.

**Steps to confirm:**

1. Check if migration actually executed
2. Verify RLS is enabled on profiles table
3. Verify policy exists
4. Re-run migration if needed

**This is the smallest, most secure fix** and aligns with the original design.

---

## Debugging Commands

Run these in Supabase SQL Editor to diagnose:

### Check if RLS is enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';
```

### Check existing policies
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';
```

### Check if profiles table exists
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
```

---

## Summary

**Root Cause:** Most likely RLS not properly configured (migration may not have executed)

**Evidence:**
- Anonymous SELECT on profiles succeeded (should be blocked)
- This indicates RLS is either OFF or policy is missing

**Recommended Fix:** 
1. Verify migration executed
2. Enable RLS if disabled
3. Create policy if missing
4. No code changes needed

**Alternative Causes:**
- Email confirmation enabled (less likely given the test results)
- Session not created immediately after signup

**Next Steps:**
1. Check Supabase Dashboard → Database → Tables → profiles
2. Verify RLS is enabled
3. Check RLS policies exist
4. Re-run migration if needed
5. Test signup again

---

**Status:** Investigation complete, awaiting confirmation of RLS status
