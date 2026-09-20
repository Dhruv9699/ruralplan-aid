# RuralPlan AI - Supabase Authentication Implementation Plan

**Date:** 2026-09-05
**Branch:** `restore/old-ruralplan` (commit a2d097d)
**Status:** 📋 PLANNING - NOT YET IMPLEMENTED

---

## EXECUTIVE SUMMARY

This plan replaces the fake localStorage authentication with real Supabase Authentication while preserving all existing RuralPlan UI, routes, and production-planning features.

**Scope:**
- ✅ Add Supabase Auth (email/password)
- ✅ Add route protection
- ✅ Add profile management
- ✅ Add session persistence
- ✅ Remove localStorage auth
- ❌ No changes to production planning logic
- ❌ No changes to existing UI components
- ❌ No changes to calculation engines

---

## PART 1: FILES THAT NEED MODIFICATION

### Core Authentication Files (4 files - MAJOR CHANGES)

#### 1. `src/routes/auth.tsx` (176 lines → ~250 lines)
**Current:** Fake client-side validation only
**Changes:**
- Add async/await for Supabase calls
- Replace `signIn()` with `supabase.auth.signInWithPassword()`
- Replace fake signup with `supabase.auth.signUp()`
- Add error handling for invalid credentials
- Add loading states during auth operations
- Create profile record after signup
- Handle email verification flow
- Remove demo login button (or make it create real account)

**Risk Level:** HIGH - Complete rewrite of auth logic

#### 2. `src/lib/ruralplan/store.tsx` (120 lines → ~200 lines)
**Current:** localStorage-only state management
**Changes:**
- Remove fake `signIn()` function
- Add `supabase` client import
- Add async `signIn(email, password)` function
- Add async `signUp(email, password, profile)` function
- Add async `signOut()` function
- Add `getSession()` function
- Add `onAuthStateChange()` listener
- Keep existing product/sales/materials functions (no changes)
- Change data source from localStorage to Supabase queries (future)
- Add user_id to all data operations

**Risk Level:** HIGH - Core state management changes

#### 3. `src/routes/__root.tsx` (115 lines → ~180 lines)
**Current:** No auth middleware
**Changes:**
- Add Supabase client initialization
- Add auth state listener in RootComponent
- Add session context provider
- Add redirect logic for unauthenticated users
- Initialize session on mount
- Handle session refresh
- Propagate auth state to child routes

**Risk Level:** MEDIUM - Foundation changes

#### 4. `src/routes/dashboard.tsx` (267 lines → ~280 lines)
**Current:** No auth guard
**Changes:**
- Add `beforeLoad` function with auth check
- Add redirect to `/auth` if not authenticated
- Verify session before rendering
- No changes to dashboard UI or logic

**Risk Level:** LOW - Just add guard

### Protected Routes (9 files - MINOR CHANGES)

All routes need `beforeLoad` auth guard:

5. **`src/routes/products.tsx`** - Add beforeLoad
6. **`src/routes/sales.tsx`** - Add beforeLoad
7. **`src/routes/inventory.tsx`** - Add beforeLoad
8. **`src/routes/planner.tsx`** - Add beforeLoad
9. **`src/routes/production-history.tsx`** - Add beforeLoad
10. **`src/routes/weather.tsx`** - Add beforeLoad
11. **`src/routes/alerts.tsx`** - Add beforeLoad
12. **`src/routes/assistant.tsx`** - Add beforeLoad
13. **`src/routes/settings.tsx`** - Add beforeLoad + logout button

**Risk Level per file:** LOW - Same pattern for all

### New Files (4 files - CREATE NEW)

14. **`src/lib/supabase.ts`** (NEW - ~30 lines)
```typescript
// Supabase client initialization
// createClient() with URL and anon key
// Export singleton instance
```

15. **`src/lib/auth-utils.ts`** (NEW - ~80 lines)
```typescript
// requireAuth() - Route guard helper
// getSession() - Session checker
// redirectToAuth() - Redirect helper
// getUserProfile() - Profile fetcher
```

16. **`.env`** (NEW - ~5 lines)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

17. **`.env.example`** (NEW - ~5 lines)
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

### Configuration Files (2 files - MINOR CHANGES)

18. **`package.json`** - Add dependencies:
```json
"dependencies": {
  "@supabase/supabase-js": "^2.48.0",
  // ... existing deps
}
```

19. **`.gitignore`** - Add .env if not present:
```
.env
.env.local
```

