-- Phase 4 Accounting: AR receipts, AP bills/payments, bank accounts, and the
-- posting RPCs that generate GL vouchers for them. Receipts/bills/payments
-- share their document number with the voucher they post (CR-/PB-/VP-…).

-- ============ BANK ACCOUNTS ============
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bank_name text,
  account_number text,
  iban text,
  coa_account_id uuid not null unique references public.chart_of_accounts(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bank_accounts enable row level security;
create policy "bank_select_accounting" on public.bank_accounts
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "bank_insert_accounting" on public.bank_accounts
  for insert to authenticated with check (public.has_accounting_access(auth.uid()));
create policy "bank_update_accounting" on public.bank_accounts
  for update to authenticated using (public.has_accounting_access(auth.uid()));
create policy "bank_delete_admin" on public.bank_accounts
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_bank_accounts_updated_at
  before update on public.bank_accounts
  for each row execute function public.update_updated_at_column();

-- Creates the GL ledger account under Bank Accounts (1120) and the bank row.
create or replace function public.create_bank_account(
  p_name text, p_bank_name text default null,
  p_account_number text default null, p_iban text default null)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  _group_id uuid;
  _next_code text;
  _coa_id uuid;
  _bank_id uuid;
begin
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  select id into _group_id from public.chart_of_accounts where system_key = 'BANK_GROUP';
  select coalesce(max(code::int), 1120) + 1 into _next_code
    from public.chart_of_accounts
   where parent_id = _group_id and code ~ '^[0-9]+$';
  insert into public.chart_of_accounts (code, name, account_type, is_group, parent_id)
  values (_next_code, p_name, 'asset', false, _group_id)
  returning id into _coa_id;
  insert into public.bank_accounts (name, bank_name, account_number, iban, coa_account_id)
  values (p_name, p_bank_name, p_account_number, p_iban, _coa_id)
  returning id into _bank_id;
  return _bank_id;
end $$;

-- ============ INTERNAL: build + post a voucher from jsonb lines ============
create or replace function public._acc_create_posted_voucher(
  _vtype text, _vnumber text, _vdate date, _narration text, _reference text,
  _source_table text, _source_id uuid, _lines jsonb)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  _vid uuid;
begin
  insert into public.vouchers (voucher_type, voucher_number, voucher_date, narration, reference, source_table, source_id, created_by)
  values (_vtype, _vnumber, _vdate, _narration, _reference, _source_table, _source_id, auth.uid())
  returning id into _vid;

  insert into public.voucher_lines (voucher_id, line_no, account_id, description, debit, credit, party_type, party_id)
  select _vid,
         row_number() over (),
         (l->>'account_id')::uuid,
         l->>'description',
         coalesce((l->>'debit')::numeric, 0),
         coalesce((l->>'credit')::numeric, 0),
         l->>'party_type',
         (l->>'party_id')::uuid
    from jsonb_array_elements(_lines) as l;

  perform public.post_voucher(_vid);
  return _vid;
end $$;

revoke execute on function public._acc_create_posted_voucher(text, text, date, text, text, text, uuid, jsonb) from anon, authenticated;

create or replace function public.acc_system_account(_key text)
returns uuid
language plpgsql stable
set search_path to 'public'
as $$
declare _id uuid;
begin
  select id into _id from public.chart_of_accounts where system_key = _key;
  if _id is null then raise exception 'System account % is not configured', _key; end if;
  return _id;
end $$;

-- ============ SALES INVOICES: payment tracking + GL link ============
alter table public.sales_invoices
  add column if not exists amount_paid numeric not null default 0,
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','partial','paid')),
  add column if not exists gl_voucher_id uuid references public.vouchers(id);

-- Dr Trade Debtors / Cr Sales Income (+ GST Output) for an issued invoice.
create or replace function public.post_sales_invoice_to_gl(p_invoice_id uuid)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  inv record;
  _vid uuid;
  _num text;
  _lines jsonb;
begin
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  select * into inv from public.sales_invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if inv.status <> 'issued' then raise exception 'Only issued invoices can be posted to the GL'; end if;
  if inv.gl_voucher_id is not null then raise exception 'Invoice % is already posted to the GL', inv.invoice_number; end if;

  _num := public.next_voucher_number('SI', inv.invoice_date);
  _lines := jsonb_build_array(
    jsonb_build_object('account_id', public.acc_system_account('AR_CONTROL'),
                       'description', 'Invoice ' || inv.invoice_number,
                       'debit', inv.total_amount, 'party_type', 'client', 'party_id', inv.client_id),
    jsonb_build_object('account_id', public.acc_system_account('SALES_INCOME'),
                       'description', 'Invoice ' || inv.invoice_number,
                       'credit', inv.total_amount - inv.tax_amount)
  );
  if inv.tax_amount > 0 then
    _lines := _lines || jsonb_build_array(
      jsonb_build_object('account_id', public.acc_system_account('GST_OUTPUT'),
                         'description', 'GST on ' || inv.invoice_number,
                         'credit', inv.tax_amount));
  end if;

  _vid := public._acc_create_posted_voucher('SI', _num, inv.invoice_date,
            'Sales invoice ' || inv.invoice_number, inv.invoice_number,
            'sales_invoices', inv.id, _lines);
  update public.sales_invoices set gl_voucher_id = _vid where id = p_invoice_id;
  return _vid;
end $$;

-- ============ AR RECEIPTS ============
create table public.ar_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  client_id uuid not null references public.clients(id),
  receipt_date date not null,
  amount numeric not null check (amount > 0),
  mode text not null check (mode in ('cash','bank','cheque')),
  bank_account_id uuid references public.bank_accounts(id),
  cheque_number text,
  cheque_date date,
  cheque_status text check (cheque_status in ('pending','cleared','bounced')),
  reference text,
  notes text,
  voucher_id uuid references public.vouchers(id),
  created_by uuid,
  created_at timestamptz not null default now()
);

