-- Phase 3: Sales module — products master, quotations, sales orders,
-- dispatch (+returns), sales invoices (+corrections), FG stock ledger.
-- Ported from v1 with adaptations:
--   * products.mold_id / masterbatch_id / formulation_group_id kept as plain
--     uuid columns WITHOUT foreign keys (molds/formulations arrive in Phase 5).
--   * dispatch_items.packing_type_id is a plain uuid (packing_types = Phase 5).
--   * recalc_so_item_progress only recomputes dispatched_qty for now;
--     produced_qty reconnects to production_jobs in Phase 5.
--   * All document numbering rides on public.next_doc_number (Phase 2).

-- ============ PRODUCTS ============
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  category text,
  product_type text,
  color text,
  image_url text,
  client_id uuid references public.clients(id) on delete set null,
  material_id uuid references public.materials(id) on delete set null,
  -- Phase 5 references (no FKs yet)
  mold_id uuid,
  masterbatch_id uuid,
  formulation_group_id uuid,
  weight_per_piece numeric,
  agreed_weight_per_piece numeric,
  agreed_weight_unit text,
  agreed_weight_notes text,
  cycle_time numeric,
  cavities integer default 1,
  masterbatch_ratio numeric,
  waste_percent numeric,
  additives jsonb,
  is_assembled boolean not null default false,
  selling_price numeric,
  labour_price numeric,
  price_unit text default 'pcs',
  -- costing/pricing overrides (Phase 5 costing engine reads these)
  labour_rate_per_min_override numeric,
  pieces_per_hour_override numeric,
  ke_rate_override numeric,
  carton_packing_override numeric,
  quality_inspection_override numeric,
  transport_override numeric,
  fitting_component1_cost numeric,
  fitting_component2_cost numeric,
  fitting_assembly_labour numeric,
  fitting_labour_override numeric,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_products_client on public.products(client_id);
create index idx_products_material on public.products(material_id);

alter table public.products enable row level security;

create policy "products_select_authenticated"
  on public.products for select to authenticated using (true);
create policy "products_insert_sales"
  on public.products for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sales_manager'));
create policy "products_update_sales"
  on public.products for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sales_manager'));
create policy "products_delete_admin"
  on public.products for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.update_updated_at_column();

-- ============ PRODUCT PRICE HISTORY ============
create table public.product_price_history (
  id uuid not null default gen_random_uuid() primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  selling_price numeric not null default 0,
  labour_price numeric not null default 0,
  price_unit text not null default 'pcs',
  effective_from date not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (product_id, effective_from)
);

create index idx_product_price_history_product_date
  on public.product_price_history (product_id, effective_from desc);

alter table public.product_price_history enable row level security;

create policy "pph_select_authenticated"
  on public.product_price_history for select to authenticated using (true);
create policy "pph_insert_sales"
  on public.product_price_history for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sales_manager'));
create policy "pph_update_sales"
  on public.product_price_history for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sales_manager'));
create policy "pph_delete_admin"
  on public.product_price_history for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.get_product_price_on(_product_id uuid, _on_date date)
returns table(selling_price numeric, labour_price numeric, price_unit text)
language sql
stable
security definer
set search_path = public
as $$
  select selling_price, labour_price, price_unit
  from public.product_price_history
  where product_id = _product_id
    and effective_from <= _on_date
  order by effective_from desc
  limit 1
$$;

