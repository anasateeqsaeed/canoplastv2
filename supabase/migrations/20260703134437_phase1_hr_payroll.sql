-- Phase 1: HR & Payroll — work patterns, employee types, employees, documents,
-- attendance (+edit audit), leave, shift rosters, payroll, HR audit log.

-- ============ SHARED HELPERS ============
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ HR AUDIT LOG (created first so triggers can reference it) ============
create table public.hr_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  changed_at timestamptz not null default now()
);

create index idx_hr_audit_entity on public.hr_audit_log (entity_type, entity_id);
create index idx_hr_audit_changed_at on public.hr_audit_log (changed_at desc);
create index idx_hr_audit_actor on public.hr_audit_log (actor_id);

alter table public.hr_audit_log enable row level security;

create policy "Admin and HR can view audit log"
  on public.hr_audit_log for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "System inserts audit log"
  on public.hr_audit_log for insert to authenticated
  with check (true);

create or replace function public.log_hr_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_email text;
  v_entity_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if auth.uid() is not null then
    select email into v_actor_email from auth.users where id = auth.uid();
  end if;

  if TG_OP = 'INSERT' then
    v_entity_id := new.id;
    v_after := to_jsonb(new);
    v_before := null;
  elsif TG_OP = 'UPDATE' then
    v_entity_id := new.id;
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    if v_before = v_after then
      return new;
    end if;
  end if;

  insert into public.hr_audit_log (
    actor_id, actor_email, entity_type, entity_id, action, before_data, after_data
  ) values (
    auth.uid(), v_actor_email, TG_ARGV[0], v_entity_id, lower(TG_OP), v_before, v_after
  );

  return new;
end;
$$;

-- ============ WORK PATTERNS ============
create table public.hr_work_patterns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  color text not null default 'slate',
  start_hour int not null default 9 check (start_hour between 0 and 23),
  start_minute int not null default 0 check (start_minute between 0 and 59),
  end_hour int not null default 17 check (end_hour between 0 and 23),
  end_minute int not null default 0 check (end_minute between 0 and 59),
  grace_minutes int not null default 15,
  lunch_minutes int not null default 60,
  standard_hours numeric(5,2) not null default 8,
  ot_threshold_hours numeric(5,2) not null default 8,
  standard_days_per_month int not null default 26,
  weekly_off_days int[] not null default '{5}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hr_work_patterns enable row level security;

create policy "hr_work_patterns_select_authenticated"
  on public.hr_work_patterns for select to authenticated using (true);

create policy "hr_work_patterns_insert_admin_or_hr"
  on public.hr_work_patterns for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "hr_work_patterns_update_admin_or_hr"
  on public.hr_work_patterns for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "hr_work_patterns_delete_admin"
  on public.hr_work_patterns for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_hr_work_patterns_updated_at
  before update on public.hr_work_patterns
  for each row execute function public.update_updated_at_column();

create trigger trg_hr_work_patterns_audit
  after insert or update on public.hr_work_patterns
  for each row execute function public.log_hr_change('hr_work_pattern');

insert into public.hr_work_patterns (code, name, color, start_hour, start_minute, end_hour, end_minute, standard_hours, ot_threshold_hours, standard_days_per_month, weekly_off_days)
values
  ('office',        'Office Staff',   'blue',    9, 0,  17, 30, 8,  8, 26, '{5}'),
  ('general',       'General Shift',  'emerald', 8, 0,  17, 0,  8,  8, 26, '{5}'),
  ('factory_day',   'Factory Day',    'amber',   8, 0,  20, 0,  12, 8, 26, '{5}'),
  ('factory_night', 'Factory Night',  'purple', 20, 0,   8, 0,  12, 8, 26, '{5}'),
  ('security',      'Security',       'slate',  18, 0,   6, 0,  12, 8, 30, '{}');

-- ============ EMPLOYEE TYPES ============
create table public.employee_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null default 'staff',
  default_work_pattern_id uuid references public.hr_work_patterns(id) on delete set null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employee_types enable row level security;

create policy "employee_types_select_authenticated"
  on public.employee_types for select to authenticated using (true);