create index idx_ar_receipts_client on public.ar_receipts(client_id);
create index idx_ar_receipts_date on public.ar_receipts(receipt_date);

create table public.ar_receipt_allocations (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.ar_receipts(id) on delete cascade,
  invoice_id uuid not null references public.sales_invoices(id),
  amount numeric not null check (amount > 0),
  unique (receipt_id, invoice_id)
);

create index idx_ar_alloc_invoice on public.ar_receipt_allocations(invoice_id);

alter table public.ar_receipts enable row level security;
alter table public.ar_receipt_allocations enable row level security;
create policy "arr_select_accounting" on public.ar_receipts
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "arr_write_accounting" on public.ar_receipts
  for all to authenticated
  using (public.has_accounting_access(auth.uid()))
  with check (public.has_accounting_access(auth.uid()));
create policy "ara_select_accounting" on public.ar_receipt_allocations
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "ara_write_accounting" on public.ar_receipt_allocations
  for all to authenticated
  using (public.has_accounting_access(auth.uid()))
  with check (public.has_accounting_access(auth.uid()));

create or replace function public.recompute_invoice_paid()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
declare
  _ids uuid[];
begin
  _ids := array_remove(array[
    case when tg_op <> 'INSERT' then old.invoice_id end,
    case when tg_op <> 'DELETE' then new.invoice_id end], null);
  update public.sales_invoices si
     set amount_paid = coalesce((select sum(a.amount) from public.ar_receipt_allocations a where a.invoice_id = si.id), 0)
   where si.id = any(_ids);
  update public.sales_invoices si
     set payment_status = case
       when si.amount_paid <= 0 then 'unpaid'
       when si.amount_paid >= si.total_amount then 'paid'
       else 'partial' end
   where si.id = any(_ids);
  return null;
end $$;

create trigger trg_ar_alloc_recompute
  after insert or update or delete on public.ar_receipt_allocations
  for each row execute function public.recompute_invoice_paid();