-- ============ QUOTATIONS ============
create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  quote_date date not null default current_date,
  valid_until date,
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','rejected','expired')),
  subtotal numeric(14,2) not null default 0,
  tax_percent numeric(5,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_quotations_client on public.quotations(client_id);
create index idx_quotations_date on public.quotations(quote_date);
create index idx_quotations_status on public.quotations(status);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  labour_price numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index idx_quotation_items_qid on public.quotation_items(quotation_id);

-- ============ SALES ORDERS ============
create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  so_number text not null unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  quotation_id uuid references public.quotations(id) on delete set null,
  customer_po_number text,
  customer_po_date date,
  order_date date not null default current_date,
  required_date date,
  status text not null default 'open'
    check (status in ('open','in_production','fulfilled','closed','cancelled')),
  subtotal numeric(14,2) not null default 0,
  tax_percent numeric(5,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_sales_orders_client on public.sales_orders(client_id);
create index idx_sales_orders_date on public.sales_orders(order_date);
create index idx_sales_orders_status on public.sales_orders(status);

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  ordered_qty numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  labour_price numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  produced_qty numeric(14,2) not null default 0,
  dispatched_qty numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_so_items_soid on public.sales_order_items(sales_order_id);
create index idx_so_items_product on public.sales_order_items(product_id);

-- ============ NUMBERING (on top of next_doc_number) ============
create or replace function public.next_quotation_number()
returns text language sql security definer set search_path = public as
$$ select public.next_doc_number('quotation', 'QT') $$;

create or replace function public.next_sales_order_number()
returns text language sql security definer set search_path = public as
$$ select public.next_doc_number('sales_order', 'SO') $$;

create or replace function public.set_quotation_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.quote_number is null or new.quote_number = '' then
    new.quote_number := public.next_quotation_number();
  end if;
  return new;
end $$;
create trigger trg_set_quotation_number before insert on public.quotations
  for each row execute function public.set_quotation_number();

create or replace function public.set_sales_order_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.so_number is null or new.so_number = '' then
    new.so_number := public.next_sales_order_number();
  end if;
  return new;
end $$;
create trigger trg_set_sales_order_number before insert on public.sales_orders
  for each row execute function public.set_sales_order_number();

-- ============ HEADER TOTAL RECALC ============
create or replace function public.recalc_quotation_totals(_qid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare _sub numeric; _tax_pct numeric; _tax numeric;
begin
  select coalesce(sum(line_total),0) into _sub from quotation_items where quotation_id = _qid;
  select tax_percent into _tax_pct from quotations where id = _qid;
  _tax := _sub * coalesce(_tax_pct,0) / 100.0;
  update quotations set subtotal = _sub, tax_amount = _tax, total_amount = _sub + _tax, updated_at = now()
    where id = _qid;
end $$;

create or replace function public.trg_quotation_items_recalc()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT','UPDATE') then
    new.line_total := coalesce(new.qty,0) * coalesce(new.selling_price,0);
  end if;
  if tg_op = 'DELETE' then
    perform recalc_quotation_totals(old.quotation_id);
    return old;
  end if;
  return new;
end $$;
create trigger trg_q_items_calc_line before insert or update on public.quotation_items
  for each row execute function public.trg_quotation_items_recalc();

create or replace function public.trg_quotation_items_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform recalc_quotation_totals(coalesce(new.quotation_id, old.quotation_id));
  return null;
end $$;
create trigger trg_q_items_after after insert or update or delete on public.quotation_items
  for each row execute function public.trg_quotation_items_after();

create or replace function public.recalc_sales_order_totals(_soid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare _sub numeric; _tax_pct numeric; _tax numeric;
begin
  select coalesce(sum(line_total),0) into _sub from sales_order_items where sales_order_id = _soid;
  select tax_percent into _tax_pct from sales_orders where id = _soid;
  _tax := _sub * coalesce(_tax_pct,0) / 100.0;
  update sales_orders set subtotal = _sub, tax_amount = _tax, total_amount = _sub + _tax, updated_at = now()
    where id = _soid;
end $$;

create or replace function public.trg_so_items_line()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.line_total := coalesce(new.ordered_qty,0) * coalesce(new.selling_price,0);
  return new;
end $$;
create trigger trg_so_items_line before insert or update on public.sales_order_items
  for each row execute function public.trg_so_items_line();

create or replace function public.trg_so_items_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform recalc_sales_order_totals(coalesce(new.sales_order_id, old.sales_order_id));
  return null;
end $$;
create trigger trg_so_items_after after insert or update or delete on public.sales_order_items
  for each row execute function public.trg_so_items_after();

-- ============ DISPATCHES ============
create table public.dispatches (
  id uuid not null default gen_random_uuid() primary key,
  dispatch_number text not null unique,
  client_id uuid not null references public.clients(id),
  consignee_name text,
  dispatch_date date not null default current_date,
  vehicle_number text,
  driver_name text,
  driver_phone text,
  gate_pass_number text,
  dispatched_by text,
  remarks text,
  status text not null default 'draft',
  is_third_party boolean not null default false,
  skip_auto_invoice boolean not null default false,
  total_pieces integer not null default 0,
  total_cartons integer not null default 0,
  total_weight_kg numeric(12,3) not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_dispatches_client on public.dispatches(client_id);
create index idx_dispatches_date on public.dispatches(dispatch_date);

create table public.dispatch_items (
  id uuid not null default gen_random_uuid() primary key,
  dispatch_id uuid not null references public.dispatches(id) on delete cascade,
  product_id uuid not null references public.products(id),
  -- packing_types master arrives in Phase 5; plain uuid for now
  packing_type_id uuid,
  num_packs integer not null default 0,
  loose_qty integer not null default 0,
  total_qty integer not null default 0,
  weight_kg numeric(12,3),
  agreed_selling_price numeric,
  agreed_labour_price numeric,
  agreed_price_unit text,
  agreed_weight_per_piece numeric,
  rate_source text,
  remarks text,
  created_at timestamptz not null default now()
);
create index idx_dispatch_items_dispatch on public.dispatch_items(dispatch_id);
create index idx_dispatch_items_product on public.dispatch_items(product_id);

-- Numbering: dispatch + gate pass via doc counters
create or replace function public.generate_dispatch_numbers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.dispatch_number is null or new.dispatch_number = '' then
    new.dispatch_number := public.next_doc_number('dispatch', 'DSP');
  end if;
  if new.gate_pass_number is null or new.gate_pass_number = '' then
    new.gate_pass_number := public.next_doc_number('gate_pass', 'GP');
  end if;
  return new;
end $$;
create trigger trg_set_dispatch_numbers before insert on public.dispatches
  for each row execute function public.generate_dispatch_numbers();

create trigger trg_dispatches_updated_at
  before update on public.dispatches
  for each row execute function public.update_updated_at_column();

-- ============ DISPATCH RETURNS ============
create table public.dispatch_returns (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.dispatches(id) on delete cascade,
  return_number text not null,
  return_date date not null default current_date,
  reason text,
  returned_by text,
  status text not null default 'pending',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dispatch_return_items (
  id uuid primary key default gen_random_uuid(),
  dispatch_return_id uuid not null references public.dispatch_returns(id) on delete cascade,
  dispatch_item_id uuid not null references public.dispatch_items(id) on delete cascade,
  return_qty integer not null default 0,
  weight_kg numeric,
  remarks text,
  created_at timestamptz not null default now()
);
create index idx_dr_items_return on public.dispatch_return_items(dispatch_return_id);

create or replace function public.generate_dispatch_return_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.return_number is null or new.return_number = '' then
    new.return_number := public.next_doc_number('dispatch_return', 'DR');
  end if;
  return new;
end $$;
create trigger trg_generate_dispatch_return_number
  before insert on public.dispatch_returns
  for each row execute function public.generate_dispatch_return_number();

create trigger trg_dispatch_returns_updated_at
  before update on public.dispatch_returns
  for each row execute function public.update_updated_at_column();

-- ============ FG STOCK LEDGER ============
create table public.stock_transactions (
  id uuid not null default gen_random_uuid() primary key,
  product_id uuid not null references public.products(id) on delete restrict,
  transaction_type text not null check (transaction_type in (
    'production_in','production_in_reversal',
    'assembly_issue','assembly_output','assembly_reserve',
    'external_receipt','adjustment','rejection','return',
    'dispatch','dispatch_return','production_receipt',
    'vendor_issue','vendor_return',
    'consumption','consumption_reversal',
    'hold_release','hold_reject',
    'opening_balance'
  )),
  quantity numeric not null,
  reference_type text,
  reference_id uuid,
  balance_after numeric not null,
  performed_by uuid,
  settled_at timestamptz,
  settled_by uuid,
  remarks text,
  created_at timestamptz not null default now()
);
create index idx_stock_txn_product on public.stock_transactions(product_id, created_at desc);

-- ============ SO PROGRESS (dispatch side; production reconnects in Phase 5) ============
create or replace function public.recalc_so_item_progress(_soi_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _dispatched numeric := 0;
  _so_id uuid;
  _client uuid;
  _product uuid;
  _order_date date;
begin
  select soi.sales_order_id, so.client_id, soi.product_id, so.order_date
    into _so_id, _client, _product, _order_date
    from sales_order_items soi
    join sales_orders so on so.id = soi.sales_order_id
    where soi.id = _soi_id;
  if _so_id is null then return; end if;

  -- produced_qty: recomputed from production_jobs when Phase 5 lands;
  -- until then it is left untouched.

  select coalesce(sum(di.total_qty),0) into _dispatched
    from dispatch_items di
    join dispatches d on d.id = di.dispatch_id
    where d.client_id = _client
      and di.product_id = _product
      and d.dispatch_date >= _order_date;

  update sales_order_items
    set dispatched_qty = _dispatched
    where id = _soi_id;
end $$;

create or replace function public.recalc_so_status(_so_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _total numeric := 0;
  _dispatched numeric := 0;
  _produced numeric := 0;
  _cur text;
begin
  select status into _cur from sales_orders where id = _so_id;
  if _cur in ('closed','cancelled') then return; end if;
  select coalesce(sum(ordered_qty),0), coalesce(sum(dispatched_qty),0), coalesce(sum(produced_qty),0)
    into _total, _dispatched, _produced
    from sales_order_items where sales_order_id = _so_id;
  if _total > 0 and _dispatched >= _total then
    update sales_orders set status='fulfilled', updated_at=now() where id=_so_id and status <> 'fulfilled';
  elsif _produced > 0 or _dispatched > 0 then
    update sales_orders set status='in_production', updated_at=now() where id=_so_id and status='open';
  end if;
end $$;

create or replace function public.trg_dispatch_items_so_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _client uuid;
  _product uuid;
  _rec record;
begin
  select d.client_id into _client from dispatches d
    where d.id = coalesce(new.dispatch_id, old.dispatch_id);
  _product := coalesce(new.product_id, old.product_id);
  if _client is null or _product is null then return null; end if;
  for _rec in
    select soi.id, soi.sales_order_id
      from sales_order_items soi
      join sales_orders so on so.id = soi.sales_order_id
      where so.client_id = _client
        and soi.product_id = _product
        and so.status not in ('closed','cancelled')
  loop
    perform recalc_so_item_progress(_rec.id);
    perform recalc_so_status(_rec.sales_order_id);
  end loop;
  return null;
end $$;
create trigger trg_dispatch_items_so_progress
  after insert or update or delete on public.dispatch_items
  for each row execute function public.trg_dispatch_items_so_progress();

-- ============ SALES INVOICES ============
create table public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  invoice_number_override text,
  invoice_date date not null default current_date,
  client_id uuid not null references public.clients(id) on delete restrict,
  invoice_type text not null default 'dispatch' check (invoice_type in ('dispatch','consolidated')),
  period_from date,
  period_to date,
  bill_to_name text,
  bill_to_address text,
  bill_to_gst text,
  subtotal numeric(14,2) not null default 0,
  tax_percent numeric(5,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  freight_charges numeric(14,2) not null default 0,
  other_charges numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','issued','cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_sales_invoices_client on public.sales_invoices(client_id);
create index idx_sales_invoices_date on public.sales_invoices(invoice_date);

create table public.sales_invoice_dispatches (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  dispatch_id uuid not null unique references public.dispatches(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index idx_sid_invoice on public.sales_invoice_dispatches(invoice_id);

create table public.sales_invoice_corrections (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  dispatch_item_id uuid references public.dispatch_items(id) on delete set null,
  line_label text,
  qty numeric,
  rate numeric,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_sic_invoice on public.sales_invoice_corrections(invoice_id);

-- Invoice numbering via doc counters (prefix INV)
create or replace function public.generate_sales_invoice_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := public.next_doc_number('sales_invoice', 'INV');
  end if;
  return new;
end $$;
create trigger trg_sales_invoice_number before insert on public.sales_invoices
  for each row execute function public.generate_sales_invoice_number();

create trigger trg_sales_invoice_updated before update on public.sales_invoices
  for each row execute function public.update_updated_at_column();

create trigger trg_sic_updated_at before update on public.sales_invoice_corrections
  for each row execute function public.update_updated_at_column();

-- Edit gate: draft = any authenticated, issued = admin only, cancelled = none
create or replace function public.can_edit_invoice(_invoice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sales_invoices si
    where si.id = _invoice_id
      and (
        (si.status = 'draft' and auth.uid() is not null)
        or (si.status = 'issued' and public.has_role(auth.uid(), 'admin'::app_role))
      )
  );
$$;

-- Corrections-aware total recompute (dispatch lines with overlays + manual lines)
create or replace function public.recompute_invoice_totals(_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric := 0;
  v_tax_percent numeric;
  v_freight numeric;
  v_other numeric;
  v_tax_amt numeric;
  v_total numeric;
begin
  select coalesce(sum(
    coalesce(c.qty, di.total_qty) * coalesce(c.rate, di.agreed_selling_price, 0)
  ), 0)
  into v_subtotal
  from public.sales_invoice_dispatches sid
  join public.dispatch_items di on di.dispatch_id = sid.dispatch_id
  left join public.sales_invoice_corrections c
    on c.invoice_id = sid.invoice_id and c.dispatch_item_id = di.id
  where sid.invoice_id = _invoice_id;

  v_subtotal := v_subtotal + coalesce((
    select sum(coalesce(qty,0) * coalesce(rate,0))
    from public.sales_invoice_corrections
    where invoice_id = _invoice_id and dispatch_item_id is null
  ), 0);

  select tax_percent, freight_charges, other_charges
    into v_tax_percent, v_freight, v_other
  from public.sales_invoices where id = _invoice_id;
  if not found then return; end if;

  v_tax_amt := round(v_subtotal * coalesce(v_tax_percent,0) / 100.0, 2);
  v_total := v_subtotal + v_tax_amt + coalesce(v_freight,0) + coalesce(v_other,0);

  update public.sales_invoices
     set subtotal = v_subtotal,
         tax_amount = v_tax_amt,
         total_amount = v_total,
         updated_at = now()
   where id = _invoice_id;
end;
$$;

-- Kept under the v1 name too; both recompute with corrections applied.
create or replace function public.recompute_sales_invoice_totals(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_invoice_totals(p_invoice_id);
end $$;

create or replace function public.trg_sid_recompute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_sales_invoice_totals(old.invoice_id);
    -- Auto-delete empty auto-dispatch invoice
    delete from public.sales_invoices
      where id = old.invoice_id
        and invoice_type = 'dispatch'
        and not exists (select 1 from public.sales_invoice_dispatches where invoice_id = old.invoice_id);
    return old;
  else
    perform public.recompute_sales_invoice_totals(new.invoice_id);
    return new;
  end if;
end $$;
create trigger trg_sid_recompute after insert or delete on public.sales_invoice_dispatches
  for each row execute function public.trg_sid_recompute();

create or replace function public.trg_invoice_recompute_on_field_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.tax_percent, new.freight_charges, new.other_charges) is distinct from
     (old.tax_percent, old.freight_charges, old.other_charges) then
    new.tax_amount := round(coalesce(new.subtotal,0) * coalesce(new.tax_percent,0) / 100.0, 2);
    new.total_amount := coalesce(new.subtotal,0) + new.tax_amount
                      + coalesce(new.freight_charges,0) + coalesce(new.other_charges,0);
  end if;
  return new;
end $$;
create trigger trg_invoice_recompute_fields before update on public.sales_invoices
  for each row execute function public.trg_invoice_recompute_on_field_change();

-- Auto-create draft invoice when a dispatch is inserted
create or replace function public.trg_dispatch_auto_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_invoice_id uuid; v_tax numeric;
begin
  if new.skip_auto_invoice is true or new.is_third_party is true then
    return new;
  end if;
  select coalesce(default_tax_percent,0) into v_tax from public.clients where id = new.client_id;
  insert into public.sales_invoices (invoice_date, client_id, invoice_type, tax_percent, status, created_by)
    values (new.dispatch_date, new.client_id, 'dispatch', coalesce(v_tax,0), 'draft', auth.uid())
    returning id into v_invoice_id;
  insert into public.sales_invoice_dispatches (invoice_id, dispatch_id) values (v_invoice_id, new.id);
  return new;
end $$;
create trigger trg_dispatch_auto_invoice after insert on public.dispatches
  for each row execute function public.trg_dispatch_auto_invoice();

-- Recompute linked invoice when dispatch item rates/qtys change
create or replace function public.trg_di_recompute_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_inv uuid; v_disp uuid;
begin
  v_disp := coalesce(new.dispatch_id, old.dispatch_id);
  select invoice_id into v_inv from public.sales_invoice_dispatches where dispatch_id = v_disp;
  if v_inv is not null then perform public.recompute_sales_invoice_totals(v_inv); end if;
  return coalesce(new, old);
end $$;
create trigger trg_di_recompute_invoice after insert or update or delete on public.dispatch_items
  for each row execute function public.trg_di_recompute_invoice();

-- Corrections recompute trigger
create or replace function public.trg_sic_recompute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_invoice_totals(old.invoice_id);
    return old;
  else
    perform public.recompute_invoice_totals(new.invoice_id);
    return new;
  end if;
end $$;
create trigger trg_sic_recompute_aiud
  after insert or update or delete on public.sales_invoice_corrections
  for each row execute function public.trg_sic_recompute();

-- Save RPC: replace corrections + update header in one shot
create or replace function public.save_invoice_corrections(
  p_invoice_id uuid,
  p_header jsonb,
  p_lines jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_can boolean;
  v_line jsonb;
begin
  select public.can_edit_invoice(p_invoice_id) into v_can;
  if not v_can then
    raise exception 'Not allowed to edit this invoice';
  end if;

  update public.sales_invoices
     set invoice_number_override = nullif(p_header->>'invoice_number_override',''),
         invoice_date = coalesce((p_header->>'invoice_date')::date, invoice_date),
         period_from = nullif(p_header->>'period_from','')::date,
         period_to = nullif(p_header->>'period_to','')::date,
         bill_to_name = nullif(p_header->>'bill_to_name',''),
         bill_to_address = nullif(p_header->>'bill_to_address',''),
         bill_to_gst = nullif(p_header->>'bill_to_gst',''),
         tax_percent = coalesce((p_header->>'tax_percent')::numeric, tax_percent),
         freight_charges = coalesce((p_header->>'freight_charges')::numeric, freight_charges),
         other_charges = coalesce((p_header->>'other_charges')::numeric, other_charges),
         notes = p_header->>'notes',
         updated_at = now()
   where id = p_invoice_id;

  delete from public.sales_invoice_corrections where invoice_id = p_invoice_id;

  if p_lines is not null and jsonb_typeof(p_lines) = 'array' then
    for v_line in select * from jsonb_array_elements(p_lines)
    loop
      insert into public.sales_invoice_corrections(
        invoice_id, dispatch_item_id, line_label, qty, rate, sort_order
      ) values (
        p_invoice_id,
        nullif(v_line->>'dispatch_item_id','')::uuid,
        nullif(v_line->>'line_label',''),
        nullif(v_line->>'qty','')::numeric,
        nullif(v_line->>'rate','')::numeric,
        coalesce((v_line->>'sort_order')::int, 0)
      );
    end loop;
  end if;

  perform public.recompute_invoice_totals(p_invoice_id);
end;
$$;

-- ============ RLS ============
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.dispatches enable row level security;
alter table public.dispatch_items enable row level security;
alter table public.dispatch_returns enable row level security;
alter table public.dispatch_return_items enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.sales_invoices enable row level security;
alter table public.sales_invoice_dispatches enable row level security;
alter table public.sales_invoice_corrections enable row level security;

-- quotations
create policy "quotations_select" on public.quotations for select to authenticated using (true);
create policy "quotations_insert" on public.quotations for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));
create policy "quotations_update" on public.quotations for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));
create policy "quotations_delete" on public.quotations for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create policy "quotation_items_select" on public.quotation_items for select to authenticated using (true);
create policy "quotation_items_insert" on public.quotation_items for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));
create policy "quotation_items_update" on public.quotation_items for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));
create policy "quotation_items_delete" on public.quotation_items for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));

-- sales orders
create policy "sales_orders_select" on public.sales_orders for select to authenticated using (true);
create policy "sales_orders_insert" on public.sales_orders for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));
create policy "sales_orders_update" on public.sales_orders for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));
create policy "sales_orders_delete" on public.sales_orders for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create policy "sales_order_items_select" on public.sales_order_items for select to authenticated using (true);
create policy "sales_order_items_insert" on public.sales_order_items for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));
create policy "sales_order_items_update" on public.sales_order_items for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));
create policy "sales_order_items_delete" on public.sales_order_items for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));