### Type Definition Files (1 file - MINOR ADDITION)

20. **`src/lib/ruralplan/types.ts`** - Add auth types:
```typescript
export interface AuthSession {
  user: {
    id: string;
    email: string;
  };
  access_token: string;
}

export interface Profile {
  id: string; // ADD: Supabase user ID
  name: string;
  email: string;
  village: string;
  district: string;
  state: string;
}
```

### Optional Files (2 files - ENHANCE UX)

21. **`src/routes/auth/verify-email.tsx`** (NEW - Optional)
- Email verification landing page
- Shown after signup

22. **`src/routes/auth/reset-password.tsx`** (NEW - Optional)
- Password reset flow
- Can be added later

---

## PART 2: DATABASE CHANGES REQUIRED

### Supabase Database Schema

#### A. Tables to Create

**1. `profiles` table** (if not exists)

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  village TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT 'Nashik',
  state TEXT NOT NULL DEFAULT 'Maharashtra',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users';

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**2. Modify existing tables** (if they exist in old version - THEY DON'T)

Since the old version uses localStorage only, we need to CREATE all data tables:

```sql
-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  raw_material TEXT NOT NULL,
  unit TEXT NOT NULL,
  capacity_per_day NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  production_cost NUMERIC,
  shelf_life_days INTEGER NOT NULL DEFAULT 0,
  workers INTEGER NOT NULL DEFAULT 1,
  raw_per_unit NUMERIC NOT NULL DEFAULT 0,
  raw_unit TEXT NOT NULL DEFAULT 'kg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);

-- Sales history table
CREATE TABLE IF NOT EXISTS public.sales_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales_history(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales_history(date);

-- Materials/Inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  current_qty NUMERIC NOT NULL DEFAULT 0,
  required_qty NUMERIC NOT NULL DEFAULT 0,
  min_level NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);

-- Production history table
CREATE TABLE IF NOT EXISTS public.production_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  planned NUMERIC NOT NULL DEFAULT 0,
  actual NUMERIC NOT NULL DEFAULT 0,
  sold NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_user_id ON public.production_history(user_id);
CREATE INDEX IF NOT EXISTS idx_production_product_id ON public.production_history(product_id);
CREATE INDEX IF NOT EXISTS idx_production_date ON public.production_history(date);
```

#### B. Row-Level Security (RLS) Policies

**Enable RLS on all tables:**

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_history ENABLE ROW LEVEL SECURITY;
```

**Create RLS policies:**

```sql
-- Profiles: Users can only manage their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Products: Users can only see their own products
CREATE POLICY "Users can manage own products"
  ON public.products FOR ALL
  USING (auth.uid() = user_id);

-- Sales: Users can only see their own sales
CREATE POLICY "Users can manage own sales"
  ON public.sales_history FOR ALL
  USING (auth.uid() = user_id);

-- Inventory: Users can only see their own inventory
CREATE POLICY "Users can manage own inventory"
  ON public.inventory FOR ALL
  USING (auth.uid() = user_id);

-- Production: Users can only see their own production records
CREATE POLICY "Users can manage own production"
  ON public.production_history FOR ALL
  USING (auth.uid() = user_id);
```

#### C. Grants

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_history TO authenticated;
```

#### D. Database Migration File

Create: `supabase/migrations/YYYYMMDD_add_auth_tables.sql`

Contains all SQL above in proper order.

---

## PART 3: AUTHENTICATION FLOW

### A. Signup Flow

```
1. User visits /auth
2. Clicks "Sign Up" tab
3. Enters: name, email, password, village, district, state
4. Client validates (Zod schema)
5. Clicks "Create account" button
   ↓
6. Frontend calls: supabase.auth.signUp({ email, password })
   ↓
7. Supabase creates auth.users record
8. Supabase sends verification email (optional, configurable)
   ↓
9. On success, frontend creates profile:
   supabase.from('profiles').insert({
     id: user.id,
     name,
     email,
     village,
     district,
     state
   })
   ↓
10. Session created automatically by Supabase
11. Session stored in cookie/localStorage by Supabase SDK
12. Frontend updates React state with session
13. Navigate to /dashboard
14. Dashboard beforeLoad checks session → allowed
15. User sees dashboard
```

### B. Login Flow

```
1. User visits /auth
2. Clicks "Login" tab
3. Enters: email, password
4. Client validates format
5. Clicks "Login" button
   ↓
6. Frontend calls: supabase.auth.signInWithPassword({ email, password })
   ↓
7. Supabase validates credentials against auth.users
8. If invalid → Error returned → Show "Invalid email or password"
9. If valid → Session created
   ↓
10. Session stored by Supabase SDK
11. Fetch user profile:
    supabase.from('profiles').select('*').eq('id', user.id).single()
12. Update React state with profile
13. Navigate to /dashboard
14. Dashboard beforeLoad checks session → allowed
15. User sees dashboard
```

### C. Session Check Flow (Page Load)

```
1. User opens app / refreshes page
2. Root component mounts
3. Check session: supabase.auth.getSession()
   ↓
4a. If session exists:
    - Fetch profile from database
    - Update React state
    - Allow navigation
    ↓
4b. If no session:
    - Clear React state
    - If on protected route → redirect to /auth
    - If on public route → allow
```

### D. Logout Flow

```
1. User clicks "Logout" button (in settings or app-shell)
2. Call: supabase.auth.signOut()
   ↓
3. Supabase invalidates session
4. Clear React state (profile = null)
5. Navigate to /auth
6. Show login page
```

### E. Route Protection Flow

```
1. User tries to navigate to /dashboard
2. Router calls beforeLoad() function
3. beforeLoad checks: const session = await supabase.auth.getSession()
   ↓
4a. If session.data.session exists:
    - Allow navigation
    - Component renders
    ↓
4b. If no session:
    - Throw redirect({ to: '/auth' })
    - User redirected to login
    - Dashboard does NOT render
```

---

## PART 4: ROUTE PROTECTION STRATEGY

### A. Protection Helper Function

**File:** `src/lib/auth-utils.ts`

```typescript
import { redirect } from "@tanstack/react-router";
import { supabase } from "./supabase";

export async function requireAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw redirect({
      to: "/auth",
      search: {
        redirect: window.location.pathname,
      },
    });
  }
  
  return session;
}
```

### B. Apply to All Protected Routes

**Pattern for EVERY protected route:**

```typescript
// src/routes/dashboard.tsx
export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    await requireAuth();
  },
  component: Dashboard,
});
```

**Apply to:**
- /dashboard
- /products
- /sales
- /inventory
- /planner
- /production-history
- /weather
- /alerts
- /assistant
- /settings

### C. Public Routes (No Protection)

- `/` (landing page)
- `/auth` (login/signup)
- `/auth/verify-email` (optional)
- `/auth/reset-password` (optional)

### D. Redirect After Login

```typescript
// In auth.tsx after successful login:
const searchParams = new URLSearchParams(window.location.search);
const redirectTo = searchParams.get('redirect') || '/dashboard';
navigate({ to: redirectTo });
```

---

## PART 5: PROFILE CREATION STRATEGY

### A. Profile Creation Trigger

**When:** After successful `supabase.auth.signUp()`

**Where:** In `auth.tsx` submit() function

### B. Profile Creation Flow

```typescript
async function signUp(formData) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
  });
  
  if (authError) {
    toast.error(authError.message);
    return;
  }
  
  // 2. Create profile record
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user!.id, // Link to auth.users
      name: formData.name,
      email: formData.email,
      village: formData.village,
      district: formData.district,
      state: formData.state,
    });
  
  if (profileError) {
    toast.error("Profile creation failed");
    // Optionally: Delete auth user if profile fails
    // await supabase.auth.admin.deleteUser(authData.user!.id);
    return;
  }
  
  // 3. Success
  toast.success("Account created");
  navigate({ to: "/dashboard" });
}
```

### C. Profile Loading Strategy

**When:** After login or on app mount

**Where:** In root component or store

```typescript
async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error("Failed to load profile", error);
    return null;
  }
  
  return data;
}
```

### D. Profile Update Strategy

**When:** User changes settings

**Where:** In settings page

```typescript
async function updateProfile(updates: Partial<Profile>) {
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user.id;
  
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  
  if (error) {
    toast.error("Update failed");
    return;
  }
  
  toast.success("Profile updated");
}
```

---

## PART 6: MIGRATION RISKS

### High Risk Areas

#### 1. **Data Migration from localStorage to Database**
- **Risk:** Users on old version have data in localStorage
- **Impact:** Data loss if not migrated
- **Mitigation:**
  - Create migration utility to read localStorage
  - Prompt user to export data before upgrading
  - Or: Auto-import localStorage data on first login
  - Provide manual import/export feature

#### 2. **Session Management Changes**
- **Risk:** Active "sessions" become invalid
- **Impact:** All users logged out on upgrade
- **Mitigation:**
  - Expect all users to re-authenticate
  - Show clear message: "Please log in with new account"
  - This is acceptable for prototype → production migration

#### 3. **Email/Password Requirement**
- **Risk:** Old version didn't require real password
- **Impact:** Users don't have accounts yet
- **Mitigation:**
  - Treat as new signup for all users
  - Old localStorage data can be imported after signup

#### 4. **Breaking Changes to Store API**
- **Risk:** `signIn()` changes from sync to async
- **Impact:** All consumers need async/await
- **Mitigation:**
  - Update all calls to use async/await
  - Use try/catch for error handling
  - Test each route individually

### Medium Risk Areas

#### 5. **Environment Variable Management**
- **Risk:** .env not committed, keys not shared
- **Impact:** Dev environment broken without setup
- **Mitigation:**
  - Create .env.example with placeholders
  - Document setup steps clearly
  - Store keys securely (1Password, etc.)

#### 6. **Supabase Project Setup**
- **Risk:** No Supabase project exists yet
- **Impact:** Cannot test until project created
- **Mitigation:**
  - Create Supabase project first
  - Run migrations
  - Test auth flow in Supabase dashboard
  - Then connect to app

#### 7. **RLS Policy Errors**
- **Risk:** Incorrect policies block legitimate access
- **Impact:** Users can't see their own data
- **Mitigation:**
  - Test RLS policies thoroughly
  - Use Supabase SQL editor to verify
  - Check `auth.uid()` matches `user_id`

### Low Risk Areas

#### 8. **UI/UX Changes**
- **Risk:** Loading states, error messages differ
- **Impact:** User experience changes
- **Mitigation:**
  - Maintain consistent UI patterns
  - Use existing toast library (sonner)
  - Keep form layouts same

#### 9. **TypeScript Type Errors**
- **Risk:** Type mismatches after async changes
- **Impact:** Build errors
- **Mitigation:**
  - Update type definitions
  - Use strict TypeScript
  - Test builds frequently

#### 10. **Demo Data Handling**
- **Risk:** "Continue with demo data" button unclear
- **Impact:** Users confused about demo vs real
- **Mitigation:**
  - Remove demo button, or
  - Make it create a real demo account
  - Clearly label demo users

---

## PART 7: TESTING PLAN

### Phase 1: Unit Testing (Each Component)

#### A. Authentication Tests

**Test File:** `src/lib/auth-utils.test.ts`

```
✓ requireAuth() redirects when no session
✓ requireAuth() allows when session exists
✓ getUserProfile() fetches correct profile
✓ getUserProfile() returns null for missing profile
```

#### B. Store Tests

**Test File:** `src/lib/ruralplan/store.test.tsx`

```
✓ signIn() succeeds with valid credentials
✓ signIn() fails with invalid credentials
✓ signUp() creates user and profile
✓ signUp() fails with duplicate email
✓ signOut() clears session
✓ Session persists across page reload
```

### Phase 2: Integration Testing (Full Flows)

#### A. Signup Flow Test

```
1. Visit /auth
2. Click "Sign Up"
3. Enter valid data
4. Submit form
5. Verify: User created in auth.users
6. Verify: Profile created in profiles table
7. Verify: Session exists
8. Verify: Redirected to /dashboard
9. Verify: Dashboard shows user name
```

#### B. Login Flow Test

```
1. Visit /auth
2. Enter valid credentials
3. Submit
4. Verify: Session created
5. Verify: Profile loaded
6. Verify: Redirected to dashboard
7. Verify: User data displayed
```

#### C. Invalid Login Test

```
1. Visit /auth
2. Enter: invalid@test.com / wrongpassword
3. Submit
4. Verify: Error shown "Invalid email or password"
5. Verify: Not redirected
6. Verify: No session created
7. Verify: Still on /auth page
```

#### D. Route Protection Test

```
1. Logout (no session)
2. Try to visit /dashboard directly
3. Verify: Redirected to /auth
4. Verify: Dashboard NOT rendered
5. Login
6. Verify: Now can access /dashboard
```

#### E. Session Persistence Test

```
1. Login successfully
2. Navigate to /products
3. Refresh page
4. Verify: Still authenticated
5. Verify: Not redirected to /auth
6. Verify: Products page loads
```

#### F. Logout Flow Test

```
1. Login
2. Navigate to /settings
3. Click "Logout"
4. Verify: Session invalidated
5. Verify: Redirected to /auth
6. Try to visit /dashboard
7. Verify: Redirected to /auth
```

### Phase 3: Cross-Browser Testing

**Test in:**
- Chrome
- Firefox
- Safari
- Edge

**Verify:**
- Session cookies work
- LocalStorage works
- Redirects work
- Forms submit correctly

### Phase 4: User Isolation Testing

#### Multi-User Test

```
1. Create User A: alice@test.com
2. Create User B: bob@test.com
3. Login as Alice
4. Create product "Mango Pickle"
5. Logout
6. Login as Bob
7. Verify: Bob does NOT see Alice's product
8. Create product "Lemon Pickle"
9. Logout
10. Login as Alice
11. Verify: Alice sees only "Mango Pickle"
12. Verify: Alice does NOT see Bob's product
```

### Phase 5: Performance Testing

```
✓ Login completes in < 2 seconds
✓ Dashboard loads in < 3 seconds
✓ Route navigation is instant
✓ Session check is < 500ms
✓ No memory leaks on repeated login/logout
```

### Phase 6: Security Testing

```
✓ Cannot access /dashboard without session
✓ Cannot view another user's data
✓ Cannot modify another user's data
✓ SQL injection attempts blocked (RLS)
✓ XSS attempts sanitized
✓ CSRF tokens validated
✓ Password not visible in network tab
✓ Session token not accessible via JS (HTTP-only)
```

### Phase 7: Error Handling Testing

```
✓ Network errors show user-friendly message
✓ Invalid credentials show clear error
✓ Email format errors show immediately
✓ Password too short shows clear message
✓ Supabase down → graceful error
✓ Database errors don't crash app
```

### Testing Checklist

**Before Deployment:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Cross-browser testing complete
- [ ] User isolation verified
- [ ] Performance acceptable
- [ ] Security audit complete
- [ ] Error handling tested
- [ ] Documentation updated
- [ ] .env.example provided
- [ ] Migration guide written

---

## PART 8: IMPLEMENTATION ORDER

### Step 1: Setup (Day 1)
1. Create Supabase project
2. Run database migrations
3. Install @supabase/supabase-js
4. Create .env file with keys
5. Create src/lib/supabase.ts

### Step 2: Core Auth (Day 1-2)
6. Create src/lib/auth-utils.ts
7. Update src/lib/ruralplan/types.ts (add auth types)
8. Rewrite src/routes/auth.tsx (async signup/login)
9. Update src/lib/ruralplan/store.tsx (async methods)

### Step 3: Session Management (Day 2)
10. Update src/routes/__root.tsx (auth listener)
11. Add session context provider
12. Test session persistence

### Step 4: Route Protection (Day 2-3)
13. Add beforeLoad to /dashboard
14. Add beforeLoad to /products
15. Add beforeLoad to /sales
16. Add beforeLoad to /inventory
17. Add beforeLoad to /planner
18. Add beforeLoad to /production-history
19. Add beforeLoad to /weather
20. Add beforeLoad to /alerts
21. Add beforeLoad to /assistant
22. Add beforeLoad to /settings

### Step 5: Profile Management (Day 3)
23. Test profile creation on signup
24. Test profile loading on login
25. Add profile update in settings
26. Add logout button

### Step 6: Testing (Day 3-4)
27. Test signup flow
28. Test login flow
29. Test invalid credentials rejection
30. Test route protection
31. Test user isolation
32. Test logout
33. Test session persistence

### Step 7: Polish (Day 4)
34. Add loading states
35. Add error messages
36. Update UI feedback
37. Test all routes
38. Fix any bugs found

### Step 8: Documentation (Day 4)
39. Write setup instructions
40. Document environment variables
41. Create migration guide
42. Update README

---

## PART 9: ROLLBACK PLAN

### If Implementation Fails

**Option A: Revert to Current Version**
```bash
git checkout main
git reset --hard 3de7ca1  # Current version
```

**Option B: Revert to Old Fake Auth**
```bash
git checkout restore/old-ruralplan
git reset --hard a2d097d  # Old version
```

**Option C: Partial Rollback**
- Keep new auth code
- Disable route protection temporarily
- Fix issues one by one

### Backup Strategy

Before implementation:
1. Create branch: `backup/before-supabase-auth`
2. Commit all current work
3. Tag commit: `v1-fake-auth`
4. Push to remote

Then on new branch:
1. Create branch: `feature/supabase-auth`
2. Implement changes
3. Test thoroughly
4. Merge only when ready

---

## PART 10: SUCCESS CRITERIA

### Must Have (P0)

- ✅ Invalid credentials are rejected
- ✅ Valid credentials are accepted
- ✅ Users can signup with email/password
- ✅ Users can login with email/password
- ✅ Profile is created on signup
- ✅ Session persists across page reload
- ✅ Logout invalidates session
- ✅ Protected routes require authentication
- ✅ Users cannot access other users' data
- ✅ No localStorage used for authentication

### Should Have (P1)

- ✅ Loading states during auth operations
- ✅ Clear error messages
- ✅ Redirect after login to intended page
- ✅ Remember me functionality (Supabase default)
- ✅ Session expires after 1 hour (configurable)

### Nice to Have (P2)

- ⭕ Email verification flow
- ⭕ Password reset flow
- ⭕ Social login (Google, etc.)
- ⭕ MFA option
- ⭕ Account deletion

### Out of Scope

- ❌ Changes to production planning logic
- ❌ Changes to existing UI components
- ❌ New features unrelated to auth
- ❌ Database migrations for old data
- ❌ Billing/subscriptions
- ❌ Admin panel

---

## PART 11: ESTIMATED EFFORT

| Phase | Tasks | Time | Risk |
|-------|-------|------|------|
| **Setup** | Supabase project, migrations | 2 hours | Low |
| **Core Auth** | Rewrite auth.tsx, store.tsx | 6 hours | High |
| **Session** | Root component, context | 3 hours | Medium |
| **Routes** | Add beforeLoad to 10 routes | 2 hours | Low |
| **Profile** | Create, load, update profile | 2 hours | Low |
| **Testing** | All test scenarios | 8 hours | Medium |
| **Polish** | UI, errors, loading states | 3 hours | Low |
| **Docs** | Setup guide, migration docs | 2 hours | Low |
| **Total** | **~28 hours** | **3-4 days** | **Medium** |

---

## PART 12: DEPENDENCIES

### External Dependencies

1. **Supabase Project** - Must be created first
2. **Database Migrations** - Must run before app starts
3. **Environment Variables** - Must be configured
4. **Package Installation** - `@supabase/supabase-js` required

### Internal Dependencies

1. **Root Component** - Must initialize before routes
2. **Auth Utils** - Must exist before route protection
3. **Supabase Client** - Must be initialized first
4. **Profile Creation** - Must happen after auth user created

### No Dependencies On

- ❌ Production planning engines (unchanged)
- ❌ Calculation logic (unchanged)
- ❌ UI components (reused as-is)
- ❌ Existing routes structure (preserved)

---

## PART 13: QUESTIONS FOR USER APPROVAL

Before implementation, please confirm:

### Configuration
1. ✅ Do you have a Supabase project, or should we create one?
2. ✅ What should be the session timeout? (Default: 1 hour)
3. ✅ Should we require email verification? (Recommended: Yes)
4. ✅ Should we add password reset flow? (Recommended: Yes)

### Features
5. ✅ Keep "demo login" button or remove it?
6. ✅ Should demo data be imported automatically for new users?
7. ✅ Add social login (Google, etc.) now or later?
8. ✅ Add MFA option now or later?

### Data Migration
9. ✅ Should we build localStorage → database migration tool?
10. ✅ Or just treat this as fresh start (all users sign up new)?

### Testing
11. ✅ Can we test on staging before deploying to production?
12. ✅ Should we do beta testing with limited users first?

---

## CONCLUSION

This plan provides a comprehensive roadmap to replace fake localStorage authentication with real Supabase Authentication while preserving all existing RuralPlan functionality.

**Key Principles:**
- ✅ Security first (real auth, RLS, session management)
- ✅ User isolation (each user sees only their data)
- ✅ Preserve existing features (no changes to planning logic)
- ✅ Maintain UI/UX (same routes, same components)
- ✅ Testable (comprehensive test plan)
- ✅ Reversible (rollback plan in place)

**Estimated Timeline:** 3-4 days of focused development + testing

**Risk Level:** Medium (major changes to auth, but well-planned)

**Next Step:** Await user approval to proceed with implementation.

---

**Status:** 📋 PLAN COMPLETE - AWAITING APPROVAL