-- Creates receipt + posted CR voucher (Dr cash/bank, Cr Trade Debtors) and
-- allocates against invoices. p_allocations: [{invoice_id, amount}, …]
create or replace function public.create_ar_receipt(
  p_client_id uuid, p_receipt_date date, p_amount numeric, p_mode text,
  p_bank_account_id uuid default null, p_cheque_number text default null,
  p_cheque_date date default null, p_reference text default null,
  p_notes text default null, p_allocations jsonb default '[]')
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  _debit_account uuid;
  _num text;
  _vid uuid;
  _rid uuid;
  _alloc record;
  _alloc_total numeric := 0;
  _outstanding numeric;
  _client_name text;
begin
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  select name into _client_name from public.clients where id = p_client_id;
  if _client_name is null then raise exception 'Client not found'; end if;

  if p_mode = 'cash' then
    _debit_account := public.acc_system_account('CASH_IN_HAND');
  else
    if p_bank_account_id is null then raise exception 'Bank account is required for %s receipts', p_mode; end if;
    select coa_account_id into _debit_account from public.bank_accounts where id = p_bank_account_id and is_active;
    if _debit_account is null then raise exception 'Bank account not found or inactive'; end if;
  end if;
  if p_mode = 'cheque' and (p_cheque_number is null or p_cheque_number = '') then
    raise exception 'Cheque number is required for cheque receipts';
  end if;

  for _alloc in select (a->>'invoice_id')::uuid as invoice_id, (a->>'amount')::numeric as amount
                  from jsonb_array_elements(p_allocations) as a loop
    if _alloc.amount is null or _alloc.amount <= 0 then raise exception 'Allocation amounts must be positive'; end if;
    select total_amount - amount_paid into _outstanding
      from public.sales_invoices
     where id = _alloc.invoice_id and client_id = p_client_id and status = 'issued'
       for update;
    if _outstanding is null then raise exception 'Invoice not found for this client'; end if;
    if _alloc.amount > _outstanding + 0.01 then
      raise exception 'Allocation exceeds invoice outstanding (%.2f)', _outstanding;
    end if;
    _alloc_total := _alloc_total + _alloc.amount;
  end loop;
  if _alloc_total > p_amount + 0.01 then
    raise exception 'Allocations (%) exceed receipt amount (%)', _alloc_total, p_amount;
  end if;

  _num := public.next_voucher_number('CR', p_receipt_date);
  _vid := public._acc_create_posted_voucher('CR', _num, p_receipt_date,
      'Receipt from ' || _client_name || coalesce(' — ' || p_reference, ''), p_reference,
      'ar_receipts', null,
      jsonb_build_array(
        jsonb_build_object('account_id', _debit_account, 'description', 'Receipt ' || _num, 'debit', p_amount),
        jsonb_build_object('account_id', public.acc_system_account('AR_CONTROL'),
                           'description', 'Receipt ' || _num, 'credit', p_amount,
                           'party_type', 'client', 'party_id', p_client_id)));

  insert into public.ar_receipts (receipt_number, client_id, receipt_date, amount, mode,
      bank_account_id, cheque_number, cheque_date, cheque_status, reference, notes, voucher_id, created_by)
  values (_num, p_client_id, p_receipt_date, p_amount, p_mode,
      p_bank_account_id, p_cheque_number, p_cheque_date,
      case when p_mode = 'cheque' then 'pending' end,
      p_reference, p_notes, _vid, auth.uid())
  returning id into _rid;

  update public.vouchers set source_id = _rid where id = _vid;

  insert into public.ar_receipt_allocations (receipt_id, invoice_id, amount)
  select _rid, (a->>'invoice_id')::uuid, (a->>'amount')::numeric
    from jsonb_array_elements(p_allocations) as a;

  return _rid;
end $$;

