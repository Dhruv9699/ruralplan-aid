# RuralPlan Database Schema Investigation Report

## Overview
Investigation of RuralPlan application to determine required Supabase database schema for the new project (ytnjhctmpqhsuglojydx).

## Current Issue
- Supabase project changed to: `ytnjhctmpqhsuglojydx`
- Authentication working: Users created successfully
- **Database tables missing**: 404 errors for `/rest/v1/profiles`, `/rest/v1/products`, `/rest/v1/production_history`
- Application cannot refresh RuralPlan data

## Investigation Method
1. Examined all database migrations: `supabase/migrations/`
2. Searched all TypeScript code for `supabase.from()` calls
3. Analyzed loadData(), CRUD operations, and data models
4. Documented complete schema requirements

---

## COMPLETE SCHEMA REQUIREMENTS

### 1. **profiles** Table
**Purpose**: Stores user profile information

**Schema**:
```sql
CREATE TABLE public.profiles (
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

**Columns**:
| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | Yes | - | Primary key, links to auth.users.id |
| name | text | Yes | - | User's full name |
| email | text | Yes | - | User's email address |
| location | text | No | '' | Village/location name |
| district | text | No | 'Nashik' | District |
| state | text | No | 'Maharashtra' | State |
| safety_stock_percent | numeric | No | 10 | Safety stock settings |
| planning_days | integer | No | 30 | Planning horizon days |
| created_at | timestamptz | No | now() | Timestamp |
| updated_at | timestamptz | No | now() | Timestamp |

**Primary Key**: `id` (uuid)

**Accessed By**:
- loadData(): SELECT all columns for user
- register(): UPSERT when creating account
- signIn(): UPSERT when updating profile
- saveSettings(): UPDATE settings columns

---

### 2. **products** Table
**Purpose**: Stores product information for each user

**Schema**:
```sql
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  raw_material_name text NOT NULL,
  unit text NOT NULL,
  production_capacity numeric NOT NULL DEFAULT 0,
  current_stock numeric NOT NULL DEFAULT 0,
  minimum_stock numeric NOT NULL DEFAULT 0,
  shelf_life numeric NOT NULL DEFAULT 0,
  production_cost numeric NOT NULL DEFAULT 0,
  workers integer NOT NULL DEFAULT 1,
  raw_per_unit numeric NOT NULL DEFAULT 0,
  raw_unit text NOT NULL DEFAULT 'kg',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Columns**:
| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | Yes | gen_random_uuid() | Primary key |
| user_id | uuid | Yes | - | Foreign key → profiles(id) |
| product_name | text | Yes | - | Product name |
| raw_material_name | text | Yes | - | Raw material needed |
| unit | text | Yes | - | Unit (kg, liter, etc) |
| production_capacity | numeric | No | 0 | Units per day |
| current_stock | numeric | No | 0 | Current inventory |
| minimum_stock | numeric | No | 0 | Minimum threshold |
| shelf_life | numeric | No | 0 | Days before expiry |
| production_cost | numeric | No | 0 | Cost per unit |
| workers | integer | No | 1 | Number of workers |
| raw_per_unit | numeric | No | 0 | Raw material per unit |
| raw_unit | text | No | 'kg' | Raw material unit |
| created_at | timestamptz | No | now() | Timestamp |
| updated_at | timestamptz | No | now() | Timestamp |

**Primary Key**: `id` (uuid)

**Foreign Keys**: 
- `user_id` → `profiles(id)` ON DELETE CASCADE

**Accessed By**:
- loadData(): SELECT all for user
- addProduct(): INSERT new product
- updateProduct(): UPDATE product fields
- removeProduct(): DELETE product
- loadDemo(): INSERT demo products

---

### 3. **sales_history** Table
**Purpose**: Records sales transactions