create policy "employee_types_write_admin_or_hr"
  on public.employee_types for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create trigger trg_employee_types_updated_at
  before update on public.employee_types
  for each row execute function public.update_updated_at_column();

insert into public.employee_types (code, name, category, sort_order) values
  ('staff',     'Office Staff',      'staff',   1),
  ('worker',    'Factory Worker',    'worker',  2),
  ('operator',  'Machine Operator',  'worker',  3),
  ('security',  'Security Guard',    'support', 4),
  ('management','Management',        'staff',   0);

-- ============ EMPLOYEES ============
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  full_name text not null,
  father_name text,
  cnic text,
  date_of_birth date,
  gender text,
  marital_status text,
  blood_group text,
  phone text not null default '',
  alt_phone text,
  email text,
  current_address text,
  permanent_address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  photo_url text,
  department_id uuid references public.departments(id) on delete set null,
  designation text,
  employee_type text not null default 'staff',
  employee_type_id uuid references public.employee_types(id) on delete set null,
  employment_status text not null default 'active',
  joining_date date not null default current_date,
  probation_end_date date,
  reporting_to uuid references public.employees(id) on delete set null,
  shift text,
  work_pattern_id uuid references public.hr_work_patterns(id) on delete set null,
  device_punch_id text,
  salary_type text not null default 'monthly',
  basic_salary numeric,
  overtime_rate numeric,
  allowances jsonb,
  bank_name text,
  bank_account text,
  payment_mode text default 'cash',
  user_id uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_employees_department on public.employees (department_id);
create index idx_employees_active on public.employees (is_active);
create index idx_employees_punch on public.employees (device_punch_id);

alter table public.employees enable row level security;

create policy "employees_select_admin_or_hr"
  on public.employees for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "employees_insert_admin_or_hr"
  on public.employees for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "employees_update_admin_or_hr"
  on public.employees for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "employees_delete_admin"
  on public.employees for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_employees_updated_at
  before update on public.employees
  for each row execute function public.update_updated_at_column();

create trigger trg_hr_audit_employees
  after insert or update on public.employees
  for each row execute function public.log_hr_change('employee');

create or replace function public.get_employee_work_pattern(_employee_id uuid)
returns public.hr_work_patterns
language sql stable security definer set search_path = public
as $$
  select p.*
  from public.hr_work_patterns p
  where p.id = coalesce(
    (select work_pattern_id from public.employees where id = _employee_id),
    (select et.default_work_pattern_id
       from public.employees e
       join public.employee_types et on et.id = e.employee_type_id
      where e.id = _employee_id),
    (select id from public.hr_work_patterns where code = 'office' limit 1)
  )
  limit 1
$$;

-- ============ EMPLOYEE DOCUMENTS ============
create table public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  doc_type text not null,
  doc_name text not null,
  file_url text not null,
  file_size bigint,
  mime_type text,
  notes text,
  uploaded_by uuid,
  uploaded_at timestamptz not null default now()
);

alter table public.employee_documents enable row level security;

create policy "employee_documents_all_admin_or_hr"
  on public.employee_documents for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

-- ============ ATTENDANCE EDIT REASONS ============
create table public.attendance_edit_reasons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  description text,
  is_system boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.attendance_edit_reasons enable row level security;

create policy "attendance_edit_reasons_select_authenticated"
  on public.attendance_edit_reasons for select to authenticated using (true);

create policy "attendance_edit_reasons_write_admin_or_hr"
  on public.attendance_edit_reasons for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create trigger trg_attendance_edit_reasons_updated_at
  before update on public.attendance_edit_reasons
  for each row execute function public.update_updated_at_column();

insert into public.attendance_edit_reasons (code, label, is_system, sort_order) values
  ('punch_missed',   'Punch machine missed',       true, 1),
  ('device_error',   'Device error / no record',   true, 2),
  ('manual_entry',   'Manual entry correction',    true, 3),
  ('late_approval',  'Late arrival approved',      true, 4),
  ('field_duty',     'On field duty / outdoor',    true, 5),
  ('other',          'Other',                      true, 99);