-- Bounced cheque: reverse the GL voucher and undo invoice allocations.
create or replace function public.mark_ar_cheque_bounced(p_receipt_id uuid)
returns void
language plpgsql security definer
set search_path to 'public'
as $$
declare
  r record;
begin
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  select * into r from public.ar_receipts where id = p_receipt_id for update;
  if not found then raise exception 'Receipt not found'; end if;
  if r.mode <> 'cheque' or r.cheque_status <> 'pending' then
    raise exception 'Only pending cheque receipts can be marked bounced';
  end if;
  perform public.reverse_voucher(r.voucher_id, current_date, 'Cheque ' || coalesce(r.cheque_number, '') || ' bounced');
  delete from public.ar_receipt_allocations where receipt_id = p_receipt_id;
  update public.ar_receipts set cheque_status = 'bounced' where id = p_receipt_id;
end $$;

-- ============ AP BILLS ============
create table public.ap_bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique,
  supplier_id uuid not null references public.suppliers(id),
  bill_date date not null,
  due_date date,
  vendor_bill_no text,
  subtotal numeric not null default 0 check (subtotal >= 0),
  tax_amount numeric not null default 0 check (tax_amount >= 0),
  total_amount numeric not null default 0,
  amount_paid numeric not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid')),
  status text not null default 'draft' check (status in ('draft','posted','cancelled')),
  narration text,
  po_id uuid references public.purchase_orders(id),
  voucher_id uuid references public.vouchers(id),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ap_bills_supplier on public.ap_bills(supplier_id);
create index idx_ap_bills_date on public.ap_bills(bill_date);

create table public.ap_bill_lines (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.ap_bills(id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts(id),
  description text,
  amount numeric not null check (amount > 0)
);

create index idx_ap_bill_lines_bill on public.ap_bill_lines(bill_id);

alter table public.ap_bills enable row level security;
alter table public.ap_bill_lines enable row level security;
create policy "apb_select_accounting" on public.ap_bills
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "apb_write_accounting" on public.ap_bills
  for all to authenticated
  using (public.has_accounting_access(auth.uid()))
  with check (public.has_accounting_access(auth.uid()));
create policy "apbl_select_accounting" on public.ap_bill_lines
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "apbl_write_accounting" on public.ap_bill_lines
  for all to authenticated
  using (public.has_accounting_access(auth.uid()))
  with check (public.has_accounting_access(auth.uid()));

create trigger trg_ap_bills_updated_at
  before update on public.ap_bills
  for each row execute function public.update_updated_at_column();

-- Posted bills are immutable except payment tracking (handled by definer fns).
create or replace function public.guard_ap_bill()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if coalesce(current_setting('app.accounting_internal', true), '') = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then raise exception 'Posted bills cannot be deleted'; end if;
    return old;
  end if;
  if old.status = 'posted' and (new.status, new.supplier_id, new.bill_date, new.subtotal, new.tax_amount, new.total_amount)
       is distinct from (old.status, old.supplier_id, old.bill_date, old.subtotal, old.tax_amount, old.total_amount) then
    raise exception 'Posted bills cannot be edited — reverse the voucher instead';
  end if;
  return new;
end $$;

create trigger trg_ap_bills_guard
  before update or delete on public.ap_bills
  for each row execute function public.guard_ap_bill();

-- Dr expense/stock lines (+ GST Input) / Cr Trade Creditors.
create or replace function public.post_ap_bill(p_bill_id uuid)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  b record;
  _sum numeric;
  _lines jsonb;
  _vid uuid;
  _supplier text;
begin
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  select * into b from public.ap_bills where id = p_bill_id for update;
  if not found then raise exception 'Bill not found'; end if;
  if b.status <> 'draft' then raise exception 'Only draft bills can be posted'; end if;

  select coalesce(sum(amount), 0) into _sum from public.ap_bill_lines where bill_id = p_bill_id;
  if _sum = 0 then raise exception 'Bill has no expense lines'; end if;
  if round(_sum, 2) <> round(b.subtotal, 2) then
    raise exception 'Bill lines (%) do not add up to the subtotal (%)', _sum, b.subtotal;
  end if;
  if round(b.total_amount, 2) <> round(b.subtotal + b.tax_amount, 2) then
    raise exception 'Total must equal subtotal + tax';
  end if;

  select name into _supplier from public.suppliers where id = b.supplier_id;

  select jsonb_agg(jsonb_build_object(
           'account_id', l.account_id,
           'description', coalesce(l.description, 'Bill ' || b.bill_number),
           'debit', l.amount))
    into _lines
    from public.ap_bill_lines l where l.bill_id = p_bill_id;

  if b.tax_amount > 0 then
    _lines := _lines || jsonb_build_array(jsonb_build_object(
      'account_id', public.acc_system_account('GST_INPUT'),
      'description', 'GST on ' || b.bill_number, 'debit', b.tax_amount));
  end if;
  _lines := _lines || jsonb_build_array(jsonb_build_object(
      'account_id', public.acc_system_account('AP_CONTROL'),
      'description', 'Bill ' || b.bill_number, 'credit', b.total_amount,
      'party_type', 'supplier', 'party_id', b.supplier_id));

  _vid := public._acc_create_posted_voucher('PB', b.bill_number, b.bill_date,
      'Purchase bill ' || b.bill_number || ' — ' || coalesce(_supplier, ''),
      b.vendor_bill_no, 'ap_bills', b.id, _lines);

  perform set_config('app.accounting_internal', 'on', true);
  update public.ap_bills set status = 'posted', voucher_id = _vid where id = p_bill_id;
  perform set_config('app.accounting_internal', '', true);
  return _vid;
end $$;

-- ============ AP PAYMENTS ============
create table public.ap_payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique,
  supplier_id uuid not null references public.suppliers(id),
  payment_date date not null,
  amount numeric not null check (amount > 0),
  mode text not null check (mode in ('cash','bank','cheque')),
  bank_account_id uuid references public.bank_accounts(id),
  cheque_number text,
  cheque_date date,
  cheque_status text check (cheque_status in ('pending','cleared','bounced')),
  reference text,
  notes text,
  voucher_id uuid references public.vouchers(id),
  created_by uuid,
  created_at timestamptz not null default now()
);

