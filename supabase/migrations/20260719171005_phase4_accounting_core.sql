-- Phase 4 Accounting (core): chart of accounts, fiscal calendar, voucher
-- engine (numbering, posting, reversal, immutability, period locking).
-- Design notes:
--   * Party-tagged voucher lines (party_type/party_id) give per-customer and
--     per-vendor subledgers on the AR/AP control accounts, replacing the
--     entity_account_map table from the planning doc.
--   * Fiscal year = calendar year (decided in plan v1.0, section 9.1).
--   * Posted vouchers are immutable at the DB level; status changes only via
--     post_voucher()/reverse_voucher() which set app.accounting_internal.

-- ============ ACCESS HELPER ============
create or replace function public.has_accounting_access(_user_id uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in ('admin', 'accountant', 'finance_manager')
  )
$$;

-- Seed role_permissions rows for the two new roles (same grid as phase 0);
-- both get the accounting module, finance_manager also gets delete.
do $$
declare
  m text;
  modules text[] := array['dashboard','masters','hr','purchase','inventory','sales','accounting',
                           'production','quality','maintenance','mixing','tooling','finance','reports','settings'];
begin
  foreach m in array modules loop
    insert into public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
    values
      ('accountant', m, m in ('dashboard','accounting'), m = 'accounting', m = 'accounting', false),
      ('finance_manager', m, m in ('dashboard','accounting','sales','purchase','reports'), m = 'accounting', m = 'accounting', m = 'accounting')
    on conflict (role, module) do nothing;
  end loop;
end $$;

-- ============ CHART OF ACCOUNTS ============
create type public.account_type as enum ('asset','liability','equity','income','expense');

create table public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  account_type public.account_type not null,
  parent_id uuid references public.chart_of_accounts(id) on delete restrict,
  is_group boolean not null default false,
  -- Fixed handle the posting functions use to look accounts up (AR_CONTROL etc.)
  system_key text unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_coa_parent on public.chart_of_accounts(parent_id);

alter table public.chart_of_accounts enable row level security;

create policy "coa_select_accounting" on public.chart_of_accounts
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "coa_insert_accounting" on public.chart_of_accounts
  for insert to authenticated with check (public.has_accounting_access(auth.uid()));
create policy "coa_update_accounting" on public.chart_of_accounts
  for update to authenticated using (public.has_accounting_access(auth.uid()));
create policy "coa_delete_admin" on public.chart_of_accounts
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_coa_updated_at
  before update on public.chart_of_accounts
  for each row execute function public.update_updated_at_column();

-- System accounts (system_key set) cannot be deleted or deactivated.
create or replace function public.guard_system_account()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    if old.system_key is not null then
      raise exception 'System account % cannot be deleted', old.code;
    end if;
    return old;
  end if;
  if old.system_key is not null and (new.is_active = false or new.system_key is distinct from old.system_key) then
    raise exception 'System account % cannot be deactivated or remapped', old.code;
  end if;
  return new;
end $$;

create trigger trg_coa_guard_system
  before update or delete on public.chart_of_accounts
  for each row execute function public.guard_system_account();

-- ============ FISCAL CALENDAR (calendar year, per plan decision) ============
create table public.fiscal_years (
  id uuid primary key default gen_random_uuid(),
  year_label text not null unique,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create table public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_id uuid not null references public.fiscal_years(id) on delete cascade,
  period_no integer not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open','closed')),
  unique (fiscal_year_id, period_no)
);

create index idx_periods_dates on public.accounting_periods(start_date, end_date);

alter table public.fiscal_years enable row level security;
alter table public.accounting_periods enable row level security;

create policy "fy_select_accounting" on public.fiscal_years
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "fy_write_admin" on public.fiscal_years
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'finance_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'finance_manager'));
create policy "periods_select_accounting" on public.accounting_periods
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "periods_write_admin" on public.accounting_periods
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'finance_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'finance_manager'));

-- ============ VOUCHER NUMBERING ============
create table public.accounting_doc_counters (
  voucher_type text not null,
  year_label text not null,
  last_no integer not null default 0,
  primary key (voucher_type, year_label)
);
alter table public.accounting_doc_counters enable row level security;
-- no policies: only reachable through next_voucher_number (security definer)

