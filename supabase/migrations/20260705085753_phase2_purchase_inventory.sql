-- Phase 2: Purchase & Inventory — suppliers, clients, materials masters;
-- purchase orders + GRN; multi-store lot-tracked inventory; issues/returns;
-- requisitions; gate movements.

-- ============ DOCUMENT NUMBER GENERATOR ============
create table public.doc_counters (
  doc_type text primary key,
  prefix text not null,
  last_number int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.doc_counters enable row level security;

create policy "doc_counters_select_authenticated"
  on public.doc_counters for select to authenticated using (true);

create or replace function public.next_doc_number(_doc_type text, _prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num int;
begin
  insert into public.doc_counters (doc_type, prefix, last_number)
  values (_doc_type, _prefix, 1)
  on conflict (doc_type) do update
    set last_number = public.doc_counters.last_number + 1,
        updated_at = now()
  returning last_number into v_num;
  return _prefix || '-' || to_char(now(), 'YYMM') || '-' || lpad(v_num::text, 4, '0');
end;
$$;

-- ============ SUPPLIERS ============
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  supplier_type text not null default 'material',
  category text,
  contact_person text,
  phone text,
  email text,
  address text,
  gst_number text,
  ntn_number text,
  bank_details text,
  payment_terms int,
  lead_time_days int,
  min_order_qty numeric,
  labor_rate numeric,
  labor_rate_unit text,
  turnaround_days int,
  process_types text[],
  linked_client_id uuid,
  expense_category text,
  petty_cash_limit numeric,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.suppliers enable row level security;

create policy "suppliers_select_authenticated"
  on public.suppliers for select to authenticated using (true);

create policy "suppliers_write_admin_store"
  on public.suppliers for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'));

create trigger trg_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.update_updated_at_column();

-- ============ CLIENTS (customers) ============
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  gst_number text,
  credit_limit numeric,
  payment_terms int,
  default_tax_percent numeric,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clients enable row level security;

create policy "clients_select_authenticated"
  on public.clients for select to authenticated using (true);

create policy "clients_write_admin_sales"
  on public.clients for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sales_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sales_manager'));

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.update_updated_at_column();

create table public.client_consignees (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.client_consignees enable row level security;

create policy "client_consignees_select_authenticated"
  on public.client_consignees for select to authenticated using (true);

create policy "client_consignees_write_admin_sales"
  on public.client_consignees for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sales_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sales_manager'));

alter table public.suppliers
  add constraint suppliers_linked_client_fkey
  foreign key (linked_client_id) references public.clients(id) on delete set null;

-- ============ MATERIALS ============
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  material_type text not null default 'raw',
  grade text,
  color text,
  unit text default 'kg',
  unit_price numeric,
  hsn_code text,
  min_stock numeric,
  max_stock numeric,
  reorder_level numeric,
  current_stock numeric default 0,
  deny_extra_tolerance boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.materials enable row level security;

create policy "materials_select_authenticated"
  on public.materials for select to authenticated using (true);

create policy "materials_write_admin_store"
  on public.materials for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'));

create trigger trg_materials_updated_at
  before update on public.materials
  for each row execute function public.update_updated_at_column();

-- ============ PURCHASE ============
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  po_date date not null default current_date,
  source_type text not null default 'company',
  supplier_id uuid references public.suppliers(id),
  client_id uuid references public.clients(id),
  status text not null default 'draft',
  delivery_date date,
  total_amount numeric default 0,
  remarks text,
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_po_supplier on public.purchase_orders (supplier_id);
create index idx_po_status on public.purchase_orders (status);

alter table public.purchase_orders enable row level security;

create policy "po_select_authenticated"
  on public.purchase_orders for select to authenticated using (true);

create policy "po_write_admin_store"
  on public.purchase_orders for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge')
              or public.has_role(auth.uid(), 'production_manager'));

create policy "po_update_admin_store"
  on public.purchase_orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge')
         or public.has_role(auth.uid(), 'production_manager'));

create policy "po_delete_admin"
  on public.purchase_orders for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_po_updated_at
  before update on public.purchase_orders
  for each row execute function public.update_updated_at_column();

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  material_id uuid not null references public.materials(id),
  ordered_qty numeric not null,
  received_qty numeric not null default 0,
  pending_qty numeric,
  unit_id uuid references public.units_of_measure(id),
  unit_price numeric,
  line_total numeric,
  tolerance_percent numeric,
  allow_extra_receipt boolean default false,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_poi_po on public.purchase_order_items (po_id);

alter table public.purchase_order_items enable row level security;

create policy "poi_select_authenticated"
  on public.purchase_order_items for select to authenticated using (true);

create policy "poi_write_admin_store"
  on public.purchase_order_items for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge')
         or public.has_role(auth.uid(), 'production_manager'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge')
              or public.has_role(auth.uid(), 'production_manager'));

create trigger trg_poi_updated_at
  before update on public.purchase_order_items
  for each row execute function public.update_updated_at_column();

create table public.grn_tolerance_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  updated_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.grn_tolerance_settings enable row level security;

create policy "grn_tolerance_select_authenticated"
  on public.grn_tolerance_settings for select to authenticated using (true);

create policy "grn_tolerance_write_admin"
  on public.grn_tolerance_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into public.grn_tolerance_settings (setting_key, setting_value) values
  ('default_tolerance_percent', '5'::jsonb),
  ('allow_extra_receipt_default', 'false'::jsonb);

-- ============ STORES & LOCATIONS ============
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  floor_location text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.stores enable row level security;

create policy "stores_select_authenticated"
  on public.stores for select to authenticated using (true);

create policy "stores_write_admin_store"
  on public.stores for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'));

create trigger trg_stores_updated_at
  before update on public.stores
  for each row execute function public.update_updated_at_column();

create table public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  location_code text not null unique,
  location_name text not null,
  zone text not null default 'general',
  sub_zone text,
  rack_number text,
  row_number text,
  bin_number text,
  material_type text,
  capacity_kg numeric,
  current_stock_kg numeric default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.storage_locations enable row level security;

create policy "storage_locations_select_authenticated"
  on public.storage_locations for select to authenticated using (true);

create policy "storage_locations_write_admin_store"
  on public.storage_locations for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'));

create trigger trg_storage_locations_updated_at
  before update on public.storage_locations
  for each row execute function public.update_updated_at_column();

-- ============ MATERIAL LOTS (lot-tracked stock) ============
create table public.material_lots (
  id uuid primary key default gen_random_uuid(),
  lot_number text not null unique,
  material_id uuid references public.materials(id),
  po_item_id uuid references public.purchase_order_items(id),
  supplier_id uuid references public.suppliers(id),
  grn_number text,
  invoice_number text,
  quantity numeric not null,
  remaining_qty numeric not null,
  unit text not null default 'kg',
  unit_id uuid references public.units_of_measure(id),
  grade text,
  received_date date not null default current_date,
  expiry_date date,
  inspection_status text not null default 'pending',
  storage_location_id uuid references public.storage_locations(id),
  put_away_by uuid,
  put_away_date timestamptz,
  is_customer_material boolean default false,
  customer_client_id uuid references public.clients(id),
  customer_balance_kg numeric,
  is_adjustment boolean not null default false,
  adjustment_reason text,
  remarks text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lots_material on public.material_lots (material_id);
create index idx_lots_remaining on public.material_lots (remaining_qty);
create index idx_lots_grn on public.material_lots (grn_number);

alter table public.material_lots enable row level security;

create policy "lots_select_authenticated"
  on public.material_lots for select to authenticated using (true);

create policy "lots_write_admin_store"
  on public.material_lots for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'));

create policy "lots_update_admin_store"
  on public.material_lots for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'));

create policy "lots_delete_admin"
  on public.material_lots for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_lots_updated_at
  before update on public.material_lots
  for each row execute function public.update_updated_at_column();

create or replace function public.generate_material_lot_number()
returns text
language sql
security definer
set search_path = public
as $$
  select public.next_doc_number('material_lot', 'LOT')
$$;

-- ============ STOCK ADJUSTMENT LOG ============
create table public.stock_adjustment_log (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'raw_material',
  item_id uuid not null,
  item_code text,
  item_name text,
  material_lot_id uuid references public.material_lots(id),
  as_of_date date not null default current_date,
  before_qty numeric not null,
  after_qty numeric not null,
  delta numeric not null,
  reason text not null,
  reason_type text,
  client_id uuid references public.clients(id),
  adjusted_by uuid,
  adjusted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.stock_adjustment_log enable row level security;

create policy "stock_adj_select_authenticated"
  on public.stock_adjustment_log for select to authenticated using (true);

create policy "stock_adj_insert_admin_store"
  on public.stock_adjustment_log for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'));

-- ============ STORE REQUISITIONS ============
create table public.store_requisitions (
  id uuid primary key default gen_random_uuid(),
  requisition_number text not null unique,
  requisition_date date not null default current_date,
  department_id uuid references public.departments(id),
  job_id uuid,
  machine_id uuid,
  shift text,
  planned_production_qty numeric,
  status text not null default 'pending',
  requires_approval boolean default false,
  manager_approved boolean default false,
  manager_approved_by uuid,
  manager_approved_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  requested_by uuid,
  remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_req_status on public.store_requisitions (status);
create index idx_req_date on public.store_requisitions (requisition_date);

alter table public.store_requisitions enable row level security;

create policy "req_select_authenticated"
  on public.store_requisitions for select to authenticated using (true);

create policy "req_write_authenticated"
  on public.store_requisitions for insert to authenticated with check (true);

create policy "req_update_admin_store_pm"
  on public.store_requisitions for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge')
         or public.has_role(auth.uid(), 'production_manager'));

create policy "req_delete_admin"
  on public.store_requisitions for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_req_updated_at
  before update on public.store_requisitions
  for each row execute function public.update_updated_at_column();

create table public.requisition_items (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.store_requisitions(id) on delete cascade,
  material_id uuid references public.materials(id),
  material_role text,
  required_qty_kg numeric not null,
  available_qty_kg numeric,
  issued_qty_kg numeric,
  original_qty_kg numeric,
  adjusted_qty_kg numeric,
  adjustment_reason text,
  adjusted_by uuid,
  adjusted_at timestamptz,
  source_type text,
  source_location_id uuid references public.storage_locations(id),
  is_regrind boolean default false,
  status text default 'pending',
  remarks text,
  created_at timestamptz default now()
);

create index idx_reqitems_req on public.requisition_items (requisition_id);

alter table public.requisition_items enable row level security;

create policy "reqitems_select_authenticated"
  on public.requisition_items for select to authenticated using (true);

create policy "reqitems_write_authenticated"
  on public.requisition_items for insert to authenticated with check (true);

create policy "reqitems_update_admin_store_pm"
  on public.requisition_items for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge')
         or public.has_role(auth.uid(), 'production_manager'));

create policy "reqitems_delete_admin"
  on public.requisition_items for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============ MATERIAL ISSUES / RETURNS ============
create table public.material_issues (
  id uuid primary key default gen_random_uuid(),
  issue_number text not null unique,
  issue_date date not null default current_date,
  material_lot_id uuid references public.material_lots(id),
  from_location_id uuid references public.storage_locations(id),
  to_department text not null,
  job_id uuid,
  purpose text,
  quantity_issued numeric not null,
  unit text default 'kg',
  status text not null default 'issued',
  picking_by uuid,
  picking_completed_at timestamptz,
  dispatched_qty numeric,
  received_qty numeric,
  received_by uuid,
  received_at timestamptz,
  shortage_reason text,
  issued_by uuid,
  remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_issues_lot on public.material_issues (material_lot_id);
create index idx_issues_date on public.material_issues (issue_date);

alter table public.material_issues enable row level security;

create policy "issues_select_authenticated"
  on public.material_issues for select to authenticated using (true);

create policy "issues_write_admin_store"
  on public.material_issues for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'));

create policy "issues_update_admin_store"
  on public.material_issues for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'));

create policy "issues_delete_admin"
  on public.material_issues for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_issues_updated_at
  before update on public.material_issues
  for each row execute function public.update_updated_at_column();

create table public.material_returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  return_date date not null default current_date,
  return_type text not null default 'unused',
  from_department text not null,
  from_machine_id uuid,
  to_department text,
  to_location_id uuid references public.storage_locations(id),
  quantity_kg numeric not null,
  shift text,
  status text not null default 'pending',
  returned_by uuid,
  received_by uuid,
  remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.material_returns enable row level security;

create policy "returns_select_authenticated"
  on public.material_returns for select to authenticated using (true);

create policy "returns_write_authenticated"
  on public.material_returns for insert to authenticated with check (true);

create policy "returns_update_admin_store"
  on public.material_returns for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'));

create policy "returns_delete_admin"
  on public.material_returns for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_returns_updated_at
  before update on public.material_returns
  for each row execute function public.update_updated_at_column();

-- ============ GATE MOVEMENTS ============
create table public.gate_movements (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'material_inward',
  direction text not null default 'in',
  movement_date date not null default current_date,
  movement_time time not null default localtime,
  gate_no text,
  gate_pass_no text,
  party_kind text,
  party_name text,
  vendor_id uuid references public.suppliers(id),
  customer_id uuid references public.clients(id),
  material_lot_id uuid references public.material_lots(id),
  item_description text,
  quantity numeric,
  unit text,
  weight_kg numeric,
  vehicle_no text,
  driver_name text,
  driver_cnic text,
  returnable boolean not null default false,
  returned_at timestamptz,
  security_guard text,
  status text not null default 'open',
  attachment_url text,
  remarks text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_gate_date on public.gate_movements (movement_date);

alter table public.gate_movements enable row level security;

create policy "gate_select_authenticated"
  on public.gate_movements for select to authenticated using (true);

create policy "gate_write_authenticated"
  on public.gate_movements for insert to authenticated with check (true);

create policy "gate_update_admin_store"
  on public.gate_movements for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'store_incharge'));

create policy "gate_delete_admin"
  on public.gate_movements for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_gate_updated_at
  before update on public.gate_movements
  for each row execute function public.update_updated_at_column();

-- ============ DEFAULT PERMISSIONS ============
update public.role_permissions set can_view = true, can_create = true, can_edit = true
where role = 'store_incharge' and module in ('inventory','purchase','masters');

update public.role_permissions set can_view = true, can_create = true, can_edit = true
where role = 'production_manager' and module in ('purchase','inventory');

update public.role_permissions set can_view = true
where role in ('finance_manager','accountant') and module in ('purchase','inventory');;