create index idx_ap_payments_supplier on public.ap_payments(supplier_id);
create index idx_ap_payments_date on public.ap_payments(payment_date);

create table public.ap_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.ap_payments(id) on delete cascade,
  bill_id uuid not null references public.ap_bills(id),
  amount numeric not null check (amount > 0),
  unique (payment_id, bill_id)
);

create index idx_ap_alloc_bill on public.ap_payment_allocations(bill_id);

alter table public.ap_payments enable row level security;
alter table public.ap_payment_allocations enable row level security;
create policy "app_select_accounting" on public.ap_payments
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "app_write_accounting" on public.ap_payments
  for all to authenticated
  using (public.has_accounting_access(auth.uid()))
  with check (public.has_accounting_access(auth.uid()));
create policy "appa_select_accounting" on public.ap_payment_allocations
  for select to authenticated using (public.has_accounting_access(auth.uid()));
create policy "appa_write_accounting" on public.ap_payment_allocations
  for all to authenticated
  using (public.has_accounting_access(auth.uid()))
  with check (public.has_accounting_access(auth.uid()));

create or replace function public.recompute_bill_paid()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
declare
  _ids uuid[];
begin
  _ids := array_remove(array[
    case when tg_op <> 'INSERT' then old.bill_id end,
    case when tg_op <> 'DELETE' then new.bill_id end], null);
  perform set_config('app.accounting_internal', 'on', true);
  update public.ap_bills b
     set amount_paid = coalesce((select sum(a.amount) from public.ap_payment_allocations a where a.bill_id = b.id), 0)
   where b.id = any(_ids);
  update public.ap_bills b
     set payment_status = case
       when b.amount_paid <= 0 then 'unpaid'
       when b.amount_paid >= b.total_amount then 'paid'
       else 'partial' end
   where b.id = any(_ids);
  perform set_config('app.accounting_internal', '', true);
  return null;