-- ============ ATTENDANCE RECORDS ============
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null,
  person_type text not null default 'employee',
  attendance_date date not null,
  status text not null,
  shift text,
  check_in text,
  check_out text,
  hours_worked numeric,
  remarks text,
  edit_reason text,
  edit_reason_code text,
  marked_by uuid,
  marked_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (person_id, person_type, attendance_date)
);

create index idx_attendance_date on public.attendance_records (attendance_date);
create index idx_attendance_person on public.attendance_records (person_id, person_type);

alter table public.attendance_records enable row level security;

create policy "attendance_select_admin_or_hr"
  on public.attendance_records for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "attendance_insert_admin_or_hr"
  on public.attendance_records for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "attendance_update_admin_or_hr"
  on public.attendance_records for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "attendance_delete_admin"
  on public.attendance_records for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_attendance_updated_at
  before update on public.attendance_records
  for each row execute function public.update_updated_at_column();

create trigger trg_hr_audit_attendance
  after insert or update on public.attendance_records
  for each row execute function public.log_hr_change('attendance_record');

-- ============ ATTENDANCE RECORD EDITS (fine-grained before/after log) ============
create table public.attendance_record_edits (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid,
  person_id uuid not null,
  person_type text not null,
  attendance_date date not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  edit_reason text,
  edit_reason_code text,
  actor_id uuid,
  actor_email text,
  changed_at timestamptz not null default now()
);

create index idx_att_edits_record on public.attendance_record_edits (attendance_record_id);
create index idx_att_edits_date on public.attendance_record_edits (attendance_date);

alter table public.attendance_record_edits enable row level security;

create policy "attendance_edits_select_admin_or_hr"
  on public.attendance_record_edits for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "attendance_edits_insert_authenticated"
  on public.attendance_record_edits for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

-- ============ SHIFT ROSTERS ============
create table public.shift_rosters (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null,
  person_type text not null default 'employee',
  roster_date date not null,
  shift text not null,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, person_type, roster_date)
);

alter table public.shift_rosters enable row level security;

create policy "shift_rosters_select_authenticated"
  on public.shift_rosters for select to authenticated using (true);

create policy "shift_rosters_write_admin_or_hr"
  on public.shift_rosters for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create trigger trg_shift_rosters_updated_at
  before update on public.shift_rosters
  for each row execute function public.update_updated_at_column();

-- Resolve effective shift for a person/date: roster override first, then the
-- employee's fixed shift, defaulting to 'day'.
create or replace function public.resolve_shift(_person_id uuid, _person_type text, _date date)
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select shift from public.shift_rosters
      where person_id = _person_id and person_type = _person_type and roster_date = _date),
    (select shift from public.employees where id = _person_id and _person_type = 'employee'),
    'day'
  )
$$;

-- ============ LEAVE ============
create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  annual_quota numeric not null default 0,
  is_paid boolean not null default true,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leave_types enable row level security;

create policy "leave_types_select_authenticated"
  on public.leave_types for select to authenticated using (true);

create policy "leave_types_write_admin_or_hr"
  on public.leave_types for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create trigger trg_leave_types_updated_at
  before update on public.leave_types
  for each row execute function public.update_updated_at_column();

insert into public.leave_types (code, name, annual_quota, is_paid, color) values
  ('casual', 'Casual Leave', 10, true,  'blue'),
  ('sick',   'Sick Leave',   8,  true,  'amber'),
  ('annual', 'Annual Leave', 14, true,  'emerald'),
  ('unpaid', 'Unpaid Leave', 0,  false, 'slate');

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  year int not null,
  allocated numeric not null default 0,
  used numeric not null default 0,
  carried_forward numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, leave_type_id, year)
);

alter table public.leave_balances enable row level security;

create policy "leave_balances_all_admin_or_hr"
  on public.leave_balances for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create trigger trg_leave_balances_updated_at
  before update on public.leave_balances
  for each row execute function public.update_updated_at_column();

