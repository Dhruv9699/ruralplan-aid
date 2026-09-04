# RuralPlan Database Schema Deployment Instructions

## Current Situation
- **New Supabase Project**: ytnjhctmpqhsuglojydx (configured in .env)
- **Authentication**: Working (users created successfully)
- **Database**: Tables missing (404 errors)
- **Symptom**: Application shows "unable to refresh RuralPlan data"

## Root Cause
The new Supabase project doesn't have the RuralPlan database schema. The migration files were stored locally but not applied to the project.

## Solution
Apply the complete schema migration to create all required tables, functions, triggers, policies, and grants.

---

## DEPLOYMENT METHOD 1: Supabase Dashboard (Recommended)

### Step 1: Access Supabase Dashboard
1. Go to https://app.supabase.com
2. Select project: **ytnjhctmpqhsuglojydx**
3. Click **SQL Editor** in the left sidebar

### Step 2: Create New Query
1. Click **+ New Query**
2. Give it a name: "RuralPlan Schema Setup"
3. Leave as "Blank query"

### Step 3: Copy and Paste SQL
1. Open this file: `supabase/migrations/20260904_complete_schema.sql`
2. Copy ALL the SQL content
3. Paste into the Supabase SQL editor

### Step 4: Execute
1. Click the **Run** button (or press Ctrl+Enter)
2. Wait for completion (~5-10 seconds)
3. You should see: "All tables created successfully"

### Step 5: Verify
1. Go to **Table Editor** in Supabase
2. You should see these tables:
   - profiles
   - products
   - sales_history
   - inventory
   - production_history
   - production_recommendations

---

## DEPLOYMENT METHOD 2: Supabase CLI

### Prerequisites
- Have Supabase CLI installed
- Have project credentials

### Step 1: Link Project (if not already linked)
```powershell
cd "c:\Users\Dhruv Joshi\Documents\Projects\ruralplan-aid"
supabase link --project-ref ytnjhctmpqhsuglojydx
```

### Step 2: Apply Migration
```powershell
supabase db push
```

This will:
- Read migration files from `supabase/migrations/`
- Apply any migrations not yet applied to the project
- Show progress and completion status

### Step 3: Verify
```powershell
supabase status
```

Should show all tables and their status.

---

## DEPLOYMENT METHOD 3: Using psql Directly

### Prerequisites
- PostgreSQL client tools installed
- Supabase connection string

### Step 1: Get Connection String
1. Go to Supabase Dashboard
2. Click **Project Settings** → **Database**
3. Copy the **Connection String** (URI)

### Step 2: Execute Migration
```powershell
# Set connection string
$connectionString = "postgresql://postgres:<password>@<host>:<port>/postgres"

# Run migration file
psql $connectionString -f "supabase\migrations\20260904_complete_schema.sql"
```

---

## VERIFICATION CHECKLIST

After deployment, verify the schema is complete:

### 1. Check Tables Exist
In Supabase Dashboard → Table Editor, you should see:
- ✅ profiles
- ✅ products
- ✅ sales_history
- ✅ inventory
- ✅ production_history
- ✅ production_recommendations

### 2. Check RLS Policies
For each table, click it and check **Authentication** section:
- ✅ RLS enabled
- ✅ Policy exists: "Users can manage their own X"

### 3. Check Triggers (SQL Editor)
Run this query to verify triggers exist:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

Expected results:
- update_profiles_updated_at (on profiles)
- update_products_updated_at (on products)
- update_inventory_updated_at (on inventory)

### 4. Test Application
1. Sign up new user in RuralPlan
2. Check browser console (F12)
3. Look for 404 errors on `/rest/v1/profiles`, `/rest/v1/products`, etc.
4. Expected: No more 404 errors
5. Dashboard should load user data

---

## SCHEMA VALIDATION QUERIES

Run these in Supabase SQL Editor to validate the schema:

### Check all tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected: 6 rows (all RuralPlan tables)

### Check RLS enabled
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'products', 'sales_history', 
                   'inventory', 'production_history', 'production_recommendations')
ORDER BY tablename;
```

Expected: All have `rowsecurity = true`

### Check policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected: 6 policies (one per table)

### Check foreign keys
```sql
SELECT
  constraint_name,
  table_name,
  column_name,
  foreign_table_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public'
  AND foreign_table_name IS NOT NULL