**Schema**:
```sql
CREATE TABLE public.sales_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  date date NOT NULL,
  quantity_sold numeric NOT NULL DEFAULT 0,
  location text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Columns**:
| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | Yes | gen_random_uuid() | Primary key |
| user_id | uuid | Yes | - | Foreign key → profiles(id) |
| product_id | uuid | Yes | - | Foreign key → products(id) |
| date | date | Yes | - | Sale date |
| quantity_sold | numeric | No | 0 | Quantity sold |
| location | text | No | '' | Sale location |
| created_at | timestamptz | No | now() | Timestamp |

**Primary Key**: `id` (uuid)

**Foreign Keys**:
- `user_id` → `profiles(id)` ON DELETE CASCADE
- `product_id` → `products(id)` ON DELETE CASCADE

**Accessed By**:
- loadData(): SELECT all for user
- addSale(): INSERT sale
- removeSale(): DELETE sale
- loadDemo(): INSERT demo sales

---

### 4. **inventory** Table
**Purpose**: Stores raw materials/inventory items

**Schema**:
```sql
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  current_quantity numeric NOT NULL DEFAULT 0,
  required_quantity numeric NOT NULL DEFAULT 0,
  minimum_quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Columns**:
| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | Yes | gen_random_uuid() | Primary key |
| user_id | uuid | Yes | - | Foreign key → profiles(id) |
| product_id | uuid | No | NULL | Foreign key → products(id) (optional) |
| material_name | text | Yes | - | Material name |
| current_quantity | numeric | No | 0 | Current stock |
| required_quantity | numeric | No | 0 | Required amount |
| minimum_quantity | numeric | No | 0 | Minimum threshold |
| unit | text | No | 'kg' | Unit |
| created_at | timestamptz | No | now() | Timestamp |
| updated_at | timestamptz | No | now() | Timestamp |

**Primary Key**: `id` (uuid)

**Foreign Keys**:
- `user_id` → `profiles(id)` ON DELETE CASCADE
- `product_id` → `products(id)` ON DELETE CASCADE (optional)

**Accessed By**:
- loadData(): SELECT all for user
- addMaterial(): INSERT material
- updateMaterial(): UPDATE material
- removeMaterial(): DELETE material
- loadDemo(): INSERT demo materials

---

### 5. **production_history** Table
**Purpose**: Records production batches and output

**Schema**:
```sql
CREATE TABLE public.production_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  date date NOT NULL,
  planned_quantity numeric NOT NULL DEFAULT 0,
  actual_quantity numeric NOT NULL DEFAULT 0,
  quantity_sold numeric NOT NULL DEFAULT 0,
  remaining_stock numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Columns**:
| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | Yes | gen_random_uuid() | Primary key |
| user_id | uuid | Yes | - | Foreign key → profiles(id) |
| product_id | uuid | Yes | - | Foreign key → products(id) |
| date | date | Yes | - | Production date |
| planned_quantity | numeric | No | 0 | Planned production |
| actual_quantity | numeric | No | 0 | Actual produced |
| quantity_sold | numeric | No | 0 | Amount sold |
| remaining_stock | numeric | No | 0 | Stock remaining |
| created_at | timestamptz | No | now() | Timestamp |

**Primary Key**: `id` (uuid)

**Foreign Keys**:
- `user_id` → `profiles(id)` ON DELETE CASCADE
- `product_id` → `products(id)` ON DELETE CASCADE

**Accessed By**:
- loadData(): SELECT all for user
- addProduction(): INSERT production record
- removeProduction(): DELETE production record
- loadDemo(): INSERT demo production

---

### 6. **production_recommendations** Table
**Purpose**: Stores AI-generated production recommendations

**Schema**:
```sql
CREATE TABLE public.production_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  expected_demand numeric NOT NULL DEFAULT 0,
  current_stock numeric NOT NULL DEFAULT 0,
  safety_stock numeric NOT NULL DEFAULT 0,
  recommended_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Columns**:
| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | Yes | gen_random_uuid() | Primary key |
| user_id | uuid | Yes | - | Foreign key → profiles(id) |
| product_id | uuid | Yes | - | Foreign key → products(id) |
| expected_demand | numeric | No | 0 | Expected demand |
| current_stock | numeric | No | 0 | Current inventory |
| safety_stock | numeric | No | 0 | Safety stock level |
| recommended_quantity | numeric | No | 0 | Recommendation |
| created_at | timestamptz | No | now() | Timestamp |

**Primary Key**: `id` (uuid)

**Foreign Keys**:
- `user_id` → `profiles(id)` ON DELETE CASCADE
- `product_id` → `products(id)` ON DELETE CASCADE