end $$;

create trigger trg_ap_alloc_recompute
  after insert or update or delete on public.ap_payment_allocations
  for each row execute function public.recompute_bill_paid();

-- Creates payment + posted VP voucher (Dr Trade Creditors, Cr cash/bank).
create or replace function public.create_ap_payment(
  p_supplier_id uuid, p_payment_date date, p_amount numeric, p_mode text,
  p_bank_account_id uuid default null, p_cheque_number text default null,
  p_cheque_date date default null, p_reference text default null,
  p_notes text default null, p_allocations jsonb default '[]')
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  _credit_account uuid;
  _num text;
  _vid uuid;
  _pid uuid;
  _alloc record;
  _alloc_total numeric := 0;
  _outstanding numeric;
  _supplier text;
begin
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  select name into _supplier from public.suppliers where id = p_supplier_id;
  if _supplier is null then raise exception 'Supplier not found'; end if;

  if p_mode = 'cash' then
    _credit_account := public.acc_system_account('CASH_IN_HAND');
  else
    if p_bank_account_id is null then raise exception 'Bank account is required for %s payments', p_mode; end if;
    select coa_account_id into _credit_account from public.bank_accounts where id = p_bank_account_id and is_active;
    if _credit_account is null then raise exception 'Bank account not found or inactive'; end if;
  end if;
  if p_mode = 'cheque' and (p_cheque_number is null or p_cheque_number = '') then
    raise exception 'Cheque number is required for cheque payments';
  end if;

  for _alloc in select (a->>'bill_id')::uuid as bill_id, (a->>'amount')::numeric as amount
                  from jsonb_array_elements(p_allocations) as a loop
    if _alloc.amount is null or _alloc.amount <= 0 then raise exception 'Allocation amounts must be positive'; end if;
    select total_amount - amount_paid into _outstanding
      from public.ap_bills
     where id = _alloc.bill_id and supplier_id = p_supplier_id and status = 'posted'
       for update;
    if _outstanding is null then raise exception 'Bill not found for this supplier (must be posted)'; end if;
    if _alloc.amount > _outstanding + 0.01 then
      raise exception 'Allocation exceeds bill outstanding (%.2f)', _outstanding;
    end if;
    _alloc_total := _alloc_total + _alloc.amount;
  end loop;
  if _alloc_total > p_amount + 0.01 then
    raise exception 'Allocations (%) exceed payment amount (%)', _alloc_total, p_amount;
  end if;

  _num := public.next_voucher_number('VP', p_payment_date);
  _vid := public._acc_create_posted_voucher('VP', _num, p_payment_date,
      'Payment to ' || _supplier || coalesce(' — ' || p_reference, ''), p_reference,
      'ap_payments', null,
      jsonb_build_array(
        jsonb_build_object('account_id', public.acc_system_account('AP_CONTROL'),
                           'description', 'Payment ' || _num, 'debit', p_amount,
                           'party_type', 'supplier', 'party_id', p_supplier_id),
        jsonb_build_object('account_id', _credit_account, 'description', 'Payment ' || _num, 'credit', p_amount)));

  insert into public.ap_payments (payment_number, supplier_id, payment_date, amount, mode,
      bank_account_id, cheque_number, cheque_date, cheque_status, reference, notes, voucher_id, created_by)
  values (_num, p_supplier_id, p_payment_date, p_amount, p_mode,
      p_bank_account_id, p_cheque_number, p_cheque_date,
      case when p_mode = 'cheque' then 'pending' end,
      p_reference, p_notes, _vid, auth.uid())
  returning id into _pid;

  update public.vouchers set source_id = _pid where id = _vid;

  insert into public.ap_payment_allocations (payment_id, bill_id, amount)
  select _pid, (a->>'bill_id')::uuid, (a->>'amount')::numeric
    from jsonb_array_elements(p_allocations) as a;

  return _pid;