create table public.leave_applications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id),
  from_date date not null,
  to_date date not null,
  days numeric not null,
  reason text,
  status text not null default 'pending',
  applied_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leave_apps_employee on public.leave_applications (employee_id);
create index idx_leave_apps_status on public.leave_applications (status);

alter table public.leave_applications enable row level security;

create policy "leave_applications_all_admin_or_hr"
  on public.leave_applications for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create trigger trg_leave_applications_updated_at
  before update on public.leave_applications
  for each row execute function public.update_updated_at_column();

create trigger trg_hr_audit_leave_applications
  after insert or update on public.leave_applications
  for each row execute function public.log_hr_change('leave_application');

-- ============ PAYROLL ============
create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  run_code text unique,
  period_month date not null,
  status text not null default 'draft',
  working_days int not null default 26,
  total_gross numeric not null default 0,
  total_deductions numeric not null default 0,
  total_net numeric not null default 0,
  notes text,
  finalized_at timestamptz,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_month)
);

alter table public.payroll_runs enable row level security;

create policy "payroll_runs_select_hr_finance"
  on public.payroll_runs for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager')
         or public.has_role(auth.uid(), 'finance_manager') or public.has_role(auth.uid(), 'accountant'));

create policy "payroll_runs_insert_admin_or_hr"
  on public.payroll_runs for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "payroll_runs_update_admin_or_hr"
  on public.payroll_runs for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "payroll_runs_delete_admin"
  on public.payroll_runs for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_payroll_runs_updated_at
  before update on public.payroll_runs
  for each row execute function public.update_updated_at_column();

create trigger trg_hr_audit_payroll_runs
  after insert or update on public.payroll_runs
  for each row execute function public.log_hr_change('payroll_run');

create table public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  days_present numeric not null default 0,
  days_absent numeric not null default 0,
  days_half numeric not null default 0,
  days_leave numeric not null default 0,
  days_holiday numeric not null default 0,
  days_off numeric not null default 0,
  days_late numeric not null default 0,
  payable_days numeric not null default 0,
  daily_wage numeric not null default 0,
  earned_basic numeric not null default 0,
  ot_hours numeric not null default 0,
  ot_rate numeric not null default 0,
  ot_amount numeric not null default 0,
  allowances_amount numeric not null default 0,
  advance_deduction numeric not null default 0,
  other_deduction numeric not null default 0,
  gross_pay numeric not null default 0,
  net_pay numeric not null default 0,
  payment_status text not null default 'pending',
  payment_mode text not null default 'cash',
  payment_ref text,
  paid_on date,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, employee_id)
);

create index idx_payroll_items_run on public.payroll_items (run_id);
create index idx_payroll_items_employee on public.payroll_items (employee_id);

alter table public.payroll_items enable row level security;

create policy "payroll_items_select_hr_finance"
  on public.payroll_items for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager')
         or public.has_role(auth.uid(), 'finance_manager') or public.has_role(auth.uid(), 'accountant'));

create policy "payroll_items_insert_admin_or_hr"
  on public.payroll_items for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "payroll_items_update_admin_or_hr"
  on public.payroll_items for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager'));

create policy "payroll_items_delete_admin"
  on public.payroll_items for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_payroll_items_updated_at
  before update on public.payroll_items
  for each row execute function public.update_updated_at_column();

create trigger trg_hr_audit_payroll_items
  after insert or update on public.payroll_items
  for each row execute function public.log_hr_change('payroll_item');

-- ============ STORAGE BUCKET FOR EMPLOYEE DOCUMENTS ============
insert into storage.buckets (id, name, public)
values ('employee-documents', 'employee-documents', false)
on conflict (id) do nothing;

create policy "employee_docs_bucket_read_admin_or_hr"
  on storage.objects for select to authenticated
  using (bucket_id = 'employee-documents'
         and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager')));

create policy "employee_docs_bucket_write_admin_or_hr"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'employee-documents'
              and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager')));

create policy "employee_docs_bucket_delete_admin_or_hr"
  on storage.objects for delete to authenticated
  using (bucket_id = 'employee-documents'
         and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'hr_manager')));