create or replace function public.next_voucher_number(_vtype text, _vdate date)
returns text
language plpgsql security definer
set search_path to 'public'
as $$
declare
  _year text := to_char(_vdate, 'YYYY');
  _n integer;
begin
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  insert into public.accounting_doc_counters (voucher_type, year_label, last_no)
  values (_vtype, _year, 1)
  on conflict (voucher_type, year_label)
  do update set last_no = public.accounting_doc_counters.last_no + 1
  returning last_no into _n;
  return _vtype || '-' || _year || '-' || lpad(_n::text, 4, '0');
end $$;

-- ============ VOUCHERS ============
create type public.voucher_status as enum ('draft','posted','reversed');

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  voucher_type text not null check (voucher_type in
    ('JV','OB','SI','CN','CR','PB','DN','VP','BP','BR','CP','TR','PY')),
  voucher_number text not null unique,
  voucher_date date not null,
  status public.voucher_status not null default 'draft',
  narration text,
  reference text,
  source_table text,
  source_id uuid,
  reversal_of uuid references public.vouchers(id),
  attachment_url text,
  created_by uuid,
  posted_by uuid,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_vouchers_date on public.vouchers(voucher_date);
create index idx_vouchers_status on public.vouchers(status);
create index idx_vouchers_source on public.vouchers(source_table, source_id);

create table public.voucher_lines (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.vouchers(id) on delete cascade,
  line_no integer not null default 1,
  account_id uuid not null references public.chart_of_accounts(id) on delete restrict,
  description text,
  debit numeric not null default 0 check (debit >= 0),
  credit numeric not null default 0 check (credit >= 0),
  party_type text check (party_type in ('client','supplier','employee')),
  party_id uuid,
  is_reconciled boolean not null default false,
  reconciled_on date,
  created_at timestamptz not null default now(),
  check (not (debit > 0 and credit > 0))
);

create index idx_vlines_voucher on public.voucher_lines(voucher_id);
create index idx_vlines_account on public.voucher_lines(account_id);
create index idx_vlines_party on public.voucher_lines(party_type, party_id);

alter table public.vouchers enable row level security;
alter table public.voucher_lines enable row level security;

create policy "vouchers_select_accounting" on public.vouchers
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "vouchers_insert_accounting" on public.vouchers
  for insert to authenticated with check (public.has_accounting_access(auth.uid()));
create policy "vouchers_update_accounting" on public.vouchers
  for update to authenticated using (public.has_accounting_access(auth.uid()));
create policy "vouchers_delete_accounting" on public.vouchers
  for delete to authenticated using (public.has_accounting_access(auth.uid()));

create policy "vlines_select_accounting" on public.voucher_lines
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "vlines_insert_accounting" on public.voucher_lines
  for insert to authenticated with check (public.has_accounting_access(auth.uid()));
create policy "vlines_update_accounting" on public.voucher_lines
  for update to authenticated using (public.has_accounting_access(auth.uid()));
create policy "vlines_delete_accounting" on public.voucher_lines
  for delete to authenticated using (public.has_accounting_access(auth.uid()));

create trigger trg_vouchers_updated_at
  before update on public.vouchers
  for each row execute function public.update_updated_at_column();

-- Immutability: posted/reversed vouchers cannot be touched except through the
-- posting functions (which set app.accounting_internal for the transaction).
create or replace function public.guard_voucher_immutable()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if coalesce(current_setting('app.accounting_internal', true), '') = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.status <> 'draft' then
      raise exception 'Voucher % is % and cannot be edited', old.voucher_number, old.status;
    end if;
    if new.status <> old.status then
      raise exception 'Use post_voucher()/reverse_voucher() to change voucher status';
    end if;
    return new;
  end if;
  if old.status <> 'draft' then
    raise exception 'Voucher % is % and cannot be deleted — reverse it instead', old.voucher_number, old.status;
  end if;
  return old;
end $$;

create trigger trg_vouchers_guard
  before update or delete on public.vouchers
  for each row execute function public.guard_voucher_immutable();

