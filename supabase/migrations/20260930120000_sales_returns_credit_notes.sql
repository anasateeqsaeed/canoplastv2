-- Sales Returns / Credit Notes — customer-level material return accounting.
--
-- Problem: goods dispatched to a customer come back later (rejections, QC
-- failures, damage), often as accumulated quantities across several delivery
-- challans and months. The existing dispatch_returns flow only works against
-- ONE dispatch, so there was no way to gate the material back in and credit
-- the customer's account for the value.
--
-- This migration adds a customer-level Sales Return document that, on posting:
--   1. gates the material in  (gate_movements, direction 'in')
--   2. restores FG stock       (stock_transactions 'return', optionally
--                               followed by 'rejection' for scrap/rework)
--   3. issues a Credit Note    (credit_note_number + value, reducing the
--                               customer's account; optional allocation
--                               against issued invoices; optional GL voucher
--                               of type 'CN' when the accounting module is
--                               installed)
--
-- Reporting helpers: client_product_ledger (qty in/out per product) and
-- client_account_statement (invoices vs credit notes vs receipts).

-- ============ TABLES ============
create table if not exists public.sales_returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  credit_note_number text unique,
  gate_pass_number text,
  client_id uuid not null references public.clients(id) on delete restrict,
  return_date date not null default current_date,
  reason text not null default 'rejection'
    check (reason in ('rejection','quality','damaged','excess','wrong_item','other')),
  reference text,
  returned_by text,
  received_by text,
  vehicle_number text,
  driver_name text,
  tax_percent numeric(5,2) not null default 0,
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','posted','cancelled')),
  notes text,
  gate_movement_id uuid,
  gl_voucher_id uuid,
  created_by uuid,
  posted_by uuid,
  posted_at timestamptz,
  cancelled_by uuid,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sales_returns_client on public.sales_returns(client_id);
create index if not exists idx_sales_returns_date on public.sales_returns(return_date desc);
create index if not exists idx_sales_returns_status on public.sales_returns(status);