end $$;

create or replace function public.mark_ap_cheque_bounced(p_payment_id uuid)
returns void
language plpgsql security definer
set search_path to 'public'
as $$
declare
  p record;
begin
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  select * into p from public.ap_payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if p.mode <> 'cheque' or p.cheque_status <> 'pending' then
    raise exception 'Only pending cheque payments can be marked bounced';
  end if;
  perform public.reverse_voucher(p.voucher_id, current_date, 'Cheque ' || coalesce(p.cheque_number, '') || ' bounced');
  delete from public.ap_payment_allocations where payment_id = p_payment_id;
  update public.ap_payments set cheque_status = 'bounced' where id = p_payment_id;
end $$;

-- ============ CHEQUE REGISTER ============
create view public.cheque_register with (security_invoker = true) as
select 'received' as direction, r.id as source_id, r.receipt_number as doc_number,
       r.receipt_date as entry_date, r.cheque_number, r.cheque_date, r.cheque_status,
       r.amount, c.name as party_name, b.name as bank_account_name
  from public.ar_receipts r
  join public.clients c on c.id = r.client_id
  left join public.bank_accounts b on b.id = r.bank_account_id
 where r.mode = 'cheque'
union all
select 'issued', p.id, p.payment_number, p.payment_date, p.cheque_number, p.cheque_date,
       p.cheque_status, p.amount, s.name, b.name
  from public.ap_payments p
  join public.suppliers s on s.id = p.supplier_id
  left join public.bank_accounts b on b.id = p.bank_account_id
 where p.mode = 'cheque';

-- ============ PAYROLL → GL ============
-- Dr Salary Expense (gross) / Cr Employee Advances (deductions) + Salaries Payable (net)
create or replace function public.post_payroll_run(p_run_id uuid)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  r record;
  _num text;
  _vid uuid;
  _existing uuid;
  _lines jsonb;
  _vdate date;
begin
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  select * into r from public.payroll_runs where id = p_run_id;
  if not found then raise exception 'Payroll run not found'; end if;
  if r.finalized_at is null then raise exception 'Payroll run must be finalized before posting'; end if;
  select id into _existing from public.vouchers
   where source_table = 'payroll_runs' and source_id = p_run_id and status in ('posted','reversed');
  if _existing is not null then raise exception 'Payroll run is already posted to the GL'; end if;
  if coalesce(r.total_gross, 0) <= 0 then raise exception 'Payroll run has no amounts'; end if;

  _vdate := (date_trunc('month', r.period_month) + interval '1 month - 1 day')::date;
  _num := public.next_voucher_number('PY', _vdate);
  _lines := jsonb_build_array(
    jsonb_build_object('account_id', public.acc_system_account('SALARY_EXPENSE'),
                       'description', 'Payroll ' || to_char(r.period_month, 'Mon YYYY'), 'debit', r.total_gross));
  if coalesce(r.total_deductions, 0) > 0 then
    _lines := _lines || jsonb_build_array(jsonb_build_object(
      'account_id', public.acc_system_account('EMP_ADVANCES'),
      'description', 'Payroll deductions ' || to_char(r.period_month, 'Mon YYYY'), 'credit', r.total_deductions));
  end if;
  _lines := _lines || jsonb_build_array(jsonb_build_object(
      'account_id', public.acc_system_account('SALARIES_PAYABLE'),
      'description', 'Net payable ' || to_char(r.period_month, 'Mon YYYY'), 'credit', r.total_net));

  _vid := public._acc_create_posted_voucher('PY', _num, _vdate,
      'Payroll ' || to_char(r.period_month, 'Mon YYYY') || coalesce(' (' || r.run_code || ')', ''),
      r.run_code, 'payroll_runs', p_run_id, _lines);
  return _vid;
end $$;
