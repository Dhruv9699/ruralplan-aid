create table public.profiles (
  id uuid primary key,
  name text not null,
  email text not null,
  location text not null default '',
  district text not null default 'Nashik',
  state text not null default 'Maharashtra',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users can manage their own profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_name text not null,
  raw_material_name text not null,
  unit text not null,
  production_capacity numeric not null default 0,
  current_stock numeric not null default 0,
  minimum_stock numeric not null default 0,
  shelf_life numeric not null default 0,
  workers integer not null default 1,
  raw_per_unit numeric not null default 0,
  raw_unit text not null default 'kg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Users can manage their own products" on public.products for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.sales_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  date date not null,
  quantity_sold numeric not null default 0,
  location text not null default '',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.sales_history to authenticated;
grant all on public.sales_history to service_role;
alter table public.sales_history enable row level security;
create policy "Users can manage their own sales history" on public.sales_history for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  material_name text not null,
  current_quantity numeric not null default 0,
  required_quantity numeric not null default 0,
  minimum_quantity numeric not null default 0,
  unit text not null default 'kg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.inventory to authenticated;
grant all on public.inventory to service_role;
alter table public.inventory enable row level security;
create policy "Users can manage their own inventory" on public.inventory for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.production_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  date date not null,
  planned_quantity numeric not null default 0,
  actual_quantity numeric not null default 0,
  quantity_sold numeric not null default 0,
  remaining_stock numeric not null default 0,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.production_history to authenticated;
grant all on public.production_history to service_role;
alter table public.production_history enable row level security;
create policy "Users can manage their own production history" on public.production_history for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.production_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  expected_demand numeric not null default 0,
  current_stock numeric not null default 0,
  safety_stock numeric not null default 0,
  recommended_quantity numeric not null default 0,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.production_recommendations to authenticated;
grant all on public.production_recommendations to service_role;
alter table public.production_recommendations enable row level security;
create policy "Users can manage their own production recommendations" on public.production_recommendations for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger update_products_updated_at before update on public.products for each row execute function public.update_updated_at_column();
create trigger update_inventory_updated_at before update on public.inventory for each row execute function public.update_updated_at_column();