create or replace function public.guard_voucher_lines()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  _status public.voucher_status;
begin
  if coalesce(current_setting('app.accounting_internal', true), '') = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select status into _status from public.vouchers
    where id = coalesce(new.voucher_id, old.voucher_id);
  -- parent already gone => cascade delete of a draft voucher, allow
  if found and _status <> 'draft' then
    raise exception 'Lines of a % voucher cannot be modified', _status;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger trg_vlines_guard
  before insert or update or delete on public.voucher_lines
  for each row execute function public.guard_voucher_lines();

-- ============ POSTING / REVERSAL ============
create or replace function public.assert_open_period(_date date)
returns void
language plpgsql stable
set search_path to 'public'
as $$
declare
  _p record;
begin
  select p.name as period_name, p.status as period_status, fy.status as fy_status
    into _p
    from public.accounting_periods p
    join public.fiscal_years fy on fy.id = p.fiscal_year_id
   where _date between p.start_date and p.end_date;
  if not found then
    raise exception 'No accounting period covers % — set up the fiscal year first', _date;
  end if;
  if _p.period_status <> 'open' or _p.fy_status <> 'open' then
    raise exception 'Accounting period % is closed', _p.period_name;
  end if;
end $$;

create or replace function public.post_voucher(p_voucher_id uuid)
returns void
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v record;
  _cnt integer;
  _dr numeric;
  _cr numeric;
  _bad integer;
begin
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised to post vouchers';
  end if;
  select * into v from public.vouchers where id = p_voucher_id for update;
  if not found then raise exception 'Voucher not found'; end if;
  if v.status <> 'draft' then raise exception 'Only draft vouchers can be posted'; end if;

  select count(*), coalesce(sum(debit), 0), coalesce(sum(credit), 0)
    into _cnt, _dr, _cr
    from public.voucher_lines where voucher_id = p_voucher_id;
  if _cnt < 2 then raise exception 'A voucher needs at least two lines'; end if;
  if round(_dr, 2) <> round(_cr, 2) then
    raise exception 'Voucher is not balanced: debits % vs credits %', _dr, _cr;
  end if;
  if round(_dr, 2) = 0 then raise exception 'Voucher total cannot be zero'; end if;

  select count(*) into _bad
    from public.voucher_lines l
    join public.chart_of_accounts a on a.id = l.account_id
   where l.voucher_id = p_voucher_id and (a.is_group or not a.is_active);
  if _bad > 0 then
    raise exception 'Voucher lines must use active, non-group ledger accounts';
  end if;

  perform public.assert_open_period(v.voucher_date);

  perform set_config('app.accounting_internal', 'on', true);
  update public.vouchers
     set status = 'posted', posted_by = auth.uid(), posted_at = now()
   where id = p_voucher_id;
  perform set_config('app.accounting_internal', '', true);
end $$;

create or replace function public.reverse_voucher(p_voucher_id uuid, p_date date default null, p_reason text default null)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v record;
  _date date;
  _rev_id uuid;
begin
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised to reverse vouchers';
  end if;
  select * into v from public.vouchers where id = p_voucher_id for update;
  if not found then raise exception 'Voucher not found'; end if;
  if v.status <> 'posted' then raise exception 'Only posted vouchers can be reversed'; end if;

  _date := coalesce(p_date, current_date);
  perform public.assert_open_period(_date);

  insert into public.vouchers (voucher_type, voucher_number, voucher_date, narration, reference, reversal_of, created_by)
  values ('JV', public.next_voucher_number('JV', _date), _date,
          coalesce(p_reason, 'Reversal of ' || v.voucher_number),
          v.voucher_number, v.id, auth.uid())
  returning id into _rev_id;

  insert into public.voucher_lines (voucher_id, line_no, account_id, description, debit, credit, party_type, party_id)
  select _rev_id, line_no, account_id, description, credit, debit, party_type, party_id
    from public.voucher_lines where voucher_id = p_voucher_id;

  perform public.post_voucher(_rev_id);

  perform set_config('app.accounting_internal', 'on', true);
  update public.vouchers set status = 'reversed' where id = p_voucher_id;
  perform set_config('app.accounting_internal', '', true);

  return _rev_id;
end $$;