ORDER BY table_name;
```

Expected: 5 foreign key relationships

### Check triggers
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

Expected: 3 triggers (on profiles, products, inventory)

---

## WHAT THE MIGRATION DOES

### Creates Tables (6 total)
1. **profiles** - User account information
2. **products** - Product catalog per user
3. **sales_history** - Sales records
4. **inventory** - Raw materials/inventory items
5. **production_history** - Production batch records
6. **production_recommendations** - AI recommendations

### Creates Function (1)
- **update_updated_at_column()** - Auto-updates timestamps

### Creates Triggers (3)
- Automatic updated_at on profiles, products, inventory

### Creates RLS Policies (6)
- One per table ensuring users can only see their own data

### Creates Indexes (8)
- On foreign keys and frequently queried columns for performance

### Sets Grants
- Authenticated users can SELECT, INSERT, UPDATE, DELETE (via RLS)
- Service role has ALL permissions (bypasses RLS, server-side only)

---

## ROLLBACK (If Needed)

If something goes wrong, you can drop and recreate:

### Option 1: Drop All Tables (DESTRUCTIVE - loses data)
```sql
DROP TABLE IF EXISTS public.production_recommendations CASCADE;
DROP TABLE IF EXISTS public.production_history CASCADE;
DROP TABLE IF EXISTS public.sales_history CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
```

Then rerun the migration.

### Option 2: Use Git History (Non-destructive)
If you've already run the migration and made changes:
1. Check git history for original migration files
2. Apply any fixes to the migration file
3. Rerun the migration

---

## EXPECTED RESULTS AFTER DEPLOYMENT

### Application Functionality
✅ Users can sign up and create profiles
✅ Users can add products
✅ Users can record sales
✅ Users can manage inventory
✅ Users can log production records
✅ Users can view recommendations
✅ Dashboard loads without errors
✅ No 404 errors in browser console

### Data Isolation
✅ User A cannot see User B's products
✅ User A cannot modify User B's data
✅ RLS policies enforce automatically
✅ No manual permission checks needed

### Performance
✅ Queries are fast (indexes on foreign keys)
✅ Automatic timestamps work
✅ No N+1 query problems
✅ Cascade deletes work properly

### Data Integrity
✅ Products cannot exist without users
✅ Sales cannot exist without products
✅ Deleted users cascade delete all data
✅ Updated_at timestamps auto-update

---

## TROUBLESHOOTING

### Problem: 404 errors still appearing after deployment

**Solution**: 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh application (Ctrl+F5)
3. Wait 30 seconds and refresh again (CDN may need to update)
4. If still failing, check:
   - Tables actually exist in Supabase Table Editor
   - RLS policies are enabled
   - Your user is authenticated

### Problem: "Permission denied" errors

**Possible causes**:
- RLS policies not created
- User not authenticated
- Authenticated user role doesn't have grants

**Solution**:
1. Re-run the migration (it handles dropping/recreating policies)
2. Log out and log in again
3. Check browser Network tab for auth token in Authorization header

### Problem: "Foreign key violation" errors

**Possible causes**:
- Trying to insert product with non-existent user_id
- Trying to insert sales with non-existent product_id

**Solution**:
1. Verify user exists first (check profiles table)
2. Verify product exists and belongs to that user
3. Data integrity is working as designed

### Problem: "Column does not exist" errors

**Possible cause**: Migration didn't complete fully

**Solution**:
1. Run the validation queries above to check table structure
2. If columns missing, re-run the migration
3. Check SQL Editor logs for errors during execution

---

## SUCCESS CONFIRMATION

Your deployment is successful when:

1. ✅ No 404 errors in browser console
2. ✅ Dashboard loads with empty state (no errors)
3. ✅ Can create new product
4. ✅ Can view products in dashboard
5. ✅ Can log out and log back in
6. ✅ User data persists across sessions
7. ✅ Multiple users see isolated data

---

## NEXT STEPS

After successful deployment:

1. **Test signup** - Create test accounts
2. **Add test data** - Products, sales, inventory
3. **Verify isolation** - Login as different users
4. **Test features** - All app functionality
5. **Monitor logs** - No errors in Supabase logs
6. **Deploy to production** - Notify users

---

## SUPPORT

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs → Database
2. Run validation queries (see section above)
3. Review migration file for syntax
4. Contact support with error messages

---

**Status**: Ready for deployment

**Estimated Time**: 5-10 minutes total

**Risk Level**: Low (no production data yet, can rerun)

**Reversibility**: Can rerun if needed
