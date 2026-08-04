-- Staff role bootstrap helpers
-- Create an auth user first (Dashboard/Auth or API), then grant role with this function.

create or replace function public.grant_staff_role_by_email(
  p_email text,
  p_role public.user_role default 'admin',
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'No existe usuario auth para el email: %', p_email;
  end if;

  insert into public.profiles (user_id, full_name, role)
  values (v_user_id, nullif(trim(p_full_name), ''), p_role)
  on conflict (user_id)
  do update set
    full_name = coalesce(nullif(trim(p_full_name), ''), public.profiles.full_name),
    role = excluded.role;

  return v_user_id;
end;
$$;

comment on function public.grant_staff_role_by_email(text, public.user_role, text)
is 'Asigna/actualiza rol de backoffice para un usuario existente en auth.users usando su email.';

-- Example:
-- select public.grant_staff_role_by_email('admin@jactourspuntacana.com', 'admin', 'Administrador Jac Tours');
