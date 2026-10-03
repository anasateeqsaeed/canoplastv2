-- Sales returns: follow the app's Role Management permission matrix.
--
-- Before this, only admin / sales_manager / store_incharge could create a
-- return, so users who were granted Inventory or Sales "Create" in Role
-- Management got "new row violates row-level security policy for table
-- sales_returns". has_module_permission mirrors useMyPermissions:
-- admin = everything; otherwise OR of built-in role rows + active custom
-- roles, then a non-null, unexpired per-user override replaces the value.

create or replace function public.has_module_permission(_user_id uuid, _module text, _action text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_base boolean;
  v_ovr boolean;
begin
  if _user_id is null then return false; end if;
  if _action not in ('view', 'create', 'edit', 'delete') then
    raise exception 'Unknown permission action %', _action;
  end if;
  if exists (select 1 from public.user_roles where user_id = _user_id and role = 'admin') then
    return true;
  end if;

  select coalesce(bool_or(case _action
           when 'view' then s.can_view
           when 'create' then s.can_create
           when 'edit' then s.can_edit
           else s.can_delete end), false)
    into v_base
    from (
      select rp.can_view, rp.can_create, rp.can_edit, rp.can_delete
        from public.role_permissions rp
        join public.user_roles ur on ur.role = rp.role
       where ur.user_id = _user_id and rp.module = _module
      union all
      select crp.can_view, crp.can_create, crp.can_edit, crp.can_delete
        from public.custom_role_permissions crp
        join public.user_custom_roles ucr on ucr.custom_role_id = crp.custom_role_id
        join public.custom_roles cr on cr.id = crp.custom_role_id
       where ucr.user_id = _user_id and crp.module = _module
         and cr.is_active
         and (ucr.expires_at is null or ucr.expires_at > now())
    ) s;

  select case _action
           when 'view' then o.can_view
           when 'create' then o.can_create
           when 'edit' then o.can_edit
           else o.can_delete end
    into v_ovr
    from public.user_permission_overrides o
   where o.user_id = _user_id and o.module = _module
     and (o.expires_at is null or o.expires_at > now())
   limit 1;

  return coalesce(v_ovr, v_base);
end $$;

grant execute on function public.has_module_permission(uuid, text, text) to authenticated;

-- Create / edit / post returns: the old roles, or Create on Sales or Inventory.
create or replace function public.can_manage_sales_returns(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
           select 1 from public.user_roles
            where user_id = _user_id
              and role in ('admin', 'sales_manager', 'store_incharge'))
      or public.has_module_permission(_user_id, 'sales', 'create')
      or public.has_module_permission(_user_id, 'inventory', 'create')
$$;

-- Customer ledger: the old roles, or View on Sales.
create or replace function public.can_view_customer_ledger(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
           select 1 from public.user_roles
            where user_id = _user_id
              and role in ('admin', 'sales_manager', 'store_incharge', 'accountant', 'finance_manager', 'super_user'))
      or public.has_module_permission(_user_id, 'sales', 'view')
$$;

-- Cancel a posted return: admin / sales manager, or Delete on Sales or Inventory.
create or replace function public.can_cancel_sales_returns(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin')
      or public.has_role(_user_id, 'sales_manager')
      or public.has_module_permission(_user_id, 'sales', 'delete')
      or public.has_module_permission(_user_id, 'inventory', 'delete')
$$;

create or replace function public.cancel_sales_return(p_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  t record;
  v_latest integer;
begin
  if not public.can_cancel_sales_returns(auth.uid()) then
    raise exception 'You do not have permission to cancel a sales return';
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
