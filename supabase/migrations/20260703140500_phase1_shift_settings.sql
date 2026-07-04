-- Shift settings: named working shifts (day/night) with timing rules.
-- Used by HR attendance rules now; production hourly entry reuses it later.
create table public.shift_settings (
  id uuid primary key default gen_random_uuid(),
  shift_name text not null unique,
  display_name text,
  color text,
  start_hour int not null default 8,
  start_minute int not null default 0,
  end_hour int not null default 20,
  end_minute int not null default 0,
  grace_minutes int not null default 15,
  lunch_minutes int not null default 60,
  standard_hours numeric not null default 8,
  ot_threshold_hours numeric not null default 8,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.shift_settings enable row level security;

create policy "shift_settings_select_authenticated"
  on public.shift_settings for select to authenticated using (true);

create policy "shift_settings_write_admin_or_hr"
  on public.shift_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create trigger trg_shift_settings_updated_at
  before update on public.shift_settings
  for each row execute function public.update_updated_at_column();

insert into public.shift_settings (shift_name, display_name, color, start_hour, start_minute, end_hour, end_minute, standard_hours, ot_threshold_hours)
values
  ('day',   'Day Shift',   'amber',  8, 0, 20, 0, 12, 8),
  ('night', 'Night Shift', 'indigo', 20, 0, 8, 0, 12, 8);
