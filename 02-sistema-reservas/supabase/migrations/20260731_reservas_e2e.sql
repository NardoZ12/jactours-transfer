-- E2E reservation flow + operations + financial base

-- Add missing status for operation control
do $$
begin
  begin
    alter type public.reservation_status add value 'no_show';
  exception
    when duplicate_object then null;
  end;
end
$$;

-- Lead pipeline stage
create type public.lead_stage as enum (
  'nuevo',
  'contactado',
  'cotizado',
  'reservado',
  'perdido'
);

-- Assignment resource types
create type public.assignment_resource_type as enum (
  'vehiculo',
  'chofer',
  'embarcacion',
  'guia'
);

-- Reservation customer action types
create type public.customer_action_type as enum (
  'cancelacion',
  'reprogramacion'
);

alter table public.services
add column if not exists capacity_total int not null default 50,
add column if not exists cancellation_hours int not null default 24;

alter table public.reservations
add column if not exists lead_stage public.lead_stage not null default 'nuevo',
add column if not exists extras_amount numeric(12,2) not null default 0,
add column if not exists tax_amount numeric(12,2) not null default 0,
add column if not exists commission_amount numeric(12,2) not null default 0,
add column if not exists grand_total numeric(12,2) not null default 0,
add column if not exists deposit_required numeric(12,2) not null default 0,
add column if not exists amount_paid numeric(12,2) not null default 0,
add column if not exists amount_due numeric(12,2) not null default 0,
add column if not exists payment_due_mode text not null default 'total' check (payment_due_mode in ('deposito','total')),
add column if not exists customer_token text unique,
add column if not exists cancelled_at timestamptz,
add column if not exists cancellation_reason text,
add column if not exists rescheduled_from_id uuid references public.reservations(id) on delete set null,
add column if not exists no_show boolean not null default false,
add column if not exists last_incident text;

-- Stable token for status page lookups without login
update public.reservations
set customer_token = substring(replace(gen_random_uuid()::text, '-', '') from 1 for 20)
where customer_token is null;

alter table public.reservations
alter column customer_token set default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 20);

create table if not exists public.reservation_extras (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  code text,
  title text not null,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.service_inventory_slots (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  service_date date not null,
  service_time time not null default '00:00:00',
  unit_key text not null default 'general',
  capacity int not null check (capacity >= 0),
  reserved int not null default 0 check (reserved >= 0 and reserved <= capacity),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service_id, service_date, service_time, unit_key)
);

create table if not exists public.reservation_assignments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  resource_type public.assignment_resource_type not null,
  resource_name text not null,
  resource_id text,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(user_id),
  notes text
);

create table if not exists public.reservation_customer_actions (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  action_type public.customer_action_type not null,
  old_service_date date,
  old_service_time time,
  new_service_date date,
  new_service_time time,
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(user_id)
);

create table if not exists public.reservation_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  event_type text not null,
  old_value text,
  new_value text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(user_id)
);

create index if not exists idx_reservations_service_day on public.reservations(service_date);
create index if not exists idx_reservations_lead_stage on public.reservations(lead_stage);
create index if not exists idx_reservations_customer_email on public.reservations(customer_email);
create index if not exists idx_inventory_slots_lookup on public.service_inventory_slots(service_id, service_date, service_time);

create trigger trg_inventory_slots_updated_at
before update on public.service_inventory_slots
for each row
execute function public.set_updated_at();

-- Financial recomputation helper
create or replace function public.recompute_reservation_financials(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grand_total numeric(12,2);
  v_paid numeric(12,2);
  v_status public.payment_status;
begin
  select grand_total into v_grand_total
  from public.reservations
  where id = p_reservation_id;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.payments
  where reservation_id = p_reservation_id
    and status = 'captured';

  if v_paid <= 0 then
    v_status := 'unpaid';
  elsif v_paid < coalesce(v_grand_total, 0) then
    v_status := 'partial';
  elsif v_grand_total > 0 then
    v_status := 'paid';
  else
    v_status := 'unpaid';
  end if;

  update public.reservations
  set
    amount_paid = v_paid,
    amount_due = greatest(coalesce(v_grand_total, 0) - v_paid, 0),
    payment_status = v_status,
    status = case
      when v_status in ('partial', 'paid') and status = 'pending' then 'confirmed'
      else status
    end
  where id = p_reservation_id;
end;
$$;

create or replace view public.v_dashboard_kpis as
select
  now()::date as today,
  coalesce((
    select sum(p.amount)
    from public.payments p
    where p.status = 'captured'
      and p.created_at::date = now()::date
  ), 0) as ingresos_hoy,
  coalesce((
    select sum(p.amount)
    from public.payments p
    where p.status = 'captured'
      and date_trunc('week', p.created_at) = date_trunc('week', now())
  ), 0) as ingresos_semana,
  coalesce((
    select sum(p.amount)
    from public.payments p
    where p.status = 'captured'
      and date_trunc('month', p.created_at) = date_trunc('month', now())
  ), 0) as ingresos_mes,
  (select count(*) from public.reservations where status = 'pending') as reservas_pendientes,
  (select count(*) from public.reservations where status = 'confirmed') as reservas_confirmadas,
  (select count(*) from public.reservations where status = 'cancelled') as reservas_canceladas,
  coalesce((
    select avg(r.grand_total)
    from public.reservations r
    where r.status in ('confirmed','completed')
  ), 0) as ticket_promedio;

alter table public.reservation_extras enable row level security;
alter table public.service_inventory_slots enable row level security;
alter table public.reservation_assignments enable row level security;
alter table public.reservation_customer_actions enable row level security;
alter table public.reservation_events enable row level security;

create policy "staff can read reservation extras" on public.reservation_extras
for select to authenticated
using (true);

create policy "staff can manage reservation extras" on public.reservation_extras
for all to authenticated
using (public.current_user_role() in ('admin','ventas','operaciones'))
with check (public.current_user_role() in ('admin','ventas','operaciones'));

create policy "staff can read inventory slots" on public.service_inventory_slots
for select to authenticated
using (true);

create policy "staff can manage inventory slots" on public.service_inventory_slots
for all to authenticated
using (public.current_user_role() in ('admin','operaciones'))
with check (public.current_user_role() in ('admin','operaciones'));

create policy "staff can read assignments" on public.reservation_assignments
for select to authenticated
using (true);

create policy "staff can manage assignments" on public.reservation_assignments
for all to authenticated
using (public.current_user_role() in ('admin','operaciones'))
with check (public.current_user_role() in ('admin','operaciones'));

create policy "staff can read customer actions" on public.reservation_customer_actions
for select to authenticated
using (true);

create policy "staff can create customer actions" on public.reservation_customer_actions
for insert to authenticated
with check (public.current_user_role() in ('admin','ventas','operaciones'));

create policy "staff can read events" on public.reservation_events
for select to authenticated
using (true);

create policy "staff can write events" on public.reservation_events
for insert to authenticated
with check (public.current_user_role() in ('admin','ventas','operaciones','contabilidad'));