create table if not exists public.sales_return_items (
  id uuid primary key default gen_random_uuid(),
  sales_return_id uuid not null references public.sales_returns(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  dispatch_item_id uuid references public.dispatch_items(id) on delete set null,
  quantity integer not null check (quantity > 0),
  weight_kg numeric(12,3),
  rate numeric(14,4) not null default 0 check (rate >= 0),
  line_total numeric(14,2) generated always as (round(quantity * rate, 2)) stored,
  disposition text not null default 'restock' check (disposition in ('restock','rework','scrap')),
  remarks text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_sri_return on public.sales_return_items(sales_return_id);
create index if not exists idx_sri_product on public.sales_return_items(product_id);

-- Credit note applied against specific issued invoices (optional; a credit
-- note can also sit unallocated "on account").
create table if not exists public.sales_return_allocations (
  id uuid primary key default gen_random_uuid(),
  sales_return_id uuid not null references public.sales_returns(id) on delete cascade,
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  -- Removing an allocation marks it inactive instead of erasing the row,
  -- so the credit note keeps its full history.
  is_active boolean not null default true,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (sales_return_id, invoice_id)
);
create index if not exists idx_sra_invoice on public.sales_return_allocations(invoice_id);

alter table public.gate_movements
  add column if not exists sales_return_id uuid references public.sales_returns(id) on delete set null;

-- Invoice settlement columns (already present on the live DB from Phase 4;
-- added here so a fresh database also carries them).
alter table public.sales_invoices
  add column if not exists amount_paid numeric(14,2) not null default 0;
alter table public.sales_invoices
  add column if not exists payment_status text not null default 'unpaid';

-- ============ NUMBERING + TOTALS ============
create or replace function public.generate_sales_return_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.return_number is null or new.return_number = '' then
    new.return_number := public.next_doc_number('sales_return', 'SR');
  end if;
  if new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end $$;
create trigger trg_sales_return_number before insert on public.sales_returns
  for each row execute function public.generate_sales_return_number();

create trigger trg_sales_returns_updated_at before update on public.sales_returns
  for each row execute function public.update_updated_at_column();

create or replace function public.recompute_sales_return_totals(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_sub numeric := 0;
  v_tax_pct numeric := 0;
  v_tax numeric := 0;
begin
  select coalesce(sum(line_total), 0) into v_sub
    from public.sales_return_items where sales_return_id = _id;
  select tax_percent into v_tax_pct from public.sales_returns where id = _id;
  if not found then return; end if;
  v_tax := round(v_sub * coalesce(v_tax_pct, 0) / 100.0, 2);
  update public.sales_returns
     set subtotal = v_sub, tax_amount = v_tax, total_amount = v_sub + v_tax
   where id = _id;
end $$;

-- Items may only change while the document is a draft.
create or replace function public.trg_sales_return_items_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status text; v_id uuid;
begin
  v_id := coalesce(new.sales_return_id, old.sales_return_id);
  select status into v_status from public.sales_returns where id = v_id;
  -- Parent already gone: this is the ON DELETE CASCADE of a draft being deleted.
  if v_status is null then return coalesce(new, old); end if;
  if v_status <> 'draft' then
    raise exception 'Sales return is % — lines cannot be changed', coalesce(v_status, 'missing');
  end if;
  return coalesce(new, old);
end $$;
create trigger trg_sri_guard before insert or update or delete on public.sales_return_items
  for each row execute function public.trg_sales_return_items_guard();

create or replace function public.trg_sales_return_items_recalc()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_sales_return_totals(coalesce(new.sales_return_id, old.sales_return_id));
  return coalesce(new, old);
end $$;
create trigger trg_sri_recalc after insert or update or delete on public.sales_return_items
  for each row execute function public.trg_sales_return_items_recalc();

-- Header guard: posted/cancelled documents are frozen except for the columns
-- the posting/cancel/GL functions themselves set (they run with the
-- app.sales_return_internal flag on).
create or replace function public.trg_sales_returns_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('app.sales_return_internal', true) = 'on' then
    return new;
  end if;
  if old.status <> 'draft' then
    raise exception 'Sales return % is % and cannot be edited', old.return_number, old.status;
  end if;
  if new.status <> old.status then
    raise exception 'Use post_sales_return / cancel_sales_return to change status';
  end if;
  if new.tax_percent is distinct from old.tax_percent then
    new.tax_amount := round(coalesce(new.subtotal, 0) * coalesce(new.tax_percent, 0) / 100.0, 2);
    new.total_amount := coalesce(new.subtotal, 0) + new.tax_amount;
  end if;
  return new;
end $$;
create trigger trg_sales_returns_guard before update on public.sales_returns
  for each row execute function public.trg_sales_returns_guard();

-- ============ ROLE HELPERS ============
-- Same definition as the Phase 4 accounting module; repeated here so this
-- migration also stands on a database without that module.
create or replace function public.has_accounting_access(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
     where user_id = _user_id
       and role in ('admin', 'accountant', 'finance_manager')
  )
$$;

create or replace function public.can_manage_sales_returns(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
     where user_id = _user_id
       and role in ('admin', 'sales_manager', 'store_incharge')
  )
$$;

create or replace function public.can_view_customer_ledger(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
     where user_id = _user_id
       and role in ('admin', 'sales_manager', 'store_incharge', 'accountant', 'finance_manager', 'super_user')
  )
$$;

-- ============ POST ============
-- Gate-in + FG stock restore + credit note number. Idempotent guard on status.
create or replace function public.post_sales_return(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  it record;
  v_client_name text;
  v_latest integer;
  v_after integer;
  v_gate_id uuid;
  v_gate_no text;
  v_desc text;
  v_total_qty integer;
  v_total_wt numeric;
  v_cn text;
begin
  if not public.can_manage_sales_returns(auth.uid()) then
    raise exception 'Not authorised to post sales returns';
  end if;

  select * into r from public.sales_returns where id = p_id for update;
  if not found then raise exception 'Sales return not found'; end if;
  if r.status <> 'draft' then raise exception 'Sales return % is already %', r.return_number, r.status; end if;
  if not exists (select 1 from public.sales_return_items where sales_return_id = p_id) then
    raise exception 'Add at least one product line before posting';
  end if;

  select name into v_client_name from public.clients where id = r.client_id;

  perform public.recompute_sales_return_totals(p_id);

  -- 1. FG stock ledger
  for it in
    select i.*, p.code as product_code, p.name as product_name
      from public.sales_return_items i
      join public.products p on p.id = i.product_id
     where i.sales_return_id = p_id
     order by i.sort_order, i.created_at
  loop
    select balance_after into v_latest
      from public.stock_transactions
     where product_id = it.product_id
     order by created_at desc, id desc
     for update
     limit 1;
    v_latest := coalesce(v_latest, 0);
    v_after := v_latest + it.quantity;

    insert into public.stock_transactions
      (product_id, transaction_type, quantity, balance_after, reference_type, reference_id, performed_by, remarks)
    values
      (it.product_id, 'return', it.quantity, v_after, 'sales_return', p_id, auth.uid(),
       'Customer return ' || r.return_number || ' from ' || coalesce(v_client_name, 'customer')
       || ' (' || it.disposition || ')');

    -- Rework / scrap: material is back on site but not saleable stock, so
    -- book the offsetting rejection right away (net FG balance unchanged,
    -- both movements stay visible in the ledger).
    if it.disposition <> 'restock' then
      insert into public.stock_transactions
        (product_id, transaction_type, quantity, balance_after, reference_type, reference_id, performed_by, remarks)
      values
        (it.product_id, 'rejection', -it.quantity, v_after - it.quantity, 'sales_return', p_id, auth.uid(),
         'Customer return ' || r.return_number || ' — ' || it.disposition);
    end if;
  end loop;

  -- 2. Gate-in movement
  select string_agg(p.code || ' × ' || i.quantity, ', ' order by i.sort_order, i.created_at),
         sum(i.quantity), sum(coalesce(i.weight_kg, 0))
    into v_desc, v_total_qty, v_total_wt
    from public.sales_return_items i
    join public.products p on p.id = i.product_id
   where i.sales_return_id = p_id;

  insert into public.gate_movements
    (type, direction, movement_date, party_kind, party_name, customer_id, sales_return_id,
     item_description, quantity, unit, weight_kg, vehicle_no, driver_name, status, remarks, created_by)
  values
    ('dispatch_return', 'in', r.return_date, 'customer', v_client_name, r.client_id, p_id,
     left(v_desc, 500), v_total_qty, 'pcs', nullif(v_total_wt, 0), r.vehicle_number, r.driver_name,
     'closed', 'Sales return ' || r.return_number || coalesce(' — ' || r.reference, ''), auth.uid())
  returning id, gate_no into v_gate_id, v_gate_no;

  -- 3. Credit note
  v_cn := public.next_doc_number('credit_note', 'CN');

  perform set_config('app.sales_return_internal', 'on', true);
  update public.sales_returns
     set status = 'posted',
         credit_note_number = v_cn,
         gate_movement_id = v_gate_id,
         gate_pass_number = v_gate_no,
         posted_by = auth.uid(),
         posted_at = now()
   where id = p_id;
  perform set_config('app.sales_return_internal', '', true);
end $$;

-- ============ CANCEL ============
create or replace function public.cancel_sales_return(p_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  t record;
  v_latest integer;
begin
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sales_manager')) then
    raise exception 'Only admin or sales manager can cancel a sales return';
  end if;

  select * into r from public.sales_returns where id = p_id for update;
  if not found then raise exception 'Sales return not found'; end if;
  if r.status = 'cancelled' then raise exception 'Sales return % is already cancelled', r.return_number; end if;

  if r.status = 'posted' then
    if r.gl_voucher_id is not null then
      if not public.has_accounting_access(auth.uid()) then
        raise exception 'Credit note % is posted to the GL — an accountant must cancel it', r.credit_note_number;
      end if;
      perform public.reverse_voucher(r.gl_voucher_id, current_date,
        'Cancel credit note ' || r.credit_note_number || coalesce(': ' || p_reason, ''));
    end if;

    -- Reverse every FG ledger movement this return created.
    for t in
      select * from public.stock_transactions
       where reference_type = 'sales_return' and reference_id = p_id
       order by created_at, id
    loop
      select balance_after into v_latest
        from public.stock_transactions
       where product_id = t.product_id
       order by created_at desc, id desc
       for update
       limit 1;
      v_latest := coalesce(v_latest, 0);
      insert into public.stock_transactions
        (product_id, transaction_type, quantity, balance_after, reference_type, reference_id, performed_by, remarks)
      values
        (t.product_id, 'adjustment', -t.quantity, v_latest - t.quantity, 'sales_return_cancel', p_id, auth.uid(),
         'Cancel ' || r.return_number || coalesce(': ' || p_reason, ''));
    end loop;

    update public.gate_movements
       set status = 'cancelled',
           remarks = coalesce(remarks || ' | ', '') || 'Cancelled' || coalesce(': ' || p_reason, '')
     where id = r.gate_movement_id;

    update public.sales_return_allocations
       set is_active = false, removed_at = now()
     where sales_return_id = p_id and is_active;
  end if;

  perform set_config('app.sales_return_internal', 'on', true);
  update public.sales_returns
     set status = 'cancelled',
         cancelled_by = auth.uid(),
         cancelled_at = now(),
         cancel_reason = p_reason
   where id = p_id;
  perform set_config('app.sales_return_internal', '', true);
end $$;

-- ============ INVOICE ALLOCATION ============
-- amount_paid on an invoice = cash receipts + credit notes applied to it.
create or replace function public.recompute_invoice_paid()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _ids uuid[];
begin
  _ids := array_remove(array[
    case when tg_op <> 'INSERT' then old.invoice_id end,
    case when tg_op <> 'DELETE' then new.invoice_id end], null);

  update public.sales_invoices si
     set amount_paid = coalesce((select sum(a.amount) from public.sales_return_allocations a
                                  where a.invoice_id = si.id and a.is_active), 0)
   where si.id = any(_ids);

  if to_regclass('public.ar_receipt_allocations') is not null then
    execute 'update public.sales_invoices si
                set amount_paid = si.amount_paid
                  + coalesce((select sum(a.amount) from public.ar_receipt_allocations a where a.invoice_id = si.id), 0)
              where si.id = any($1)'
    using _ids;
  end if;

  update public.sales_invoices si
     set payment_status = case
       when si.amount_paid <= 0 then 'unpaid'
       when si.amount_paid >= si.total_amount then 'paid'
       else 'partial' end
   where si.id = any(_ids);
  return null;
end $$;

create trigger trg_sra_recompute after insert or update or delete on public.sales_return_allocations
  for each row execute function public.recompute_invoice_paid();

-- Replace the allocation set of a posted credit note.
-- p_allocations: [{"invoice_id": "...", "amount": 123.45}, ...]
create or replace function public.set_sales_return_allocations(p_id uuid, p_allocations jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  a record;
  v_total numeric := 0;
  v_outstanding numeric;
  v_existing numeric;
begin
  if not (public.can_manage_sales_returns(auth.uid()) or public.has_accounting_access(auth.uid())) then
    raise exception 'Not authorised';
  end if;
  select * into r from public.sales_returns where id = p_id for update;
  if not found then raise exception 'Sales return not found'; end if;
  if r.status <> 'posted' then raise exception 'Only a posted credit note can be applied to invoices'; end if;

  for a in select (x->>'invoice_id')::uuid as invoice_id, (x->>'amount')::numeric as amount
             from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) as x
  loop
    if a.amount is null or a.amount <= 0 then raise exception 'Allocation amounts must be positive'; end if;
    select coalesce((select sum(amount) from public.sales_return_allocations
                      where invoice_id = a.invoice_id and sales_return_id = p_id and is_active), 0)
      into v_existing;
    select si.total_amount - si.amount_paid + v_existing into v_outstanding
      from public.sales_invoices si
     where si.id = a.invoice_id and si.client_id = r.client_id and si.status = 'issued'
       for update;
    if v_outstanding is null then raise exception 'Invoice not found for this customer (must be issued)'; end if;
    if a.amount > v_outstanding + 0.01 then
      raise exception 'Allocation % exceeds invoice outstanding (%)', a.amount, v_outstanding;
    end if;
    v_total := v_total + a.amount;
  end loop;
  if v_total > r.total_amount + 0.01 then
    raise exception 'Allocations (%) exceed credit note value (%)', v_total, r.total_amount;
  end if;

  update public.sales_return_allocations
     set is_active = false, removed_at = now()
   where sales_return_id = p_id and is_active;

  insert into public.sales_return_allocations (sales_return_id, invoice_id, amount, is_active, removed_at)
  select p_id, (x->>'invoice_id')::uuid, (x->>'amount')::numeric, true, null
    from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) as x
  on conflict (sales_return_id, invoice_id)
  do update set amount = excluded.amount, is_active = true, removed_at = null;
end $$;

-- ============ GL POSTING (accounting module, when installed) ============
-- Dr Sales Returns (net) / Dr GST Output (tax)  ->  Cr Trade Debtors (party = client)
create or replace function public.post_sales_return_to_gl(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_client_name text;
  v_num text;
  v_vid uuid;
  v_ret_acct uuid;
  v_parent uuid;
  v_lines jsonb;
begin
  if to_regclass('public.vouchers') is null then
    raise exception 'Accounting module is not installed';
  end if;
  if not public.has_accounting_access(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  select * into r from public.sales_returns where id = p_id for update;
  if not found then raise exception 'Sales return not found'; end if;
  if r.status <> 'posted' then raise exception 'Only posted credit notes can be booked to the GL'; end if;
  if r.gl_voucher_id is not null then raise exception 'Credit note % is already in the GL', r.credit_note_number; end if;
  if r.total_amount <= 0 then raise exception 'Credit note value is zero — set rates on the lines first'; end if;

  select name into v_client_name from public.clients where id = r.client_id;

  -- Contra-income account for returns; created on first use.
  select id into v_ret_acct from public.chart_of_accounts where system_key = 'SALES_RETURNS';
  if v_ret_acct is null then
    select id into v_parent from public.chart_of_accounts where code = '4000' and is_group;
    insert into public.chart_of_accounts (code, name, account_type, parent_id, is_group, system_key, description, is_active)
    values ('4350', 'Sales Returns & Allowances', 'income', v_parent, false, 'SALES_RETURNS',
            'Credit notes for goods returned by customers', true)
    returning id into v_ret_acct;
  end if;

  v_num := public.next_voucher_number('CN', r.return_date);
  v_lines := jsonb_build_array(
    jsonb_build_object('account_id', v_ret_acct,
                       'description', 'Credit note ' || r.credit_note_number || ' — ' || coalesce(v_client_name, ''),
                       'debit', r.total_amount - r.tax_amount));
  if r.tax_amount > 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_id', public.acc_system_account('GST_OUTPUT'),
                         'description', 'GST reversed on ' || r.credit_note_number,
                         'debit', r.tax_amount));
  end if;
  v_lines := v_lines || jsonb_build_array(
    jsonb_build_object('account_id', public.acc_system_account('AR_CONTROL'),
                       'description', 'Credit note ' || r.credit_note_number,
                       'credit', r.total_amount, 'party_type', 'client', 'party_id', r.client_id));

  v_vid := public._acc_create_posted_voucher('CN', v_num, r.return_date,
             'Credit note ' || r.credit_note_number || ' — return ' || r.return_number
               || ' from ' || coalesce(v_client_name, 'customer'),
             r.credit_note_number, 'sales_returns', p_id, v_lines);

  perform set_config('app.sales_return_internal', 'on', true);
  update public.sales_returns set gl_voucher_id = v_vid where id = p_id;
  perform set_config('app.sales_return_internal', '', true);
  return v_vid;
end $$;

-- ============ CUSTOMER LEDGERS ============
-- Quantity account per product: what went out on challans vs what came back.
create or replace function public.client_product_ledger(p_client_id uuid, p_from date default null, p_to date default null)
returns table (
  product_id uuid,
  product_code text,
  product_name text,
  dispatched_qty bigint,
  dispatch_returned_qty bigint,
  sales_returned_qty bigint,
  net_qty bigint,
  dispatched_value numeric,
  credited_value numeric,
  last_dispatch_date date,
  last_return_date date
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_view_customer_ledger(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  return query
  with d as (
    select di.product_id,
           sum(di.total_qty)::bigint as qty,
           sum(di.total_qty * coalesce(di.agreed_selling_price, 0)) as value,
           max(ds.dispatch_date) as last_date
      from public.dispatch_items di
      join public.dispatches ds on ds.id = di.dispatch_id
     where ds.client_id = p_client_id
       and ds.status not in ('draft', 'cancelled')
       and (p_from is null or ds.dispatch_date >= p_from)
       and (p_to is null or ds.dispatch_date <= p_to)
     group by di.product_id
  ),
  dr as (
    select di.product_id,
           sum(dri.return_qty)::bigint as qty,
           max(r.return_date) as last_date
      from public.dispatch_return_items dri
      join public.dispatch_returns r on r.id = dri.dispatch_return_id
      join public.dispatch_items di on di.id = dri.dispatch_item_id
      join public.dispatches ds on ds.id = di.dispatch_id
     where ds.client_id = p_client_id
       and (p_from is null or r.return_date >= p_from)
       and (p_to is null or r.return_date <= p_to)
     group by di.product_id
  ),
  sr as (
    select i.product_id,
           sum(i.quantity)::bigint as qty,
           sum(i.line_total) as value,
           max(s.return_date) as last_date
      from public.sales_return_items i
      join public.sales_returns s on s.id = i.sales_return_id
     where s.client_id = p_client_id
       and s.status = 'posted'
       and (p_from is null or s.return_date >= p_from)
       and (p_to is null or s.return_date <= p_to)
     group by i.product_id
  ),
  keys as (
    select d.product_id from d
    union select dr.product_id from dr
    union select sr.product_id from sr
  )
  select k.product_id,
         p.code,
         p.name,
         coalesce(d.qty, 0),
         coalesce(dr.qty, 0),
         coalesce(sr.qty, 0),
         coalesce(d.qty, 0) - coalesce(dr.qty, 0) - coalesce(sr.qty, 0),
         coalesce(d.value, 0),
         coalesce(sr.value, 0),
         d.last_date,
         greatest(dr.last_date, sr.last_date)
    from keys k
    join public.products p on p.id = k.product_id
    left join d on d.product_id = k.product_id
    left join dr on dr.product_id = k.product_id
    left join sr on sr.product_id = k.product_id
   order by p.name;
end $$;

-- Money account: issued invoices (debit) vs credit notes and receipts (credit).
create or replace function public.client_account_statement(p_client_id uuid, p_from date default null, p_to date default null)
returns table (
  entry_date date,
  doc_type text,
  doc_number text,
  doc_id uuid,
  description text,
  debit numeric,
  credit numeric,
  sort_ts timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_view_customer_ledger(auth.uid()) then
    raise exception 'Not authorised';
  end if;
  return query
  select si.invoice_date, 'invoice'::text,
         coalesce(si.invoice_number_override, si.invoice_number), si.id,
         ('Invoice ' || si.invoice_type
           || case when si.period_from is not null then ' ' || si.period_from::text || ' – ' || si.period_to::text else '' end)::text,
         si.total_amount, 0::numeric, si.created_at
    from public.sales_invoices si
   where si.client_id = p_client_id and si.status = 'issued'
     and (p_from is null or si.invoice_date >= p_from)
     and (p_to is null or si.invoice_date <= p_to);

  return query
  select s.return_date, 'credit_note'::text, s.credit_note_number, s.id,
         ('Credit note — return ' || s.return_number || ' (' || s.reason || ')')::text,
         0::numeric, s.total_amount, s.posted_at
    from public.sales_returns s
   where s.client_id = p_client_id and s.status = 'posted'
     and (p_from is null or s.return_date >= p_from)
     and (p_to is null or s.return_date <= p_to);

  if to_regclass('public.ar_receipts') is not null then
    return query execute
      'select r.receipt_date, ''receipt''::text, r.receipt_number, r.id,
              (''Receipt '' || r.mode || coalesce('' — '' || r.reference, ''''))::text,
              0::numeric, r.amount, r.created_at
         from public.ar_receipts r
        where r.client_id = $1
          and ($2::date is null or r.receipt_date >= $2)
          and ($3::date is null or r.receipt_date <= $3)'
      using p_client_id, p_from, p_to;
  end if;
end $$;

-- ============ RLS ============
alter table public.sales_returns enable row level security;
alter table public.sales_return_items enable row level security;
alter table public.sales_return_allocations enable row level security;

create policy "sales_returns_select" on public.sales_returns for select to authenticated using (true);
create policy "sales_returns_insert" on public.sales_returns for insert to authenticated
  with check (public.can_manage_sales_returns(auth.uid()));
create policy "sales_returns_update" on public.sales_returns for update to authenticated
  using (public.can_manage_sales_returns(auth.uid()));
create policy "sales_returns_delete" on public.sales_returns for delete to authenticated
  using (status = 'draft' and public.can_manage_sales_returns(auth.uid()));

create policy "sri_select" on public.sales_return_items for select to authenticated using (true);
create policy "sri_write" on public.sales_return_items for all to authenticated
  using (public.can_manage_sales_returns(auth.uid()))
  with check (public.can_manage_sales_returns(auth.uid()));

create policy "sra_select" on public.sales_return_allocations for select to authenticated using (true);
create policy "sra_write" on public.sales_return_allocations for all to authenticated
  using (public.can_manage_sales_returns(auth.uid()) or public.has_accounting_access(auth.uid()))
  with check (public.can_manage_sales_returns(auth.uid()) or public.has_accounting_access(auth.uid()));

grant execute on function public.post_sales_return(uuid) to authenticated;
grant execute on function public.cancel_sales_return(uuid, text) to authenticated;
grant execute on function public.set_sales_return_allocations(uuid, jsonb) to authenticated;
grant execute on function public.post_sales_return_to_gl(uuid) to authenticated;
grant execute on function public.client_product_ledger(uuid, date, date) to authenticated;
grant execute on function public.client_account_statement(uuid, date, date) to authenticated;
