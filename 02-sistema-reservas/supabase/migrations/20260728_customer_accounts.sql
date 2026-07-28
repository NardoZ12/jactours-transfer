-- Customer account mapping
create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reservations
add column if not exists customer_auth_user_id uuid references auth.users(id) on delete set null;

create trigger trg_customer_profiles_updated_at
before update on public.customer_profiles
for each row
execute function public.set_updated_at();

alter table public.customer_profiles enable row level security;

create policy "staff can read customer profiles" on public.customer_profiles
for select to authenticated
using (public.current_user_role() in ('admin','ventas','operaciones','contabilidad','lectura'));

create policy "staff can manage customer profiles" on public.customer_profiles
for all to authenticated
using (public.current_user_role() in ('admin','ventas'))
with check (public.current_user_role() in ('admin','ventas'));

create policy "customer can read own profile" on public.customer_profiles
for select to authenticated
using (auth.uid() = auth_user_id);

create policy "customer can update own profile" on public.customer_profiles
for update to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);