**Accessed By**:
- saveRecommendation(): INSERT recommendation
- clearDemo(): DELETE recommendations
- loadDemo(): INSERT demo recommendations

---

## DATABASE FUNCTIONS & TRIGGERS

### Function: `update_updated_at_column()`

**Purpose**: Automatically update `updated_at` timestamp on record modification

**Definition**:
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  new.updated_at = now();
  return new;
END;
$$;
```

### Triggers Using This Function

**1. Trigger on profiles**:
```sql
CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON public.profiles 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();
```

**2. Trigger on products**:
```sql
CREATE TRIGGER update_products_updated_at 
BEFORE UPDATE ON public.products 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();
```

**3. Trigger on inventory**:
```sql
CREATE TRIGGER update_inventory_updated_at 
BEFORE UPDATE ON public.inventory 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();
```

---

## ROW LEVEL SECURITY (RLS) POLICIES

All tables must have RLS enabled with the following policies:

### 1. profiles Table
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile" 
  ON public.profiles 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);
```

### 2. products Table
```sql
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own products" 
  ON public.products 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
```

### 3. sales_history Table
```sql
ALTER TABLE public.sales_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sales history" 
  ON public.sales_history 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
```

### 4. inventory Table
```sql
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own inventory" 
  ON public.inventory 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
```

### 5. production_history Table
```sql
ALTER TABLE public.production_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own production history" 
  ON public.production_history 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
```

### 6. production_recommendations Table
```sql
ALTER TABLE public.production_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own production recommendations" 
  ON public.production_recommendations 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
```

---

## GRANTS (Table Permissions)

For authenticated users (via RLS):
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_recommendations TO authenticated;
```

For service role (bypasses RLS, server-side only):
```sql
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.sales_history TO service_role;
GRANT ALL ON public.inventory TO service_role;
GRANT ALL ON public.production_history TO service_role;
GRANT ALL ON public.production_recommendations TO service_role;
```

---

## SUMMARY TABLE

| Table | Purpose | Has user_id? | Has RLS? | Notes |
|-------|---------|--------------|----------|-------|
| profiles | User data | Yes (PK) | Yes | Auth.users link |
| products | Product catalog | Yes (FK) | Yes | Cascade delete |
| sales_history | Sales records | Yes (FK) | Yes | Cascade delete |
| inventory | Raw materials | Yes (FK) | Yes | Cascade delete |
| production_history | Production logs | Yes (FK) | Yes | Cascade delete |
| production_recommendations | AI recommendations | Yes (FK) | Yes | Cascade delete |

---

## DATA ISOLATION MODEL

Each user can only see and modify their own data:

```
User A (auth.uid = uuid-a)
  ├── Profile (id = uuid-a)
  ├── Products (user_id = uuid-a) [5 products]
  ├── Sales (user_id = uuid-a) [50 sales]
  ├── Inventory (user_id = uuid-a) [8 materials]
  ├── Production (user_id = uuid-a) [30 records]
  └── Recommendations (user_id = uuid-a) [8 records]

User B (auth.uid = uuid-b)
  ├── Profile (id = uuid-b)
  ├── Products (user_id = uuid-b) [3 products]
  ├── Sales (user_id = uuid-b) [20 sales]
  ├── Inventory (user_id = uuid-b) [5 materials]
  ├── Production (user_id = uuid-b) [15 records]
  └── Recommendations (user_id = uuid-b) [5 records]

Note: Users CANNOT access each other's data due to RLS policies
```

---

## VERIFICATION CHECKLIST

- [x] All 6 tables identified from code analysis
- [x] All columns documented with types and defaults
- [x] All primary/foreign keys identified
- [x] Cascade delete relationships verified
- [x] All RLS policies documented
- [x] Timestamps and triggers documented
- [x] Data isolation model verified
- [x] Grants documented
- [x] No destructive operations needed

---

## NEXT STEPS

1. Create comprehensive SQL migration file with all tables, functions, triggers, policies, and grants
2. Execute migration on new Supabase project (ytnjhctmpqhsuglojydx)
3. Verify 404 errors are resolved
4. Test application data loading

---

**Status**: Investigation complete. Schema fully documented. Ready for migration.
