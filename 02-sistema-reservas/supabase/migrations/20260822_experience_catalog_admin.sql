create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('excursion', 'traslado', 'yate')),
  base_price numeric(12,2) not null default 0,
  currency text not null default 'USD',
  active boolean not null default true,
  capacity_total int not null default 50,
  cancellation_hours int not null default 24,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'ventas', 'operaciones', 'contabilidad', 'lectura')
  );
$$;

alter table public.services
add column if not exists offer_price numeric(12,2),
add column if not exists offer_label text,
add column if not exists offer_active boolean not null default false;

alter table public.services
drop constraint if exists services_offer_price_check;

alter table public.services
add constraint services_offer_price_check
check (offer_price is null or offer_price >= 0);

drop policy if exists "public can read active services" on public.services;
create policy "public can read active services" on public.services
for select
using (active = true);

drop policy if exists "staff can manage services" on public.services;
create policy "staff can manage services" on public.services
for all to authenticated
using (public.is_staff())
with check (public.is_staff());

insert into public.services (slug, title, category, base_price, currency, active)
values
  ('aguila-marina', 'Aguila Marina', 'yate', 49, 'USD', true),
  ('aicon-fly56', 'Aicon Fly 56', 'yate', 49, 'USD', true),
  ('atv-4wd', 'ATV 4WD', 'excursion', 49, 'USD', true),
  ('benetti', 'Benetti', 'yate', 49, 'USD', true),
  ('buggies', 'Buggies', 'excursion', 49, 'USD', true),
  ('cocobongo', 'Coco Bongo', 'excursion', 49, 'USD', true),
  ('cranchi-50-mediterranee', 'Cranchi 50 Mediterranee', 'yate', 49, 'USD', true),
  ('dorado-park', 'Dorado Park', 'excursion', 49, 'USD', true),
  ('excursiones', 'Excursiones', 'excursion', 49, 'USD', true),
  ('express-38', 'Express 38', 'yate', 49, 'USD', true),
  ('fairline-50', 'Fairline 50', 'yate', 49, 'USD', true),
  ('hacienda-park', 'Hacienda Park', 'excursion', 49, 'USD', true),
  ('higuey-city', 'Higuey City', 'excursion', 49, 'USD', true),
  ('isla-catalina', 'Isla Catalina', 'excursion', 49, 'USD', true),
  ('isla-catalina-buceo', 'Isla Catalina Buceo', 'excursion', 49, 'USD', true),
  ('isla-saona-clasica', 'Isla Saona Clasica', 'excursion', 49, 'USD', true),
  ('isla-saona-clÃ¡sica', 'Isla Saona Clásica', 'excursion', 49, 'USD', true),
  ('isla-saona-vip-4-playas', 'Isla Saona VIP 4 Playas', 'excursion', 49, 'USD', true),
  ('majesty-56', 'Majesty 56', 'yate', 49, 'USD', true),
  ('party-boat-en-punta-cana', 'Party Boat en Punta Cana', 'excursion', 49, 'USD', true),
  ('pesca', 'Pesca', 'yate', 49, 'USD', true),
  ('sacred-river', 'Sacred River', 'excursion', 49, 'USD', true),
  ('samana', 'Samana', 'excursion', 49, 'USD', true),
  ('santo-domingo', 'Santo Domingo', 'excursion', 49, 'USD', true),
  ('santo-domingo-privado', 'Santo Domingo Privado', 'excursion', 49, 'USD', true),
  ('sea-ray-42', 'Sea Ray 42', 'yate', 49, 'USD', true),
  ('tiara-38', 'Tiara 38', 'yate', 49, 'USD', true),
  ('tiara-50', 'Tiara 50', 'yate', 49, 'USD', true),
  ('traslados', 'Traslados', 'traslado', 49, 'USD', true),
  ('yates', 'Yates', 'yate', 49, 'USD', true)
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  currency = excluded.currency,
  active = excluded.active;