-- dispatches (store_incharge can also write)
create policy "dispatches_select" on public.dispatches for select to authenticated using (true);
create policy "dispatches_insert" on public.dispatches for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager') or public.has_role(auth.uid(),'store_incharge'));
create policy "dispatches_update" on public.dispatches for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager') or public.has_role(auth.uid(),'store_incharge'));
create policy "dispatches_delete" on public.dispatches for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create policy "dispatch_items_select" on public.dispatch_items for select to authenticated using (true);
create policy "dispatch_items_insert" on public.dispatch_items for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager') or public.has_role(auth.uid(),'store_incharge'));
create policy "dispatch_items_update" on public.dispatch_items for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager') or public.has_role(auth.uid(),'store_incharge'));
create policy "dispatch_items_delete" on public.dispatch_items for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create policy "dispatch_returns_select" on public.dispatch_returns for select to authenticated using (true);
create policy "dispatch_returns_insert" on public.dispatch_returns for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager') or public.has_role(auth.uid(),'store_incharge'));
create policy "dispatch_returns_update" on public.dispatch_returns for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager') or public.has_role(auth.uid(),'store_incharge'));
create policy "dispatch_returns_delete" on public.dispatch_returns for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create policy "dispatch_return_items_select" on public.dispatch_return_items for select to authenticated using (true);
create policy "dispatch_return_items_insert" on public.dispatch_return_items for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager') or public.has_role(auth.uid(),'store_incharge'));
create policy "dispatch_return_items_update" on public.dispatch_return_items for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager') or public.has_role(auth.uid(),'store_incharge'));
create policy "dispatch_return_items_delete" on public.dispatch_return_items for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- stock transactions (FG ledger; dispatch flow writes here)
create policy "stock_txn_select" on public.stock_transactions for select to authenticated using (true);
create policy "stock_txn_insert" on public.stock_transactions for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager') or public.has_role(auth.uid(),'store_incharge'));
create policy "stock_txn_update" on public.stock_transactions for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager') or public.has_role(auth.uid(),'store_incharge'));
create policy "stock_txn_delete" on public.stock_transactions for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- sales invoices (draft editable by sales; issued only by admin)
create policy "sales_invoices_select" on public.sales_invoices for select to authenticated using (true);
create policy "sales_invoices_insert" on public.sales_invoices for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));
create policy "sales_invoices_update" on public.sales_invoices for update to authenticated
  using (
    public.has_role(auth.uid(),'admin')
    or (status = 'draft' and public.has_role(auth.uid(),'sales_manager'))
  )
  with check (
    status <> 'cancelled' or public.has_role(auth.uid(),'admin')
  );
create policy "sales_invoices_delete" on public.sales_invoices for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create policy "sid_select" on public.sales_invoice_dispatches for select to authenticated using (true);
create policy "sid_insert" on public.sales_invoice_dispatches for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));
create policy "sid_update" on public.sales_invoice_dispatches for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager'));
create policy "sid_delete" on public.sales_invoice_dispatches for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create policy "sic_select" on public.sales_invoice_corrections for select to authenticated using (true);
create policy "sic_insert" on public.sales_invoice_corrections for insert to authenticated
  with check (public.can_edit_invoice(invoice_id)
    and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager')));
create policy "sic_update" on public.sales_invoice_corrections for update to authenticated
  using (public.can_edit_invoice(invoice_id)
    and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'sales_manager')))
  with check (public.can_edit_invoice(invoice_id));
create policy "sic_delete" on public.sales_invoice_corrections for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.can_edit_invoice(invoice_id));

-- ============ DEFAULT PERMISSIONS ============
update public.role_permissions
   set can_view = true, can_create = true, can_edit = true
 where role = 'sales_manager' and module in ('sales','masters','reports');

update public.role_permissions
   set can_view = true
 where role in ('finance_manager','accountant') and module = 'sales';
