-- Extensions
create extension if not exists pgcrypto;

-- Enums
create type public.reservation_status as enum (
  'pending',
  'confirmed',
  'cancelled',
  'completed'
);

create type public.payment_status as enum (
  'unpaid',
  'partial',
  'paid',
  'refunded'
);

create type public.payment_provider as enum (
  'paypal'
);

create type public.payment_tx_status as enum (
  'created',
  'captured',
  'failed',
  'refunded'
);

create type public.user_role as enum (
  'admin',
  'ventas',
  'operaciones',
  'contabilidad',
  'lectura'
);

-- Profiles mapped to auth.users
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'lectura',
  created_at timestamptz not null default now()
);

-- Services (excursions, transfers, yachts)
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('excursion', 'traslado', 'yate')),
  base_price numeric(12,2) not null default 0,
  currency text not null default 'USD',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reservations
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null unique,
  status public.reservation_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',

  service_id uuid not null references public.services(id),
  service_date date not null,
  service_time time,

  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  hotel text,
  pickup_address text,
  notes text,

  adults int not null default 1 check (adults >= 0),
  children int not null default 0 check (children >= 0),
  infants int not null default 0 check (infants >= 0),

  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'USD',

  sales_channel text not null default 'web',
  created_by uuid references public.profiles(user_id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Payments (PayPal transactions)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  provider public.payment_provider not null default 'paypal',
  status public.payment_tx_status not null default 'created',

  paypal_order_id text unique,
  paypal_capture_id text unique,

  amount numeric(12,2) not null,
  currency text not null default 'USD',

  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Operating costs to calculate margins
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete set null,
  category text not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  expense_date date not null default now()::date,
  notes text,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now()
);

-- Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_reservation_code()
returns text
language plpgsql
as $$
declare
  v_code text;
begin
  v_code := 'DB-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
  return v_code;
end;
$$;

create or replace function public.fill_reservation_code()
returns trigger
language plpgsql
as $$
begin
  if new.reservation_code is null or length(trim(new.reservation_code)) = 0 then
    new.reservation_code := public.generate_reservation_code();
  end if;
  return new;
end;
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

-- Triggers
create trigger trg_services_updated_at
before update on public.services
for each row
execute function public.set_updated_at();

create trigger trg_reservations_updated_at
before update on public.reservations
for each row
execute function public.set_updated_at();

create trigger trg_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

create trigger trg_fill_reservation_code
before insert on public.reservations
for each row
execute function public.fill_reservation_code();

-- Reporting views
create or replace view public.v_income_daily as
select
  date_trunc('day', p.created_at)::date as day,
  p.currency,
  sum(case when p.status = 'captured' then p.amount else 0 end) as income
from public.payments p
group by 1,2;

create or replace view public.v_margin_by_reservation as
select
  r.id as reservation_id,
  r.reservation_code,
  r.total as reservation_total,
  coalesce(sum(case when p.status = 'captured' then p.amount else 0 end), 0) as paid_total,
  coalesce(sum(e.amount), 0) as total_expenses,
  coalesce(sum(case when p.status = 'captured' then p.amount else 0 end), 0) - coalesce(sum(e.amount), 0) as gross_margin
from public.reservations r
left join public.payments p on p.reservation_id = r.id
left join public.expenses e on e.reservation_id = r.id
group by r.id, r.reservation_code, r.total;

-- RLS
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.reservations enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

-- Staff read policies
create policy "staff can read profiles" on public.profiles
for select to authenticated
using (true);

create policy "staff can read services" on public.services
for select to authenticated
using (true);

create policy "staff can read reservations" on public.reservations
for select to authenticated
using (true);

create policy "staff can read payments" on public.payments
for select to authenticated
using (true);

create policy "staff can read expenses" on public.expenses
for select to authenticated
using (true);

-- Staff write policies by role
create policy "admins full profiles" on public.profiles
for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "staff can manage services" on public.services
for all to authenticated
using (public.current_user_role() in ('admin','ventas'))
with check (public.current_user_role() in ('admin','ventas'));

create policy "staff can manage reservations" on public.reservations
for all to authenticated
using (public.current_user_role() in ('admin','ventas','operaciones'))
with check (public.current_user_role() in ('admin','ventas','operaciones'));

create policy "staff can manage payments" on public.payments
for all to authenticated
using (public.current_user_role() in ('admin','ventas','contabilidad'))
with check (public.current_user_role() in ('admin','ventas','contabilidad'));

create policy "staff can manage expenses" on public.expenses
for all to authenticated
using (public.current_user_role() in ('admin','operaciones','contabilidad'))
with check (public.current_user_role() in ('admin','operaciones','contabilidad'));
