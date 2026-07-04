-- Phase 0 foundation: enums, auth/profiles, RBAC (built-in + custom roles),
-- activity logging, and a small set of Phase-0 shared masters.

-- ============ ENUMS ============
create type public.app_role as enum (
  'admin',
  'super_user',
  'production_manager',
  'quality_manager',
  'operator',
  'assistant',
  'data_entry',
  'store_incharge',
  'mixer_operator',
  'tooling_maintenance',
  'maintenance_operator',
  'hr_manager',
  'sales_manager',
  'accountant',
  'finance_manager'
);

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated using (auth.uid() = user_id);

create policy "Admins can insert profiles"
  on public.profiles for insert
  to authenticated with check (true);

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- SECURITY DEFINER helper, needed before it's referenced in policies below.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Authenticated users can view roles"
  on public.user_roles for select
  to authenticated using (true);

create policy "Admins manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.get_user_roles(_user_id uuid)
returns public.app_role[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(role), array[]::public.app_role[])
  from public.user_roles
  where user_id = _user_id
$$;

-- ============ AUTO-PROVISION PROFILE ON SIGNUP ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ ROLE PERMISSIONS (module x action grid per built-in role) ============
create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  module text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role, module)
);

alter table public.role_permissions enable row level security;

create policy "Authenticated users can view role permissions"
  on public.role_permissions for select
  to authenticated using (true);

create policy "Admins manage role permissions"
  on public.role_permissions for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Seed one row per (role, module). Admin gets full access; every other role
-- starts view-only on dashboard and gets tightened/loosened later from the
-- Role Management screen as each module actually ships.
do $$
declare
  r public.app_role;
  m text;
  modules text[] := array['dashboard','masters','hr','purchase','inventory','sales','accounting',
                           'production','quality','maintenance','mixing','tooling','finance','reports','settings'];
begin
  foreach r in array enum_range(null::public.app_role) loop
    foreach m in array modules loop
      insert into public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
      values (
        r, m,
        case when r = 'admin' then true else (m = 'dashboard') end,
        r = 'admin',
        r = 'admin',
        r = 'admin'
      )
      on conflict (role, module) do nothing;
    end loop;
  end loop;
end $$;

-- ============ PER-USER PERMISSION OVERRIDES ============
create table public.user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  can_view boolean,
  can_create boolean,
  can_edit boolean,
  can_delete boolean,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, module)
);

alter table public.user_permission_overrides enable row level security;

create policy "Users can view their own overrides"
  on public.user_permission_overrides for select
  to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins manage overrides"
  on public.user_permission_overrides for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ CUSTOM ROLES ============
create table public.custom_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  color text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_roles enable row level security;

create policy "Authenticated users can view custom roles"
  on public.custom_roles for select
  to authenticated using (true);

create policy "Admins manage custom roles"
  on public.custom_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.custom_role_permissions (
  id uuid primary key default gen_random_uuid(),
  custom_role_id uuid not null references public.custom_roles(id) on delete cascade,
  module text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (custom_role_id, module)
);

alter table public.custom_role_permissions enable row level security;

create policy "Authenticated users can view custom role permissions"
  on public.custom_role_permissions for select
  to authenticated using (true);

create policy "Admins manage custom role permissions"
  on public.custom_role_permissions for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.user_custom_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  custom_role_id uuid not null references public.custom_roles(id) on delete cascade,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, custom_role_id)
);

alter table public.user_custom_roles enable row level security;

create policy "Users can view their own custom role assignments"
  on public.user_custom_roles for select
  to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins manage custom role assignments"
  on public.user_custom_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ ACTIVITY LOGS ============
create table public.role_activity_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid references auth.users(id),
  target_user_id uuid references auth.users(id),
  role text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.role_activity_log enable row level security;

create policy "Admins can view role activity log"
  on public.role_activity_log for select
  to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Authenticated users can insert role activity log"
  on public.role_activity_log for insert
  to authenticated with check (true);

create or replace function public.log_role_activity(
  p_action text,
  p_actor_id uuid,
  p_target_user_id uuid default null,
  p_role text default null,
  p_details jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.role_activity_log (action, actor_id, target_user_id, role, details)
  values (p_action, p_actor_id, p_target_user_id, p_role, p_details)
  returning id into v_id;
  return v_id;
end;
$$;

create table public.user_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

alter table public.user_activity_log enable row level security;

create policy "Admins can view all activity"
  on public.user_activity_log for select
  to authenticated using (public.has_role(auth.uid(), 'admin') or auth.uid() = user_id);

create policy "Users can log their own activity"
  on public.user_activity_log for insert
  to authenticated with check (auth.uid() = user_id);

create or replace function public.get_user_activity_with_email(limit_count int default 200)
returns table (
  id uuid,
  user_id uuid,
  activity_type text,
  created_at timestamptz,
  user_agent text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.user_id, l.activity_type, l.created_at, l.user_agent, p.email
  from public.user_activity_log l
  left join public.profiles p on p.user_id = l.user_id
  order by l.created_at desc
  limit limit_count
$$;

-- ============ DEPARTMENTS + USER-DEPARTMENT SCOPING ============
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.departments enable row level security;

create policy "Authenticated users can view departments"
  on public.departments for select
  to authenticated using (true);

create policy "Admins manage departments"
  on public.departments for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.user_departments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, department_id)
);

alter table public.user_departments enable row level security;

create policy "Authenticated users can view user departments"
  on public.user_departments for select
  to authenticated using (true);

create policy "Admins manage user departments"
  on public.user_departments for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ SIMPLE REFERENCE MASTERS ============
create table public.units_of_measure (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.units_of_measure enable row level security;

create policy "Authenticated users can view UOM"
  on public.units_of_measure for select
  to authenticated using (true);

create policy "Admins manage UOM"
  on public.units_of_measure for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.delivery_terms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  delivery_cost_per_kg numeric not null default 0,
  packing_cost_per_kg numeric not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.delivery_terms enable row level security;

create policy "Authenticated users can view delivery terms"
  on public.delivery_terms for select
  to authenticated using (true);

create policy "Admins manage delivery terms"
  on public.delivery_terms for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.payment_terms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_adjust_pct numeric not null default 0,
  sort_order int not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.payment_terms enable row level security;

create policy "Authenticated users can view payment terms"
  on public.payment_terms for select
  to authenticated using (true);

create policy "Admins manage payment terms"
  on public.payment_terms for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
