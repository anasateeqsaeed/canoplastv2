-- Fix: create_ar_receipt / create_ap_payment backfill source_id on their
-- voucher after posting, which the immutability guard rejects. Wrap the
-- backfill in the internal flag. (Also fixes a stray %s in two messages.)

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
    if p_bank_account_id is null then raise exception 'Bank account is required for % receipts', p_mode; end if;
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
      raise exception 'Allocation exceeds invoice outstanding (%)', _outstanding;
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

  perform set_config('app.accounting_internal', 'on', true);
  update public.vouchers set source_id = _rid where id = _vid;
  perform set_config('app.accounting_internal', '', true);

  insert into public.ar_receipt_allocations (receipt_id, invoice_id, amount)
  select _rid, (a->>'invoice_id')::uuid, (a->>'amount')::numeric
    from jsonb_array_elements(p_allocations) as a;

  return _rid;
end $$;

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
    if p_bank_account_id is null then raise exception 'Bank account is required for % payments', p_mode; end if;
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
      raise exception 'Allocation exceeds bill outstanding (%)', _outstanding;
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

  perform set_config('app.accounting_internal', 'on', true);
  update public.vouchers set source_id = _pid where id = _vid;
  perform set_config('app.accounting_internal', '', true);

  insert into public.ap_payment_allocations (payment_id, bill_id, amount)
  select _pid, (a->>'bill_id')::uuid, (a->>'amount')::numeric
    from jsonb_array_elements(p_allocations) as a;

  return _pid;
end $$;
